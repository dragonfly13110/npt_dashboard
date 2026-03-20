import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4'];

const PLOT_TYPE_COLORS = {
    'พื้นที่เสี่ยง': '#cf222e',
    'ศจช.': '#0969da',
    'พื้นที่เฝ้าระวัง': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const PC_GRADE_COLORS = {
    'A': '#1a7f37',
    'B': '#0969da',
    'C': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const SF_GRADE_COLORS = {
    'A+': '#055160',
    'A': '#1a7f37',
    'B': '#0969da',
    'C': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const CustomTooltip = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value} {unit}
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} {unit}
                </div>
            </div>
        );
    }
    return null;
};

export default function ProtectionDashboard() {
    const [pestOutbreaks, setPestOutbreaks] = useState([]);
    const [pestCenters, setPestCenters] = useState([]);
    const [soilFertilizer, setSoilFertilizer] = useState([]);
    const [fireHotspots, setFireHotspots] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [po, pc, sf, fh] = await Promise.all([
                supabase.from('forecast_plots').select('*'),
                supabase.from('pest_centers').select('*'),
                supabase.from('soil_fertilizer_centers').select('*'),
                supabase.from('fire_hotspots').select('*'),
            ]);
            setPestOutbreaks(po.data || []);
            setPestCenters(pc.data || []);
            setSoilFertilizer(sf.data || []);
            setFireHotspots(fh.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ============================================
    // Pest Outbreaks Charts (Forecast Plots)
    // ============================================
    const poPie = useMemo(() => {
        const counts = {};
        pestOutbreaks.forEach((item) => {
            const crop = item.crop_type || 'ไม่ระบุ';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [pestOutbreaks]);

    const { poBar, poTypes } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();
        pestOutbreaks.forEach((item) => {
            const dist = item.district || 'ไม่ระบุ';
            const type = item.plot_type || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][type] = (counts[dist][type] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(type);
        });
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            const order = { 'พื้นที่เสี่ยง': 1, 'ศจช.': 2, 'พื้นที่เฝ้าระวัง': 3, 'ไม่ระบุ': 4 };
            return (order[a] || 9) - (order[b] || 9);
        });
        return { poBar: sortedBarData, poTypes: sortedTypes };
    }, [pestOutbreaks]);

    // ============================================
    // Pest Centers Charts 
    // ============================================
    const pcPie = useMemo(() => {
        const counts = {};
        pestCenters.forEach((item) => {
            const crop = item.main_crop_type || 'ไม่ระบุ';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [pestCenters]);

    const { pcBar, pcTypes } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();
        pestCenters.forEach((item) => {
            const dist = item.district || 'ไม่ระบุ';
            const grade = item.grade_level || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][grade] = (counts[dist][grade] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(grade);
        });
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            const order = { 'A': 1, 'B': 2, 'C': 3, 'ไม่ระบุ': 4 };
            return (order[a] || 9) - (order[b] || 9);
        });
        return { pcBar: sortedBarData, pcTypes: sortedTypes };
    }, [pestCenters]);

    // ============================================
    // Soil Fertilizer Centers Charts
    // ============================================
    const sfPie = useMemo(() => {
        const counts = {};
        soilFertilizer.forEach((item) => {
            const crop = item.main_crop_type || 'ไม่ระบุ';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [soilFertilizer]);

    const { sfBar, sfTypes } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();
        soilFertilizer.forEach((item) => {
            const dist = item.district || 'ไม่ระบุ';
            const grade = item.grade_level || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][grade] = (counts[dist][grade] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(grade);
        });
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            const order = { 'A+': 1, 'A': 2, 'B': 3, 'C': 4, 'ไม่ระบุ': 5 };
            return (order[a] || 9) - (order[b] || 9);
        });
        return { sfBar: sortedBarData, sfTypes: sortedTypes };
    }, [soilFertilizer]);

    // ============================================
    // Fire Hotspots Charts
    // ============================================
    const firePie = useMemo(() => {
        const map = {};
        fireHotspots.forEach((f) => {
            const d = f.district || f.subdistrict || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [fireHotspots]);

    // ============================================
    // Summary Stats for Bento Cards
    // ============================================
    const poStats = useMemo(() => {
        const typeMap = {};
        pestOutbreaks.forEach((item) => {
            const t = item.plot_type || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const getVal = (key) => typeMap[key] || 0;
        return { 
            total: pestOutbreaks.length, 
            risk: getVal('พื้นที่เสี่ยง'), 
            pc: getVal('ศจช.'), 
            watch: getVal('พื้นที่เฝ้าระวัง') 
        };
    }, [pestOutbreaks]);

    const pcStats = useMemo(() => {
        const gradeMap = {};
        pestCenters.forEach((item) => {
            const g = item.grade_level || 'ไม่ระบุ';
            gradeMap[g] = (gradeMap[g] || 0) + 1;
        });
        const getVal = (key) => gradeMap[key] || 0;
        return { 
            total: pestCenters.length, 
            a: getVal('A'), 
            b: getVal('B'), 
            c: getVal('C') 
        };
    }, [pestCenters]);

    const sfStats = useMemo(() => {
        const gradeMap = {};
        soilFertilizer.forEach((item) => {
            const g = item.grade_level || 'ไม่ระบุ';
            gradeMap[g] = (gradeMap[g] || 0) + 1;
        });
        const getVal = (key) => gradeMap[key] || 0;
        return { 
            total: soilFertilizer.length, 
            aplus: getVal('A+'), 
            a: getVal('A'), 
            b: getVal('B'), 
            c: getVal('C') 
        };
    }, [soilFertilizer]);


    return (
        <div>
            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <PieChartOutlined style={{ fontSize: 22, color: '#1a7f37' }} />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>🛡️ อารักขาพืช</h2>
                </div>
                <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>ภาพรวมข้อมูลแปลงพยากรณ์, ศจช., ศดปช. และจุดเฝ้าระวัง PM2.5</p>
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    {/* Bento Summary Cards */}
                    <section className="bento-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', display: 'grid', gap: '24px', marginBottom: '32px', gridTemplateAreas: 'none' }}>
                        
                        {/* 1. Pest Outbreaks (Forecast Plots) */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🌿 แปลงพยากรณ์</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {poStats.total} แปลง
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ประเภทแปลง (แปลง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                                            <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>พื้นที่เสี่ยง</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>{poStats.risk}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>ศจช.</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{poStats.pc}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                            <span style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>พื้นที่เฝ้าระวัง</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{poStats.watch}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Pest Centers (ศจช.) */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🏥 ศูนย์จัดการศัตรูพืชชุมชน (ศจช.)</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {pcStats.total} ศูนย์
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ระดับการประเมินศักยภาพ (ศูนย์)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce3' }}>
                                            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>ระดับ A</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>{pcStats.a}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>ระดับ B</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{pcStats.b}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                            <span style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>ระดับ C</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{pcStats.c}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Soil Fertilizer Centers (ศดปช.) */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🧪 ศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.)</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {sfStats.total} ศูนย์
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ระดับการประเมินศักยภาพ (ศูนย์)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ecfeff', borderRadius: '8px', border: '1px solid #cffafe' }}>
                                            <span style={{ fontSize: 13, color: '#0e7490', fontWeight: 600 }}>ระดับ A+</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#155e75' }}>{sfStats.aplus}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce3' }}>
                                            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>ระดับ A</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>{sfStats.a}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>ระดับ B</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{sfStats.b}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                            <span style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>ระดับ C</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{sfStats.c}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                    <Row gutter={[20, 20]}>

                        {/* --- Pest Outbreaks (Forecast Plots) --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🌿 แปลงพยากรณ์ตามชนิดพืช" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {poPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={poPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {poPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val + ' แปลง', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="แปลงพยากรณ์" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🌿 แปลงพยากรณ์รวมแยกอำเภอ (แยกประเภทแปลง)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {poBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={poBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomTooltip unit="แปลง" />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {poTypes.map((type) => (
                                                    <Bar key={type} dataKey={type} name={type} stackId="a" fill={PLOT_TYPE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="แปลงพยากรณ์" />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Pest Centers --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🏥 ศจช. ตามชนิดพืชหลัก" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {pcPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pcPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {pcPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val + ' ศูนย์', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศจช." />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🏥 ศจช. แยกอำเภอ (ระดับชั้น)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {pcBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={pcBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomTooltip unit="ศูนย์" />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {pcTypes.map((type) => (
                                                    <Bar key={type} dataKey={type} name={`ระดับ ${type}`} stackId="a" fill={PC_GRADE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศจช." />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Soil Fertilizer Centers --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🧪 ศดปช. ตามชนิดพืชหลัก" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {sfPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={sfPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {sfPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val + ' ศูนย์', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศดปช." />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🧪 ศดปช. แยกอำเภอ (ระดับชั้น)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {sfBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sfBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomTooltip unit="ศูนย์" />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {sfTypes.map((type) => (
                                                    <Bar key={type} dataKey={type} name={`ระดับ ${type}`} stackId="a" fill={SF_GRADE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศดปช." />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Fire Hotspots Pie --- */}
                        {firePie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="🔥 จุดเฝ้าระวัง PM2.5 แยกตามพื้นที่" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 340 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={firePie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {firePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val + ' จุด', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </>
            )}
        </div>
    );
}

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}
