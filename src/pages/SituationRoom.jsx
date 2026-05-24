import { useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Progress, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import {
    AlertOutlined,
    BarChartOutlined,
    CloudOutlined,
    DollarOutlined,
    FilePdfOutlined,
    FireOutlined,
    ReloadOutlined,
    RobotOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { useApiCache } from '../hooks/useApiCache';
import { supabase } from '../supabaseClient';
import budgetSeed from '../data/budgetRound2_2569.json';
import './SituationRoom.css';

const { Paragraph, Text, Title } = Typography;
const AI_PROXY_URL = '/.netlify/functions/ai-proxy';
const GEMINI_SITUATION_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

const DISTRICT_CENTROIDS = [
    { name: 'เมืองนครปฐม', lat: 13.82, lon: 100.04 },
    { name: 'กำแพงแสน', lat: 14.01, lon: 99.98 },
    { name: 'บางเลน', lat: 14.02, lon: 100.17 },
    { name: 'ดอนตูม', lat: 13.98, lon: 100.08 },
    { name: 'นครชัยศรี', lat: 13.8, lon: 100.18 },
    { name: 'สามพราน', lat: 13.72, lon: 100.22 },
    { name: 'พุทธมณฑล', lat: 13.78, lon: 100.32 },
];

const money = (value) => Number(value || 0).toLocaleString('th-TH');
const pct = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0) * 10) / 10));

function parseNotes(notes) {
    if (!notes || typeof notes !== 'string') return {};
    try {
        const parsed = JSON.parse(notes);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return { detail: notes };
    }
}

function normalizeBudgetStatus(status) {
    if (status === 'ส่งเบิกแล้ว') return 'ส่งเบิกแล้ว';
    if (['เสร็จสิ้น', 'เบิกจ่ายแล้ว', 'เบิกจ่ายเสร็จสิ้น'].includes(status)) return 'เบิกจ่ายเสร็จสิ้น';
    return 'กำลังดำเนินการ';
}

function parseBudgetRow(row) {
    const notes = parseNotes(row.notes);
    return {
        id: row.id,
        project: notes.project || row.project_name || 'รายการงบประมาณ',
        district: notes.district || 'ไม่ระบุพื้นที่',
        budget: Number(row.budget_amount ?? notes.budget ?? 0),
        spent: Number(row.spent_amount ?? notes.spentAmount ?? 0),
        status: normalizeBudgetStatus(row.status || notes.status),
    };
}

async function maybeData(query) {
    const { data, error } = await query;
    if (error) return [];
    return data || [];
}

async function fetchExecutiveSignals() {
    const [budgets, requests, assignments, hotspots] = await Promise.all([
        maybeData(supabase.from('budgets').select('id,project_name,budget_amount,spent_amount,status,notes')),
        maybeData(supabase.from('data_requests').select('id,title,status,created_at').order('created_at', { ascending: false }).limit(20)),
        maybeData(supabase.from('data_request_assignments').select('id,status')),
        maybeData(supabase.from('fire_hotspots').select('district,confidence,frp,acq_date').order('acq_date', { ascending: false }).limit(200)),
    ]);

    return { budgets, requests, assignments, hotspots };
}

