import { useState, useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Spin, Row, Col, Card } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อเกษตรกร', dataIndex: 'farmer_name', key: 'farmer_name', width: 160, sorter: (a, b) => String(a.farmer_name || '').localeCompare(String(b.farmer_name || ''), 'th') },
    { title: 'ชื่อพืช', dataIndex: 'crop_name', key: 'crop_name', width: 130, sorter: (a, b) => String(a.crop_name || '').localeCompare(String(b.crop_name || ''), 'th') },
    { title: 'รหัสแปลง', dataIndex: 'plot_code', key: 'plot_code', width: 140 },
    { title: 'ชนิดของแปลง', dataIndex: 'plot_type', key: 'plot_type', width: 100 },
    { title: 'พื้นที่ (ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 100, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.area_rai || 0) - (b.area_rai || 0) },
    { title: 'ผลผลิต (กก.)', dataIndex: 'production_volume_kg', key: 'production_volume_kg', width: 110, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.production_volume_kg || 0) - (b.production_volume_kg || 0) },
    { title: 'อำเภอ (แปลง)', dataIndex: 'plot_district', key: 'plot_district', width: 130, sorter: (a, b) => String(a.plot_district || '').localeCompare(String(b.plot_district || ''), 'th') },
    { title: 'รับรองเมื่อ', dataIndex: 'cert_date', key: 'cert_date', width: 100 },
    { title: 'หมดอายุ', dataIndex: 'exp_date', key: 'exp_date', width: 100 },
];

const formFields = (
    <>
        <Form.Item name="cert_date" label="วันที่รับรอง"><Input placeholder="ว/ด/ป เช่น 27/8/2567" /></Form.Item>
        <Form.Item name="exp_date" label="วันที่สิ้นสุด"><Input placeholder="ว/ด/ป" /></Form.Item>
        <Form.Item name="farmer_name" label="ชื่อ-นามสกุล" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="plot_code" label="รหัสแปลง"><Input /></Form.Item>
        <Form.Item name="crop_name" label="ชื่อพืช"><Input /></Form.Item>
        <Form.Item name="plot_type" label="ชนิดของแปลง"><Input placeholder="DOA กรมวิชาการเกษตร" /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ปลูก(ไร่)"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
        <Form.Item name="production_volume_kg" label="ปริมาณการผลิต (กก.)"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
        <Form.Item name="plot_moo" label="แปลง หมู่"><Input /></Form.Item>
        <Form.Item name="plot_subdistrict" label="แปลง ตำบล"><Input /></Form.Item>
        <Form.Item name="plot_district" label="แปลง อำเภอ">
            <Select allowClear options={['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'].map(d => ({ label: d, value: d }))} />
        </Form.Item>
        <Form.Item name="farmer_moo" label="เกษตรกร หมู่"><Input /></Form.Item>
        <Form.Item name="farmer_subdistrict" label="เกษตรกร ตำบล"><Input /></Form.Item>
        <Form.Item name="farmer_district" label="เกษตรกร อำเภอ"><Input /></Form.Item>
    </>
);

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const COLORS = ['#1a7f37', '#0969da', '#bf8700', '#cf222e', '#8250df', '#0550ae', '#bc8c00', '#2da44e'];

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        let total = 0;
        payload.forEach(entry => { total += (entry.value || 0); });
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

export default function Certifications() {
    const [dashboardData, setDashboardData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters for charts
    const [filterCrop, setFilterCrop] = useState(null);
    const [filterDistrict, setFilterDistrict] = useState(null);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('certifications').select('*');
                if (error && error.code !== '42P01') throw error; // ignore if table doesn't exist yet
                setDashboardData(data || []);
            } catch (err) {
                console.error('Error fetching GAP data', err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    const cropOptions = useMemo(() => {
        const unique = [...new Set(dashboardData.map(d => d.crop_name).filter(Boolean))].sort();
        return unique.map(c => ({ label: c, value: c }));
    }, [dashboardData]);

    const districtOptions = useMemo(() => {
        const unique = [...new Set(dashboardData.map(d => d.plot_district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [dashboardData]);

    // Derived filtered data
    const filteredData = useMemo(() => {
        return dashboardData.filter(item => {
            if (filterCrop && item.crop_name !== filterCrop) return false;
            if (filterDistrict && item.plot_district !== filterDistrict) return false;
            return true;
        });
    }, [dashboardData, filterCrop, filterDistrict]);

    // Pie Chart: Area size by Crop
    const pieData = useMemo(() => {
        const sums = {};
        filteredData.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            sums[crop] = (sums[crop] || 0) + (Number(item.area_rai) || 0);
        });
        return Object.entries(sums)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 crops
    }, [filteredData]);

    // Bar Chart: Area size by district (stacked by Crop)
    const { barData, barGroups } = useMemo(() => {
        const sums = {};
        const groupSet = new Set();

        filteredData.forEach(item => {
            const dist = item.plot_district || 'ไม่ระบุอำเภอ';
            const crop = item.crop_name || 'ไม่ระบุพืช';

            if (!sums[dist]) sums[dist] = { name: dist, total: 0 };
            
            sums[dist][crop] = (sums[dist][crop] || 0) + (Number(item.area_rai) || 0);
            sums[dist].total += (Number(item.area_rai) || 0);
            groupSet.add(crop);
        });

        const barDataArray = Object.values(sums).sort((a, b) => b.total - a.total);
        const barGroupsArray = Array.from(groupSet).sort();
        
        return { barData: barDataArray, barGroups: barGroupsArray };
    }, [filteredData]);

    // Table filters config
    const tableFilterConfig = [
        { key: 'crop_name', label: 'ชื่อพืช', options: cropOptions.map(o => o.value) },
        { key: 'plot_district', label: 'อำเภอ (แปลง)', options: districtOptions.map(o => o.value).concat(districts) },
    ];

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปพื้นที่ปลูกมาตรฐาน GAP</span>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20,
                    padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>พืช:</span>
                        <Select
                            value={filterCrop}
                            onChange={setFilterCrop}
                            options={cropOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 150 }}
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
                        <Spin tip="กำลังโหลด..." />
                    </div>
                ) : (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card title="พื้นที่ปลูก (ไร่) แยกตามชนิดพืช (Top 8)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ไร่', 'พื้นที่']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล (รอการเพิ่มไฟล์ฐานข้อมูล)</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="ภาพรวมพื้นที่ปลูก (ไร่) แยกตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {barGroups.slice(0, 10).map((group, index) => (
                                                    <Bar key={group} dataKey={group} stackId="a" fill={COLORS[index % COLORS.length]} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล (รอการเพิ่มไฟล์ฐานข้อมูล)</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                )}
            </div>

            {/* ===== Data Table Section ===== */}
            <CrudTable
                tableName="certifications"
                title="ฐานข้อมูลมาตรฐาน GAP"
                columns={columns}
                formFields={formFields}
                searchField="farmer_name"
                searchFields={['farmer_name', 'plot_code', 'crop_name']}
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
