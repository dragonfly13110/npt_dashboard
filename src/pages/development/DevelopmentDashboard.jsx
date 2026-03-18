import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, TeamOutlined } from '@ant-design/icons';
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

export default function DevelopmentDashboard() {
    const [communityData, setCommunityData] = useState([]);
    const [smartData, setSmartData] = useState([]);
    const [farmerGroupData, setFarmerGroupData] = useState([]);
    const [farmerInstData, setFarmerInstData] = useState([]);
    const [tourismData, setTourismData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [ce, sf, fg, fi, at] = await Promise.all([
                supabase.from('community_enterprises').select('*'),
                supabase.from('smart_farmers').select('*'),
                supabase.from('farmer_groups').select('*'),
                supabase.from('farmer_institutes').select('*'),
                supabase.from('agri_tourism').select('*'),
            ]);
            setCommunityData(ce.data || []);
            setSmartData(sf.data || []);
            setFarmerGroupData(fg.data || []);
            setFarmerInstData(fi.data || []);
            setTourismData(at.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Community Enterprises: by district
    const ceBar = useMemo(() => {
        const map = {};
        communityData.forEach(c => {
            const d = c.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [communityData]);

    // Smart Farmers: by district
    const sfBar = useMemo(() => {
        const map = {};
        smartData.forEach(s => {
            const d = s.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [smartData]);

    // Farmer Institutes: Pie by type
    const fiPie = useMemo(() => {
        const map = {};
        farmerInstData.forEach(f => {
            const t = f.institute_type || f.type || 'ไม่ระบุ';
            map[t] = (map[t] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [farmerInstData]);

    return (
        <div>
            <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <PieChartOutlined style={{ fontSize: 22, color: '#1a7f37' }} />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>🤝 ส่งเสริมและพัฒนาเกษตรกร</h2>
                </div>
                <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>ภาพรวมข้อมูลวิสาหกิจชุมชน, เกษตรกรรุ่นใหม่, กลุ่มแม่บ้าน, สถาบันเกษตรกร และท่องเที่ยวเกษตร</p>
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>🤝 วิสาหกิจ {communityData.length}</Tag>
                        <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px' }}>🧑‍🌾 เกษตรกรรุ่นใหม่ {smartData.length}</Tag>
                        <Tag color="green" style={{ fontSize: 13, padding: '4px 12px' }}>👩‍🌾 กลุ่มแม่บ้าน {farmerGroupData.length}</Tag>
                        <Tag color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>🏛️ สถาบันเกษตรกร {farmerInstData.length}</Tag>
                        <Tag color="cyan" style={{ fontSize: 13, padding: '4px 12px' }}>🏕️ ท่องเที่ยวเกษตร {tourismData.length}</Tag>
                    </div>

                    <Row gutter={[20, 20]}>
                        {/* Community Enterprises Bar */}
                        <Col xs={24} lg={12}>
                            <Card title="🤝 วิสาหกิจชุมชนแยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {ceBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={ceBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#42a5f5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="วิสาหกิจชุมชน" />}
                                </div>
                            </Card>
                        </Col>

                        {/* Smart Farmers Bar */}
                        <Col xs={24} lg={12}>
                            <Card title="🧑‍🌾 เกษตรกรรุ่นใหม่แยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {sfBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sfBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#ff7043" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="เกษตรกรรุ่นใหม่" />}
                                </div>
                            </Card>
                        </Col>

                        {/* Farmer Institutes Pie */}
                        {fiPie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="🏛️ สัดส่วนสถาบันเกษตรกรตามประเภท" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={fiPie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {fiPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}