async function fetchWeatherRisk() {
    const results = await Promise.all(DISTRICT_CENTROIDS.map(async (district) => {
        try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&forecast_days=3&timezone=Asia%2FBangkok`;
            const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${district.lat}&longitude=${district.lon}&current=pm2_5,european_aqi`;
            const [weatherRes, airRes] = await Promise.all([fetch(weatherUrl), fetch(airUrl)]);
            if (!weatherRes.ok || !airRes.ok) throw new Error('weather unavailable');
            const weather = await weatherRes.json();
            const air = await airRes.json();
            const rainTotal = (weather.daily?.precipitation_sum || []).reduce((sum, value) => sum + Number(value || 0), 0);
            const rainProbability = Math.max(...(weather.daily?.precipitation_probability_max || [0]).map(value => Number(value || 0)));
            const pm25 = Number(air.current?.pm2_5 || 0);
            return {
                ...district,
                temp: Number(weather.current?.temperature_2m || 0),
                humidity: Number(weather.current?.relative_humidity_2m || 0),
                wind: Number(weather.current?.wind_speed_10m || 0),
                rainTotal,
                rainProbability,
                pm25,
                riskScore: (rainProbability >= 70 ? 2 : 0) + (rainTotal >= 20 ? 2 : 0) + (pm25 >= 37.5 ? 2 : pm25 >= 25 ? 1 : 0),
            };
        } catch {
            return { ...district, temp: 0, humidity: 0, wind: 0, rainTotal: 0, rainProbability: 0, pm25: 0, riskScore: 0 };
        }
    }));

    const valid = results.filter(item => item.temp || item.pm25 || item.rainTotal);
    const divisor = valid.length || 1;
    return {
        districts: results.sort((a, b) => b.riskScore - a.riskScore),
        avgTemp: valid.reduce((sum, item) => sum + item.temp, 0) / divisor,
        avgPm25: valid.reduce((sum, item) => sum + item.pm25, 0) / divisor,
        maxRainProbability: Math.max(...results.map(item => item.rainProbability), 0),
        maxRainTotal: Math.max(...results.map(item => item.rainTotal), 0),
    };
}

function buildBudgetSummary(rows) {
    const parsedRows = rows.length ? rows.map(parseBudgetRow) : [];
    const fallbackTotal = Number(budgetSeed?.meta?.totalBudget || 0);
    const totalBudget = parsedRows.length ? parsedRows.reduce((sum, row) => sum + row.budget, 0) : fallbackTotal;
    const totalSpent = parsedRows.reduce((sum, row) => sum + row.spent, 0);
    const statusCounts = parsedRows.reduce((map, row) => {
        map[row.status] = (map[row.status] || 0) + 1;
        return map;
    }, {});
    const topProjects = parsedRows.length
        ? [...parsedRows].sort((a, b) => b.budget - a.budget).slice(0, 5)
        : (budgetSeed.projectSummary || []).slice(0, 5).map(item => ({
            project: item.project,
            district: 'แผนจังหวัด',
            budget: item.budget,
            spent: 0,
            status: 'รอติดตามผลเบิกจ่าย',
        }));

    return {
        rows: parsedRows,
        totalBudget,
        totalSpent,
        progress: totalBudget ? pct((totalSpent / totalBudget) * 100) : 0,
        statusCounts,
        topProjects,
    };
}

function buildDistrictRanking(districtStats, hotspots) {
    const hotspotCounts = hotspots.reduce((map, row) => {
        const name = row.district || 'ไม่ระบุ';
        map[name] = (map[name] || 0) + 1;
        return map;
    }, {});

    return Object.entries(districtStats || {}).map(([name, stats]) => {
        const fire = Number(stats.fireCount || hotspotCounts[name] || 0);
        const pestArea = Number(stats.pestArea || 0);
        const disasterArea = Number(stats.disasterArea || 0);
        const score = (fire * 5) + (pestArea / 100) + (disasterArea / 120) + Number(stats.lp || 0) + Number(stats.ce || 0) / 2;
        return {
            name,
            area: Number(stats.area || 0),
            households: Number(stats.house || 0),
            ce: Number(stats.ce || 0),
            lp: Number(stats.lp || 0),
            fire,
            pestArea,
            disasterArea,
            score: Math.round(score),
        };
    }).sort((a, b) => b.score - a.score).slice(0, 7);
}

