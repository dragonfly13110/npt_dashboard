import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Tag, Row, Col, Card, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { supabase } from '../../supabaseClient';
import EChart from '../../components/widgets/EChart';

// Columns exactly matching the user's Excel import format
const columns = [
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 110 },
    { title: 'รวมกลุ่ม', dataIndex: 'total_groups', key: 'total_groups', width: 100, align: 'right' },
    { title: 'วิสาหกิจ', dataIndex: 'community_enterprise_groups', key: 'community_enterprise_groups', width: 110, align: 'right' },
    { title: 'แม่บ้าน', dataIndex: 'housewives_groups', key: 'housewives_groups', width: 110, align: 'right' },
    { title: 'ยุวเกษตรกร', dataIndex: 'young_farmer_groups', key: 'young_farmer_groups', width: 110, align: 'right' },
    { title: 'ส่งเสริมอาชีพ', dataIndex: 'career_promotion_groups', key: 'career_promotion_groups', width: 120, align: 'right' },
    { title: 'กม.', dataIndex: 'village_farmers_count', key: 'village_farmers_count', width: 90, align: 'right' },
    { title: 'SF', dataIndex: 'smart_farmer_count', key: 'smart_farmer_count', width: 90, align: 'right' },
    { title: 'YSF', dataIndex: 'young_smart_farmer_count', key: 'young_smart_farmer_count', width: 90, align: 'right' },
];

const formFields = (
    <>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="total_groups" label="รวม_จำนวนกลุ่ม"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="community_enterprise_groups" label="วิสาหกิจชุมชน_กลุ่ม"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="housewives_groups" label="กลุ่มแม่บ้านเกษตรกร_กลุ่ม"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="young_farmer_groups" label="กลุ่มยุวเกษตรกร_กลุ่ม"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="career_promotion_groups" label="กลุ่มส่งเสริมอาชีพ_กลุ่ม"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="village_farmers_count" label="เกษตรกรหมู่บ้าน_ราย"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="smart_farmer_count" label="Smart_Farmer_ราย"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="young_smart_farmer_count" label="Young_Smart_Farmer_ราย"><InputNumber style={{ width: '100%' }} /></Form.Item>
    </>
);

const GROUP_TYPES = [
    { key: 'community_enterprise_groups', label: 'วิสาหกิจชุมชน', color: '#0969da' },
    { key: 'housewives_groups', label: 'กลุ่มแม่บ้านเกษตรกร', color: '#1a7f37' },
    { key: 'young_farmer_groups', label: 'กลุ่มยุวเกษตรกร', color: '#bf8700' },
    { key: 'career_promotion_groups', label: 'กลุ่มส่งเสริมอาชีพ', color: '#8250df' }
];

export default function FarmerInstitutes() {
    useEffect(() => {
        document.title = 'สถาบันเกษตรกรนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'ข้อมูลสถาบันเกษตรกรจังหวัดนครปฐม พร้อมกราฟสรุปการกระจายตัวและตารางรายการค้นหา');
    }, []);

    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);

    // Dashboard filters
    const [filterDistrict, setFilterDistrict] = useState(null);

    const loadData = useCallback(async () => {
        setChartLoading(true);
        try {
            const { data, error } = await supabase
                .from('farmer_institutes')
                .select('*');
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

    // Derive filter options
    const districtOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    // Apply Filters for Dashboard
    const filteredData = useMemo(() => {
        return chartData.filter(item => {
            if (filterDistrict && item.district !== filterDistrict) return false;
            return true;
        });
    }, [chartData, filterDistrict]);

    // Calculate Pie Chart Data
    const pieData = useMemo(() => {
        let sums = {
            community_enterprise_groups: 0,
            housewives_groups: 0,
            young_farmer_groups: 0,
            career_promotion_groups: 0
        };

        filteredData.forEach(item => {
            sums.community_enterprise_groups += Number(item.community_enterprise_groups) || 0;
            sums.housewives_groups += Number(item.housewives_groups) || 0;
            sums.young_farmer_groups += Number(item.young_farmer_groups) || 0;
            sums.career_promotion_groups += Number(item.career_promotion_groups) || 0;
        });

        return GROUP_TYPES.map(type => ({
            name: type.label,
            value: sums[type.key],
            color: type.color
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Calculate Stacked Bar Chart Data
    const barData = useMemo(() => {
        // Since each row is ideally one district, we can just group by district and sum,
        // just in case there are multiple entries for the same district.
        const districtMap = {};

        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!districtMap[dist]) {
                districtMap[dist] = {
                    name: dist,
                    community_enterprise_groups: 0,
                    housewives_groups: 0,
                    young_farmer_groups: 0,
                    career_promotion_groups: 0,
                    total: 0
                };
            }
            districtMap[dist].community_enterprise_groups += Number(item.community_enterprise_groups) || 0;
            districtMap[dist].housewives_groups += Number(item.housewives_groups) || 0;
            districtMap[dist].young_farmer_groups += Number(item.young_farmer_groups) || 0;
            districtMap[dist].career_promotion_groups += Number(item.career_promotion_groups) || 0;
            districtMap[dist].total += GROUP_TYPES.reduce((sum, type) => sum + (Number(item[type.key]) || 0), 0);
        });

        // Sort by total groups descending
        return Object.values(districtMap).sort((a, b) => {
            const totalA = a.community_enterprise_groups + a.housewives_groups + a.young_farmer_groups + a.career_promotion_groups;
            const totalB = b.community_enterprise_groups + b.housewives_groups + b.young_farmer_groups + b.career_promotion_groups;
            return totalB - totalA;
        });
    }, [filteredData]);

    const hasActiveFilter = !!filterDistrict;

    // Built-in Table Filters
    const tableFilterConfig = [
        { key: 'district', label: 'อำเภอ', options: districtOptions }
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
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลสถาบันเกษตรกร (รวม)</span>
                    <Tag color="green">
                        {hasActiveFilter
                            ? `แสดงผล ${filteredData.length} จาก ${chartData.length} อำเภอ`
                            : `รวมข้อมูลทั้งหมด`}
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
                    {hasActiveFilter && (
                        <a
                            onClick={() => setFilterDistrict(null)}
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
                            <Card title="สรุปสัดส่วนประเภทกลุ่ม" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {pieData.length > 0 ? (
                                        <EChart option={pieOption(pieData, { colors: GROUP_TYPES.map((type) => type.color), unit: 'กลุ่ม' })} />
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="จำนวนกลุ่มแยกตามอำเภอ (แยกประเภทกลุ่ม)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <EChart option={barOption(
                                            barData,
                                            GROUP_TYPES.map((type) => ({
                                                key: type.key,
                                                name: type.label,
                                                color: type.color,
                                                maxBarSize: 50,
                                            })),
                                            { colors: GROUP_TYPES.map((type) => type.color), unit: 'กลุ่ม', stacked: true, totalKey: 'total' }
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
                tableName="farmer_institutes" 
                title="รายการสถาบันเกษตรกร (รวม)" 
                columns={columns} 
                formFields={formFields} 
                searchField="district" 
                searchFields={['district']} 
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
