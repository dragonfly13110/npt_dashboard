import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, AlertOutlined, ExperimentOutlined, FireOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

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

    // Pest outbreaks by district
    const poBar = useMemo(() => {
        const map = {};
        pestOutbreaks.forEach(p => {
            const d = p.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [pestOutbreaks]);

    // Pest Centers: by district
    const pcBar = useMemo(() => {
        const map = {};
        pestCenters.forEach(c => {
            const d = c.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [pestCenters]);

    // Soil Fertilizer Centers: by district
    const sfBar = useMemo(() => {
        const map = {};
        soilFertilizer.forEach(s => {
            const d = s.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [soilFertilizer]);

    // Fire hotspots: pie by district
    const firePie = useMemo(() => {
        const map = {};
        fireHotspots.forEach(f => {
            const d = f.district || f.subdistrict || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [fireHotspots]);

    return (
        <div>
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
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <Tag color="green" style={{ fontSize: 13, padding: '4px 12px' }}>🌿 แปลงพยากรณ์ {pestOutbreaks.length}</Tag>
                        <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>🏥 ศจช. {pestCenters.length}</Tag>
                        <Tag color="cyan" style={{ fontSize: 13, padding: '4px 12px' }}>🧪 ศดปช. {soilFertilizer.length}</Tag>
                        <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px' }}>🔥 จุดเฝ้าระวัง {fireHotspots.length}</Tag>
                    </div>

                    <Row gutter={[20, 20]}>
                        {/* Pest Outbreaks Bar */}
                        <Col xs={24} lg={12}>
                            <Card title="🌿 แปลงพยากรณ์แยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {poBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={poBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#66bb6a" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="แปลงพยากรณ์" />}
                                </div>
                            </Card>
                        </Col>

                        {/* Pest Centers Bar */}
                        <Col xs={24} lg={12}>
                            <Card title="🏥 ศจช. แยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {pcBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={pcBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#42a5f5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศจช." />}
                                </div>
                            </Card>
                        </Col>

                        {/* Soil Fertilizer Centers Bar */}
                        {sfBar.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="🧪 ศดปช. แยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sfBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#26a69a" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </Col>
                        )}

                        {/* Fire Hotspots Pie */}
                        {firePie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="🔥 จุดเฝ้าระวัง PM2.5 แยกตามพื้นที่" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={firePie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value"
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
