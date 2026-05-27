import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, InputNumber, Row, Col, Divider, Card, Statistic, Progress, Button, Tag } from 'antd';
import { SyncOutlined, ArrowUpOutlined, AimOutlined } from '@ant-design/icons';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, BarChart
} from 'recharts';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';

const columns = [
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 110, fixed: 'left' },
    { title: 'ปีข้อมูล', dataIndex: 'data_year', key: 'data_year', width: 80, align: 'center' },
    { title: 'เป้าหมาย (ครัวเรือน)', dataIndex: 'target', key: 'target', width: 110, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'ปรับปรุงรวม (ครัวเรือน)', dataIndex: 'total_updated_households', key: 'total_updated_households', width: 130, align: 'right', render: v => v?.toLocaleString() || '-' },
    {
        title: 'คงเหลือสะสม',
        key: 'remaining_target',
        width: 110,
        align: 'right',
        render: (_, record) => {
            const target = record.target;
            const updated = record.total_updated_households || 0;
            if (target === null || target === undefined || target === 0) return '-';
            const remaining = target - updated;
            const color = remaining < 0 ? '#cf222e' : '#57606a';
            return <span style={{ color, fontWeight: remaining < 0 ? 600 : 400 }}>{remaining.toLocaleString()}</span>;
        }
    },
    { title: 'ยกเลิก (ครัวเรือน)', dataIndex: 'cancelled_households', key: 'cancelled_households', width: 110, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'รวมครัวเรือน', dataIndex: 'net_total_households', key: 'net_total_households', width: 120, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'พื้นที่ปรับปรุงรวม (ไร่)', dataIndex: 'total_updated_area_rai', key: 'total_updated_area_rai', width: 130, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'พืชหลัก', dataIndex: 'main_crop', key: 'main_crop', width: 120 },
    { title: 'วันที่ตัดยอดข้อมูล', dataIndex: 'cutoff_date', key: 'cutoff_date', width: 120, align: 'center', render: v => v ? new Date(v).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
    { title: 'วันที่อัปเดตระบบ', dataIndex: 'updated_at', key: 'updated_at', width: 150, align: 'center', render: v => v ? new Date(v).toLocaleString('th-TH') : '-' },
];

const formFields = (
    <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
        <Divider orientation="left" style={{ marginTop: 0 }}>ข้อมูลทั่วไป</Divider>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
                    <Select placeholder="เลือกอำเภอ" options={[
                        'จังหวัดนครปฐม', 'เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'
                    ].map(d => ({ label: d, value: d }))} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="data_year" label="ปีข้อมูล" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} placeholder="2569" />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="main_crop" label="พืชหลัก">
                    <Input placeholder="ข้าว, มะพร้าว" />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="cutoff_date" label="วันที่ตัดยอดข้อมูล">
                    <Input type="date" style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>

        <Divider orientation="left">เป้าหมาย & ครัวเรือนเดิม</Divider>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="target" label="เป้าหมาย (ครัวเรือน)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="household_count" label="ครัวเรือนเดิม">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>

        <Divider orientation="left">ปรับปรุงช่องทาง ทบก.</Divider>
        <Row gutter={12}>
            <Col span={8}>
                <Form.Item name="update_tbk_households" label="ครัวเรือน">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="update_tbk_plots" label="แปลง">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="update_tbk_area_rai" label="เนื้อที่ (ไร่)">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>

        <Divider orientation="left">ปรับปรุงช่องทาง Farmbook</Divider>
        <Row gutter={12}>
            <Col span={8}>
                <Form.Item name="update_farmbook_households" label="ครัวเรือน">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="update_farmbook_plots" label="แปลง">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="update_farmbook_area_rai" label="เนื้อที่ (ไร่)">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>

        <Divider orientation="left">ปรับปรุงช่องทาง e-Form</Divider>
        <Row gutter={12}>
            <Col span={8}>
                <Form.Item name="update_eform_households" label="ครัวเรือน">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="update_eform_plots" label="แปลง">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="update_eform_area_rai" label="เนื้อที่ (ไร่)">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>

        <Divider orientation="left">สรุปยอดสะสม & ยกเลิก</Divider>
        <Row gutter={12}>
            <Col span={8}>
                <Form.Item name="total_updated_households" label="ปรับปรุงสะสม (ครัวเรือน)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="total_updated_plots" label="ปรับปรุงสะสม (แปลง)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="total_updated_area_rai" label="ปรับปรุงสะสม (ไร่)">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="cancelled_households" label="ยกเลิก (ครัวเรือน)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="net_total_households" label="รวมครัวเรือน">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>
    </div>
);

