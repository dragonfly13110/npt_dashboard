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
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 90, fixed: 'left', importHeader: 'อำเภอ' },
    { title: 'หมู่บ้าน', dataIndex: 'villages_count', key: 'villages_count', width: 80, align: 'right', importHeader: 'จำนวนหมู่บ้าน', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ตำบล', dataIndex: 'subdistricts_count', key: 'subdistricts_count', width: 70, align: 'right', importHeader: 'จำนวนตำบล', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ครัวเรือน<br/>เกษตรกร</div>, importHeader: 'จำนวนครัวเรือนเกษตรกร_ครัวเรือน', dataIndex: 'farmer_households', key: 'farmer_households', width: 100, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>พื้นที่<br/>ทั้งหมด (ไร่)</div>, importHeader: 'พื้นที่ทั้งหมด_ไร่', dataIndex: 'total_area_rai', key: 'total_area_rai', width: 100, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>พื้นที่ด่านพืช<br/>(ไร่)</div>, importHeader: 'พื้นที่การเกษตรด้านพืช_ไร่', dataIndex: 'agri_crop_area_rai', key: 'agri_crop_area_rai', width: 100, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ข้าวนาปี', dataIndex: 'rice_in_season_rai', key: 'rice_in_season_rai', width: 90, align: 'right', importHeader: 'ข้าวนาปี_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ข้าวนาปรัง', dataIndex: 'rice_off_season_rai', key: 'rice_off_season_rai', width: 90, align: 'right', importHeader: 'ข้าวนาปรัง_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'พืชไร่', dataIndex: 'field_crops_rai', key: 'field_crops_rai', width: 80, align: 'right', importHeader: 'พืชไร่_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'พืชสวน', dataIndex: 'horticulture_rai', key: 'horticulture_rai', width: 80, align: 'right', importHeader: 'พืชสวน_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ไม้ผล<br/>ไม้ยืนต้น</div>, importHeader: 'ไม้ผลไม้ยืนต้น_ไร่', dataIndex: 'fruit_trees_rai', key: 'fruit_trees_rai', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'พืชผัก', dataIndex: 'vegetables_rai', key: 'vegetables_rai', width: 80, align: 'right', importHeader: 'พืชผัก_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ไม้ดอก<br/>ไม้ประดับ</div>, importHeader: 'ไม้ดอกไม้ประดับ_ไร่', dataIndex: 'flowers_rai', key: 'flowers_rai', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>สมุนไพร<br/>เครื่องเทศ</div>, importHeader: 'สมุนไพรเครื่องเทศ_ไร่', dataIndex: 'herbs_spices_rai', key: 'herbs_spices_rai', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
];

const formFields = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="villages_count" label="จำนวนหมู่บ้าน"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="subdistricts_count" label="จำนวนตำบล"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="farmer_households" label="จำนวนครัวเรือนเกษตรกร_ครัวเรือน"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="total_area_rai" label="พื้นที่ทั้งหมด_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="agri_crop_area_rai" label="พื้นที่การเกษตรด้านพืช_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="rice_in_season_rai" label="ข้าวนาปี_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="rice_off_season_rai" label="ข้าวนาปรัง_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="field_crops_rai" label="พืชไร่_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="horticulture_rai" label="พืชสวน_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="fruit_trees_rai" label="ไม้ผลไม้ยืนต้น_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="vegetables_rai" label="พืชผัก_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="flowers_rai" label="ไม้ดอกไม้ประดับ_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="herbs_spices_rai" label="สมุนไพรเครื่องเทศ_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
    </div>
);

const CROP_TYPES = [
    { key: 'rice_in_season_rai', label: 'ข้าวนาปี', color: '#ffd54f' },
    { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง', color: '#ffca28' },
    { key: 'field_crops_rai', label: 'พืชไร่', color: '#8d6e63' },
    { key: 'horticulture_rai', label: 'พืชสวน', color: '#66bb6a' },
    { key: 'fruit_trees_rai', label: 'ไม้ผลไม้ยืนต้น', color: '#388e3c' },
    { key: 'vegetables_rai', label: 'พืชผัก', color: '#81c784' },
    { key: 'flowers_rai', label: 'ไม้ดอกไม้ประดับ', color: '#f06292' },
    { key: 'herbs_spices_rai', label: 'สมุนไพรเครื่องเทศ', color: '#a1887f' }
];

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        let total = 0;
        payload.forEach(entry => { total += (entry.value || 0); });
        
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    entry.value > 0 && (
                        <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                            {entry.name} : {Number(entry.value).toLocaleString()} ไร่
                        </div>
                    )
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมพื้นที่เพาะปลูก : {total.toLocaleString()} ไร่
                </div>
            </div>
        );
    }
    return null;
};

export default function AgriculturalAreas() {
    const [filterDistrict, setFilterDistrict] = useState(null);

    const fetchAgriAreas = async () => {
        const { data, error } = await supabase
            .from('agricultural_areas')
            .select('*')
            .neq('district', 'รวม'); // Don't chart the "Total" row if imported
        if (error) throw error;
        return data || [];
    };

    const { data: chartData = [], isLoading: chartLoading } = useApiCache(
        ['all-agricultural-areas'], 
        fetchAgriAreas, 
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

    const pieData = useMemo(() => {
        let sums = {};
        CROP_TYPES.forEach(t => sums[t.key] = 0);

        filteredData.forEach(item => {
            CROP_TYPES.forEach(t => {
                sums[t.key] += Number(item[t.key]) || 0;
            });
        });

        return CROP_TYPES.map(type => ({
            name: type.label,
            value: sums[type.key],
            color: type.color
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const barData = useMemo(() => {
        const districtMap = {};

        filteredData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!districtMap[dist]) {
                districtMap[dist] = { name: dist };
                CROP_TYPES.forEach(t => districtMap[dist][t.key] = 0);
            }
            CROP_TYPES.forEach(t => {
                districtMap[dist][t.key] += Number(item[t.key]) || 0;
            });
        });

        return Object.values(districtMap).sort((a, b) => {
            let totalA = 0, totalB = 0;
            CROP_TYPES.forEach(t => { totalA += a[t.key]; totalB += b[t.key]; });
            return totalB - totalA;
        });
    }, [filteredData]);

    const hasActiveFilter = !!filterDistrict;

    const tableFilterConfig = [
        { key: 'district', label: 'อำเภอ', options: districtOptions }
    ];

    return (
        <div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปพื้นที่การเกษตร แยกตามชนิดพืช</span>
                    <Tag color="green">
                        {hasActiveFilter
                            ? `แสดงผล ${filteredData.length} จาก ${chartData.length} อำเภอ`
                            : `รวมข้อมูลทั้งหมด`}
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
                            <Card title="สรุปสัดส่วนพื้นที่เพาะปลูกพืช" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [Number(value).toLocaleString() + ' ไร่', 'พื้นที่']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="พื้นที่เพาะปลูกพืชแยกตามอำเภอ (แยกชนิดพืช)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 350 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} tickFormatter={(val) => (val/1000).toFixed(0) + 'k'} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} verticalAlign="bottom" height={40} />
                                                {CROP_TYPES.map((type) => (
                                                    <Bar 
                                                        key={type.key} 
                                                        dataKey={type.key} 
                                                        name={type.label}
                                                        stackId="a" 
                                                        fill={type.color} 
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

            <CrudTable 
                tableName="agricultural_areas" 
                title="รายการพื้นที่การเกษตร" 
                columns={columns} 
                formFields={formFields} 
                searchField="district" 
                searchFields={['district']} 
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
