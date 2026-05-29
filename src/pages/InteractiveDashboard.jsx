import React, { useState, useMemo, useEffect } from 'react';
import { Select, Spin, Row, Col, Card, Tag, Result, Button } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area, Treemap
} from 'recharts';
import { useDashboardData, PIE_COLORS, groupConfig, DISTRICT_LIST } from '../hooks/useDashboardData';
import { 
    ArrowLeftOutlined, FilterOutlined, DashboardOutlined, PrinterOutlined, ReloadOutlined,
    BugOutlined, AlertOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './InteractiveDashboard.css';

// ── Shared Chart Constants ─────────────────────────────────────
const CARD = { borderRadius: 16, boxShadow: '0 4px 20px -8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' };
const HEAD = { borderBottom: '1px solid #f1f5f9', padding: '16px 20px', fontSize: 15, fontWeight: 700 };
const TIP  = { borderRadius: 10, border: 'none', boxShadow: '0 8px 20px -4px rgba(0,0,0,0.12)', fontSize: 13 };
const BAR_RADIUS = [4, 4, 0, 0];
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const TREEMAP_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

const formatK = (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v;

// ── Custom Tooltips ─────────────────────────────────────────
const TreemapTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', padding: '10px', ...TIP }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.name}</p>
                <p style={{ margin: 0, color: '#0f172a' }}>{`${payload[0].value.toLocaleString()} รายการ`}</p>
            </div>
        );
    }
    return null;
};

const RadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ background: '#fff', padding: '10px', ...TIP }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{data.subject}</p>
                <p style={{ margin: 0, color: '#10b981', fontWeight: 600 }}>
                    {`${Number(data.actual).toLocaleString()} ${data.unit}`}
                </p>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    (เทียบกับค่าสูงสุด: {data.pct.toFixed(0)}%)
                </div>
            </div>
        );
    }
    return null;
};

const getUnit = (name) => {
    if (!name) return '';
    if (name.includes('ข้าว') || name.includes('พืช') || name.includes('ไม้') || name.includes('สมุนไพร') || name.includes('พื้นที่') || name.includes('แปลงใหญ่สมาชิก') || name.includes('พื้นที่เพาะปลูก')) return ' ไร่';
    if (name.includes('วิสาหกิจ') || name.includes('ศพก') || name.includes('ศจช') || name.includes('ศดปช') || name.includes('แห่ง') || name.includes('ศูนย์') || name.includes('จุด')) return ' แห่ง';
    if (name.includes('แปลง')) return ' แปลง';
    if (name.includes('ครัวเรือน')) return ' ครัวเรือน';
    if (name.includes('กลุ่ม') || name.includes('สมาชิก')) return ' กลุ่ม';
    if (name === 'จำนวน') return ' แห่ง';
    return '';
};

const formatLabel = (lbl) => {
    if (!lbl) return '';
    if (typeof lbl === 'string') {
        if (lbl.startsWith('นฐ.')) return `อ.${lbl.replace('นฐ.', '')}`;
        if (!lbl.startsWith('อ.')) return lbl;
    }
    return lbl;
};

const BarTooltip = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', padding: '12px', ...TIP }}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: '#1e293b' }}>{formatLabel(label)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {payload.map((item, idx) => {
                        const finalUnit = unit || getUnit(item.name || item.dataKey);
                        return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px' }}>
                                <span style={{ color: '#64748b' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.color, marginRight: '6px' }} />
                                    {item.name}:
                                </span>
                                <strong style={{ color: '#0f172a' }}>{Number(item.value).toLocaleString()}{finalUnit}</strong>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

const AreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', padding: '12px', ...TIP }}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: '#1e293b' }}>{formatLabel(label)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {payload.map((item, idx) => {
                        const unit = item.name === 'ครัวเรือน' ? 'ครัวเรือน' : 'ไร่';
                        return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px' }}>
                                <span style={{ color: '#64748b' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.color, marginRight: '6px' }} />
                                    {item.name}:
                                </span>
                                <strong style={{ color: '#0f172a' }}>{Number(item.value).toLocaleString()} {unit}</strong>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

