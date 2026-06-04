import { useMemo, useState } from 'react';
import { Card, Col, Form, Input, InputNumber, Row, Select, Spin, Statistic, Tag } from 'antd';
import { MedicineBoxOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { barOption } from '../../components/charts/echartOptions';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { getPublicSelectColumns } from '../../utils/dataPrivacy';
import EChart from '../../components/widgets/EChart';

const columns = [
    { title: 'ลำดับ', dataIndex: 'row_number', key: 'row_number', width: 80, align: 'center' },
    { title: 'ชื่อ-สกุล', dataIndex: 'full_name', key: 'full_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130 },
    { title: 'บ้านเลขที่', dataIndex: 'address_no', key: 'address_no', width: 100 },
    { title: 'หมู่', dataIndex: 'village_no', key: 'village_no', width: 80 },
    { title: 'จังหวัด', dataIndex: 'province', key: 'province', width: 100 },
    { title: 'เบอร์โทร', dataIndex: 'contact_phone', key: 'contact_phone', width: 140 },
    { title: 'หมายเหตุ', dataIndex: 'notes', key: 'notes', width: 180, ellipsis: true },
];

const formFields = (
    <>
        <Form.Item name="row_number" label="ลำดับ"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="full_name" label="ชื่อ-สกุล" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="address_no" label="บ้านเลขที่"><Input /></Form.Item>
        <Form.Item name="village_no" label="หมู่"><Input /></Form.Item>
        <Form.Item name="province" label="จังหวัด"><Input /></Form.Item>
        <Form.Item name="contact_phone" label="เบอร์โทร"><Input /></Form.Item>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item>
    </>
);

function countBy(rows, getter) {
    const counts = {};
    rows.forEach((row) => {
        const key = getter(row) || 'ไม่ระบุ';
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
}

export default function PlantDoctors() {
    const { role } = useAuth();
    const [filterDistrict, setFilterDistrict] = useState(null);

    const fetchPlantDoctors = async () => {
        const selectColumns = getPublicSelectColumns('plant_doctors', columns, role);
        const { data, error } = await supabase
            .from('plant_doctors')
            .select(selectColumns)
            .order('row_number', { ascending: true });
        if (error) throw error;
        return data || [];
    };

    const { data: doctors = [], isLoading } = useApiCache(
        ['all-plant-doctors', role],
        fetchPlantDoctors,
        { staleMinutes: 10 }
    );

    const districtOptions = useMemo(() => {
        const unique = [...new Set(doctors.map(row => row.district).filter(Boolean))].sort();
        return unique.map(value => ({ label: value, value }));
    }, [doctors]);

    const filteredDoctors = useMemo(() => (
        doctors.filter(row => !filterDistrict || row.district === filterDistrict)
    ), [doctors, filterDistrict]);

    const districtSummary = useMemo(() => countBy(filteredDoctors, row => row.district), [filteredDoctors]);
    const phoneCount = useMemo(() => doctors.filter(row => String(row.contact_phone || '').trim()).length, [doctors]);
    const subdistrictCount = useMemo(() => new Set(doctors.map(row => row.subdistrict).filter(Boolean)).size, [doctors]);
    const tableFilterConfig = useMemo(() => [
        { key: 'district', label: 'อำเภอ', options: districtOptions },
    ], [districtOptions]);

    return (
        <div>
            <div style={{
                padding: 20,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e8ecf0',
                marginBottom: 24
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <MedicineBoxOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลหมอพืชชุมชนจังหวัดนครปฐม</span>
                    <Tag color="green">
                        {filterDistrict ? `${filteredDoctors.length} / ${doctors.length} ราย` : `${doctors.length} ราย`}
                    </Tag>
                </div>

                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                        <Card size="small">
                            <Statistic title="หมอพืชทั้งหมด" value={doctors.length} suffix="ราย" prefix={<TeamOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small">
                            <Statistic
                                title={role === 'guest' ? 'ตำบลที่ครอบคลุม' : 'มีเบอร์โทร'}
                                value={role === 'guest' ? subdistrictCount : phoneCount}
                                suffix={role === 'guest' ? 'ตำบล' : 'ราย'}
                                prefix={<PhoneOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small">
                            <Statistic title="อำเภอที่ครอบคลุม" value={districtOptions.length} suffix="อำเภอ" />
                        </Card>
                    </Col>
                </Row>

                <div style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 20,
                    padding: '12px 16px',
                    background: '#f6f8fa',
                    borderRadius: 8,
                    border: '1px solid #e8ecf0'
                }}>
                    <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500, alignSelf: 'center' }}>อำเภอ:</span>
                    <Select
                        value={filterDistrict}
                        onChange={setFilterDistrict}
                        options={districtOptions}
                        placeholder="ทั้งหมด"
                        allowClear
                        style={{ minWidth: 170 }}
                        size="small"
                    />
                </div>

                {isLoading ? (
                    <div style={{ height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Spin tip="กำลังโหลดข้อมูล..." />
                    </div>
                ) : (
                    <Card title="หมอพืชแยกตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                        <div style={{ height: 320 }}>
                            <EChart option={barOption(
                                districtSummary,
                                [{ key: 'total', name: 'หมอพืช', color: '#1a7f37', maxBarSize: 48 }],
                                { categoryKey: 'name', unit: 'ราย', layout: 'vertical', grid: { left: 120 } }
                            )} />
                        </div>
                    </Card>
                )}
            </div>

            <CrudTable
                tableName="plant_doctors"
                title="ทำเนียบหมอพืชชุมชนจังหวัดนครปฐม"
                columns={columns}
                formFields={formFields}
                searchField="full_name"
                searchFields={['full_name', 'district', 'subdistrict', 'contact_phone']}
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
