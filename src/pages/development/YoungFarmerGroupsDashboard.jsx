import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Popover, Row, Select, Space, Spin, Statistic, Table, Tag, Tooltip, message } from 'antd';
import { BarChartOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EnvironmentOutlined, FileExcelOutlined, FilterOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import CsvImportModal from '../../components/DataTable/CsvImportModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseCrud } from '../../hooks/useSupabase';
import { getPublicColumns } from '../../utils/dataPrivacy';
import districtGeoJSON from '../../data/nakhon_pathom_districts.json';

const number = new Intl.NumberFormat('th-TH');
const hasValue = (value) => value !== null && value !== undefined && value !== '';

const columns = [
    { title: 'ปีข้อมูล', dataIndex: 'data_year', key: 'data_year', width: 90, align: 'center', importHeader: 'ปีข้อมูล' },
    { title: 'รหัสระเบียน', dataIndex: 'record_code', key: 'record_code', width: 130, importHeader: 'รหัสระเบียน' },
    { title: 'ชื่อกลุ่ม', dataIndex: 'group_name', key: 'group_name', width: 260, importHeader: 'ชื่อกลุ่ม' },
    { title: 'เลขที่', dataIndex: 'address_no', key: 'address_no', width: 90, importHeader: 'เลขที่' },
    { title: 'หมู่', dataIndex: 'moo', key: 'moo', width: 70, align: 'center', importHeader: 'หมู่' },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 120, importHeader: 'ตำบล' },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130, importHeader: 'อำเภอ' },
    { title: 'จังหวัด', dataIndex: 'province', key: 'province', width: 110, importHeader: 'จังหวัด' },
    { title: 'โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 120, importHeader: 'เบอร์โทรศัพท์' },
    { title: 'มือถือ', dataIndex: 'mobile', key: 'mobile', width: 120, importHeader: 'เบอร์มือถือ' },
    { title: 'วันที่จัดตั้ง', dataIndex: 'established_date', key: 'established_date', width: 120, importHeader: 'วันที่จัดตั้งกลุ่ม' },
    { title: 'ปีจัดตั้ง พ.ศ.', dataIndex: 'established_year_be', key: 'established_year_be', width: 100, importHeader: 'ปีจัดตั้ง_พ.ศ.' },
    { title: 'ปีจัดตั้ง ค.ศ.', dataIndex: 'established_year_ce', key: 'established_year_ce', width: 100, importHeader: 'ปีจัดตั้ง_ค.ศ.' },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 90, align: 'right', importHeader: 'จำนวนสมาชิกกลุ่ม', render: (value) => number.format(value || 0) },
    { title: 'กลุ่มต้นแบบ', dataIndex: 'model_group', key: 'model_group', width: 130, importHeader: 'การเป็นกลุ่มต้นแบบ' },
    { title: 'ทุน', dataIndex: 'fund_management', key: 'fund_management', width: 110, align: 'right', importHeader: 'การบริหารจัดการทุน_บาท', render: (value) => number.format(value || 0) },
    { title: 'รายได้', dataIndex: 'income', key: 'income', width: 110, align: 'right', importHeader: 'รายได้กลุ่ม_บาท', render: (value) => number.format(value || 0) },
    { title: 'กิจกรรมกลุ่ม', dataIndex: 'activity', key: 'activity', width: 280, importHeader: 'กิจกรรมกลุ่ม' },
    { title: 'จำนวนกิจกรรม', dataIndex: 'activity_count', key: 'activity_count', width: 110, align: 'center', importHeader: 'จำนวนกิจกรรมที่ระบุ' },
    { title: 'ศักยภาพ', dataIndex: 'potential_level', key: 'potential_level', width: 110, importHeader: 'ระดับการประเมินศักยภาพ', render: (value) => value ? <Tag color={value === 'ดี' ? 'green' : 'gold'}>{value}</Tag> : '-' },
    { title: 'Lat', dataIndex: 'lat', key: 'lat', width: 100, importHeader: 'Lat', render: (value) => value ? Number(value).toFixed(6) : '-' },
    { title: 'Lon', dataIndex: 'lon', key: 'lon', width: 100, importHeader: 'Lon', render: (value) => value ? Number(value).toFixed(6) : '-' },
];

