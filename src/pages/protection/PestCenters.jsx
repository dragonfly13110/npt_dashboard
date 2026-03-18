import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Tag, Row, Col, Card, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';

const GRADE_LEVELS = ['A', 'B', 'C', 'ไม่ระบุ'];

const GRADE_COLORS = {
    'A': '#1a7f37', // Green
    'B': '#0969da', // Blue
    'C': '#bf8700', // Yellow
    'ไม่ระบุ': '#656d76', // Gray
};

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4'];

const columns = [
    { title: 'ชื่อ_ศจช', dataIndex: 'center_name', key: 'center_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130 },
    { title: 'ปีที่จัดตั้ง_พ.ศ.', dataIndex: 'established_year_th', key: 'established_year_th', width: 100 },
    { title: 'ปีที่จัดตั้ง_ค.ศ.', dataIndex: 'established_year_en', key: 'established_year_en', width: 100 },
    { title: 'ระดับชั้น', dataIndex: 'grade_level', key: 'grade_level', width: 80, align: 'center' },
    { title: 'สมาชิก_ราย', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
    { title: 'ชนิดพืชหลัก', dataIndex: 'main_crop_type', key: 'main_crop_type', width: 150, ellipsis: true },
    { title: 'พื้นที่ตั้ง', dataIndex: 'location_type', key: 'location_type', width: 180, ellipsis: true },
    { title: 'ชื่อ_สกุล_ประธาน', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'สถานะอื่นๆ', dataIndex: 'other_status', key: 'other_status', width: 150, ellipsis: true },
    { title: 'เบอร์ติดต่อ', dataIndex: 'contact_phone', key: 'contact_phone', width: 120 },
];

const formFields = (
    <>
        <Form.Item name="center_name" label="ชื่อ_ศจช (ชื่อศูนย์)" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="established_year_th" label="ปีที่จัดตั้ง_พ.ศ."><Input /></Form.Item>
        <Form.Item name="established_year_en" label="ปีที่จัดตั้ง_ค.ศ."><Input /></Form.Item>
        <Form.Item name="grade_level" label="ระดับชั้น"><Input placeholder="เช่น A, B, C" /></Form.Item>
        <Form.Item name="member_count" label="สมาชิก_ราย"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="main_crop_type" label="ชนิดพืชหลัก"><Input /></Form.Item>
        <Form.Item name="location_type" label="พื้นที่ตั้ง"><Input placeholder="เช่น พื้นที่ปกติ/ทั่วไป" /></Form.Item>
        <Form.Item name="chairman" label="ชื่อ_สกุล_ประธาน"><Input /></Form.Item>
        <Form.Item name="other_status" label="สถานะอื่นๆ"><Input placeholder="เช่น ศดปช." /></Form.Item>
        <Form.Item name="contact_phone" label="เบอร์ติดต่อ"><Input /></Form.Item>
    </>
);

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value} ศูนย์
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} ศูนย์
                </div>
            </div>
        );
    }
    return null;
};

export default function PestCenters() {
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);

    // Dashboard filters
    const [filterDistrict, setFilterDistrict] = useState(null);
    const [filterGradeLevel, setFilterGradeLevel] = useState(null);
    const [filterCropType, setFilterCropType] = useState(null);

    const loadData = useCallback(async () => {
        setChartLoading(true);
        try {
            const { data, error } = await supabase
                .from('pest_centers')
                .select('*');
            if (error) throw error;
            setChartData(data || []);
        } catch (err) {
            console.error('Error loading pest centers data:', err);
        } finally {
            setChartLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Derive filter options
    const districtOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    const gradeOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.grade_level).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    const cropOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.main_crop_type).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    // Apply Filters for Dashboard
    const filteredData = useMemo(() => {
        return chartData.filter(item => {
            if (filterDistrict && item.district !== filterDistrict) return false;
            if (filterGradeLevel && item.grade_level !== filterGradeLevel) return false;
            if (filterCropType && item.main_crop_type !== filterCropType) return false;
            return true;
        });
    }, [chartData, filterDistrict, filterGradeLevel, filterCropType]);

    // Calculate Pie Chart Data (Crop Type)
    const pieData = useMemo(() => {
        const counts = {};
        filteredData.forEach(item => {
            const crop = item.main_crop_type || 'ไม่ระบุ';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Calculate Stacked Bar Chart Data (District & Grade Level)
    const { barData, barGroups } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();

        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const grade = item.grade_level || 'ไม่ระบุ';

            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            
            counts[dist][grade] = (counts[dist][grade] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(grade);
        });

        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypeGroups = Array.from(typeSet).sort((a, b) => {
            const order = { 'A': 1, 'B': 2, 'C': 3, 'ไม่ระบุ': 4 };
            return (order[a] || 9) - (order[b] || 9);
        });
        
        return { barData: sortedBarData, barGroups: sortedTypeGroups };
    }, [filteredData]);

    const hasActiveFilter = filterDistrict || filterGradeLevel || filterCropType;

    // Built-in Table Filters
    const tableFilterConfig = [
        { key: 'district', label: 'อำเภอ', options: districtOptions },
        { key: 'grade_level', label: 'ระดับชั้น', options: gradeOptions },
        { key: 'main_crop_type', label: 'ชนิดพืช', options: cropOptions }
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
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลศูนย์จัดการศัตรูพืชชุมชน (ศจช.)</span>
                    <Tag color="green">
                        {hasActiveFilter
                            ? `${filteredData.length} / ${chartData.length} ศูนย์`
                            : `${chartData.length} ศูนย์`
                        }
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
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>ระดับชั้น:</span>
                        <Select
                            value={filterGradeLevel}
                            onChange={setFilterGradeLevel}
                            options={gradeOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 140 }}
                            size="small"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>ชนิดพืชหลัก:</span>
                        <Select
                            value={filterCropType}
                            onChange={setFilterCropType}
                            options={cropOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 140 }}
                            size="small"
                        />
                    </div>
                    {hasActiveFilter && (
                        <a
                            onClick={() => { setFilterDistrict(null); setFilterGradeLevel(null); setFilterCropType(null); }}
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
                        <Col xs={24} lg={12}>
                            <Card title="สรุปตามชนิดพืชหลัก" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                            <Card title="สรุปตามอำเภอ (แยกตามระดับชั้น)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {barGroups.map((type) => (
                                                    <Bar 
                                                        key={type} 
                                                        dataKey={type} 
                                                        name={`ระดับ ${type}`}
                                                        stackId="a" 
                                                        fill={GRADE_COLORS[type] || '#8250df'} 
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
                tableName="pest_centers" 
                title="รายชื่อศูนย์จัดการศัตรูพืชชุมชน (ศจช.)" 
                columns={columns} 
                formFields={formFields} 
                searchField="center_name" 
                searchFields={['center_name', 'district', 'chairman', 'main_crop_type']}
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