function buildAlerts({ weatherRisk, budget, pendingRequests, pendingAssignments, ranking }) {
    const alerts = [];
    const topDistrict = ranking[0];
    const topWeather = weatherRisk.districts[0];

    if (topDistrict && (topDistrict.fire > 0 || topDistrict.pestArea > 0 || topDistrict.disasterArea > 0)) {
        alerts.push({
            level: 'critical',
            title: `พื้นที่ต้องติดตาม: ${topDistrict.name}`,
            detail: `จุดความร้อน ${topDistrict.fire.toLocaleString()} จุด, พื้นที่ศัตรูพืช ${(topDistrict.pestArea || 0).toLocaleString()} ไร่`,
        });
    }
    if (topWeather?.riskScore > 0) {
        alerts.push({
            level: topWeather.riskScore >= 4 ? 'critical' : 'warning',
            title: `สภาพอากาศเสี่ยง: ${topWeather.name}`,
            detail: `โอกาสฝน ${topWeather.rainProbability}% / PM2.5 ${topWeather.pm25.toFixed(1)} µg/m³`,
        });
    }
    if (budget.totalBudget > 0 && budget.progress < 60) {
        alerts.push({
            level: 'warning',
            title: 'ความคืบหน้างบประมาณยังต่ำกว่า 60%',
            detail: `เบิกจ่าย ${budget.progress}% จากงบรวม ${money(budget.totalBudget)} บาท`,
        });
    }
    if (pendingRequests > 0 || pendingAssignments > 0) {
        alerts.push({
            level: 'info',
            title: 'มีคำขอข้อมูลที่ยังต้องติดตาม',
            detail: `คำขอเปิดอยู่ ${pendingRequests} รายการ / assignment รอส่ง ${pendingAssignments} รายการ`,
        });
    }
    alerts.push({
        level: 'success',
        title: 'ข้อมูลภาพรวมพร้อมใช้สำหรับ briefing',
        detail: `ครอบคลุม ${Object.keys(ranking || {}).length || DISTRICT_CENTROIDS.length} อำเภอ พร้อมข้อมูลพื้นที่ กลุ่ม และแปลงใหญ่`,
    });

    return alerts.slice(0, 5);
}

function buildRecommendedActions({ weatherRisk, budget, pendingRequests, ranking }) {
    const actions = [];
    const topDistrict = ranking[0];
    const topWeather = weatherRisk.districts[0];

    if (topDistrict) {
        actions.push(`ให้กลุ่มอารักขาพืชตรวจสอบ ${topDistrict.name} ก่อน โดยดูจุดความร้อนและพื้นที่ศัตรูพืชเป็นลำดับแรก`);
    }
    if (topWeather?.rainProbability >= 60) {
        actions.push(`แจ้งอำเภอ ${topWeather.name} เตรียมแผนสื่อสารความเสี่ยงฝนและติดตามพื้นที่เสี่ยงน้ำขัง`);
    }
    if (budget.progress < 75) {
        actions.push('เร่งทบทวนรายการงบที่ยังไม่ส่งเบิกและนัดเจ้าของโครงการอัปเดตสถานะภายในสัปดาห์นี้');
    }
    if (pendingRequests > 0) {
        actions.push('มอบหมายเจ้าของคำขอข้อมูลที่ยังเปิดอยู่ และกำหนดเส้นตายตอบกลับให้ชัดเจน');
    }
    actions.push('ใช้รายงานผู้บริหารชุดนี้เป็นวาระเปิดประชุม: สถานการณ์เสี่ยง, งบ, คำขอข้อมูล, และพื้นที่ต้องติดตาม');
    return actions.slice(0, 5);
}

function buildPrompt(snapshot) {
    return `คุณคือผู้ช่วยวิเคราะห์สถานการณ์สำหรับผู้บริหารสำนักงานเกษตรจังหวัดนครปฐม
สรุปเป็นภาษาไทย กระชับ ตรงประเด็น ไม่เปิดเผยข้อมูลส่วนบุคคล

ข้อมูลวันนี้:
${JSON.stringify(snapshot, null, 2)}

ตอบกลับเป็น 4 ส่วน:
1. สถานการณ์รวมจังหวัด 2-3 ประโยค
2. สิ่งที่ผู้บริหารต้องดูวันนี้ 3 ข้อ
3. การตัดสินใจ/มอบหมายงานที่แนะนำ 3 ข้อ
4. ประโยคสรุปสำหรับรายงานผู้บริหาร 1 ย่อหน้า`;
}

function buildGenerationConfig(model) {
    const base = {
        temperature: 0.35,
        maxOutputTokens: 1100,
    };

    if (model.startsWith('gemini-2.5')) {
        return {
            ...base,
            thinkingConfig: { thinkingBudget: 1024 },
        };
    }

    return {
        ...base,
        thinkingConfig: { thinkingLevel: 'high' },
    };
}