const PieTooltip = ({ active, payload, unit }) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div style={{ background: '#fff', padding: '10px 12px', ...TIP }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.payload.fill || item.color, marginRight: '6px' }} />
                    <span style={{ color: '#64748b', fontWeight: 500 }}>{item.name}:</span>
                    <strong style={{ color: '#0f172a' }}>
                        {Number(item.value).toLocaleString()} {unit || ''}
                    </strong>
                </div>
            </div>
        );
    }
    return null;
};

// ── Sub-Components (Memoized) ──────────────────────────────────────────
const MetricCard = React.memo(function MetricCard({ title, value, unit, color, icon, link, isWarning }) {
    const navigate = useNavigate();
    const handleClick = () => {
        if (link) navigate(link);
    };
    return (
        <div 
            className={`metric-card ${link ? 'clickable-metric-card' : ''} ${isWarning ? 'warning-metric-card' : ''}`} 
            style={{ borderTop: `3px solid ${color}`, cursor: link ? 'pointer' : 'default' }}
            onClick={handleClick}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div className="metric-title">{title}</div>
                    <div className="metric-value-container">
                        <span className="metric-value">{Number(value).toLocaleString()}</span>
                        <span className="metric-unit">{unit}</span>
                    </div>
                </div>
                <span className="metric-icon" role="img" aria-label={title}>{icon}</span>
            </div>
            <div className="metric-bg-circle" style={{ background: color }} />
        </div>
    );
});

const ChartCard = React.memo(function ChartCard({ title, children }) {
    return (
        <Card bordered={false} style={CARD} styles={{ header: HEAD, body: { padding: '12px 16px 16px' } }} title={title}>
            {children}
        </Card>
    );
});

const PieLegend = React.memo(function PieLegend({ data, colors }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', padding: '4px 8px' }}>
            {data.map((entry, i) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[i % colors.length], flexShrink: 0 }} />
                    {entry.name}
                </div>
            ))}
        </div>
    );
});

const CustomTreemapContent = React.memo(function CustomTreemapContent({ x, y, width, height, name, size, index }) {
    if (width < 20 || height < 15) return null;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} rx={4} fill={TREEMAP_COLORS[index % TREEMAP_COLORS.length]} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
            {width > 60 && height > 35 && (
                <>
                    <text x={x + width / 2} y={y + height / 2 - 4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{name}</text>
                    <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={10}>{(size || 0).toLocaleString()}</text>
                </>
            )}
        </g>
    );
});

