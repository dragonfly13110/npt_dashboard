import { useState, useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Spin, Row, Col, Card } from 'antd';
import { PieChartOutlined, BarChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'รหัส', dataIndex: 'code', key: 'code', width: 90, sorter: (a, b) => (Number(a.code) || 0) - (Number(b.code) || 0) },
    { title: 'แปลงใหญ่ปี', dataIndex: 'year', key: 'year', width: 100, align: 'center', sorter: (a, b) => (a.year || 0) - (b.year || 0) },
    { title: 'กลุ่มสินค้า', dataIndex: 'commodity_group', key: 'commodity_group', width: 120, sorter: (a, b) => String(a.commodity_group || '').localeCompare(String(b.commodity_group || ''), 'th') },
    { title: 'สินค้าหลัก', dataIndex: 'commodity', key: 'commodity', width: 120, sorter: (a, b) => String(a.commodity || '').localeCompare(String(b.commodity || ''), 'th') },
    { title: 'สินค้ารอง', dataIndex: 'secondary_commodity', key: 'secondary_commodity', width: 120, sorter: (a, b) => String(a.secondary_commodity || '').localeCompare(String(b.secondary_commodity || ''), 'th') },
    { title: 'ชื่อแปลงใหญ่', dataIndex: 'plot_name', key: 'plot_name', width: 220, sorter: (a, b) => String(a.plot_name || '').localeCompare(String(b.plot_name || ''), 'th') },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130, sorter: (a, b) => String(a.district || '').localeCompare(String(b.district || ''), 'th') },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130, sorter: (a, b) => String(a.subdistrict || '').localeCompare(String(b.subdistrict || ''), 'th') },
    { title: 'โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: 'เกษตรกร', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.member_count || 0) - (b.member_count || 0) },
    { title: 'พื้นที่(ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 110, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.area_rai || 0) - (b.area_rai || 0) },
    { title: 'หน่วยงาน', dataIndex: 'agency', key: 'agency', width: 160, sorter: (a, b) => String(a.agency || '').localeCompare(String(b.agency || ''), 'th') },
];

const formFields = (
    <>
        <Form.Item name="code" label="รหัส"><Input /></Form.Item>
        <Form.Item name="year" label="แปลงใหญ่ปี"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
        <Form.Item name="commodity_group" label="กลุ่มสินค้า"><Input placeholder="ข้าว, ผัก/สมุนไพร" /></Form.Item>
        <Form.Item name="commodity" label="สินค้าหลัก" rules={[{ required: true }]}><Input placeholder="ข้าว" /></Form.Item>
        <Form.Item name="secondary_commodity" label="สินค้ารอง"><Input placeholder="ข้าวโพดฝักอ่อน" /></Form.Item>
        <Form.Item name="plot_name" label="ชื่อแปลงใหญ่" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="district" label="อำเภอ">
            <Select
                placeholder="เลือกอำเภอ"
                allowClear
                options={[
                    'เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม',
                    'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'
                ].map(d => ({ label: d, value: d }))}
            />
        </Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="phone" label="โทรศัพท์"><Input placeholder="08x-xxx-xxxx" /></Form.Item>
        <Form.Item name="member_count" label="จำนวนเกษตรกร"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ (ไร่)"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
        <Form.Item name="agency" label="หน่วยงาน"><Input placeholder="กรมการข้าว, กรมส่งเสริมการเกษตร" /></Form.Item>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item>
    </>
);

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'year', label: 'แปลงใหญ่ปี', options: [2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565, 2566, 2567, 2568, 2569, 2570] },
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'commodity_group', label: 'กลุ่มสินค้า', options: ['ข้าว', 'ผัก/สมุนไพร', 'ไม้ผล', 'พืชไร่', 'ไม้ดอกไม้ประดับ', 'ไม้ยืนต้น', 'ปศุสัตว์', 'ประมง', 'แมลงเศรษฐกิจ'] },
    { key: 'agency', label: 'หน่วยงาน', options: ['กรมส่งเสริมการเกษตร', 'กรมการข้าว', 'กรมประมง', 'กรมปศุสัตว์', 'กรมหม่อนไหม', 'การยางแห่งประเทศไทย'] },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63'];

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value} แปลง
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} แปลง
                </div>
            </div>
        );
    }
    return null;
};

export default function LargePlots() {
    const [dashboardData, setDashboardData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters for charts
    const [filterYear, setFilterYear] = useState(null);
    const [filterDistrict, setFilterDistrict] = useState(null);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('large_plots').select('*');
                if (error) throw error;
                setDashboardData(data || []);
            } catch (err) {
                console.error('Error fetching large plots dash data', err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    // Derived Filter Options
    const yearOptions = useMemo(() => {
        const unique = [...new Set(dashboardData.map(d => d.year).filter(Boolean))].sort();
        return unique.map(y => ({ label: `ปี ${y}`, value: y }));
    }, [dashboardData]);

    const districtOptions = useMemo(() => {
        const unique = [...new Set(dashboardData.map(d => d.district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [dashboardData]);

    // Apply Filters for Charts
    const filteredData = useMemo(() => {
        return dashboardData.filter(item => {
            if (filterYear && String(item.year) !== String(filterYear)) return false;
            if (filterDistrict && item.district !== filterDistrict) return false;
            return true;
        });
    }, [dashboardData, filterYear, filterDistrict]);

    // Calculate Data for Pie Chart (Commodity Group)
    const pieData = useMemo(() => {
        const counts = {};
        filteredData.forEach(item => {
            const group = item.commodity_group || 'ไม่ระบุ';
            counts[group] = (counts[group] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Calculate Data for Stacked Bar Chart (District & Commodity Group)
    const { barData, barGroups } = useMemo(() => {
        const counts = {};
        const groupSet = new Set();

        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const group = item.commodity_group || 'ไม่ระบุ';

            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            
            counts[dist][group] = (counts[dist][group] || 0) + 1;
            counts[dist].total += 1;
            groupSet.add(group);
        });

        const barDataArray = Object.values(counts).sort((a, b) => b.total - a.total);
        const barGroupsArray = Array.from(groupSet).sort();
        
        return { barData: barDataArray, barGroups: barGroupsArray };
    }, [filteredData]);


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
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลแปลงใหญ่</span>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20,
                    padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>ปี:</span>
                        <Select
                            value={filterYear}
                            onChange={setFilterYear}
                            options={yearOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 120 }}
                            size="small"
                        />
                    </div>
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
                </div>

                {/* Charts */}
                {loading ? (
                    <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Spin tip="กำลังโหลดข้อมูลกราฟ..." />
                    </div>
                ) : (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card title="ภาพรวมสัดส่วนแต่ละกลุ่มสินค้า" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value + ' แปลง', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title={filterDistrict ? `จำนวนแปลงใหญ่ใน ${filterDistrict}` : "จำนวนแปลงใหญ่แยกตามอำเภอ"} size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {barGroups.map((group, index) => (
                                                    <Bar key={group} dataKey={group} stackId="a" fill={COLORS[index % COLORS.length]} maxBarSize={50} />
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

            {/* ===== Data Table Section ===== */}
            <CrudTable
                tableName="large_plots"
                title="ข้อมูลแปลงใหญ่"
                columns={columns}
                formFields={formFields}
                searchField="plot_name"
                filterConfig={filterConfig}
            />
        </div>
    );
}