const districts = ['จังหวัดนครปฐม', 'เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data) return null;
        const target = data.target || 0;
        const updated = data.total_updated_households || 0;
        const tbk = data.update_tbk_households || 0;
        const farmbook = data.update_farmbook_households || 0;
        const eform = data.update_eform_households || 0;

        return (
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>อ.{data.district || label}</p>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#475569' }}>
                    เป้าหมาย: <strong style={{ color: '#4f46e5' }}>{target ? target.toLocaleString() : '-'}</strong> ครัวเรือน
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569' }}>
                    ปรับปรุงสะสม: <strong style={{ color: '#10b981' }}>{updated.toLocaleString()}</strong> ครัวเรือน
                </p>
                <div style={{ paddingLeft: '8px', borderLeft: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>• ระบบ TBK: <strong style={{ color: '#0ea5e9' }}>{tbk.toLocaleString()}</strong> ครัวเรือน</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>• App Farmbook: <strong style={{ color: '#10b981' }}>{farmbook.toLocaleString()}</strong> ครัวเรือน</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>• e-Form: <strong style={{ color: '#f59e0b' }}>{eform.toLocaleString()}</strong> ครัวเรือน</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function FarmerRegistry() {
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ target: 0, updated: 0, remaining: 0, percent: 0 });
    const [latestDates, setLatestDates] = useState({ cutoff: null, updated: null });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const loadStats = useCallback(async () => {
        const { data: yearData } = await supabase
            .from('farmer_registry')
            .select('data_year')
            .order('data_year', { ascending: false })
            .limit(1);

        const activeYear = yearData?.[0]?.data_year || 2568;

        const { data } = await supabase
            .from('farmer_registry')
            .select('*')
            .eq('data_year', activeYear)
            .order('district');

        if (data) {
            const provinceRow = data.find(d => d.district === 'จังหวัดนครปฐม' || d.district === 'นครปฐม') || { target: 0, total_updated_households: 0 };

            const target = provinceRow.target || 0;
            const updated = provinceRow.total_updated_households || 0;
            const remaining = target - updated;
            const percent = target > 0 ? Math.round((updated / target) * 100) : 0;

            setStats({ target, updated, remaining, percent });

            // Find latest cutoff_date and updated_at
            let latestCutoff = null;
            let latestUpdated = null;
            data.forEach(r => {
                if (r.cutoff_date && (!latestCutoff || r.cutoff_date > latestCutoff)) {
                    latestCutoff = r.cutoff_date;
                }
                if (r.updated_at && (!latestUpdated || r.updated_at > latestUpdated)) {
                    latestUpdated = r.updated_at;
                }
            });
            setLatestDates({ cutoff: latestCutoff, updated: latestUpdated });

            const districtsData = data.filter(d => d.district !== 'จังหวัดนครปฐม' && d.district !== 'นครปฐม');
            setChartData(districtsData);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats, refreshTrigger]);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            backgroundColor: '#f8fafc',
            backgroundImage: `
                radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.04) 0%, transparent 40%),
                radial-gradient(circle at 85% 20%, rgba(13, 148, 136, 0.04) 0%, transparent 40%),
                radial-gradient(circle at 50% 80%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)
            `,
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 30px rgba(0,0,0,0.01)'
        }}>

            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a 0%, #166534 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>รายงานทะเบียนเกษตรกรจังหวัดนครปฐม</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>วิเคราะห์เปรียบเทียบเป้าหมายการปรับปรุงและปริมาณงานสะสม</span>
                        {latestDates.cutoff && (
                            <Tag style={{
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: '999px',
                                fontSize: '12px',
                                margin: 0,
                                background: 'rgba(240, 253, 244, 0.94)',
                                color: '#15803d',
                                padding: '4px 12px',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                                📅 ข้อมูล ณ วันที่: {new Date(latestDates.cutoff).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Tag>
                        )}
                        {latestDates.updated && (
                            <Tag style={{
                                border: '1px solid rgba(14, 165, 233, 0.25)',
                                borderRadius: '999px',
                                fontSize: '12px',
                                margin: 0,
                                background: 'rgba(240, 249, 255, 0.94)',
                                color: '#0369a1',
                                padding: '4px 12px',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                                🔄 อัปเดตระบบเมื่อ: {new Date(latestDates.updated).toLocaleString('th-TH')}
                            </Tag>
                        )}
                    </div>
                </div>
                <Button type="text" icon={<SyncOutlined />} onClick={handleRefresh} style={{ backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontWeight: 600, color: '#1e293b' }}>
                    รีเฟรชบอร์ด
                </Button>
            </div>

            {/* Top Dashboard Section */}
            <Row gutter={[20, 20]}>

                {/* Left Mini Sparkline Cards (10 columns) */}
                <Col xs={24} lg={10} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Card 1: Target */}
                    <Card style={{
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                        boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                        backdropFilter: 'blur(20px)',
                        padding: '4px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>เป้าหมายการปรับปรุง (ครัวเรือน)</div>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#4f46e5', margin: '4px 0' }}>{stats.target.toLocaleString()}</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>จำนวนครัวเรือนเป้าหมายของจังหวัด</div>
                            </div>
                            <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe', borderRadius: '14px', border: '1px solid #bae6fd' }}>
                                <AimOutlined style={{ fontSize: '24px', color: '#0ea5e9' }} />
                            </div>
                        </div>
                    </Card>

                    {/* Card 2: Actual Updated */}
                    <Card style={{
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                        boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                        backdropFilter: 'blur(20px)',
                        padding: '4px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                                    ปรับปรุงข้อมูลสำเร็จแล้ว <Tag color="green" style={{ border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}><ArrowUpOutlined /> {stats.percent}%</Tag>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>{stats.updated.toLocaleString()}</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>ปรับปรุงสะสมผ่าน 3 ช่องทางหลัก</div>
                            </div>
                            <div style={{ width: '110px', height: '55px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <Tooltip
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px', padding: '4px 8px' }}
                                            formatter={(value, name, props) => [value?.toLocaleString() + ' ครัวเรือน', 'อ.' + props.payload?.district]}
                                            labelFormatter={() => ''}
                                        />
                                        <Bar dataKey="total_updated_households" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>

                    {/* Card 3: Remaining / Outstanding */}
                    <Card style={{
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                        boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                        backdropFilter: 'blur(20px)',
                        padding: '4px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>คงเหลือครัวเรือนค้างปรับปรุง</div>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: stats.remaining < 0 ? '#ef4444' : '#475569', margin: '4px 0' }}>
                                    {stats.remaining.toLocaleString()}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>{stats.remaining < 0 ? 'ดำเนินการปรับปรุงได้เกินเป้าหมาย' : 'คงค้างที่ยังไม่ได้รับการปรับปรุงข้อมูล'}</div>
                            </div>
                            <div style={{ width: '110px', height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Progress type="circle" percent={stats.percent} size={50} strokeColor={stats.remaining < 0 ? '#ef4444' : '#8b5cf6'} />
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Right Overview Double Bar & Trend Chart (14 columns) */}
                <Col xs={24} lg={14}>
                    {chartData.length > 0 ? (
                        <Card
                            title={
                                <div style={{
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #1e3a8a 0%, #6366f1 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    color: 'transparent'
                                }}>
                                    Overview — เป้าหมายและจำนวนครัวเรือนเกษตรกรแยกตามอำเภอ
                                </div>
                            }
                            style={{
                                borderRadius: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.8)',
                                background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                                boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                                backdropFilter: 'blur(20px)',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                        >
                            <div style={{ width: '100%', height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#64748b' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

                                        {/* Target Bars (Indigo) - Rounded and Thin */}
                                        <Bar dataKey="target" name="เป้าหมาย (ครัวเรือน)" fill="#4f46e5" barSize={12} radius={[4, 4, 0, 0]} />

                                        {/* Stacked Actual Progress Bars (TBK + Farmbook + e-Form) matching Landing Page widget themes */}
                                        <Bar dataKey="update_tbk_households" name="ระบบ TBK" stackId="actual" fill="#0ea5e9" barSize={12} />
                                        <Bar dataKey="update_farmbook_households" name="App Farmbook" stackId="actual" fill="#10b981" barSize={12} />
                                        <Bar dataKey="update_eform_households" name="e-Form" stackId="actual" fill="#f59e0b" barSize={12} radius={[4, 4, 0, 0]} />

                                        {/* Dotted Trend Line */}
                                        <Line type="monotone" dataKey="total_updated_households" name="แนวโน้มปริมาณปรับปรุง" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    ) : (
                        <Card style={{ borderRadius: '24px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.02)', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <span style={{ color: '#94a3b8' }}>ยังไม่มีข้อมูลเปรียบเทียบ</span>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Main CRUD Table */}
            <Card style={{
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(20px)'
            }}>
                <CrudTable
                    tableName="farmer_registry"
                    title="ตารางรายละเอียดรายอำเภอ"
                    columns={columns}
                    formFields={formFields}
                    searchField="district"
                    filterConfig={filterConfig}
                    scrollX={1300}
                    requiredColumns={['district', 'data_year', 'target', 'total_updated_households', 'remaining_target']}
                    defaultColumns={['cancelled_households', 'net_total_households', 'total_updated_area_rai', 'cutoff_date', 'updated_at']}
                    extraActions={<Button icon={<SyncOutlined />} onClick={handleRefresh} className="export-btn">รีเฟรชตาราง</Button>}
                />
            </Card>
        </div>
    );
}