// ── Main Component ──────────────────────────────────────────
export default function InteractiveDashboard() {
    const navigate = useNavigate();
    const {
        loading, error, refetch, stats, districtStats, instituteStats, lpStats, agriStats,
        smartFarmers, enterprises, tourism,
        ceDistrictStats, agriPie, lpPie
    } = useDashboardData();
    const [selectedDistrict, setSelectedDistrict] = useState('ทั้งหมด');
    const [latestForecast, setLatestForecast] = useState(null);

    useEffect(() => {
        document.title = 'Interactive Dashboard | ศูนย์ข้อมูลการเกษตรนครปฐม';
        
        const fetchLatestForecast = async () => {
            try {
                const { data, error } = await supabase
                    .from('ai_disease_forecasts')
                    .select('*')
                    .order('forecast_date', { ascending: false })
                    .limit(1);
                if (error) throw error;
                if (data && data.length > 0) {
                    setLatestForecast(data[0]);
                }
            } catch (err) {
                console.error('Error fetching latest forecast for dashboard:', err.message);
            }
        };

        fetchLatestForecast();
    }, []);

    const districts = ['ทั้งหมด', ...DISTRICT_LIST];

    const getGlobalStat = (table) => stats?.find(s => s.table === table)?.count || 0;

    // ── Metric cards data ──────────────────────────────────
    const metrics = useMemo(() => {
        const warningCount = latestForecast?.details?.filter(d => d.risk_level === 'สูง').length || 0;
        const totalDiseases = latestForecast?.details?.length || 0;

        const aiWarningCard = {
            title: 'เฝ้าระวังโรค/แมลง (AI)',
            value: totalDiseases,
            unit: 'ชนิด',
            color: warningCount > 0 ? '#ef4444' : '#ea580c',
            icon: '🐛',
            link: '/dashboard/protection/disease-forecast',
            isWarning: warningCount > 0
        };

        if (selectedDistrict === 'ทั้งหมด') {
            return [
                { title: 'ครัวเรือนเกษตรกร', value: agriStats.households || 0, unit: 'ครัวเรือน', color: '#1a7f37', icon: '👨‍🌾' },
                { title: 'พื้นที่เพาะปลูก', value: agriStats.crop_area || 0, unit: 'ไร่', color: '#2563eb', icon: '🌱' },
                { title: 'วิสาหกิจชุมชน', value: enterprises.count || 0, unit: 'แห่ง', color: '#9333ea', icon: '🤝' },
                { title: 'แปลงใหญ่', value: lpStats.total || 0, unit: 'แปลง', color: '#ea580c', icon: '🌾' },
                { title: 'ศูนย์เรียนรู้ (ศพก.)', value: getGlobalStat('learning_centers'), unit: 'แห่ง', color: '#0891b2', icon: '📚' },
                { title: 'จุดเฝ้าระวัง', value: getGlobalStat('soil_fertilizer_centers'), unit: 'แห่ง', color: '#d946ef', icon: '🛡️' },
                aiWarningCard
            ];
        }
        const s = districtStats[selectedDistrict] || {};
        return [
            { title: 'ครัวเรือนเกษตรกร', value: s.house || 0, unit: 'ครัวเรือน', color: '#1a7f37', icon: '👨‍🌾' },
            { title: 'พื้นที่เพาะปลูก', value: s.area || 0, unit: 'ไร่', color: '#2563eb', icon: '🌱' },
            { title: 'วิสาหกิจชุมชน', value: s.ce || 0, unit: 'แห่ง', color: '#9333ea', icon: '🤝' },
            { title: 'แปลงใหญ่', value: s.lp || 0, unit: 'แปลง', color: '#ea580c', icon: '🌾' },
            { title: 'ศูนย์เรียนรู้ (ศพก.)', value: s.lc || 0, unit: 'แห่ง', color: '#0891b2', icon: '📚' },
            { title: 'จุดเฝ้าระวัง', value: s.sfc || 0, unit: 'แห่ง', color: '#d946ef', icon: '🛡️' },
            aiWarningCard
        ];
    }, [selectedDistrict, districtStats, agriStats, enterprises, lpStats, stats, latestForecast]);

    // ── Update Agri Pie to respect filters ────────────────
    const displayAgriPie = useMemo(() => {
        if (selectedDistrict === 'ทั้งหมด') return agriPie;
        const s = districtStats[selectedDistrict] || {};
        return [
            { name: 'ข้าวนาปี', value: s.ricePi || 0 },
            { name: 'ข้าวนาปรัง', value: s.ricePrung || 0 },
            { name: 'พืชไร่', value: s.field || 0 },
            { name: 'ไม้ผล', value: s.fruit || 0 },
            { name: 'พืชผัก', value: s.veg || 0 },
            { name: 'ไม้ดอก', value: s.flow || 0 },
            { name: 'สมุนไพร', value: s.herb || 0 },
        ].filter(d => d.value > 0);
    }, [selectedDistrict, agriPie, districtStats]);

    // ── District bar charts ────────────────────────────────
    const districtGroupBar = useMemo(() => DISTRICT_LIST.map(d => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        วิสาหกิจ: districtStats[d]?.ce || 0,
        แปลงใหญ่: districtStats[d]?.lp || 0,
        'ศพก.': districtStats[d]?.lc || 0,
        'ศจช.': districtStats[d]?.pc || 0,
        'ศดปช.': districtStats[d]?.sfc || 0,
    })), [districtStats]);

    const riceBar = useMemo(() => DISTRICT_LIST.map(d => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        'ข้าวนาปี': districtStats[d]?.ricePi || 0,
        'ข้าวนาปรัง': districtStats[d]?.ricePrung || 0,
    })), [districtStats]);

    const cropDistrictBar = useMemo(() => DISTRICT_LIST.map(d => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        'พืชไร่': districtStats[d]?.field || 0,
        'ไม้ผล': districtStats[d]?.fruit || 0,
        'พืชผัก': districtStats[d]?.veg || 0,
        'ไม้ดอก': districtStats[d]?.flow || 0,
        'สมุนไพร': districtStats[d]?.herb || 0,
    })), [districtStats]);

    // ── Farmer institute breakdown ────────────────────────
    const instituteBar = useMemo(() => [
        { name: 'กลุ่มแม่บ้าน', value: instituteStats.housewives || 0 },
        { name: 'เกษตรกรรุ่นใหม่', value: instituteStats.young_grp || 0 },
        { name: 'ส่งเสริมอาชีพ', value: instituteStats.career || 0 },
        { name: 'อสม.', value: instituteStats.village || 0 },
        { name: 'วิสาหกิจ', value: instituteStats.ce || 0 },
    ].filter(d => d.value > 0), [instituteStats]);

    // ── Radar chart per district (normalized) ─────────────
    const radarData = useMemo(() => {
        if (selectedDistrict === 'ทั้งหมด') return [];
        const s = districtStats[selectedDistrict] || {};
        
        const maxVals = DISTRICT_LIST.reduce((acc, d) => {
            const dist = districtStats[d] || {};
            return {
                house: Math.max(acc.house, dist.house || 0),
                ce: Math.max(acc.ce, dist.ce || 0),
                lp: Math.max(acc.lp, dist.lp || 0),
                lc: Math.max(acc.lc, dist.lc || 0),
                pc: Math.max(acc.pc, dist.pc || 0),
                area: Math.max(acc.area, dist.area || 0)
            };
        }, { house: 1, ce: 1, lp: 1, lc: 1, pc: 1, area: 1 });

        return [
            { subject: 'ครัวเรือน', pct: (s.house || 0) / maxVals.house * 100, actual: s.house || 0, unit: 'ครัวเรือน' },
            { subject: 'วิสาหกิจ', pct: (s.ce || 0) / maxVals.ce * 100, actual: s.ce || 0, unit: 'แห่ง' },
            { subject: 'แปลงใหญ่', pct: (s.lp || 0) / maxVals.lp * 100, actual: s.lp || 0, unit: 'แปลง' },
            { subject: 'ศพก.', pct: (s.lc || 0) / maxVals.lc * 100, actual: s.lc || 0, unit: 'แห่ง' },
            { subject: 'ศจช.', pct: (s.pc || 0) / maxVals.pc * 100, actual: s.pc || 0, unit: 'แห่ง' },
            { subject: 'พื้นที่เพาะปลูก', pct: (s.area || 0) / maxVals.area * 100, actual: s.area || 0, unit: 'ไร่' },
        ];
    }, [selectedDistrict, districtStats]);

    // ── District households area chart ──────────────────
    const householdsArea = useMemo(() => DISTRICT_LIST.map(d => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        ครัวเรือน: districtStats[d]?.house || 0,
        พื้นที่: districtStats[d]?.area || 0,
    })), [districtStats]);

    // ── CE district distribution ────────────────────────
    const ceDistBar = useMemo(() => Object.entries(ceDistrictStats || {})
        .map(([name, value]) => ({ name: name.replace('นครปฐม', 'นฐ.'), จำนวน: value }))
        .sort((a, b) => b.จำนวน - a.จำนวน), [ceDistrictStats]);

    // ── Treemap data ──────────────────────────────────
    const treemapData = useMemo(() => {
        if (!stats || !stats.length) return [];
        return groupConfig.map(g => ({
            name: g.group,
            children: g.tables.map(t => {
                const found = stats.find(s => s.table === t.table);
                return { name: t.label, size: found?.count || 0 };
            }).filter(c => c.size > 0)
        })).filter(g => g.children.length > 0);
    }, [stats]);

    const flatTreemap = useMemo(() => treemapData.flatMap(g =>
        g.children.map(c => ({ name: `${c.name}`, size: c.size, group: g.name }))
    ), [treemapData]);


    // ── Helpers ────────────────────────────────────────────
    const isTargetDistrict = (name) => selectedDistrict === 'ทั้งหมด' || name === selectedDistrict.replace('นครปฐม', 'นฐ.');
    
    // Add dynamic keys to force remount/re-animate on filter change
    const animationKey = `anim-${selectedDistrict}`;

    if (loading) {
        return (
            <div className="dashboard-state-container">
                <Spin size="large" />
                <span className="state-text">กำลังโหลดข้อมูล Interactive Dashboard...</span>
            </div>
        );
    }

    if (error || !stats || stats.length === 0) {
        return (
            <div className="dashboard-state-container">
                <Result
                    status="warning"
                    title="ไม่สามารถโหลดข้อมูลได้"
                    subTitle="อาจเกิดปัญหาการเชื่อมต่อกับฐานข้อมูล กรุณาลองใหม่อีกครั้ง"
                    extra={
                        <Button type="primary" icon={<ReloadOutlined />} onClick={refetch}>
                            โหลดข้อมูลใหม่
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* ═══ Top Bar ═══ */}
            <div className="dashboard-topbar">
                <div className="topbar-left">
                    <button onClick={() => navigate('/')} className="dashboard-back-btn" aria-label="กลับหน้าหลัก">
                        <ArrowLeftOutlined /> กลับหน้าหลัก
                    </button>
                    <div>
                        <h1 className="dashboard-title">
                            <DashboardOutlined /> Interactive Dashboard
                        </h1>
                        <p className="dashboard-subtitle">ภาพรวมข้อมูลการเกษตรจังหวัดนครปฐม — กรองตามอำเภอได้</p>
                    </div>
                </div>
                <div className="topbar-right">
                    <div className="filter-container">
                        <FilterOutlined style={{ color: '#6ee7b7', fontSize: 16 }} />
                        <span className="filter-label">อำเภอ:</span>
                        <Select
                            value={selectedDistrict}
                            onChange={setSelectedDistrict}
                            style={{ width: 200 }}
                            options={districts.map(d => ({ label: d, value: d }))}
                            size="middle"
                            aria-label="เลือกอำเภอ"
                        />
                    </div>
                    <button onClick={() => window.print()} className="dashboard-export-btn" aria-label="พิมพ์รายงาน">
                        <PrinterOutlined /> พิมพ์
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                {/* ═══ Row 1: Metric Cards ═══ */}
                <div className="metrics-row" style={{ marginBottom: 24 }}>
                    {metrics.map(m => (
                        <div className="metric-col" key={`${m.title}-${animationKey}`}>
                            <MetricCard {...m} />
                        </div>
                    ))}
                </div>

                {/* ═══ Row 2: District Groups + Crop Pie ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={15}>
                        <ChartCard title="📊 เปรียบเทียบรายอำเภอ — กลุ่มเกษตรกร & โครงสร้างพื้นฐาน">
                            <ResponsiveContainer width="100%" height={300} key={animationKey}>
                                <BarChart data={districtGroupBar} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} isAnimationActive>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<BarTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="วิสาหกิจ" radius={BAR_RADIUS} maxBarSize={28}>
                                        {districtGroupBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#8b5cf6' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="แปลงใหญ่" radius={BAR_RADIUS} maxBarSize={28}>
                                        {districtGroupBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#f97316' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="ศพก." radius={BAR_RADIUS} maxBarSize={28}>
                                        {districtGroupBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#10b981' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="ศจช." radius={BAR_RADIUS} maxBarSize={28}>
                                        {districtGroupBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#06b6d4' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="ศดปช." radius={BAR_RADIUS} maxBarSize={28}>
                                        {districtGroupBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#f43f5e' : '#e2e8f0'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={9}>
                        <ChartCard title={`🌾 สัดส่วนพื้นที่เพาะปลูก (${selectedDistrict === 'ทั้งหมด' ? 'ทั้งจังหวัด' : selectedDistrict})`}>
                            <ResponsiveContainer width="100%" height={240} key={animationKey}>
                                <PieChart>
                                    <Pie data={displayAgriPie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value" role="img" aria-label="สัดส่วนพื้นที่เพาะปลูก" isAnimationActive>
                                        {displayAgriPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                                    </Pie>
                                    <Tooltip content={<PieTooltip unit="ไร่" />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <PieLegend data={displayAgriPie} colors={PIE_COLORS} />
                        </ChartCard>
                    </Col>
                </Row>

                {/* ═══ Row 3: Rice + Crop breakdown ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={12}>
                        <ChartCard title="🍚 ผลผลิตข้าว — นาปี vs นาปรัง รายอำเภอ">
                            <ResponsiveContainer width="100%" height={280} key={animationKey}>
                                <BarChart data={riceBar} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatK} />
                                    <Tooltip content={<BarTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="ข้าวนาปี" stackId="rice" radius={[0, 0, 0, 0]} maxBarSize={40}>
                                        {riceBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#16a34a' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="ข้าวนาปรัง" stackId="rice" radius={BAR_RADIUS} maxBarSize={40}>
                                        {riceBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#86efac' : '#f1f5f9'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={12}>
                        <ChartCard title="🌿 พืชอื่นๆ รายอำเภอ">
                            <ResponsiveContainer width="100%" height={280} key={animationKey}>
                                <BarChart data={cropDistrictBar} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatK} />
                                    <Tooltip content={<BarTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="พืชไร่" stackId="crop" maxBarSize={40}>
                                        {cropDistrictBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#f59e0b' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="ไม้ผล" stackId="crop" maxBarSize={40}>
                                        {cropDistrictBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#ef4444' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="พืชผัก" stackId="crop" maxBarSize={40}>
                                        {cropDistrictBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#22c55e' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="ไม้ดอก" stackId="crop" maxBarSize={40}>
                                        {cropDistrictBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#ec4899' : '#e2e8f0'} />)}
                                    </Bar>
                                    <Bar dataKey="สมุนไพร" stackId="crop" radius={BAR_RADIUS} maxBarSize={40}>
                                        {cropDistrictBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? '#14b8a6' : '#e2e8f0'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                </Row>

                {/* ═══ Row 4: LP Pie + Institute Bar + CE Dist ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <ChartCard title="🌾 แปลงใหญ่ — ประเภทสินค้า">
                            <ResponsiveContainer width="100%" height={220} key={animationKey}>
                                <PieChart>
                                    <Pie data={lpPie} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value" role="img" aria-label="แปลงใหญ่" isAnimationActive>
                                        {lpPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                                    </Pie>
                                    <Tooltip content={<PieTooltip unit="แปลง" />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <PieLegend data={lpPie} colors={CHART_COLORS} />
                            <div className="chart-footer-note">
                                สมาชิกรวม {(lpStats.members || 0).toLocaleString()} ราย · พื้นที่ {(lpStats.area || 0).toLocaleString()} ไร่
                            </div>
                        </ChartCard>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <ChartCard title="👥 สถาบันเกษตรกร — ประเภทกลุ่ม">
                            <ResponsiveContainer width="100%" height={260} key={animationKey}>
                                <BarChart data={instituteBar} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }} isAnimationActive>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                                    <Tooltip content={<BarTooltip unit=" กลุ่ม" />} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={24} name="จำนวน">
                                        {instituteBar.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="chart-footer-note">
                                รวม {(instituteStats.total || 0).toLocaleString()} กลุ่ม · SF {(instituteStats.sf || 0).toLocaleString()} คน · YSF {(instituteStats.ysf || 0).toLocaleString()} คน
                            </div>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={8}>
                        <ChartCard title="🤝 วิสาหกิจชุมชน — แยกตามอำเภอ">
                            <ResponsiveContainer width="100%" height={280} key={animationKey}>
                                <BarChart data={ceDistBar} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }} isAnimationActive>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip content={<BarTooltip unit=" แห่ง" />} />
                                    <Bar dataKey="จำนวน" fill="#a855f7" radius={[0, 6, 6, 0]} maxBarSize={20}>
                                        {ceDistBar.map((entry, index) => <Cell key={`cell-${index}`} fill={isTargetDistrict(entry.name) ? PIE_COLORS[index % PIE_COLORS.length] : '#e2e8f0'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                </Row>

                {/* ═══ Row 5: Area Chart + Radar (district) / Treemap ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={selectedDistrict !== 'ทั้งหมด' ? 14 : 24}>
                        <ChartCard title="📈 ครัวเรือนเกษตรกร & พื้นที่เพาะปลูก รายอำเภอ">
                            <ResponsiveContainer width="100%" height={280} key={animationKey}>
                                <AreaChart data={householdsArea} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradHouse" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatK} />
                                    <Tooltip content={<AreaTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Area type="monotone" dataKey="ครัวเรือน" stroke="#10b981" fill="url(#gradHouse)" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                                    <Area type="monotone" dataKey="พื้นที่" stroke="#3b82f6" fill="url(#gradArea)" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    {selectedDistrict !== 'ทั้งหมด' && (
                        <Col xs={24} lg={10}>
                            <ChartCard title={`🎯 Radar — ${selectedDistrict}`}>
                                <ResponsiveContainer width="100%" height={280} key={animationKey}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData} isAnimationActive>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name={selectedDistrict} dataKey="pct" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                                        <Tooltip content={<RadarTooltip />} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </Col>
                    )}
                </Row>

                {/* ═══ Row 6: Data Treemap + Summary Table ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={14}>
                        <ChartCard title="🗂️ ภาพรวมข้อมูลในระบบ — Treemap ตามกลุ่มงาน">
                            <ResponsiveContainer width="100%" height={280} key={animationKey}>
                                <Treemap
                                    data={flatTreemap}
                                    dataKey="size"
                                    stroke="#fff"
                                    content={<CustomTreemapContent />}
                                    isAnimationActive
                                >
                                    <Tooltip content={<TreemapTooltip />} />
                                </Treemap>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={10}>
                        <ChartCard title="📋 สรุปจำนวนข้อมูลทั้งหมดในระบบ">
                            <div className="summary-table-container">
                                {groupConfig.map(g => (
                                    <div key={g.group} style={{ marginBottom: 16 }}>
                                        <div className="summary-group-title" style={{ color: g.color }}>
                                            <span>{g.icon}</span> {g.group}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {g.tables.map(t => {
                                                const found = stats?.find(s => s.table === t.table);
                                                return (
                                                    <Tag key={t.table} className="summary-tag">
                                                        {t.label}: <strong>{(found?.count || 0).toLocaleString()}</strong>
                                                    </Tag>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>
                    </Col>
                </Row>

                {/* Footer note */}
                <div className="dashboard-footer">
                    ข้อมูลจากระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม · อัปเดตตามข้อมูลจริงในระบบ
                </div>
            </div>
        </div>
    );
}