async function callGeminiSituationModel(model, snapshot) {
    const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: 'gemini',
            body: {
                model,
                contents: [{ role: 'user', parts: [{ text: buildPrompt(snapshot) }] }],
                generationConfig: buildGenerationConfig(model),
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`AI briefing unavailable (${response.status}) ${body.slice(0, 180)}`);
    }
    const payload = await response.json();
    return payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
}

async function callSituationAi(snapshot) {
    const failures = [];
    for (const model of GEMINI_SITUATION_MODELS) {
        try {
            const text = await callGeminiSituationModel(model, snapshot);
            if (text) return { text, model };
            failures.push(`${model}: empty response`);
        } catch (err) {
            failures.push(`${model}: ${err.message}`);
        }
    }
    throw new Error(failures.join(' | '));
}

export default function SituationRoom() {
    const reportRef = useRef(null);
    const { stats, loading: dashboardLoading, districtStats, lpStats, agriStats, instituteStats } = useDashboardData();
    const { data: signals = {}, isLoading: signalsLoading, refetch: refetchSignals } = useApiCache('executive-situation-signals', fetchExecutiveSignals, { staleMinutes: 5 });
    const { data: weatherRisk = { districts: [], avgTemp: 0, avgPm25: 0, maxRainProbability: 0, maxRainTotal: 0 }, isLoading: weatherLoading, refetch: refetchWeather } = useApiCache('executive-weather-risk', fetchWeatherRisk, { staleMinutes: 10 });
    const [aiBriefing, setAiBriefing] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [reportReady, setReportReady] = useState(false);

    const budget = useMemo(() => buildBudgetSummary(signals.budgets || []), [signals.budgets]);
    const ranking = useMemo(() => buildDistrictRanking(districtStats, signals.hotspots || []), [districtStats, signals.hotspots]);
    const pendingRequests = useMemo(() => (signals.requests || []).filter(item => item.status === 'published' || item.status === 'draft').length, [signals.requests]);
    const pendingAssignments = useMemo(() => (signals.assignments || []).filter(item => item.status !== 'submitted').length, [signals.assignments]);
    const totalRecords = useMemo(() => (stats || []).reduce((sum, item) => sum + Number(item.count || 0), 0), [stats]);
    const situationLoading = dashboardLoading || signalsLoading || weatherLoading;

    const alerts = useMemo(() => buildAlerts({ weatherRisk, budget, pendingRequests, pendingAssignments, ranking }), [budget, pendingAssignments, pendingRequests, ranking, weatherRisk]);
    const actions = useMemo(() => buildRecommendedActions({ weatherRisk, budget, pendingRequests, ranking }), [budget, pendingRequests, ranking, weatherRisk]);
    const snapshot = useMemo(() => ({
        generatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        totalRecords,
        agriculture: {
            households: agriStats.households || 0,
            cropAreaRai: agriStats.crop_area || 0,
            largePlots: lpStats.total || 0,
            farmerInstituteGroups: instituteStats.total || 0,
        },
        weather: {
            avgTemp: Number(weatherRisk.avgTemp || 0).toFixed(1),
            avgPm25: Number(weatherRisk.avgPm25 || 0).toFixed(1),
            maxRainProbability: weatherRisk.maxRainProbability || 0,
            maxRainTotal: Number(weatherRisk.maxRainTotal || 0).toFixed(1),
            highestRiskDistrict: weatherRisk.districts?.[0]?.name || '-',
        },
        budget: {
            totalBudget: budget.totalBudget,
            totalSpent: budget.totalSpent,
            progress: budget.progress,
        },
        pendingRequests,
        pendingAssignments,
        topDistricts: ranking.slice(0, 3),
        alerts: alerts.map(({ title, detail }) => ({ title, detail })),
        recommendedActions: actions,
    }), [actions, agriStats, alerts, budget, instituteStats, lpStats, pendingAssignments, pendingRequests, ranking, totalRecords, weatherRisk]);

    const handleRefresh = () => {
        refetchSignals();
        refetchWeather();
    };

    const handleGenerateReport = async () => {
        setAiLoading(true);
        setAiError('');
        setReportReady(true);
        try {
            const { text, model } = await callSituationAi(snapshot);
            setAiBriefing(`${text}\n\nใช้โมเดล: ${model}`);
        } catch (err) {
            setAiBriefing('');
            console.warn('[SituationRoom] AI briefing failed:', err.message);
            setAiError('ยังเรียก AI ไม่สำเร็จ ระบบแสดง action จากข้อมูลจริงให้ใช้เป็น fallback แล้ว กรุณาตรวจ GEMINI_API_KEY และสิทธิ์ใช้งานโมเดล Gemini 3/2.5 ใน Netlify');
        } finally {
            setAiLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="situation-room" ref={reportRef}>
            <div className="situation-hero">
                <div>
                    <Tag color="green">Executive Decision Support</Tag>
                    <Title level={2}>Executive Situation Room</Title>
                    <Paragraph>หน้าเดียวสำหรับผู้บริหาร: สถานการณ์รวมจังหวัด, alert วันนี้, งบประมาณ, คำขอข้อมูล และข้อเสนอแนะเชิงปฏิบัติ</Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>รีเฟรชข้อมูล</Button>
                    <Button type="primary" icon={<RobotOutlined />} loading={aiLoading} onClick={handleGenerateReport}>
                        สร้างรายงานผู้บริหาร
                    </Button>
                    {reportReady && <Button icon={<FilePdfOutlined />} onClick={handlePrint}>พิมพ์ / บันทึก PDF</Button>}
                </Space>
            </div>

            {situationLoading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <>
                    <Row gutter={[14, 14]} className="situation-kpis">
                        <Col xs={24} sm={12} xl={6}><Card><Statistic title="ข้อมูลรวมในระบบ" value={totalRecords} suffix="รายการ" prefix={<BarChartOutlined />} /></Card></Col>
                        <Col xs={24} sm={12} xl={6}><Card><Statistic title="พื้นที่เกษตร" value={agriStats.crop_area || 0} suffix="ไร่" prefix={<CloudOutlined />} /></Card></Col>
                        <Col xs={24} sm={12} xl={6}><Card><Statistic title="งบประมาณรวม" value={budget.totalBudget} formatter={value => `${money(value)} บาท`} prefix={<DollarOutlined />} /></Card></Col>
                        <Col xs={24} sm={12} xl={6}><Card><Statistic title="คำขอข้อมูลค้างติดตาม" value={pendingRequests + pendingAssignments} suffix="รายการ" prefix={<AlertOutlined />} /></Card></Col>
                    </Row>

                    <Row gutter={[16, 16]} className="situation-main-grid">
                        <Col xs={24} xl={15}>
                            <Card title="สถานการณ์รวมจังหวัด" className="situation-card">
                                <div className="province-snapshot">
                                    <div>
                                        <Text type="secondary">ครัวเรือนเกษตรกร</Text>
                                        <strong>{money(agriStats.households)} ราย</strong>
                                    </div>
                                    <div>
                                        <Text type="secondary">แปลงใหญ่</Text>
                                        <strong>{money(lpStats.total)} แปลง</strong>
                                    </div>
                                    <div>
                                        <Text type="secondary">กลุ่ม/สถาบัน</Text>
                                        <strong>{money(instituteStats.total)} กลุ่ม</strong>
                                    </div>
                                    <div>
                                        <Text type="secondary">ฝนสูงสุด 3 วัน</Text>
                                        <strong>{Number(weatherRisk.maxRainTotal || 0).toFixed(1)} มม.</strong>
                                    </div>
                                </div>
                                <div className="risk-strip">
                                    <div><CloudOutlined /> อุณหภูมิเฉลี่ย {Number(weatherRisk.avgTemp || 0).toFixed(1)}°C</div>
                                    <div><ThunderboltOutlined /> โอกาสฝนสูงสุด {weatherRisk.maxRainProbability || 0}%</div>
                                    <div><FireOutlined /> PM2.5 เฉลี่ย {Number(weatherRisk.avgPm25 || 0).toFixed(1)} µg/m³</div>
                                </div>
                            </Card>

                            <Card title="District Ranking: พื้นที่ต้องติดตามวันนี้" className="situation-card">
                                {ranking.length ? (
                                    <div className="ranking-list">
                                        {ranking.map((item, index) => (
                                            <div className="ranking-row" key={item.name}>
                                                <span className="rank-number">{index + 1}</span>
                                                <div className="rank-main">
                                                    <strong>{item.name}</strong>
                                                    <Text type="secondary">พื้นที่เกษตร {money(item.area)} ไร่ · วิสาหกิจ {money(item.ce)} · แปลงใหญ่ {money(item.lp)}</Text>
                                                </div>
                                                <Tag color={index === 0 ? 'red' : index < 3 ? 'orange' : 'blue'}>score {item.score}</Tag>
                                            </div>
                                        ))}
                                    </div>
                                ) : <Empty description="ยังไม่มีข้อมูลจัดอันดับ" />}
                            </Card>
                        </Col>

                        <Col xs={24} xl={9}>
                            <Card title="Alert สำคัญ" className="situation-card alert-card">
                                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                    {alerts.map((item) => (
                                        <Alert
                                            key={item.title}
                                            showIcon
                                            type={item.level === 'critical' ? 'error' : item.level}
                                            message={item.title}
                                            description={item.detail}
                                        />
                                    ))}
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={8}>
                            <Card title="Progress งบประมาณ" className="situation-card">
                                <Progress type="dashboard" percent={budget.progress} strokeColor="#1a7f37" />
                                <div className="budget-mini">
                                    <span>เบิกจ่ายแล้ว <strong>{money(budget.totalSpent)}</strong> บาท</span>
                                    <span>งบรวม <strong>{money(budget.totalBudget)}</strong> บาท</span>
                                </div>
                                <div className="top-projects">
                                    {budget.topProjects.slice(0, 3).map(project => (
                                        <div key={`${project.project}-${project.budget}`}>
                                            <Text ellipsis>{project.project}</Text>
                                            <strong>{money(project.budget)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={8}>
                            <Card title="Weather / PM / Rain Risk" className="situation-card">
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={weatherRisk.districts.slice(0, 7)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <ChartTooltip />
                                        <Bar dataKey="riskScore" fill="#0969da" radius={[6, 6, 0, 0]} name="risk score" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                        <Col xs={24} lg={8}>
                            <Card title="Pending Data Requests" className="situation-card">
                                <div className="request-summary">
                                    <div><strong>{pendingRequests}</strong><span>คำขอเปิดอยู่</span></div>
                                    <div><strong>{pendingAssignments}</strong><span>assignment รอส่ง</span></div>
                                </div>
                                <div className="request-list">
                                    {(signals.requests || []).slice(0, 5).map(item => (
                                        <div key={item.id}>
                                            <Text ellipsis>{item.title || 'คำขอข้อมูล'}</Text>
                                            <Tag color={item.status === 'published' ? 'green' : 'default'}>{item.status}</Tag>
                                        </div>
                                    ))}
                                    {!(signals.requests || []).length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีคำขอข้อมูลล่าสุด" />}
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                            <Card title="Recommended Actions" className="situation-card">
                                <ol className="action-list">
                                    {actions.map(action => <li key={action}>{action}</li>)}
                                </ol>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="AI Executive Briefing" className="situation-card ai-briefing-card">
                                {aiLoading && <Skeleton active paragraph={{ rows: 5 }} />}
                                {!aiLoading && aiError && <Alert type="warning" showIcon message={aiError} />}
                                {!aiLoading && aiBriefing && <div className="ai-briefing-text">{aiBriefing}</div>}
                                {!aiLoading && !aiBriefing && !aiError && (
                                    <Empty description="กดสร้างรายงานผู้บริหาร เพื่อให้ Gemini 3.5 Flash สรุป briefing จากข้อมูลหน้านี้ หากโมเดลยังไม่เปิด ระบบจะ fallback ไป Gemini 3 Flash Preview / 2.5 Flash" />
                                )}
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
}
