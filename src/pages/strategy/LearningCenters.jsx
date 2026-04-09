import { useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Tag, Row, Col, Card, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';

const columns = [
    { title: 'ชื่อ ศพก.', dataIndex: 'name', key: 'name', width: 280, importHeader: 'ชื่อ_ศพก' },
    { title: 'สินค้าเด่น', dataIndex: 'featured_product', key: 'featured_product', width: 100, importHeader: 'สินค้าเด่น' },
    { title: 'หมู่ที่', dataIndex: 'moo', key: 'moo', width: 70, align: 'center', importHeader: 'หมู่ที่' },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 100, importHeader: 'ตำบล' },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 100, importHeader: 'อำเภอ' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ศูนย์<br/>เครือข่าย</div>, importHeader: 'จำนวนศูนย์เครือข่าย_ศูนย์', dataIndex: 'network_centers_count', key: 'network_centers_count', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ชื่อ-สกุล ประธาน', dataIndex: 'chairman_name', key: 'chairman_name', width: 150, importHeader: 'ชื่อ_สกุล_ประธาน' },
    { title: 'เบอร์โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 130, importHeader: 'เบอร์โทรศัพท์' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>องค์ความรู้/<br/>หลักสูตรอบรม</div>, importHeader: 'องค์ความรู้_หลักสูตรอบรม', dataIndex: 'knowledge_course', key: 'knowledge_course', width: 220, ellipsis: true },
];

const formFields = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Form.Item name="name" label="ชื่อ ศพก." rules={[{ required: true }]} style={{ gridColumn: '1 / -1' }}><Input /></Form.Item>
        <Form.Item name="featured_product" label="สินค้าเด่น"><Input /></Form.Item>
        <Form.Item name="moo" label="หมู่ที่"><Input /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="network_centers_count" label="จำนวนศูนย์เครือข่าย"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="chairman_name" label="ชื่อ-สกุล ประธาน"><Input /></Form.Item>
        <Form.Item name="phone" label="เบอร์โทรศัพท์"><Input /></Form.Item>
        <Form.Item name="knowledge_course" label="องค์ความรู้/หลักสูตรอบรม" style={{ gridColumn: '1 / -1' }}><Input.TextArea rows={2} /></Form.Item>
    </div>
);

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

const BAR_COLOR = '#42a5f5';

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#1f2328' }}>อ.{label}</div>
                <div style={{ color: BAR_COLOR, fontSize: 13 }}>
                    ศูนย์เครือข่าย : {Number(payload[0].value).toLocaleString()} ศูนย์
                </div>
            </div>
        );
    }
    return null;
};

export default function LearningCenters() {
    const [filterDistrict, setFilterDistrict] = useState(null);

    const fetchAllCenters = async () => {
        const { data, error } = await supabase.from('learning_centers').select('*');
        if (error) throw error;
        return data || [];
    };

    const { data: chartData = [], isLoading: chartLoading } = useApiCache(
        ['all-learning-centers'], 
        fetchAllCenters, 
        { staleMinutes: 10 }
    );

    const districtOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    const filteredData = useMemo(() => {
        return chartData.filter(item => {
            if (filterDistrict && item.district !== filterDistrict) return false;
            return true;
        });
    }, [chartData, filterDistrict]);

    // Pie: by featured_product
    const pieData = useMemo(() => {
        const counts = {};
        filteredData.forEach(item => {
            const product = item.featured_product || 'ไม่ระบุ';
            counts[product] = (counts[product] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Bar: network_centers_count by district
    const barData = useMemo(() => {
        const distMap = {};
        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!distMap[dist]) distMap[dist] = { name: dist, network_centers: 0 };
            distMap[dist].network_centers += Number(item.network_centers_count) || 0;
        });
        return Object.values(distMap).sort((a, b) => b.network_centers - a.network_centers);
    }, [filteredData]);

    const hasActiveFilter = !!filterDistrict;

    const tableFilterConfig = [
        { key: 'district', label: 'อำเภอ', options: districtOptions },
    ];

    return (
        <div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูล ศพก.</span>
                    <Tag color="green">
                        {hasActiveFilter
                            ? `แสดง ${filteredData.length} จาก ${chartData.length} ศูนย์`
                            : `รวมข้อมูลทั้งหมด ${chartData.length} ศูนย์`}
                    </Tag>
                </div>

                <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20,
                    padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>อำเภอ:</span>
                        <Select
                            value={filterDistrict}
                            onChange={setFilterDistrict}
                            options={districtOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 150 }}
                            size="small"
                        />
                    </div>
                    {hasActiveFilter && (
                        <a
                            onClick={() => setFilterDistrict(null)}
                            style={{ fontSize: 13, cursor: 'pointer', alignSelf: 'center', color: '#cf222e' }}
                        >
                            ล้างตัวกรองกราฟ
                        </a>
                    )}
                </div>

                {chartLoading ? (
                    <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Spin tip="กำลังโหลดข้อมูลกราฟ..." />
                    </div>
                ) : (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card title="สัดส่วน ศพก. แยกตามสินค้าเด่น" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value + ' ศูนย์', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="จำนวนศูนย์เครือข่ายแยกตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Bar dataKey="network_centers" name="ศูนย์เครือข่าย" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                )}
            </div>

            <CrudTable
                tableName="learning_centers"
                title="ศูนย์เรียนรู้ฯ (ศพก.)"
                columns={columns}
                formFields={formFields}
                searchField="name"
                searchFields={['name', 'district', 'subdistrict', 'featured_product']}
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
