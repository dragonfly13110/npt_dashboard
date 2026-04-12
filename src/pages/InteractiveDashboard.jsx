import { useState, useMemo, useEffect } from 'react';
import { Select, Spin, Row, Col, Card, Tag } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area, Treemap
} from 'recharts';
import { useDashboardData, PIE_COLORS, groupConfig } from '../hooks/useDashboardData';
import { ArrowLeftOutlined, FilterOutlined, DashboardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// ── Shared Chart Styles ─────────────────────────────────────
const CARD = { borderRadius: 16, boxShadow: '0 4px 20px -8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' };
const HEAD = { borderBottom: '1px solid #f1f5f9', padding: '16px 20px', fontSize: 15, fontWeight: 700 };
const TIP  = { borderRadius: 10, border: 'none', boxShadow: '0 8px 20px -4px rgba(0,0,0,0.12)', fontSize: 13 };
const BAR_RADIUS = [4, 4, 0, 0];
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// ── Main Component ──────────────────────────────────────────
export default function InteractiveDashboard() {
    const navigate = useNavigate();
    const {
        loading, stats, districtStats, instituteStats, lpStats, agriStats,
        smartFarmers, enterprises, tourism,
        ceDistrictStats, agriPie, lpPie
    } = useDashboardData();
    const [selectedDistrict, setSelectedDistrict] = useState('ทั้งหมด');

    useEffect(() => { document.title = 'Interactive Dashboard | ศูนย์ข้อมูลการเกษตรนครปฐม'; }, []);

    const districts = ['ทั้งหมด', 'เมืองนครปฐม', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม', 'บางเลน', 'สามพราน', 'พุทธมณฑล'];

    // ── 1) Metric cards data (filter-aware) ────────────────
    const metrics = useMemo(() => {
        if (selectedDistrict === 'ทั้งหมด') {
            return [
                { title: 'ครัวเรือนเกษตรกร', value: agriStats.households || 0, unit: 'ครัวเรือน', color: '#1a7f37', icon: '👨‍🌾' },
                { title: 'พื้นที่เพาะปลูก', value: agriStats.crop_area || 0, unit: 'ไร่', color: '#2563eb', icon: '🌱' },
                { title: 'วิสาหกิจชุมชน', value: enterprises.count || 0, unit: 'แห่ง', color: '#9333ea', icon: '🤝' },
                { title: 'แปลงใหญ่', value: lpStats.total || 0, unit: 'แปลง', color: '#ea580c', icon: '🌾' },
                { title: 'Smart Farmer', value: smartFarmers.count || 0, unit: 'คน', color: '#0891b2', icon: '🧑‍💻' },
                { title: 'ท่องเที่ยวเกษตร', value: tourism.count || 0, unit: 'แห่ง', color: '#d946ef', icon: '🏕️' },
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
        ];
    }, [selectedDistrict, districtStats, agriStats, enterprises, lpStats, smartFarmers, tourism]);

    // ── 2) District comparison — groups & infrastructure ───
    const districtGroupBar = useMemo(() => {
        return Object.keys(districtStats).map(d => ({
            name: d.replace('นครปฐม', 'นฐ.'),
            วิสาหกิจ: districtStats[d].ce || 0,
            แปลงใหญ่: districtStats[d].lp || 0,
            'ศพก.': districtStats[d].lc || 0,
            'ศจช.': districtStats[d].pc || 0,
            'ศดปช.': districtStats[d].sfc || 0,
        }));
    }, [districtStats]);

    // ── 3) Rice production stacked bar ─────────────────────
    const riceBar = useMemo(() => {
        return Object.keys(districtStats).map(d => ({
            name: d.replace('นครปฐม', 'นฐ.'),
            'ข้าวนาปี': districtStats[d].ricePi || 0,
            'ข้าวนาปรัง': districtStats[d].ricePrung || 0,
        }));
    }, [districtStats]);

    // ── 4) Crop area stacked bar per district ──────────────
    const cropDistrictBar = useMemo(() => {
        return Object.keys(districtStats).map(d => ({
            name: d.replace('นครปฐม', 'นฐ.'),
            'พืชไร่': districtStats[d].field || 0,
            'ไม้ผล': districtStats[d].fruit || 0,
            'พืชผัก': districtStats[d].veg || 0,
            'ไม้ดอก': districtStats[d].flow || 0,
            'สมุนไพร': districtStats[d].herb || 0,
        }));
    }, [districtStats]);

    // ── 5) LP pie ──────────────────────────────────────────
    // already have lpPie from hook

    // ── 6) Farmer institute breakdown ──────────────────────
    const instituteBar = useMemo(() => {
        return [
            { name: 'กลุ่มแม่บ้าน', value: instituteStats.housewives || 0 },
            { name: 'เกษตรกรรุ่นใหม่', value: instituteStats.young_grp || 0 },
            { name: 'ส่งเสริมอาชีพ', value: instituteStats.career || 0 },
            { name: 'อสม.', value: instituteStats.village || 0 },
            { name: 'วิสาหกิจ', value: instituteStats.ce || 0 },
        ].filter(d => d.value > 0);
    }, [instituteStats]);

    // ── 7) Radar chart per district (normalized) ───────────
    const radarData = useMemo(() => {
        if (selectedDistrict === 'ทั้งหมด') return [];
        const s = districtStats[selectedDistrict] || {};
        return [
            { subject: 'ครัวเรือน', A: s.house || 0 },
            { subject: 'วิสาหกิจ', A: (s.ce || 0) * 100 },
            { subject: 'แปลงใหญ่', A: (s.lp || 0) * 100 },
            { subject: 'ศพก.', A: (s.lc || 0) * 200 },
            { subject: 'ศจช.', A: (s.pc || 0) * 200 },
            { subject: 'พื้นที่เพาะปลูก', A: s.area || 0 },
        ];
    }, [selectedDistrict, districtStats]);

    // ── 8) District households area chart ──────────────────
    const householdsArea = useMemo(() => {
        return Object.keys(districtStats).map(d => ({
            name: d.replace('นครปฐม', 'นฐ.'),
            ครัวเรือน: districtStats[d].house || 0,
            พื้นที่: districtStats[d].area || 0,
        }));
    }, [districtStats]);

    // ── 9) CE district distribution ────────────────────────
    const ceDistBar = useMemo(() => {
        return Object.entries(ceDistrictStats)
            .map(([name, value]) => ({ name: name.replace('นครปฐม', 'นฐ.'), จำนวน: value }))
            .sort((a, b) => b.จำนวน - a.จำนวน);
    }, [ceDistrictStats]);

    // ── 10) Treemap data from stats (table counts) ─────────
    const treemapData = useMemo(() => {
        if (!stats.length) return [];
        return groupConfig.map(g => ({
            name: g.group,
            children: g.tables.map(t => {
                const found = stats.find(s => s.table === t.table);
                return { name: t.label, size: found?.count || 0 };
            }).filter(c => c.size > 0)
        })).filter(g => g.children.length > 0);
    }, [stats]);

    // ── 11) Flat treemap for Recharts (needs flat array) ───
    const flatTreemap = useMemo(() => {
        return treemapData.flatMap(g =>
            g.children.map(c => ({ name: `${c.name}`, size: c.size, group: g.name }))
        );
    }, [treemapData]);

    // ── Loading ────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', gap: 16 }}>
                <Spin size="large" />
                <span style={{ color: '#64748b', fontSize: 15 }}>กำลังโหลดข้อมูล Interactive Dashboard...</span>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter','IBM Plex Sans Thai',sans-serif" }}>
            {/* ═══ Top Bar ═══ */}
            <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#ffffff', backdropFilter: 'blur(10px)' }}>
                        <ArrowLeftOutlined /> กลับหน้าหลัก
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <DashboardOutlined /> Interactive Dashboard
                        </h1>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>ภาพรวมข้อมูลการเกษตรจังหวัดนครปฐม — กรองตามอำเภอได้</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                    <FilterOutlined style={{ color: '#6ee7b7', fontSize: 16 }} />
                    <span style={{ fontWeight: 600, color: '#d1fae5', fontSize: 13 }}>อำเภอ:</span>
                    <Select
                        value={selectedDistrict}
                        onChange={setSelectedDistrict}
                        style={{ width: 200 }}
                        options={districts.map(d => ({ label: d, value: d }))}
                        size="middle"
                    />
                </div>
            </div>

            <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
                {/* ═══ Row 1: Metric Cards (6 cards) ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {metrics.map(m => (
                        <Col xs={12} sm={8} lg={4} key={m.title}>
                            <MetricCard {...m} />
                        </Col>
                    ))}
                </Row>

                {/* ═══ Row 2: District Groups + Crop Pie ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={15}>
                        <ChartCard title="📊 เปรียบเทียบรายอำเภอ — กลุ่มเกษตรกร & โครงสร้างพื้นฐาน">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={districtGroupBar} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={TIP} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="วิสาหกิจ" fill="#8b5cf6" radius={BAR_RADIUS} maxBarSize={28} />
                                    <Bar dataKey="แปลงใหญ่" fill="#f97316" radius={BAR_RADIUS} maxBarSize={28} />
                                    <Bar dataKey="ศพก." fill="#10b981" radius={BAR_RADIUS} maxBarSize={28} />
                                    <Bar dataKey="ศจช." fill="#06b6d4" radius={BAR_RADIUS} maxBarSize={28} />
                                    <Bar dataKey="ศดปช." fill="#f43f5e" radius={BAR_RADIUS} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={9}>
                        <ChartCard title="🌾 สัดส่วนพื้นที่เพาะปลูก (ทั้งจังหวัด)">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={agriPie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value">
                                        {agriPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                                    </Pie>
                                    <Tooltip formatter={v => `${Number(v).toLocaleString()} ไร่`} contentStyle={TIP} />
                                </PieChart>
                            </ResponsiveContainer>
                            <PieLegend data={agriPie} />
                        </ChartCard>
                    </Col>
                </Row>

                {/* ═══ Row 3: Rice + Crop breakdown ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={12}>
                        <ChartCard title="🍚 ผลผลิตข้าว — นาปี vs นาปรัง รายอำเภอ">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={riceBar} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                                    <Tooltip contentStyle={TIP} formatter={v => `${Number(v).toLocaleString()} ไร่`} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="ข้าวนาปี" stackId="rice" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="ข้าวนาปรัง" stackId="rice" fill="#86efac" radius={BAR_RADIUS} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={12}>
                        <ChartCard title="🌿 พืชอื่นๆ รายอำเภอ">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={cropDistrictBar} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                                    <Tooltip contentStyle={TIP} formatter={v => `${Number(v).toLocaleString()} ไร่`} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="พืชไร่" stackId="crop" fill="#f59e0b" maxBarSize={40} />
                                    <Bar dataKey="ไม้ผล" stackId="crop" fill="#ef4444" maxBarSize={40} />
                                    <Bar dataKey="พืชผัก" stackId="crop" fill="#22c55e" maxBarSize={40} />
                                    <Bar dataKey="ไม้ดอก" stackId="crop" fill="#ec4899" maxBarSize={40} />
                                    <Bar dataKey="สมุนไพร" stackId="crop" fill="#14b8a6" radius={BAR_RADIUS} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                </Row>

                {/* ═══ Row 4: LP Pie + Institute Bar + CE Dist ═══ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <ChartCard title="🌾 แปลงใหญ่ — ประเภทสินค้า">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={lpPie} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value">
                                        {lpPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                                    </Pie>
                                    <Tooltip contentStyle={TIP} formatter={v => `${v} แปลง`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <PieLegend data={lpPie} />
                            <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
                                สมาชิกรวม {(lpStats.members || 0).toLocaleString()} ราย · พื้นที่ {(lpStats.area || 0).toLocaleString()} ไร่
                            </div>
                        </ChartCard>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <ChartCard title="👥 สถาบันเกษตรกร — ประเภทกลุ่ม">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={instituteBar} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                                    <Tooltip contentStyle={TIP} formatter={v => `${v} กลุ่ม`} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={24} name="จำนวน">
                                        {instituteBar.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                รวม {(instituteStats.total || 0).toLocaleString()} กลุ่ม · SF {(instituteStats.sf || 0).toLocaleString()} คน · YSF {(instituteStats.ysf || 0).toLocaleString()} คน
                            </div>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={8}>
                        <ChartCard title="🤝 วิสาหกิจชุมชน — แยกตามอำเภอ">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={ceDistBar} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip contentStyle={TIP} formatter={v => `${v} แห่ง`} />
                                    <Bar dataKey="จำนวน" fill="#a855f7" radius={[0, 6, 6, 0]} maxBarSize={20}>
                                        {ceDistBar.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
                            <ResponsiveContainer width="100%" height={280}>
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
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                                    <Tooltip contentStyle={TIP} formatter={v => Number(v).toLocaleString()} />
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
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                                        <PolarRadiusAxis tick={false} axisLine={false} />
                                        <Radar name={selectedDistrict} dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                                        <Tooltip contentStyle={TIP} />
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
                            <ResponsiveContainer width="100%" height={280}>
                                <Treemap
                                    data={flatTreemap}
                                    dataKey="size"
                                    stroke="#fff"
                                    content={<CustomTreemapContent />}
                                />
                            </ResponsiveContainer>
                        </ChartCard>
                    </Col>
                    <Col xs={24} lg={10}>
                        <ChartCard title="📋 สรุปจำนวนข้อมูลทั้งหมดในระบบ">
                            <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                                {groupConfig.map(g => (
                                    <div key={g.group} style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: g.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span>{g.icon}</span> {g.group}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {g.tables.map(t => {
                                                const found = stats.find(s => s.table === t.table);
                                                return (
                                                    <Tag key={t.table} style={{ borderRadius: 8, fontSize: 12, padding: '2px 10px' }}>
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
                <div style={{ textAlign: 'center', padding: '24px 0 16px', color: '#94a3b8', fontSize: 12 }}>
                    ข้อมูลจากระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม · อัปเดตตามข้อมูลจริงในระบบ
                </div>
            </div>
        </div>
    );
}

// ── Sub-Components ──────────────────────────────────────────

function MetricCard({ title, value, unit, color, icon }) {
    return (
        <div style={{
            background: '#fff', padding: '16px 18px', borderRadius: 14,
            boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)', borderTop: `3px solid ${color}`,
            position: 'relative', overflow: 'hidden', height: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ color: '#64748b', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{title}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{Number(value).toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 12 }}>{unit}</span>
                    </div>
                </div>
                <span style={{ fontSize: 26, opacity: 0.8 }}>{icon}</span>
            </div>
            <div style={{ position: 'absolute', right: -15, bottom: -15, width: 70, height: 70, borderRadius: '50%', background: color, opacity: 0.06 }} />
        </div>
    );
}

function ChartCard({ title, children }) {
    return (
        <Card bordered={false} style={CARD} styles={{ header: HEAD, body: { padding: '12px 16px 16px' } }} title={title}>
            {children}
        </Card>
    );
}

function PieLegend({ data }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', padding: '4px 8px' }}>
            {data.map((entry, i) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    {entry.name}
                </div>
            ))}
        </div>
    );
}

// Custom Treemap cell renderer
const TREEMAP_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];
function CustomTreemapContent({ x, y, width, height, name, size, index }) {
    if (width < 30 || height < 20) return null;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} rx={6} fill={TREEMAP_COLORS[index % TREEMAP_COLORS.length]} fillOpacity={0.85} stroke="#fff" strokeWidth={2} />
            {width > 50 && height > 30 && (
                <>
                    <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{name}</text>
                    <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>{(size || 0).toLocaleString()}</text>
                </>
            )}
        </g>
    );
}
