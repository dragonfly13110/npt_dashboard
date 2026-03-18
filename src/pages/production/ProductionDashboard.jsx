import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, BankOutlined, SafetyCertificateOutlined, BarChartOutlined } from '@ant-design/icons';
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

export default function ProductionDashboard() {
    const [largePlots, setLargePlots] = useState([]);
    const [certs, setCerts] = useState([]);
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [lp, ct, cr] = await Promise.all([
                supabase.from('large_plots').select('*'),
                supabase.from('certifications').select('*'),
                supabase.from('crop_production').select('*'),
            ]);
            setLargePlots(lp.data || []);
            setCerts(ct.data || []);
            setCrops(cr.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Large Plots: stacked by commodity_group per district
    const lpChartData = useMemo(() => {
        const distMap = {};
        const cgSet = new Set();
        largePlots.forEach(p => {
            const dist = p.district || 'ไม่ระบุ';
            const cg = p.commodity_group || 'ไม่ระบุ';
            if (!distMap[dist]) distMap[dist] = { name: dist };
            distMap[dist][cg] = (distMap[dist][cg] || 0) + 1;
            cgSet.add(cg);
        });
        return { data: Object.values(distMap), groups: Array.from(cgSet) };
    }, [largePlots]);

    // Certifications: Pie by type/standard
    const certPie = useMemo(() => {
        const map = {};
        certs.forEach(c => {
            const t = c.standard_type || c.certification_type || c.type || 'GAP';
            map[t] = (map[t] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [certs]);

    // Crop Production: Bar by district (or by crop)
    const cropBar = useMemo(() => {
        const map = {};
        crops.forEach(c => {
            const key = c.district || c.crop_name || 'ไม่ระบุ';
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [crops]);

    return (
        <div>
            <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <PieChartOutlined style={{ fontSize: 22, color: '#1a7f37' }} />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>🌱 ส่งเสริมและพัฒนาการผลิต</h2>
                </div>
                <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>ภาพรวมข้อมูลแปลงใหญ่, มาตรฐาน GAP และผลผลิตพืช</p>
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <Tag icon={<BankOutlined />} color="green" style={{ fontSize: 13, padding: '4px 12px' }}>แปลงใหญ่ {largePlots.length} แปลง</Tag>
                        <Tag icon={<SafetyCertificateOutlined />} color="orange" style={{ fontSize: 13, padding: '4px 12px' }}>มาตรฐาน GAP {certs.length} รายการ</Tag>
                        <Tag icon={<BarChartOutlined />} color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>ผลผลิตพืช {crops.length} รายการ</Tag>
                    </div>

                    <Row gutter={[20, 20]}>
                        {/* Large Plots Stacked Bar */}
                        <Col xs={24} lg={12}>
                            <Card title="🌾 แปลงใหญ่รายอำเภอ (ตามกลุ่มสินค้า)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {lpChartData.data.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={lpChartData.data} margin={{ top: 20, right: 20, left: -10, bottom: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                                {lpChartData.groups.map((cg, idx) => (
                                                    <Bar key={cg} dataKey={cg} stackId="a" fill={PIE_COLORS[idx % PIE_COLORS.length]} radius={idx === lpChartData.groups.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="แปลงใหญ่" />}
                                </div>
                            </Card>
                        </Col>

                        {/* Certifications Pie */}
                        <Col xs={24} lg={12}>
                            <Card title="✅ สัดส่วนมาตรฐาน GAP" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {certPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={certPie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {certPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val + ' รายการ', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="มาตรฐาน GAP" />}
                                </div>
                            </Card>
                        </Col>

                        {/* Crop Production Bar */}
                        {cropBar.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="📊 ผลผลิตพืชรายอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 320 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cropBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#ab47bc" radius={[4, 4, 0, 0]} />
                                            </BarChart>
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
