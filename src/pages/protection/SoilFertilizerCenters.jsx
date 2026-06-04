import { useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Tag, Row, Col, Card, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { barOption, pieOption, getCropColor } from '../../components/charts/echartOptions';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from '../../components/widgets/EChart';

const GRADE_COLORS = {
    'A+': '#055160', // Dark teal
    'A': '#1a7f37', // Green
    'B': '#0969da', // Blue
    'C': '#bf8700', // Yellow
    'ไม่ระบุ': '#656d76', // Gray
};

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4'];

const columns = [
    { title: 'วันที่ออกหนังสือรับรอง', dataIndex: 'cert_date', key: 'cert_date', width: 170 },
    { title: 'ปีที่จัดตั้ง_พ.ศ.', dataIndex: 'established_year_th', key: 'established_year_th', width: 120 },
    { title: 'ปีที่จัดตั้ง_ค.ศ.', dataIndex: 'established_year_en', key: 'established_year_en', width: 120 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ชื่อ_ศดปช', dataIndex: 'center_name', key: 'center_name', width: 220 },
    { title: 'ระดับ', dataIndex: 'grade_level', key: 'grade_level', width: 80, align: 'center' },
    { title: 'เลขที่', dataIndex: 'address_no', key: 'address_no', width: 80 },
    { title: 'หมู่', dataIndex: 'village_no', key: 'village_no', width: 80 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130 },
    { title: 'ประธาน/ผู้แทน', dataIndex: 'chairman', key: 'chairman', width: 190 },
    { title: 'เบอร์โทรศัพท์', dataIndex: 'contact_phone', key: 'contact_phone', width: 120 },
    { title: 'จำนวนสมาชิก_ราย', dataIndex: 'member_count', key: 'member_count', width: 130, align: 'right' },
    { title: 'พืชหลัก', dataIndex: 'main_crop_type', key: 'main_crop_type', width: 150 },
    { title: 'กลุ่มประเภท', dataIndex: 'group_type', key: 'group_type', width: 150 }
];

const formFields = (
    <>
        <Form.Item name="cert_date" label="วันที่ออกหนังสือรับรอง"><Input placeholder="เช่น 12/5/2021" /></Form.Item>
        <Form.Item name="established_year_th" label="ปีที่จัดตั้ง_พ.ศ."><Input /></Form.Item>
        <Form.Item name="established_year_en" label="ปีที่จัดตั้ง_ค.ศ."><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="center_name" label="ชื่อ_ศดปช" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="grade_level" label="ระดับ"><Input placeholder="เช่น A+, A, B" /></Form.Item>
        <Form.Item name="address_no" label="เลขที่"><Input /></Form.Item>
        <Form.Item name="village_no" label="หมู่"><Input /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="chairman" label="ประธาน/ผู้แทน"><Input placeholder="เช่น นาย... หรือ รองประธาน รักษาการแทนประธาน" /></Form.Item>
        <Form.Item name="contact_phone" label="เบอร์โทรศัพท์"><Input /></Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก_ราย"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="main_crop_type" label="พืชหลัก"><Input /></Form.Item>
        <Form.Item name="group_type" label="กลุ่มประเภท"><Input placeholder="เช่น ศดปช.หลัก, ศดปช.เครือข่าย" /></Form.Item>
    </>
);

export default function SoilFertilizerCenters() {
    // Dashboard filters
    const [filterDistrict, setFilterDistrict] = useState(null);
    const [filterGradeLevel, setFilterGradeLevel] = useState(null);
    const [filterCropType, setFilterCropType] = useState(null);

    const fetchSoilFertilizerCenters = async () => {
        const { data, error } = await supabase
            .from('soil_fertilizer_centers')
            .select('*');
        if (error) throw error;
        return data || [];
    };

    const { data: chartData = [], isLoading: chartLoading } = useApiCache(
        ['all-soil-fertilizer-centers'], 
        fetchSoilFertilizerCenters, 
        { staleMinutes: 10 }
    );

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
            .map(([name, value]) => ({ name, value, color: getCropColor(name) }))
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
            const order = { 'A+': 1, 'A': 2, 'B': 3, 'C': 4, 'ไม่ระบุ': 5 };
            return (order[a] || 9) - (order[b] || 9);
        });
        
        return { barData: sortedBarData, barGroups: sortedTypeGroups };
    }, [filteredData]);

    const hasActiveFilter = filterDistrict || filterGradeLevel || filterCropType;

    // Built-in Table Filters
    const tableFilterConfig = [
        { key: 'district', label: 'อำเภอ', options: districtOptions },
        { key: 'grade_level', label: 'ระดับ', options: gradeOptions },
        { key: 'main_crop_type', label: 'พืชหลัก', options: cropOptions }
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
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.)</span>
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
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>พืชหลัก:</span>
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
                            <Card title="สรุปตามพืชหลัก" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {pieData.length > 0 ? (
                                        <EChart option={pieOption(pieData, { colors: CHART_COLORS, unit: 'ศูนย์' })} />
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
                                        <EChart option={barOption(
                                            barData,
                                            barGroups.map((type) => ({
                                                key: type,
                                                name: `ระดับ ${type}`,
                                                color: GRADE_COLORS[type] || '#8250df',
                                                maxBarSize: 50,
                                            })),
                                            { colors: CHART_COLORS, unit: 'ศูนย์', stacked: true, totalKey: 'total' }
                                        )} />
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
                tableName="soil_fertilizer_centers" 
                title="รายชื่อศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.)" 
                columns={columns} 
                formFields={formFields} 
                searchField="center_name" 
                searchFields={['center_name', 'district', 'chairman', 'main_crop_type']}
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
