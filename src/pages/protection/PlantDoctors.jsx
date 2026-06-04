import { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Spin, Tag } from 'antd';
import {
    ApartmentOutlined,
    BarChartOutlined,
    EnvironmentOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    TeamOutlined,
} from '@ant-design/icons';
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

function formatNumber(value, digits = 0) {
    return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: digits });
}

function SummaryTile({ icon, label, value, suffix, accent = '#0f766e', tone = '#ecfdf5' }) {
    return (
        <div style={{
            minHeight: 102,
            padding: '16px 18px',
            background: `linear-gradient(135deg, ${tone} 0%, #ffffff 100%)`,
            border: `1px solid color-mix(in srgb, ${accent} 22%, #e2e8f0)`,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 12px 28px -24px rgba(15, 23, 42, 0.45)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>{label}</span>
                <span style={{ color: accent, fontSize: 18 }}>{icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: '#0f172a' }}>
                <strong style={{ fontSize: 28, lineHeight: 1, color: accent }}>{value}</strong>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>{suffix}</span>
            </div>
        </div>
    );
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
    const subdistrictSummary = useMemo(() => countBy(filteredDoctors, row => row.subdistrict).slice(0, 8), [filteredDoctors]);
    const subdistrictCount = useMemo(() => new Set(filteredDoctors.map(row => row.subdistrict).filter(Boolean)).size, [filteredDoctors]);
    const districtCount = districtSummary.filter(row => row.name !== 'ไม่ระบุ').length;
    const averagePerDistrict = districtCount > 0 ? filteredDoctors.length / districtCount : 0;
    const hasActiveFilter = Boolean(filterDistrict);
    const tableFilterConfig = useMemo(() => [
        { key: 'district', label: 'อำเภอ', options: districtOptions },
    ], [districtOptions]);

    return (
        <div>
            <div style={{
                padding: 22,
                background: 'linear-gradient(135deg, #f8fffb 0%, #ffffff 58%, #f8fbff 100%)',
                borderRadius: 12,
                border: '1px solid #dbe7df',
                marginBottom: 24,
                boxShadow: '0 18px 50px -34px rgba(15, 23, 42, 0.45)',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <MedicineBoxOutlined style={{ fontSize: 19, color: '#0f766e' }} />
                            <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>สรุปหมอพืชชุมชนจังหวัดนครปฐม</span>
                            <Tag color="green">
                                {hasActiveFilter ? `${filteredDoctors.length} / ${doctors.length} ราย` : `${doctors.length} ราย`}
                            </Tag>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>
                            สรุปจากข้อมูลพื้นที่ที่เปิดเผยได้: อำเภอ ตำบล และจำนวนรายชื่อในระบบ
                        </div>
                    </div>
                    {hasActiveFilter && (
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => setFilterDistrict(null)}
                        >
                            ล้างตัวกรอง
                        </Button>
                    )}
                </div>

                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} xl={6}>
                        <SummaryTile
                            icon={<TeamOutlined />}
                            label={hasActiveFilter ? 'หมอพืชในอำเภอที่เลือก' : 'หมอพืชทั้งหมด'}
                            value={formatNumber(filteredDoctors.length)}
                            suffix="ราย"
                            accent="#0f766e"
                            tone="#ecfdf5"
                        />
                    </Col>
                    <Col xs={24} sm={12} xl={6}>
                        <SummaryTile
                            icon={<EnvironmentOutlined />}
                            label="อำเภอที่ครอบคลุม"
                            value={formatNumber(districtCount)}
                            suffix="อำเภอ"
                            accent="#2563eb"
                            tone="#eff6ff"
                        />
                    </Col>
                    <Col xs={24} sm={12} xl={6}>
                        <SummaryTile
                            icon={<ApartmentOutlined />}
                            label="ตำบลที่มีข้อมูล"
                            value={formatNumber(subdistrictCount)}
                            suffix="ตำบล"
                            accent="#7c3aed"
                            tone="#f5f3ff"
                        />
                    </Col>
                    <Col xs={24} sm={12} xl={6}>
                        <SummaryTile
                            icon={<BarChartOutlined />}
                            label="เฉลี่ยต่ออำเภอ"
                            value={formatNumber(averagePerDistrict, 1)}
                            suffix="ราย"
                            accent="#b45309"
                            tone="#fff7ed"
                        />
                    </Col>
                </Row>

                <div style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 20,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.78)',
                    borderRadius: 8,
                    border: '1px solid #dbe7df'
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
                    <Row gutter={[18, 18]}>
                        <Col xs={24} lg={14}>
                            <Card title="จำนวนหมอพืชชุมชนรายอำเภอ" size="small" bordered={false} style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 10 }}>
                                <div style={{ height: 300 }}>
                                    <EChart option={barOption(
                                        districtSummary,
                                        [{ key: 'total', name: 'หมอพืช', color: '#0f766e', maxBarSize: 34 }],
                                        { categoryKey: 'name', unit: 'ราย', totalKey: 'total', grid: { left: 36, right: 18, bottom: 34 } }
                                    )} />
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={10}>
                            <Card title="ตำบลที่มีรายชื่อมากสุด" size="small" bordered={false} style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 10 }}>
                                <div style={{ height: 300 }}>
                                    <EChart option={barOption(
                                        subdistrictSummary,
                                        [{ key: 'total', name: 'หมอพืช', color: '#2563eb', maxBarSize: 24 }],
                                        { categoryKey: 'name', unit: 'ราย', layout: 'vertical', grid: { left: 104, right: 18, bottom: 28 } }
                                    )} />
                                </div>
                            </Card>
                        </Col>
                    </Row>
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