const requiredColumnKeys = ['record_code', 'group_name', 'district', 'member_count', 'activity'];
const defaultOptionalColumnKeys = ['data_year', 'subdistrict', 'phone', 'mobile', 'model_group', 'fund_management', 'income', 'potential_level'];
const compactColumnConfig = {
    data_year: { title: 'ปี', width: 64 },
    record_code: { title: 'รหัส', width: 116, ellipsis: true },
    group_name: { width: 220, ellipsis: true },
    address_no: { width: 72, ellipsis: true },
    moo: { width: 60 },
    subdistrict: { width: 108, ellipsis: true },
    district: { width: 112, ellipsis: true },
    province: { width: 96, ellipsis: true },
    phone: { width: 112, ellipsis: true },
    mobile: { width: 112, ellipsis: true },
    established_date: { title: 'วันที่จัดตั้ง', width: 110 },
    established_year_be: { title: 'ปีจัดตั้ง', width: 76 },
    established_year_ce: { title: 'ค.ศ.', width: 70 },
    member_count: { title: 'สมาชิก', width: 82 },
    model_group: { title: 'ต้นแบบ', width: 112, ellipsis: true },
    fund_management: { title: 'ทุน', width: 100 },
    income: { title: 'รายได้', width: 100 },
    activity: { title: 'กิจกรรม', width: 210, ellipsis: true },
    activity_count: { title: 'จำนวนกิจกรรม', width: 100 },
    potential_level: { title: 'ศักยภาพ', width: 96 },
    lat: { width: 92 },
    lon: { width: 92 },
};

const numberFieldKeys = ['data_year', 'established_year_be', 'established_year_ce', 'member_count', 'fund_management', 'income', 'activity_count', 'lat', 'lon'];
const editableColumns = columns.filter((column) => column.dataIndex && !['id', 'created_at', 'updated_at'].includes(column.dataIndex));

