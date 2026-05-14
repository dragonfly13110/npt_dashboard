import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Popover, Progress, Row, Select, Space, Spin, Statistic, Table, Tag, message } from 'antd';
import { AppstoreOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EnvironmentOutlined, FileExcelOutlined, PlusOutlined, SearchOutlined, ShopOutlined, TeamOutlined, TrophyOutlined, UploadOutlined, WalletOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import CsvImportModal from '../../components/DataTable/CsvImportModal';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';
import districtGeoJSON from '../../data/nakhon_pathom_districts.json';

const baseColumns = [
    { title: 'ชื่อกลุ่ม', dataIndex: 'group_name', key: 'group_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ประธาน', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
];

const formFields = (
    <>
        <Form.Item name="group_name" label="ชื่อกลุ่ม" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
        <Form.Item name="district" label="อำเภอ">
            <Input />
        </Form.Item>
        <Form.Item name="chairman" label="ประธาน">
            <Input />
        </Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก">
            <InputNumber style={{ width: '100%' }} />
        </Form.Item>
    </>
);

const money = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('th-TH');

const hasValue = (value) => value !== null && value !== undefined && value !== '';
const yes = (value) => String(value || '').trim() === 'มี';
const HOUSEWIFE_TABLE = 'housewife_farmer_groups';

function countBy(rows, key) {
    const map = new Map();
    rows.forEach((row) => {
        const label = row[key] || 'ไม่ระบุ';
        map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function sum(rows, key) {
    return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function StatCard({ title, value, suffix, icon, color }) {
    return (
        <Card styles={{ body: { padding: 18 } }} style={{ height: '100%' }}>
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Statistic title={title} value={value} suffix={suffix} valueStyle={{ fontSize: 26, fontWeight: 700 }} />
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: 20,
                    background: color,
                }}>
                    {icon}
                </div>
            </Space>
        </Card>
    );
}

function RankedList({ title, rows, suffix = 'กลุ่ม' }) {
    const max = rows[0]?.[1] || 1;
    return (
        <Card title={title} style={{ height: '100%' }} styles={{ body: { paddingTop: 8 } }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {rows.slice(0, 6).map(([label, value]) => (
                    <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                            <span style={{ color: '#57606a', flexShrink: 0 }}>{number.format(value)} {suffix}</span>
                        </div>
                        <Progress percent={Math.round((value / max) * 100)} showInfo={false} strokeColor="#1a7f37" />
                    </div>
                ))}
            </Space>
        </Card>
    );
}

function YearComparison({ rows }) {
    const byYear = countBy(rows, 'year').sort((a, b) => Number(a[0]) - Number(b[0]));
    const max = Math.max(...byYear.map(([, value]) => value), 1);

    return (
        <Card title="จำนวนกลุ่มแยกตามปี" style={{ height: '100%' }} styles={{ body: { paddingTop: 8 } }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {byYear.map(([label, value]) => (
                    <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700 }}>{label}</span>
                            <span style={{ color: '#57606a' }}>{number.format(value)} กลุ่ม</span>
                        </div>
                        <Progress percent={Math.round((value / max) * 100)} showInfo={false} strokeColor="#0969da" />
                    </div>
                ))}
            </Space>
        </Card>
    );
}

function HousewifeMap({ rows, year }) {
    const [MapComponents, setMapComponents] = useState(null);

    useEffect(() => {
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
        ]).then(([L, RL]) => {
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    const points = useMemo(() => rows
        .filter((row) => row.year === year && hasValue(row.lat) && hasValue(row.lon))
        .map((row) => ({ ...row, lat: Number(row.lat), lon: Number(row.lon) }))
        .filter((row) => !Number.isNaN(row.lat) && !Number.isNaN(row.lon)), [rows, year]);

    if (!MapComponents) {
        return (
            <Card title={`แผนที่กลุ่มแม่บ้านเกษตรกร ปี ${year}`}>
                <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    <Spin tip="กำลังโหลดแผนที่..." />
                </div>
            </Card>
        );
    }

    if (!points.length) {
        return (
            <Card title={`แผนที่กลุ่มแม่บ้านเกษตรกร ปี ${year}`}>
                <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    <Empty description="ไม่มีพิกัดสำหรับปีนี้" />
                </div>
            </Card>
        );
    }

    const { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } = MapComponents;

    const FitBounds = () => {
        const map = useMap();

        useEffect(() => {
            const bounds = MapComponents.L.latLngBounds(points.map((point) => [point.lat, point.lon]));
            if (bounds.isValid()) {
                map.invalidateSize();
                map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11, animate: false });
            }
        }, [map]);

        return null;
    };

    return (
        <Card
            title={`แผนที่กลุ่มแม่บ้านเกษตรกร ปี ${year}`}
            extra={`${number.format(points.length)} จุดพิกัด`}
            style={{ marginBottom: 16 }}
        >
            <MapContainer
                center={[13.82, 100.05]}
                zoom={10}
                zoomSnap={0.25}
                zoomDelta={0.5}
                style={{ height: 460, width: '100%', borderRadius: 8, border: '1px solid #e8ecf0' }}
                scrollWheelZoom={true}
            >
                <FitBounds />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON
                    data={districtGeoJSON}
                    style={{
                        color: '#1a7f37',
                        weight: 2,
                        opacity: 0.75,
                        fillColor: '#2da44e',
                        fillOpacity: 0.08,
                        dashArray: '5, 5',
                    }}
                    onEachFeature={(feature, layer) => {
                        const name = feature.properties?.amp_th || feature.properties?.AMP_NAMT;
                        if (name) layer.bindTooltip(`อำเภอ${name}`, { sticky: true });
                    }}
                />
                {points.map((item) => {
                    const color = yes(item.has_sales_channel) ? '#0969da' : '#bf8700';
                    return (
                        <CircleMarker
                            key={item.id}
                            center={[item.lat, item.lon]}
                            radius={8}
                            fillColor={color}
                            fillOpacity={0.85}
                            color="#fff"
                            weight={2}
                        >
                            <Popup>
                                <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.group_name}</div>
                                    <div style={{ color: '#57606a', fontSize: 13 }}>อ.{item.district} ต.{item.subdistrict}</div>
                                    <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 13 }}>
                                        <span>สมาชิก: <strong>{number.format(item.member_count || 0)}</strong> ราย</span>
                                        <span>กิจกรรม: <strong>{item.activity || '-'}</strong></span>
                                        <span>ศักยภาพ: <strong>{item.potential_level || '-'}</strong></span>
                                        <span>ช่องทางจำหน่าย: <strong>{item.has_sales_channel || 'ไม่มี'}</strong></span>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, color: '#57606a', fontSize: 12 }}>
                <span><EnvironmentOutlined style={{ color: '#0969da' }} /> มีช่องทางจำหน่าย</span>
                <span><EnvironmentOutlined style={{ color: '#bf8700' }} /> ยังไม่มีช่องทางจำหน่าย</span>
            </div>
        </Card>
    );
}

const housewifeColumns = [
    { title: 'ปีข้อมูล', dataIndex: 'year', key: 'year', width: 95, fixed: 'left', align: 'center' },
    { title: 'ชื่อกลุ่ม', dataIndex: 'group_name', key: 'group_name', width: 260, fixed: 'left' },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 140 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 140 },
    { title: 'หมู่', dataIndex: 'moo', key: 'moo', width: 80, align: 'center' },
    { title: 'เลขที่', dataIndex: 'address_no', key: 'address_no', width: 110 },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right', render: (v) => number.format(v || 0) },
    { title: 'กิจกรรมกลุ่ม', dataIndex: 'activity', key: 'activity', width: 260, ellipsis: true },
    { title: 'ศักยภาพ', dataIndex: 'potential_level', key: 'potential_level', width: 120, render: (v) => v ? <Tag color={v === 'ดี' ? 'green' : 'gold'}>{v}</Tag> : '-' },
    { title: 'ช่องทางจำหน่าย', dataIndex: 'has_sales_channel', key: 'has_sales_channel', width: 140, render: (v) => <Tag color={yes(v) ? 'blue' : 'default'}>{v || 'ไม่มี'}</Tag> },
    { title: 'จดทะเบียนวิสาหกิจฯ', dataIndex: 'community_enterprise_registration', key: 'community_enterprise_registration', width: 180 },
    { title: 'กลุ่มต้นแบบ', dataIndex: 'model_group', key: 'model_group', width: 120 },
    { title: 'ทุน', dataIndex: 'fund_management', key: 'fund_management', width: 120, align: 'right', render: (v) => money.format(v || 0) },
    { title: 'รายได้', dataIndex: 'income', key: 'income', width: 120, align: 'right', render: (v) => money.format(v || 0) },
    { title: 'มาตรฐานการผลิต', dataIndex: 'production_standard', key: 'production_standard', width: 150, render: (v) => v || '-' },
    { title: 'ออนไลน์ในประเทศ', dataIndex: 'online_domestic', key: 'online_domestic', width: 145, render: (v) => v || '-' },
    { title: 'ออนไลน์ต่างประเทศ', dataIndex: 'online_international', key: 'online_international', width: 155, render: (v) => v || '-' },
    { title: 'ออฟไลน์ในประเทศ', dataIndex: 'offline_domestic', key: 'offline_domestic', width: 150, render: (v) => v || '-' },
    { title: 'ออฟไลน์ต่างประเทศ', dataIndex: 'offline_international', key: 'offline_international', width: 160, render: (v) => v || '-' },
    { title: 'โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 130, render: (v) => v && v !== '0' ? v : '-' },
    { title: 'วันที่จัดตั้ง', dataIndex: 'established_text', key: 'established_text', width: 130 },
    { title: 'Lat', dataIndex: 'lat', key: 'lat', width: 110, render: (v) => hasValue(v) ? Number(v).toFixed(6) : '-' },
    { title: 'Lon', dataIndex: 'lon', key: 'lon', width: 110, render: (v) => hasValue(v) ? Number(v).toFixed(6) : '-' },
];

// Column picker config
const REQUIRED_KEYS = ['year', 'group_name', 'district', 'subdistrict', 'member_count', 'activity'];
const DEFAULT_KEYS = ['year', 'group_name', 'district', 'subdistrict', 'member_count', 'activity', 'potential_level', 'has_sales_channel', 'fund_management', 'income'];
const ALL_OPTIONAL_KEYS = housewifeColumns.filter((c) => !REQUIRED_KEYS.includes(c.key)).map((c) => c.key);
const DEFAULT_OPTIONAL_KEYS = DEFAULT_KEYS.filter((k) => !REQUIRED_KEYS.includes(k));

const normalizeHousewifeValues = (values) => ({
    ...values,
    year: values.year ? Number(values.year) : null,
    moo: values.moo ? Number(values.moo) : null,
    member_count: values.member_count ? Number(values.member_count) : 0,
    fund_management: values.fund_management ? Number(values.fund_management) : 0,
    income: values.income ? Number(values.income) : 0,
    lat: values.lat ? Number(values.lat) : null,
    lon: values.lon ? Number(values.lon) : null,
});

const housewifeFormFields = (
    <>
        <Row gutter={12}>
            <Col xs={24} md={8}>
                <Form.Item name="year" label="ปีข้อมูล" rules={[{ required: true }]}>
                    <InputNumber min={2500} max={2600} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={16}>
                <Form.Item name="group_name" label="ชื่อกลุ่ม" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="district" label="อำเภอ">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="subdistrict" label="ตำบล">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={12} md={4}>
                <Form.Item name="moo" label="หมู่">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={12} md={4}>
                <Form.Item name="address_no" label="เลขที่">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="member_count" label="สมาชิก">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="phone" label="โทรศัพท์">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="established_text" label="วันที่จัดตั้ง">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24}>
                <Form.Item name="activity" label="กิจกรรมกลุ่ม">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="potential_level" label="ศักยภาพ">
                    <Select allowClear options={['ดี', 'ปานกลาง', 'ปรับปรุง'].map((value) => ({ value, label: value }))} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="has_sales_channel" label="ช่องทางจำหน่าย">
                    <Select allowClear options={['มี', 'ไม่มี'].map((value) => ({ value, label: value }))} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="community_enterprise_registration" label="จดทะเบียนวิสาหกิจฯ">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="model_group" label="กลุ่มต้นแบบ">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="fund_management" label="ทุน">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="income" label="รายได้">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="lat" label="Lat">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="lon" label="Lon">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>
    </>
);

export function HousewifeFarmerGroups() {
    const { canEdit, canDelete } = useAuth();
    const userCanEdit = canEdit();
    const userCanDelete = canDelete();
    const [search, setSearch] = useState('');
    const [district, setDistrict] = useState('ทั้งหมด');
    const [year, setYear] = useState(2568);
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [visibleOptionalColumns, setVisibleOptionalColumns] = useState(DEFAULT_OPTIONAL_KEYS);
    const [form] = Form.useForm();

    const fetchGroups = async () => {
        const { data, error } = await supabase
            .from(HOUSEWIFE_TABLE)
            .select('*')
            .order('year', { ascending: false })
            .order('district', { ascending: true })
            .order('group_name', { ascending: true });
        if (error) throw error;
        return data || [];
    };

    const { data: rows = [], isLoading, refetch } = useApiCache(['housewife_farmer_groups_full'], fetchGroups);

    const districts = useMemo(() => ['ทั้งหมด', ...countBy(rows, 'district').map(([name]) => name)], [rows]);
    const years = useMemo(() => countBy(rows, 'year').map(([name]) => name).sort((a, b) => Number(b) - Number(a)), [rows]);
    const activeYear = years.includes(year) ? year : (years[0] || 2568);
    const activeYearRows = useMemo(() => rows.filter((row) => row.year === activeYear), [rows, activeYear]);

    const filteredRows = useMemo(() => {
        const text = search.trim().toLowerCase();
        return rows.filter((row) => {
            const matchDistrict = district === 'ทั้งหมด' || row.district === district;
            const matchYear = row.year === activeYear;
            const matchText = !text || [
                row.group_name,
                row.district,
                row.subdistrict,
                row.activity,
                row.potential_level,
                row.has_sales_channel,
            ].some((value) => String(value || '').toLowerCase().includes(text));
            return matchDistrict && matchYear && matchText;
        });
    }, [rows, search, district, activeYear]);

    const stats = useMemo(() => {
        const sales = activeYearRows.filter((row) => yes(row.has_sales_channel)).length;
        return {
            total: activeYearRows.length,
            members: sum(activeYearRows, 'member_count'),
            sales,
            salesPct: activeYearRows.length ? Math.round((sales / activeYearRows.length) * 100) : 0,
            income: sum(activeYearRows, 'income'),
            good: activeYearRows.filter((row) => row.potential_level === 'ดี').length,
            districts: countBy(activeYearRows, 'district'),
            activities: countBy(activeYearRows, 'activity'),
            potential: countBy(activeYearRows, 'potential_level'),
        };
    }, [activeYearRows]);

    const openAdd = () => {
        setEditingRecord(null);
        form.setFieldsValue({ year: activeYear, province: 'นครปฐม', has_sales_channel: 'ไม่มี' });
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = normalizeHousewifeValues(await form.validateFields());
            setSaving(true);

            const result = editingRecord
                ? await supabase.from(HOUSEWIFE_TABLE).update(values).eq('id', editingRecord.id)
                : await supabase.from(HOUSEWIFE_TABLE).insert([values]);

            if (result.error) throw result.error;

            message.success(editingRecord ? 'แก้ไขข้อมูลแล้ว' : 'เพิ่มข้อมูลแล้ว');
            setModalOpen(false);
            setEditingRecord(null);
            form.resetFields();
            refetch();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from(HOUSEWIFE_TABLE).delete().eq('id', id);
        if (error) {
            message.error(`ลบข้อมูลล้มเหลว: ${error.message}`);
            return;
        }
        message.success('ลบข้อมูลสำเร็จ');
        refetch();
    };

    const handleExportCSV = () => {
        if (!filteredRows.length) return;
        const visibleCols = housewifeColumns.filter((c) => visibleKeys.has(c.key));
        const headers = visibleCols.map(c => c.title);
        const keys = visibleCols.map(c => c.dataIndex);
        const csvContent = [
            headers.join(','),
            ...filteredRows.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HousewifeFarmerGroups_${activeYear}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportExcel = async () => {
        try {
            if (!filteredRows.length) return;
            const { utils, writeFile } = await import('xlsx');
            const visibleCols = housewifeColumns.filter((c) => visibleKeys.has(c.key));
            const headers = visibleCols.map(c => c.title);
            const keys = visibleCols.map(c => c.dataIndex);
            
            const excelRows = filteredRows.map(row => {
                const obj = {};
                keys.forEach((k, i) => { obj[headers[i]] = row[k] ?? ''; });
                return obj;
            });

            const ws = utils.json_to_sheet(excelRows);
            ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 15) }));
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, `กลุ่มแม่บ้าน ${activeYear}`);
            writeFile(wb, `HousewifeFarmerGroups_${activeYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error('Excel export error:', err);
            message.error('Export Excel ล้มเหลว');
        }
    };

    // --- Column picker logic ---
    const visibleKeys = new Set([...REQUIRED_KEYS, ...visibleOptionalColumns]);
    const filteredHousewifeColumns = housewifeColumns.filter((c) => visibleKeys.has(c.key));
    const totalColCount = housewifeColumns.length;
    const visibleColCount = filteredHousewifeColumns.length;

    const columnPickerContent = (
        <div style={{ maxWidth: 340 }}>
            <Space size={4} style={{ marginBottom: 8 }}>
                <Button size="small" onClick={() => setVisibleOptionalColumns([...ALL_OPTIONAL_KEYS])}>เลือกทั้งหมด</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns(DEFAULT_OPTIONAL_KEYS)}>ค่าเริ่มต้น</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns([])}>หลักเท่านั้น</Button>
            </Space>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 0' }}>
                {housewifeColumns.map((col) => {
                    const isRequired = REQUIRED_KEYS.includes(col.key);
                    return (
                        <Checkbox
                            key={col.key}
                            checked={isRequired || visibleOptionalColumns.includes(col.key)}
                            disabled={isRequired}
                            onChange={(e) => {
                                setVisibleOptionalColumns((prev) =>
                                    e.target.checked ? [...prev, col.key] : prev.filter((k) => k !== col.key)
                                );
                            }}
                            style={{ width: '50%', marginInlineStart: 0 }}
                        >
                            {col.title}{isRequired ? ' (หลัก)' : ''}
                        </Checkbox>
                    );
                })}
            </div>
        </div>
    );

    const tableColumns = (!userCanEdit && !userCanDelete) ? filteredHousewifeColumns : [
        ...filteredHousewifeColumns,
        {
            title: 'จัดการ',
            key: 'actions',
            width: 110,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    {userCanEdit && (
                        <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    )}
                    {userCanDelete && (
                        <Popconfirm
                            title="ยืนยันการลบ"
                            description="ต้องการลบข้อมูลนี้ใช่ไหม?"
                            okText="ลบ"
                            cancelText="ยกเลิก"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(record.id)}
                        >
                            <Button danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div className="md-page-header">
                <h2>กลุ่มแม่บ้านเกษตรกร</h2>
                <p>ข้อมูลจากฐานข้อมูล Supabase แสดงปี {activeYear} เป็นหลัก พร้อมดูย้อนหลังแยกรายปี 2565-2568</p>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 16, alignItems: 'stretch' }}>
                <Col xs={24} lg={18}>
                    <HousewifeMap rows={rows} year={activeYear} />
                </Col>
                <Col xs={24} lg={6}>
                    <YearComparison rows={rows} />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="จำนวนกลุ่ม" value={stats.total} suffix="กลุ่ม" icon={<TeamOutlined />} color="#1a7f37" />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="สมาชิกทั้งหมด" value={stats.members} suffix="ราย" icon={<TrophyOutlined />} color="#0969da" />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="มีช่องทางจำหน่าย" value={stats.salesPct} suffix="%" icon={<ShopOutlined />} color="#bf8700" />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="รายได้รวม" value={stats.income} suffix="บาท" icon={<WalletOutlined />} color="#8250df" />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={8}>
                    <RankedList title="อำเภอที่มีกลุ่มมากสุด" rows={stats.districts} />
                </Col>
                <Col xs={24} lg={8}>
                    <RankedList title="กิจกรรมเด่น" rows={stats.activities} />
                </Col>
                <Col xs={24} lg={8}>
                    <RankedList title="ระดับศักยภาพ" rows={stats.potential} />
                </Col>
            </Row>

            <Card
                title={`ตารางข้อมูลกลุ่มแม่บ้านเกษตรกร ปี ${activeYear}`}
                extra={
                    <Space wrap>
                        <span>{number.format(filteredRows.length)} / {number.format(activeYearRows.length)} รายการ</span>
                        {(userCanEdit || userCanDelete) && (
                            <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
                                Import CSV
                            </Button>
                        )}
                        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                            Export CSV
                        </Button>
                        <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ color: '#52c41a', borderColor: '#b7eb8f' }}>
                            Export Excel
                        </Button>
                        <Popover content={columnPickerContent} title="เลือกคอลัมน์ที่แสดง" trigger="click" placement="bottomRight">
                            <Button icon={<AppstoreOutlined />}>คอลัมน์ {visibleColCount}/{totalColCount}</Button>
                        </Popover>
                        {userCanEdit && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                                เพิ่มข้อมูล
                            </Button>
                        )}
                    </Space>
                }
            >
                <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="ค้นหาชื่อกลุ่ม อำเภอ ตำบล กิจกรรม"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        style={{ width: 320, maxWidth: '100%' }}
                    />
                    <Space wrap>
                        <Select value={activeYear} onChange={setYear} options={years.map((value) => ({ value, label: value }))} style={{ width: 130 }} />
                        <Select value={district} onChange={setDistrict} options={districts.map((value) => ({ value, label: value }))} style={{ width: 180 }} />
                    </Space>
                </Space>
                <Table
                    rowKey="id"
                    loading={isLoading}
                    columns={tableColumns}
                    dataSource={filteredRows}
                    scroll={{ x: userCanEdit || userCanDelete ? 3440 : 3300 }}
                    size="middle"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>

            <CsvImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                tableName={HOUSEWIFE_TABLE}
                columns={housewifeColumns}
                onSuccess={refetch}
            />

            <Modal
                title={editingRecord ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                width={900}
                okText="บันทึก"
                cancelText="ยกเลิก"
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    {housewifeFormFields}
                </Form>
            </Modal>
        </div>
    );
}

export function YoungFarmerGroups() {
    return (
        <CrudTable
            tableName="young_farmer_groups"
            title="กลุ่มยุวเกษตรกร"
            columns={baseColumns}
            formFields={formFields}
            searchField="group_name"
            searchFields={['group_name', 'district', 'chairman']}
        />
    );
}

export default HousewifeFarmerGroups;
