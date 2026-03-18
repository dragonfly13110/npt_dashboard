import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, BarChartOutlined, EnvironmentOutlined, BankOutlined, ThunderboltOutlined } from '@ant-design/icons';
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

export default function StrategyDashboard() {
    const [agriData, setAgriData] = useState([]);
    const [learningData, setLearningData] = useState([]);
    const [disasterData, setDisasterData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAll();
    }, []);

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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Agricultural Areas: Pie Chart (crop types) ---
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
        return cropFields.map(f => ({
            name: f.label,
            value: agriData.reduce((sum, row) => sum + (Number(row[f.key]) || 0), 0)
        })).filter(d => d.value > 0);
    }, [agriData]);

    // --- Learning Centers: Bar by district ---
    const learningBar = useMemo(() => {
        const distMap = {};
        learningData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            distMap[dist] = (distMap[dist] || 0) + 1;
        });
        return Object.entries(distMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [learningData]);

    // --- Disasters: Pie by type ---
    const disasterPie = useMemo(() => {
        const typeMap = {};
        disasterData.forEach(item => {
            const t = item.disaster_type || item.type || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        return Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [disasterData]);

    const totalAgriArea = agriData.reduce((sum, row) => sum + (Number(row.total_area_rai) || 0), 0);
    const totalLearning = learningData.length;
    const totalDisasters = disasterData.length;

    return (
        <div>
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
                    {/* Summary Tags */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <Tag icon={<EnvironmentOutlined />} color="green" style={{ fontSize: 13, padding: '4px 12px' }}>
                            พื้นที่เกษตรรวม {totalAgriArea.toLocaleString()} ไร่
                        </Tag>
                        <Tag icon={<BankOutlined />} color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                            ศพก. {totalLearning} ศูนย์
                        </Tag>
                        <Tag icon={<ThunderboltOutlined />} color="red" style={{ fontSize: 13, padding: '4px 12px' }}>
                            ภัยพิบัติ {totalDisasters} รายการ
                        </Tag>
                    </div>

                    <Row gutter={[20, 20]}>
                        {/* Agricultural Areas Pie */}
                        <Col xs={24} lg={12}>
                            <Card title="🌾 สัดส่วนพื้นที่การเกษตรตามชนิดพืช" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {agriPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={agriPie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {agriPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => [val.toLocaleString() + ' ไร่', 'พื้นที่']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="พื้นที่การเกษตร" />}
                                </div>
                            </Card>
                        </Col>

                        {/* Learning Centers Bar */}
                        <Col xs={24} lg={12}>
                            <Card title="🏫 จำนวน ศพก. แยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {learningBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={learningBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน ศพก." fill="#42a5f5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ศพก." />}
                                </div>
                            </Card>
                        </Col>

                        {/* Disasters Pie */}
                        {disasterPie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="⚡ สัดส่วนภัยพิบัติตามประเภท" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={disasterPie} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value"
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

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}
