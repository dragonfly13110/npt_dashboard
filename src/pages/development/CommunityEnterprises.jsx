import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Tag, Row, Col, Card, Spin, DatePicker } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';

// ---- Constants ----
const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const enterpriseTypes = [
    'วิสาหกิจชุมชน',
    'เครือข่ายวิสาหกิจชุมชน',
];

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const DISTRICT_COLORS = {
    'เมืองนครปฐม': '#0969da',
    'นครชัยศรี': '#1a7f37',
    'สามพราน': '#bf8700',
    'ดอนตูม': '#8250df',
    'บางเลน': '#cf222e',
    'กำแพงแสน': '#0550ae',
    'พุทธมณฑล': '#953800',
};

// ---- Columns matching Excel: ลำดับ, วันที่อนุมัติ, ประเภท, ชื่อวิสาหกิจชุมชน, ที่ตั้ง, หมู่, ตำบล, อำเภอ ----
const columns = [
    { title: 'ลำดับ', dataIndex: 'sequence_no', key: 'sequence_no', width: 70, align: 'center' },
    { title: 'วันที่อนุมัติ', dataIndex: 'approval_date', key: 'approval_date', width: 120 },
    { title: 'ประเภท', dataIndex: 'enterprise_type', key: 'enterprise_type', width: 160 },
    { title: 'ชื่อวิสาหกิจชุมชน', dataIndex: 'enterprise_name', key: 'enterprise_name', width: 280, ellipsis: true },
    { title: 'ที่ตั้ง', dataIndex: 'address', key: 'address', width: 200, ellipsis: true },
    { title: 'หมู่', dataIndex: 'village_no', key: 'village_no', width: 60, align: 'center' },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 120 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
];

// ---- Form Fields ----
const formFields = (
    <>
        <Form.Item name="sequence_no" label="ลำดับ"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        <Form.Item name="approval_date" label="วันที่อนุมัติ"><Input placeholder="เช่น 17-ก.พ.-69" /></Form.Item>
        <Form.Item name="enterprise_type" label="ประเภท" rules={[{ required: true }]}>
            <Select options={enterpriseTypes.map(d => ({ label: d, value: d }))} placeholder="เลือกประเภท" />
        </Form.Item>
        <Form.Item name="enterprise_name" label="ชื่อวิสาหกิจชุมชน" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="address" label="ที่ตั้ง"><Input placeholder="เลขที่ ..." /></Form.Item>
        <Form.Item name="village_no" label="หมู่"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
            <Select options={districts.map(d => ({ label: d, value: d }))} placeholder="เลือกอำเภอ" />
        </Form.Item>
    </>
);

// ---- Table Filter Config (for CrudTable) ----
const tableFilterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'enterprise_type', label: 'ประเภท', options: enterpriseTypes },
];

// ---- Custom Tooltip for Bar Chart ----
const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value || 0} แห่ง
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} แห่ง
                </div>
            </div>
        );
    }
    return null;
};

// ============================
// Main Component
// ============================
export default function CommunityEnterprises() {
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);

    // Dashboard filters
    const [filterDistrict, setFilterDistrict] = useState(null);
    const [filterType, setFilterType] = useState(null);

    const loadData = useCallback(async () => {
        setChartLoading(true);
        try {
            const { data, error } = await supabase
                .from('community_enterprises')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setChartData(data || []);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setChartLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Derive filter options from actual data
    const districtOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    const typeOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.enterprise_type).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    // Apply dashboard filters
    const filteredData = useMemo(() => {
        return chartData.filter(item => {
            if (filterDistrict && item.district !== filterDistrict) return false;
            if (filterType && item.enterprise_type !== filterType) return false;
            return true;
        });
    }, [chartData, filterDistrict, filterType]);

    // ---- Pie Chart Data: สัดส่วนตามอำเภอ ----
    const pieData = useMemo(() => {
        const counts = {};
        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            counts[dist] = (counts[dist] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, color: DISTRICT_COLORS[name] || '#656d76' }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // ---- Bar Chart Data: จำนวนวิสาหกิจ แยกตามอำเภอ + ประเภท ----
    const { barData, barGroups } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();

        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const type = item.enterprise_type || 'ไม่ระบุ';

            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][type] = (counts[dist][type] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(type);
        });

        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypeGroups = Array.from(typeSet).sort();

        return { barData: sortedBarData, barGroups: sortedTypeGroups };
    }, [filteredData]);

    const TYPE_COLORS = {
        'วิสาหกิจชุมชน': '#0969da',
        'เครือข่ายวิสาหกิจชุมชน': '#1a7f37',
        'ไม่ระบุ': '#656d76',
    };

    const hasActiveFilter = filterDistrict || filterType;

    return (
        <div>
            {/* ===== Dashboard Section ===== */}
            <div style={{
                padding: 20,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e8ecf0',
                marginBottom: 24
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลวิสาหกิจชุมชน</span>
                    <Tag color="green">
                        {hasActiveFilter
                            ? `แสดงผล ${filteredData.length} จาก ${chartData.length} แห่ง`
                            : `รวมทั้งหมด ${chartData.length} แห่ง`}
                    </Tag>
                </div>

                {/* Unified Filters for Charts */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>ประเภท:</span>
                        <Select
                            value={filterType}
                            onChange={setFilterType}
                            options={typeOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 180 }}
                            size="small"
                        />
                    </div>
                    {hasActiveFilter && (
                        <a
                            onClick={() => { setFilterDistrict(null); setFilterType(null); }}
                            style={{ fontSize: 13, cursor: 'pointer', alignSelf: 'center', color: '#cf222e' }}
                        >
                            ล้างตัวกรองกราฟ
                        </a>
                    )}
                </div>

                {/* Charts */}
                {chartLoading ? (
                    <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Spin tip="กำลังโหลดข้อมูลกราฟ..." />
                    </div>
                ) : (
                    <Row gutter={[24, 24]}>
                        {/* Pie Chart: สัดส่วนตามอำเภอ */}
                        <Col xs={24} lg={12}>
                            <Card title="สัดส่วนวิสาหกิจชุมชนตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                                                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value + ' แห่ง', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>

                        {/* Bar Chart: จำนวนแยกตามอำเภอ + ประเภท */}
                        <Col xs={24} lg={12}>
                            <Card title="จำนวนวิสาหกิจชุมชนแยกตามอำเภอ (ตามประเภท)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {barGroups.map((type) => (
                                                    <Bar
                                                        key={type}
                                                        dataKey={type}
                                                        name={type}
                                                        stackId="a"
                                                        fill={TYPE_COLORS[type] || '#8250df'}
                                                        maxBarSize={50}
                                                    />
                                                ))}
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

            {/* ===== ตาราง ===== */}
            <CrudTable
                tableName="community_enterprises"
                title="วิสาหกิจชุมชน"
                columns={columns}
                formFields={formFields}
                searchField="enterprise_name"
                searchFields={['enterprise_name', 'district', 'subdistrict', 'address']}
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
