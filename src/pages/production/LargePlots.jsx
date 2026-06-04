import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Spin, Row, Col, Card } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import CrudTable from '../../components/DataTable/CrudTable';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from '../../components/widgets/EChart';
import { useAuth } from '../../contexts/AuthContext';
import { getPublicSelectColumns } from '../../utils/dataPrivacy';

const columns = [
    { title: 'รหัส', dataIndex: 'code', key: 'code', width: 80, sorter: (a, b) => (Number(a.code) || 0) - (Number(b.code) || 0) },
    { title: 'ปี', dataIndex: 'year', key: 'year', width: 80, align: 'center', sorter: (a, b) => (a.year || 0) - (b.year || 0) },
    { title: 'กลุ่มสินค้า', dataIndex: 'commodity_group', key: 'commodity_group', width: 120, sorter: (a, b) => String(a.commodity_group || '').localeCompare(String(b.commodity_group || ''), 'th') },
    { title: 'สินค้าหลัก', dataIndex: 'commodity', key: 'commodity', width: 110, sorter: (a, b) => String(a.commodity || '').localeCompare(String(b.commodity || ''), 'th') },
    { title: 'สินค้ารอง', dataIndex: 'secondary_commodity', key: 'secondary_commodity', width: 110, sorter: (a, b) => String(a.secondary_commodity || '').localeCompare(String(b.secondary_commodity || ''), 'th') },
    { title: 'ชื่อแปลงใหญ่', dataIndex: 'plot_name', key: 'plot_name', width: 260, sorter: (a, b) => String(a.plot_name || '').localeCompare(String(b.plot_name || ''), 'th') },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 110, sorter: (a, b) => String(a.district || '').localeCompare(String(b.district || ''), 'th') },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 100, sorter: (a, b) => String(a.subdistrict || '').localeCompare(String(b.subdistrict || ''), 'th') },
    { title: 'โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 110, hideForGuest: true },
    { title: 'เกษตรกร', dataIndex: 'member_count', key: 'member_count', width: 90, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.member_count || 0) - (b.member_count || 0) },
    { title: 'พื้นที่', dataIndex: 'area_rai', key: 'area_rai', width: 90, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.area_rai || 0) - (b.area_rai || 0) },
    { title: 'หน่วยงาน', dataIndex: 'agency', key: 'agency', width: 120, sorter: (a, b) => String(a.agency || '').localeCompare(String(b.agency || ''), 'th') },
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

export default function LargePlots() {
    const { role } = useAuth();

    useEffect(() => {
        document.title = 'แปลงใหญ่จังหวัดนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'ข้อมูลแปลงใหญ่จังหวัดนครปฐม พร้อมแผนภูมิ สถิติ และตารางค้นหาข้อมูลตามอำเภอและปี');
    }, []);

    // Filters for charts
    const [filterYear, setFilterYear] = useState(null);
    const [filterDistrict, setFilterDistrict] = useState(null);

    const fetchLargePlots = async () => {
        const { data, error } = await supabase
            .from('large_plots')
            .select(getPublicSelectColumns('large_plots', columns, role));
        if (error) throw error;
        return data || [];
    };

    const { data: dashboardData = [], isLoading: loading } = useApiCache(['large_plots_page', role], fetchLargePlots);

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
                                        <EChart option={pieOption(pieData, { colors: COLORS, unit: 'แปลง' })} />
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
                                        <EChart option={barOption(
                                            barData,
                                            barGroups.map((group, index) => ({
                                                key: group,
                                                name: group,
                                                color: COLORS[index % COLORS.length],
                                                maxBarSize: 50,
                                            })),
                                            { colors: COLORS, unit: 'แปลง', stacked: true, totalKey: 'total' }
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

            {/* ===== Data Table Section ===== */}
            <CrudTable
                tableName="large_plots"
                title="ข้อมูลแปลงใหญ่"
                columns={columns}
                formFields={formFields}
                searchField="plot_name"
                filterConfig={filterConfig}
                scrollX={1100}
            />
        </div>
    );
}
