import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, EnvironmentOutlined, BankOutlined, ThunderboltOutlined } from '@ant-design/icons';
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

const AGRI_COLORS = ['#ffb300', '#f57c00', '#7cb342', '#43a047', '#00897b', '#039be5', '#3949ab', '#8e24aa'];
const LEARN_COLORS = ['#0288d1', '#0097a7', '#388e3c', '#afb42b', '#fbc02d', '#f57c00', '#e64a19', '#d32f2f'];

const CustomAgriBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.totalArea || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })} ไร่
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ไร่
                </div>
            </div>
        );
    }
    return null;
};

const CustomLearnBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value?.toLocaleString()} ศูนย์
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total.toLocaleString()} ศูนย์
                </div>
            </div>
        );
    }
    return null;
};

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}

export default function StrategyDashboard() {
    const [agriData, setAgriData] = useState([]);
    const [learningData, setLearningData] = useState([]);
    const [disasterData, setDisasterData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [agri, learn, disaster] = await Promise.all([
                supabase.from('agricultural_areas').select('*'),
                supabase.from('learning_centers').select('*'),
                supabase.from('disasters').select('*'),
            ]);
            setAgriData(agri.data || []);
            setLearningData(learn.data || []);
            setDisasterData(disaster.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ============================================
    // Agricultural Areas Charts
    // ============================================
    const agriPie = useMemo(() => {
        const cropFields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
        ];
        return cropFields.map((f, i) => ({
            name: f.label,
            value: agriData.reduce((sum, row) => sum + (Number(row[f.key]) || 0), 0),
            color: AGRI_COLORS[i % AGRI_COLORS.length]
        })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
    }, [agriData]);

    const { agriBar, agriCrops } = useMemo(() => {
        const distMap = {};
        const cropFields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
        ];
        agriData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!distMap[dist]) {
                distMap[dist] = { name: dist, totalArea: 0 };
            }
            cropFields.forEach(f => {
                const area = Number(item[f.key]) || 0;
                distMap[dist][f.label] = (distMap[dist][f.label] || 0) + area;
                distMap[dist].totalArea += area;
            });
        });
        const barData = Object.values(distMap).sort((a, b) => b.totalArea - a.totalArea);
        return { agriBar: barData, agriCrops: cropFields.map(f => f.label) };
    }, [agriData]);

    // ============================================
    // Learning Centers Charts 
    // ============================================
    const learnPie = useMemo(() => {
        const counts = {};
        learningData.forEach(item => {
            const crop = item.featured_product || 'ไม่ระบุ';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [learningData]);

    const { learnBar, learnTypes } = useMemo(() => {
        const distMap = {};
        const typeSet = new Set();
        learningData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const crop = item.featured_product || 'ไม่ระบุ';
            if (!distMap[dist]) distMap[dist] = { name: dist, total: 0 };
            distMap[dist][crop] = (distMap[dist][crop] || 0) + 1;
            distMap[dist].total += 1;
            typeSet.add(crop);
        });
        const barData = Object.values(distMap).sort((a, b) => b.total - a.total);
        return { learnBar: barData, learnTypes: Array.from(typeSet).sort() };
    }, [learningData]);

    // ============================================
    // Disasters Charts
    // ============================================
    const disasterPie = useMemo(() => {
        const typeMap = {};
        disasterData.forEach(item => {
            const t = item.disaster_type || item.type || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        return Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [disasterData]);

    // ============================================
    // Summary Stats for Bento Cards
    // ============================================
    const agriStats = useMemo(() => {
        let totalArea = 0;
        const cropMap = {};
        const cropFields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
        ];
        agriData.forEach(row => {
            totalArea += Number(row.total_area_rai) || 0;
            cropFields.forEach(f => {
                const area = Number(row[f.key]) || 0;
                if (area > 0) cropMap[f.label] = (cropMap[f.label] || 0) + area;
            });
        });
        const topTypes = Object.entries(cropMap).sort((a,b) => b[1] - a[1]);
        const totalPlanted = topTypes.reduce((sum, [_, val]) => sum + val, 0);
        return { totalArea, topTypes, totalPlanted };
    }, [agriData]);

    const learnStats = useMemo(() => {
        const typeMap = {};
        learningData.forEach(row => {
            const t = row.featured_product || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const topTypes = Object.entries(typeMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: learningData.length, topTypes };
    }, [learningData]);

    const disasterStats = useMemo(() => {
        const typeMap = {};
        disasterData.forEach(item => {
            const t = item.disaster_type || item.type || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const prods = Object.entries(typeMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: disasterData.length, topTypes: prods };
    }, [disasterData]);

    const totalAgriArea = agriData.reduce((sum, row) => sum + (Number(row.total_area_rai) || 0), 0);
    const totalLearning = learningData.length;
    const totalDisasters = disasterData.length;

    return (
        <div>
            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <PieChartOutlined style={{ fontSize: 22, color: '#1a7f37' }} />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>🎯 ยุทธศาสตร์และสารสนเทศ</h2>
                </div>
                <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>ภาพรวมข้อมูลพื้นที่การเกษตร, ศพก. และภัยพิบัติ</p>
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    {/* Bento Summary Cards */}
                    <section className="bento-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', display: 'grid', gap: '24px', marginBottom: '32px', gridTemplateAreas: 'none' }}>
                        
                        {/* 1. Agricultural Areas */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>📍 พื้นที่การเกษตร</h3>
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ปริมาณพื้นที่รวม (ไร่)</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ecfccb', borderRadius: '8px', border: '1px solid #d9f99d' }}>
                                        <span style={{ fontSize: 14, color: '#4d7c0f', fontWeight: 600 }}>พื้นที่รวมทั้งหมด</span>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: '#3f6212' }}>{agriStats.totalArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style={{fontSize: 12, fontWeight: 500}}>ไร่</span></span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>พื้นที่เพาะปลูกรายพืช (ไร่)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                        {agriStats.topTypes.map(([c, count], idx) => (
                                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: idx % 2 === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: '8px', border: '1px solid', borderColor: idx % 2 === 0 ? '#dcfce3' : '#e2e8f0' }}>
                                                <span style={{ fontSize: 13, color: idx % 2 === 0 ? '#166534' : '#475569', fontWeight: 600 }}>{c}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: idx % 2 === 0 ? '#15803d' : '#0f172a' }}>{count.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                        {agriStats.topTypes.length > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#eef2ff', borderRadius: '8px', border: '1px solid #e0e7ff', gridColumn: 'span 2', marginTop: 4 }}>
                                                <span style={{ fontSize: 13, color: '#4338ca', fontWeight: 700 }}>รวมพื้นที่เพาะปลูกทั้งหมด</span>
                                                <span style={{ fontSize: 15, fontWeight: 800, color: '#3730a3' }}>{agriStats.totalPlanted.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {agriStats.topTypes.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8, gridColumn: 'span 2' }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Learning Centers */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🏫 ศูนย์ ศพก. </h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {learnStats.total} ศูนย์
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>เป้าหมาย/สินค้าหลัก (แห่ง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {learnStats.topTypes.map(([c, count], idx) => (
                                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: idx % 2 === 0 ? '#eff6ff' : '#f8fafc', borderRadius: '8px', border: '1px solid', borderColor: idx % 2 === 0 ? '#dbeafe' : '#e2e8f0' }}>
                                                <span style={{ fontSize: 13, color: idx % 2 === 0 ? '#1d4ed8' : '#475569', fontWeight: 600 }}>{c}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: idx % 2 === 0 ? '#1e40af' : '#0f172a' }}>{count}</span>
                                            </div>
                                        ))}
                                        {learnStats.topTypes.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Disasters */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>⚡ ภัยพิบัติ</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {disasterStats.total} รายการ
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ประเภทภัยพิบัติ (ครั้ง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {disasterStats.topTypes.map(([c, count], idx) => (
                                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: idx % 2 === 0 ? '#fef2f2' : '#f8fafc', borderRadius: '8px', border: '1px solid', borderColor: idx % 2 === 0 ? '#fee2e2' : '#e2e8f0' }}>
                                                <span style={{ fontSize: 13, color: idx % 2 === 0 ? '#b91c1c' : '#475569', fontWeight: 600 }}>{c}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: idx % 2 === 0 ? '#991b1b' : '#0f172a' }}>{count}</span>
                                            </div>
                                        ))}
                                        {disasterStats.topTypes.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                    <Row gutter={[20, 20]}>
                        
                        {/* --- Agricultural Areas --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🌾 สัดส่วนพื้นที่การเกษตรตามชนิดพืช" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {agriPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={agriPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {agriPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ไร่', 'พื้นที่']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="พื้นที่การเกษตร" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🌾 พื้นที่การเกษตรรายอำเภอ (แยกชนิดพืช)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {agriBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={agriBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomAgriBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {agriCrops.map((crop, index) => (
                                                    <Bar key={crop} dataKey={crop} stackId="a" fill={AGRI_COLORS[index % AGRI_COLORS.length]} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="พื้นที่การเกษตร" />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Learning Centers --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🏫 สัดส่วน ศพก. แบ่งตามพืชหลัก" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {learnPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={learnPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {learnPie.map((_, i) => <Cell key={i} fill={LEARN_COLORS[i % LEARN_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val.toLocaleString() + ' ศูนย์', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศพก." />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🏫 จำนวนที่ตั้ง ศพก. แยกตามอำเภอ (แบ่งตามพืชหลัก)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 340 }}>
                                    {learnBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={learnBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomLearnBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {learnTypes.map((type, index) => (
                                                    <Bar key={type} dataKey={type} stackId="a" fill={LEARN_COLORS[index % LEARN_COLORS.length]} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศพก." />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Disasters --- */}
                        {disasterPie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="⚡ สัดส่วนภัยพิบัติตามประเภท" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 340 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={disasterPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {disasterPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val + ' รายการ', 'จำนวน']} />
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