function countBy(rows, key, limit = 12) {
    const counts = rows.reduce((acc, row) => {
        const name = row[key] || 'ไม่ระบุ';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

function makeOptions(rows, key) {
    return [...new Set(rows.map((row) => row[key]).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'th'))
        .map((value) => ({ label: value, value }));
}

function normalize(value) {
    return String(value || '').toLowerCase().trim();
}

function YoungFarmerGroupsMap({ rows, year }) {
    const [MapComponents, setMapComponents] = useState(null);

    useEffect(() => {
        let active = true;
        Promise.all([
            import('react-leaflet'),
            import('leaflet'),
            import('leaflet/dist/leaflet.css'),
        ]).then(([reactLeaflet, leaflet]) => {
            if (!active) return;
            setMapComponents({
                ...reactLeaflet,
                L: leaflet.default || leaflet,
            });
        });
        return () => { active = false; };
    }, []);

    const points = useMemo(() => rows
        .filter((row) => hasValue(row.lat) && hasValue(row.lon))
        .map((row) => ({ ...row, lat: Number(row.lat), lon: Number(row.lon) }))
        .filter((row) => !Number.isNaN(row.lat) && !Number.isNaN(row.lon)), [rows]);

    if (!MapComponents) {
        return (
            <Card title={`แผนที่กลุ่มยุวเกษตรกร ปี ${year || '-'}`} style={{ marginTop: 24 }}>
                <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    <Spin tip="กำลังโหลดข้อมูลกลุ่มยุวเกษตรกร..." />
                </div>
            </Card>
        );
    }

    if (!points.length) {
        return (
            <Card title={`แผนที่กลุ่มยุวเกษตรกร ปี ${year || '-'}`} style={{ marginTop: 24 }}>
                <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    <Empty description="ไม่มีพิกัดสำหรับข้อมูลปีที่เลือก" />
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
            title={`แผนที่กลุ่มยุวเกษตรกร ปี ${year || '-'}`}
            extra={`${number.format(points.length)} จุดพิกัด`}
            style={{ marginTop: 24 }}
        >
            <MapContainer
                center={[13.82, 100.05]}
                zoom={10}
                zoomSnap={0.25}
                zoomDelta={0.5}
                style={{ height: 460, width: '100%', borderRadius: 8, border: '1px solid #e8ecf0' }}
                scrollWheelZoom
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
                {points.map((item) => (
                    <CircleMarker
                        key={item.id}
                        center={[item.lat, item.lon]}
                        radius={8}
                        fillColor={item.potential_level === 'ดี' ? '#1a7f37' : '#0969da'}
                        fillOpacity={0.85}
                        color="#fff"
                        weight={2}
                    >
                        <Popup>
                            <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.group_name}</div>
                                <div style={{ color: '#57606a', fontSize: 13 }}>อ.{item.district || '-'} ต.{item.subdistrict || '-'}</div>
                                <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 13 }}>
                                    <span>สมาชิก: <strong>{number.format(item.member_count || 0)}</strong> ราย</span>
                                    <span>กิจกรรม: <strong>{item.activity || '-'}</strong></span>
                                    <span>ศักยภาพ: <strong>{item.potential_level || '-'}</strong></span>
                                    <span>ทุน: <strong>{number.format(item.fund_management || 0)}</strong> บาท</span>
                                    <span>รายได้: <strong>{number.format(item.income || 0)}</strong> บาท</span>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, color: '#57606a', fontSize: 12 }}>
                <span><EnvironmentOutlined style={{ color: '#1a7f37' }} /> ศักยภาพดี</span>
                <span><EnvironmentOutlined style={{ color: '#0969da' }} /> จุดพิกัดกลุ่ม</span>
            </div>
        </Card>
    );
}

export default function YoungFarmerGroupsDashboard() {
    const tableWrapRef = useRef(null);
    const topScrollRef = useRef(null);
    const tableScrollX = 1720;
    const { role, canEdit, canDelete } = useAuth();
    const { createRecord, updateRecord, deleteRecord } = useSupabaseCrud('young_farmer_groups_detailed');
    const [form] = Form.useForm();
    const [editingRecord, setEditingRecord] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const userCanEdit = canEdit();
    const userCanDelete = canDelete();

    useEffect(() => {
        document.title = 'กลุ่มยุวเกษตรกร | ศูนย์ข้อมูลการเกษตรนครปฐม';
    }, []);

    const fetchRows = async () => {
        const { data, error } = await supabase
            .from('young_farmer_groups_detailed')
            .select('*')
            .order('data_year', { ascending: false })
            .order('district', { ascending: true })
            .order('group_name', { ascending: true });
        if (error) throw error;
        return data || [];
    };

    const { data: rows = [], isLoading, refetch } = useApiCache('young_farmer_groups_detailed_all', fetchRows);
    const years = useMemo(() => [...new Set(rows.map((row) => row.data_year).filter(Boolean))].sort((a, b) => b - a), [rows]);
    const [selectedYear, setSelectedYear] = useState(null);
    const [filters, setFilters] = useState({});
    const [importOpen, setImportOpen] = useState(false);
    const [visibleOptionalColumns, setVisibleOptionalColumns] = useState(defaultOptionalColumnKeys);
    const activeYear = selectedYear || years[0] || null;
    const yearRows = useMemo(() => rows.filter((row) => row.data_year === activeYear), [rows, activeYear]);

    const filteredRows = useMemo(() => {
        const search = normalize(filters.search);
        return yearRows.filter((row) => {
            const fund = Number(row.fund_management) || 0;
            const income = Number(row.income) || 0;
            if (filters.district && row.district !== filters.district) return false;
            if (filters.subdistrict && row.subdistrict !== filters.subdistrict) return false;
            if (filters.potential_level && row.potential_level !== filters.potential_level) return false;
            if (filters.model_group && row.model_group !== filters.model_group) return false;
            if (filters.minFund !== undefined && filters.minFund !== null && fund < filters.minFund) return false;
            if (filters.minIncome !== undefined && filters.minIncome !== null && income < filters.minIncome) return false;
            if (!search) return true;
            return [
                row.record_code, row.group_name, row.district, row.subdistrict, row.activity,
                row.phone, row.mobile, row.model_group, row.potential_level,
            ].some((value) => normalize(value).includes(search));
        });
    }, [yearRows, filters]);

    const districtOptions = useMemo(() => makeOptions(yearRows, 'district'), [yearRows]);
    const subdistrictOptions = useMemo(() => makeOptions(yearRows, 'subdistrict'), [yearRows]);
    const potentialOptions = useMemo(() => makeOptions(yearRows, 'potential_level'), [yearRows]);
    const modelGroupOptions = useMemo(() => makeOptions(yearRows, 'model_group'), [yearRows]);

    const districtData = useMemo(() => countBy(filteredRows, 'district'), [filteredRows]);
    const potentialData = useMemo(() => countBy(filteredRows, 'potential_level'), [filteredRows]);
    const activityData = useMemo(() => {
        const counts = {};
        filteredRows.forEach((row) => {
            String(row.activity || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
                .forEach((item) => { counts[item] = (counts[item] || 0) + 1; });
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredRows]);
    const totalMembers = useMemo(() => filteredRows.reduce((sum, row) => sum + (Number(row.member_count) || 0), 0), [filteredRows]);
    const totalFund = useMemo(() => filteredRows.reduce((sum, row) => sum + (Number(row.fund_management) || 0), 0), [filteredRows]);
    const totalIncome = useMemo(() => filteredRows.reduce((sum, row) => sum + (Number(row.income) || 0), 0), [filteredRows]);
    const activeFilterCount = Object.values(filters).filter((value) => value !== undefined && value !== null && value !== '').length;
    const baseVisibleColumns = useMemo(() => getPublicColumns('young_farmer_groups_detailed', columns, role)
        .filter((column) => requiredColumnKeys.includes(column.dataIndex) || visibleOptionalColumns.includes(column.dataIndex))
        .map((column) => ({ ...column, ...compactColumnConfig[column.dataIndex] })), [role, visibleOptionalColumns]);

    const handleEdit = (record) => {
        if (!userCanEdit) {
            message.warning('ไม่มีสิทธิ์ทำรายการ');
            return;
        }
        setEditingRecord(record);
        form.setFieldsValue(record);
        setEditOpen(true);
    };

    const handleAdd = () => {
        if (!userCanEdit) {
            message.warning('ไม่มีสิทธิ์ทำรายการ');
            return;
        }
        setEditingRecord(null);
        form.setFieldsValue({ data_year: activeYear });
        setEditOpen(true);
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        const ok = editingRecord
            ? await updateRecord(editingRecord.id, values)
            : await createRecord(values);
        if (ok) {
            setEditOpen(false);
            setEditingRecord(null);
            form.resetFields();
            refetch();
        }
    };

    const handleDelete = async (record) => {
        const ok = await deleteRecord(record.id);
        if (ok) refetch();
    };

    const actionColumn = userCanEdit ? {
        title: 'จัดการ',
        key: 'actions',
        width: userCanDelete ? 96 : 56,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
            <Space size={4}>
                <Tooltip title="แก้ไข">
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                </Tooltip>
                {userCanDelete && (
                    <Popconfirm title="ยืนยันการลบ" description="ต้องการลบรายการนี้ใช่ไหม?" okText="บันทึก" cancelText="ยกเลิก" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record)}>
                        <Tooltip title="แก้ไข"><Button danger icon={<DeleteOutlined />} /></Tooltip>
                    </Popconfirm>
                )}
            </Space>
        ),
    } : null;

    const visibleColumns = actionColumn ? [...baseVisibleColumns, actionColumn] : baseVisibleColumns;

    const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
    const selectableColumns = getPublicColumns('young_farmer_groups_detailed', columns, role);

    useEffect(() => {
        const topScroller = topScrollRef.current;
        const tableScroller = tableWrapRef.current?.querySelector('.ant-table-body, .ant-table-content');
        if (!topScroller || !tableScroller) return undefined;

        let syncing = false;
        const syncTopToTable = () => {
            if (syncing) return;
            syncing = true;
            tableScroller.scrollLeft = topScroller.scrollLeft;
            syncing = false;
        };
        const syncTableToTop = () => {
            if (syncing) return;
            syncing = true;
            topScroller.scrollLeft = tableScroller.scrollLeft;
            syncing = false;
        };

        topScroller.addEventListener('scroll', syncTopToTable);
        tableScroller.addEventListener('scroll', syncTableToTop);
        return () => {
            topScroller.removeEventListener('scroll', syncTopToTable);
            tableScroller.removeEventListener('scroll', syncTableToTop);
        };
    }, [filteredRows.length, visibleColumns.length]);

    const columnSelector = (
        <div style={{ width: 280, maxHeight: 420, overflowY: 'auto', padding: 12, background: '#fff', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>เลือกคอลัมน์ที่แสดง</div>
            <div style={{ display: 'grid', gap: 6 }}>
                {selectableColumns.map((column) => {
                    const locked = requiredColumnKeys.includes(column.dataIndex);
                    return (
                        <Checkbox
                            key={column.dataIndex}
                            checked={locked || visibleOptionalColumns.includes(column.dataIndex)}
                            disabled={locked}
                            onChange={(event) => {
                                setVisibleOptionalColumns((prev) => event.target.checked
                                    ? [...prev, column.dataIndex]
                                    : prev.filter((key) => key !== column.dataIndex));
                            }}
                        >
                            {column.title}{locked ? ' (หลัก)' : ''}
                        </Checkbox>
                    );
                })}
            </div>
            <Space style={{ marginTop: 12 }}>
                <Button size="small" onClick={() => setVisibleOptionalColumns(selectableColumns.filter((column) => !requiredColumnKeys.includes(column.dataIndex)).map((column) => column.dataIndex))}>เลือกทั้งหมด</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns(defaultOptionalColumnKeys)}>ค่าเริ่มต้น</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns([])}>หลักเท่านั้น</Button>
            </Space>
        </div>
    );

    const exportRows = (format) => {
        const exportColumns = getPublicColumns('young_farmer_groups_detailed', columns, role).filter((column) => column.dataIndex);
        const headers = exportColumns.map((column) => column.title);
        const exportData = filteredRows.map((row) => {
            const record = {};
            exportColumns.forEach((column, index) => {
                record[headers[index]] = row[column.dataIndex] ?? '';
            });
            return record;
        });

        if (format === 'xlsx') {
            import('xlsx').then(({ utils, writeFile }) => {
                const worksheet = utils.json_to_sheet(exportData);
                worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(String(header).length * 2, 15) }));
                const workbook = utils.book_new();
                utils.book_append_sheet(workbook, worksheet, `YFG_${activeYear || 'all'}`);
                writeFile(workbook, `young_farmer_groups_${activeYear || 'all'}.xlsx`);
            });
            return;
        }

        const csv = [
            headers.join(','),
            ...exportData.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `young_farmer_groups_${activeYear || 'all'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return <div style={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin tip="กำลังโหลดข้อมูลกลุ่มยุวเกษตรกร..." /></div>;
    }

    return (
        <div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TeamOutlined style={{ fontSize: 20, color: '#1a7f37' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2328' }}>กลุ่มยุวเกษตรกร</span>
                        <Tag color="green">ปี {activeYear || '-'}</Tag>
                    </div>
                </div>

                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={6}><Card size="small"><Statistic title="จำนวนกลุ่ม" value={filteredRows.length} suffix={`จาก ${yearRows.length} กลุ่ม`} /></Card></Col>
                    <Col xs={24} md={6}><Card size="small"><Statistic title="สมาชิก" value={totalMembers} formatter={(value) => Number(value).toLocaleString('th-TH')} suffix="ราย" /></Card></Col>
                    <Col xs={24} md={6}><Card size="small"><Statistic title="ทุนรวม" value={totalFund} formatter={(value) => Number(value).toLocaleString('th-TH')} suffix="บาท" /></Card></Col>
                    <Col xs={24} md={6}><Card size="small"><Statistic title="รายได้รวม" value={totalIncome} formatter={(value) => Number(value).toLocaleString('th-TH')} suffix="บาท" /></Card></Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={8}>
                        <Card title="กิจกรรมยอดนิยม" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={districtData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" name="จำนวน" fill="#1a7f37" maxBarSize={42} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card title="ระดับศักยภาพ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={potentialData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" name="จำนวน" fill="#bf8700" maxBarSize={42} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card title="กิจกรรมยอดนิยม" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activityData} layout="vertical" margin={{ top: 10, right: 30, left: 70, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" name="จำนวน" fill="#0969da" maxBarSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>

            <div className="crud-container">
                <div className="crud-header">
                    <div className="crud-header-left">
                        <BarChartOutlined style={{ color: '#1a7f37' }} />
                        <span className="crud-title">ตารางข้อมูลกลุ่มยุวเกษตรกร ปี {activeYear || '-'}</span>
                        <Tag className="crud-count">{filteredRows.length} รายการ</Tag>
                    </div>
                    <div className="crud-header-right">
                        <Space wrap>
                            <Select
                                value={activeYear}
                                onChange={(year) => { setSelectedYear(year); setFilters({}); }}
                                options={years.map((year) => ({ label: `ปี ${year}`, value: year }))}
                                style={{ width: 140 }}
                                placeholder="เลือกปี"
                            />
                            <Tooltip title="แก้ไข">
                                <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                            </Tooltip>
                            {userCanEdit && <Button icon={<PlusOutlined />} onClick={handleAdd}>เพิ่มข้อมูล</Button>}
                            {userCanEdit && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import CSV</Button>}
                            <Button icon={<DownloadOutlined />} onClick={() => exportRows('csv')}>Export CSV</Button>
                            <Button icon={<FileExcelOutlined />} onClick={() => exportRows('xlsx')}>Export Excel</Button>
                        </Space>
                        <Popover content={columnSelector} trigger="click" placement="bottomRight">
                            <Button icon={<SettingOutlined />}>คอลัมน์ {baseVisibleColumns.length}/{selectableColumns.length}</Button>
                        </Popover>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16, padding: 16, background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0' }}>
                    <Input.Search allowClear placeholder="ค้นหา ชื่อ/รหัส/โทร/กิจกรรม" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
                    <Select allowClear placeholder="อำเภอ" value={filters.district} onChange={(value) => setFilter('district', value)} options={districtOptions} showSearch />
                    <Select allowClear placeholder="ตำบล" value={filters.subdistrict} onChange={(value) => setFilter('subdistrict', value)} options={subdistrictOptions} showSearch />
                    <Select allowClear placeholder="ศักยภาพ" value={filters.potential_level} onChange={(value) => setFilter('potential_level', value)} options={potentialOptions} showSearch />
                    <Select allowClear placeholder="กลุ่มต้นแบบ" value={filters.model_group} onChange={(value) => setFilter('model_group', value)} options={modelGroupOptions} showSearch />
                    <InputNumber placeholder="ทุนขั้นต่ำ" value={filters.minFund} onChange={(value) => setFilter('minFund', value)} min={0} style={{ width: '100%' }} />
                    <InputNumber placeholder="รายได้ขั้นต่ำ" value={filters.minIncome} onChange={(value) => setFilter('minIncome', value)} min={0} style={{ width: '100%' }} />
                    <Button icon={<FilterOutlined />} onClick={() => setFilters({})} disabled={activeFilterCount === 0}>ล้างตัวกรอง {activeFilterCount ? `(${activeFilterCount})` : ''}</Button>
                </div>
                <div ref={topScrollRef} style={{ overflowX: 'auto', overflowY: 'hidden', height: 16, marginBottom: 8 }}>
                    <div style={{ width: tableScrollX, height: 1 }} />
                </div>
                <div ref={tableWrapRef}>
                    <Table
                        rowKey="id"
                        dataSource={filteredRows}
                        columns={visibleColumns}
                        size="small"
                        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
                        scroll={{ x: tableScrollX }}
                    />
                </div>
            </div>
            <YoungFarmerGroupsMap rows={filteredRows} year={activeYear} />
            <CsvImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                tableName="young_farmer_groups_detailed"
                columns={columns}
                onSuccess={refetch}
            />
            <Modal
                title={editingRecord ? 'แก้ไขข้อมูลกลุ่มยุวเกษตรกร' : 'เพิ่มข้อมูลกลุ่มยุวเกษตรกร'}
                open={editOpen}
                onCancel={() => { setEditOpen(false); setEditingRecord(null); form.resetFields(); }}
                onOk={handleSave}
                okText="บันทึก"
                cancelText="ยกเลิก"
                width={760}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        {editableColumns.map((column) => (
                            <Col xs={24} md={12} key={column.dataIndex}>
                                <Form.Item name={column.dataIndex} label={column.title} rules={column.dataIndex === 'record_code' || column.dataIndex === 'group_name' || column.dataIndex === 'data_year' ? [{ required: true }] : []}>
                                    {numberFieldKeys.includes(column.dataIndex)
                                        ? <InputNumber style={{ width: '100%' }} />
                                        : <Input />}
                                </Form.Item>
                            </Col>
                        ))}
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}
