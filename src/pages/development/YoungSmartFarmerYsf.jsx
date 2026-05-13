import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal, Popconfirm, Popover, Row, Select, Space, Spin, Statistic, Table, Tag, Tooltip, message } from 'antd';
import { BarChartOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, FileExcelOutlined, FilterOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
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

const columns = [
    { title: 'ปีข้อมูล', dataIndex: 'data_year', key: 'data_year', width: 90, align: 'center', importHeader: 'ปีข้อมูล' },
    { title: 'รหัสระเบียน', dataIndex: 'record_code', key: 'record_code', width: 130, importHeader: 'รหัสระเบียน' },
    { title: 'ลำดับ', dataIndex: 'sequence_no', key: 'sequence_no', width: 70, align: 'center', importHeader: '#' },
    { title: 'คำนำหน้า', dataIndex: 'title', key: 'title', width: 90, importHeader: 'คำนำหน้า' },
    { title: 'ชื่อ', dataIndex: 'first_name', key: 'first_name', width: 110, importHeader: 'ชื่อ' },
    { title: 'นามสกุล', dataIndex: 'last_name', key: 'last_name', width: 120, importHeader: 'นามสกุล' },
    { title: 'ชื่อ-สกุล', dataIndex: 'full_name', key: 'full_name', width: 170 },
    { title: 'บ้านเลขที่', dataIndex: 'address_no', key: 'address_no', width: 95, importHeader: 'บ้านเลขที่' },
    { title: 'หมู่', dataIndex: 'moo', key: 'moo', width: 65, align: 'center', importHeader: 'หมู่' },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 120, importHeader: 'แขวง/ตำบล' },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130, importHeader: 'เขต/อำเภอ' },
    { title: 'จังหวัด', dataIndex: 'province', key: 'province', width: 115, importHeader: 'จังหวัด' },
    { title: 'เบอร์โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 130, importHeader: 'เบอร์โทรศัพท์มือถือ' },
    { title: 'LINE', dataIndex: 'line_id', key: 'line_id', width: 130, importHeader: 'LINE' },
    { title: 'อีเมล', dataIndex: 'email', key: 'email', width: 170, importHeader: 'อีเมล' },
    { title: 'Facebook', dataIndex: 'facebook', key: 'facebook', width: 160, importHeader: 'Facebook' },
    { title: 'การศึกษา', dataIndex: 'education', key: 'education', width: 140, importHeader: 'ระดับการศึกษา' },
    { title: 'สาขาที่ศึกษา', dataIndex: 'education_major', key: 'education_major', width: 160, importHeader: 'สาขาที่ศึกษา/จบการศึกษา' },
    { title: 'พื้นที่ทำการเกษตร', dataIndex: 'production_area', key: 'production_area', width: 150, importHeader: 'พื้นที่ทำการเกษตร (ไร่-งาน-ตร.วา)' },
    { title: 'กิจกรรมทางการเกษตร', dataIndex: 'agricultural_activity', key: 'agricultural_activity', width: 190, importHeader: 'กิจกรรมทางการเกษตร' },
    { title: 'มาตรฐาน', dataIndex: 'production_standard', key: 'production_standard', width: 150, importHeader: 'การรับรองมาตรฐาน' },
    { title: 'สถานภาพ/สมาชิก', dataIndex: 'farmer_status', key: 'farmer_status', width: 170, importHeader: 'สถานภาพเกษตรกร/การเป็นสมาชิก' },
    { title: 'ช่องทางจำหน่าย', dataIndex: 'sales_channel', key: 'sales_channel', width: 180, importHeader: 'ช่องทางการจำหน่ายสินค้า' },
    { title: 'อำเภอที่สังกัด', dataIndex: 'affiliated_district', key: 'affiliated_district', width: 130, importHeader: 'อำเภอที่สังกัด' },
    { title: 'พื้นที่ (ไร่)', dataIndex: 'farm_area_rai', key: 'farm_area_rai', width: 110, align: 'right', importHeader: 'พื้นที่ทำการเกษตร_ไร่', render: (value) => value ? Number(value).toLocaleString('th-TH') : '-' },
    { title: 'รายได้เกษตร', dataIndex: 'annual_agri_income', key: 'annual_agri_income', width: 130, align: 'right', importHeader: 'รายได้ทางการเกษตรเฉลี่ยต่อปี_บาท', render: (value) => value ? Number(value).toLocaleString('th-TH') : '-' },
    { title: 'ประเภทกิจกรรมหลัก', dataIndex: 'main_activity_type', key: 'main_activity_type', width: 160, importHeader: 'ประเภทกิจกรรมหลัก' },
    { title: 'มีพืช', dataIndex: 'has_crop', key: 'has_crop', width: 80, importHeader: 'มีพืช' },
    { title: 'มีปศุสัตว์', dataIndex: 'has_livestock', key: 'has_livestock', width: 95, importHeader: 'มีปศุสัตว์' },
    { title: 'มีประมง', dataIndex: 'has_fishery', key: 'has_fishery', width: 90, importHeader: 'มีประมง' },
    { title: 'มีแปรรูป', dataIndex: 'has_processing', key: 'has_processing', width: 95, importHeader: 'มีแปรรูป' },
    { title: 'ออนไลน์', dataIndex: 'has_online_channel', key: 'has_online_channel', width: 90, importHeader: 'มีช่องทางออนไลน์' },
];

const importColumns = columns.filter((column) => column.dataIndex !== 'full_name');
const requiredColumnKeys = ['sequence_no', 'record_code', 'full_name', 'district', 'agricultural_activity'];
const defaultOptionalColumnKeys = ['data_year', 'province', 'education', 'farm_area_rai', 'annual_agri_income'];
const compactColumnConfig = {
    data_year: { title: 'ปี', width: 54 },
    record_code: { title: 'รหัส', width: 104, ellipsis: true },
    sequence_no: { title: 'ลำดับ', width: 56 },
    title: { width: 64, ellipsis: true },
    first_name: { width: 92, ellipsis: true },
    last_name: { width: 104, ellipsis: true },
    full_name: { width: 146, ellipsis: true },
    address_no: { title: 'เลขที่', width: 72, ellipsis: true },
    moo: { width: 52 },
    subdistrict: { title: 'ตำบล', width: 96, ellipsis: true },
    district: { width: 100, ellipsis: true },
    province: { width: 88, ellipsis: true },
    farmer_status: { title: 'สถานภาพ', width: 126, ellipsis: true },
    agricultural_activity: { title: 'กิจกรรม', width: 142, ellipsis: true },
    phone: { title: 'โทรศัพท์', width: 104, ellipsis: true },
    line_id: { title: 'LINE', width: 104, ellipsis: true },
    email: { title: 'อีเมล', width: 130, ellipsis: true },
    facebook: { width: 124, ellipsis: true },
    education: { title: 'การศึกษา', width: 118, ellipsis: true },
    education_major: { title: 'สาขา', width: 126, ellipsis: true },
    production_standard: { title: 'มาตรฐาน', width: 116, ellipsis: true },
    sales_channel: { title: 'ช่องทางขาย', width: 118, ellipsis: true },
    annual_agri_income: { title: 'รายได้', width: 104 },
    production_area: { title: 'พื้นที่', width: 108, ellipsis: true },
    affiliated_district: { title: 'อำเภอสังกัด', width: 106, ellipsis: true },
    farm_area_rai: { title: 'พื้นที่ไร่', width: 92 },
    main_activity_type: { title: 'กิจกรรมหลัก', width: 118, ellipsis: true },
    has_crop: { title: 'พืช', width: 66 },
    has_livestock: { title: 'ปศุสัตว์', width: 78 },
    has_fishery: { title: 'ประมง', width: 72 },
    has_processing: { title: 'แปรรูป', width: 76 },
    has_online_channel: { title: 'ออนไลน์', width: 78 },
};

const numberFieldKeys = ['data_year', 'sequence_no', 'farm_area_rai', 'annual_agri_income'];
const editableColumns = columns.filter((column) => column.dataIndex && !['id', 'full_name', 'created_at', 'updated_at'].includes(column.dataIndex));

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

export default function YoungSmartFarmerYsf() {
    const tableWrapRef = useRef(null);
    const topScrollRef = useRef(null);
    const minTableScrollX = 1040;
    const { role, canEdit, canDelete } = useAuth();
    const { createRecord, updateRecord, deleteRecord } = useSupabaseCrud('young_smart_farmer_ysf');
    const [form] = Form.useForm();
    const [editingRecord, setEditingRecord] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const userCanEdit = canEdit();
    const userCanDelete = canDelete();

    useEffect(() => {
        document.title = 'เกษตรกรรุ่นใหม่ (YSF) | ศูนย์ข้อมูลการเกษตรนครปฐม';
    }, []);

    const fetchRows = async () => {
        const { data, error } = await supabase
            .from('young_smart_farmer_ysf')
            .select('*')
            .order('data_year', { ascending: false })
            .order('sequence_no', { ascending: true });
        if (error) throw error;
        return data || [];
    };

    const { data: rows = [], isLoading, refetch } = useApiCache('young_smart_farmer_ysf_all', fetchRows);
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
            const income = Number(row.annual_agri_income) || 0;
            if (filters.district && row.district !== filters.district) return false;
            if (filters.province && row.province !== filters.province) return false;
            if (filters.farmer_status && row.farmer_status !== filters.farmer_status) return false;
            if (filters.agricultural_activity && row.agricultural_activity !== filters.agricultural_activity) return false;
            if (filters.education && row.education !== filters.education) return false;
            if (filters.minIncome !== undefined && filters.minIncome !== null && income < filters.minIncome) return false;
            if (filters.maxIncome !== undefined && filters.maxIncome !== null && income > filters.maxIncome) return false;
            if (!search) return true;
            return [
                row.record_code, row.full_name, row.first_name, row.last_name, row.district,
                row.province, row.farmer_status, row.agricultural_activity, row.phone, row.education,
            ].some((value) => normalize(value).includes(search));
        });
    }, [yearRows, filters]);

    const districtOptions = useMemo(() => makeOptions(yearRows, 'district'), [yearRows]);
    const provinceOptions = useMemo(() => makeOptions(yearRows, 'province'), [yearRows]);
    const statusOptions = useMemo(() => makeOptions(yearRows, 'farmer_status'), [yearRows]);
    const activityOptions = useMemo(() => makeOptions(yearRows, 'agricultural_activity'), [yearRows]);
    const educationOptions = useMemo(() => makeOptions(yearRows, 'education'), [yearRows]);

    const districtData = useMemo(() => countBy(filteredRows, 'district'), [filteredRows]);
    const avgIncomeByDistrictData = useMemo(() => {
        const groups = filteredRows.reduce((acc, row) => {
            const district = row.district || 'ไม่ระบุ';
            const income = Number(row.annual_agri_income) || 0;
            if (!acc[district]) acc[district] = { name: district, total: 0, count: 0 };
            if (income > 0) {
                acc[district].total += income;
                acc[district].count += 1;
            }
            return acc;
        }, {});
        return Object.values(groups)
            .filter((item) => item.count > 0)
            .map((item) => ({ name: item.name, value: Math.round(item.total / item.count) }))
            .sort((a, b) => b.value - a.value);
    }, [filteredRows]);
    const totalIncome = useMemo(() => filteredRows.reduce((sum, row) => sum + (Number(row.annual_agri_income) || 0), 0), [filteredRows]);
    const activeFilterCount = Object.values(filters).filter((value) => value !== undefined && value !== null && value !== '').length;
    const baseVisibleColumns = useMemo(() => getPublicColumns('young_smart_farmer_ysf', columns, role)
        .filter((column) => (
            requiredColumnKeys.includes(column.dataIndex) || visibleOptionalColumns.includes(column.dataIndex)
        ))
        .map((column) => ({ ...column, ...compactColumnConfig[column.dataIndex] })), [role, visibleOptionalColumns]);

    const handleEdit = (record) => {
        if (!userCanEdit) {
            message.warning('ไม่มีสิทธิ์แก้ไข');
            return;
        }
        setEditingRecord(record);
        form.setFieldsValue(record);
        setEditOpen(true);
    };

    const handleAdd = () => {
        if (!userCanEdit) {
            message.warning('ไม่มีสิทธิ์เพิ่มข้อมูล');
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
                    <Popconfirm title="ยืนยันการลบ" description="ต้องการลบรายการนี้ใช่ไหม?" okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record)}>
                        <Tooltip title="ลบ"><Button danger icon={<DeleteOutlined />} /></Tooltip>
                    </Popconfirm>
                )}
            </Space>
        ),
    } : null;

    const visibleColumns = actionColumn ? [...baseVisibleColumns, actionColumn] : baseVisibleColumns;
    const tableScrollX = Math.max(minTableScrollX, visibleColumns.reduce((sum, column) => sum + (Number(column.width) || 100), 0));

    const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
    const selectableColumns = getPublicColumns('young_smart_farmer_ysf', columns, role);

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
    }, [filteredRows.length]);

    const exportRows = (format) => {
        const exportColumns = getPublicColumns('young_smart_farmer_ysf', columns, role).filter((column) => column.dataIndex);
        const headers = exportColumns.map((column) => column.title);
        const keys = exportColumns.map((column) => column.dataIndex);
        const exportData = filteredRows.map((row) => {
            const record = {};
            keys.forEach((key, index) => {
                record[headers[index]] = row[key] ?? '';
            });
            return record;
        });

        if (format === 'xlsx') {
            import('xlsx').then(({ utils, writeFile }) => {
                const worksheet = utils.json_to_sheet(exportData);
                worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(String(header).length * 2, 15) }));
                const workbook = utils.book_new();
                utils.book_append_sheet(workbook, worksheet, `YSF_${activeYear || 'all'}`);
                writeFile(workbook, `young_smart_farmer_ysf_${activeYear || 'all'}.xlsx`);
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
        link.download = `young_smart_farmer_ysf_${activeYear || 'all'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return <div style={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin tip="กำลังโหลดข้อมูล YSF..." /></div>;
    }

    return (
        <div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TeamOutlined style={{ fontSize: 20, color: '#1a7f37' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2328' }}>เกษตรกรรุ่นใหม่ (YSF)</span>
                        <Tag color="green">ปี {activeYear || '-'}</Tag>
                    </div>
                </div>
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={8}><Card size="small"><Statistic title="จำนวนเกษตรกร" value={filteredRows.length} suffix={`จาก ${yearRows.length} ราย`} /></Card></Col>
                    <Col xs={24} md={8}><Card size="small"><Statistic title="จำนวนอำเภอ/พื้นที่" value={districtData.length} suffix="แห่ง" /></Card></Col>
                    <Col xs={24} md={8}><Card size="small"><Statistic title="รายได้ภาคเกษตรรวม" value={totalIncome} formatter={(value) => Number(value).toLocaleString('th-TH')} suffix="บาท" /></Card></Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title="จำนวน YSF แยกตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                    <Col xs={24} lg={12}>
                        <Card title="รายได้เกษตรเฉลี่ยแยกตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={avgIncomeByDistrictData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                        <XAxis type="number" tickFormatter={(value) => Number(value).toLocaleString('th-TH')} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                                        <RechartsTooltip formatter={(value) => `${Number(value).toLocaleString('th-TH')} บาท`} />
                                        <Bar dataKey="value" name="รายได้เฉลี่ย" fill="#0969da" maxBarSize={28} />
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
                        <span className="crud-title">ตารางข้อมูล YSF ปี {activeYear || '-'}</span>
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
                            <Tooltip title="รีเฟรช">
                                <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                            </Tooltip>
                            {userCanEdit && <Button icon={<PlusOutlined />} onClick={handleAdd}>เพิ่มข้อมูล</Button>}
                            {userCanEdit && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import CSV</Button>}
                            <Button icon={<DownloadOutlined />} onClick={() => exportRows('csv')}>Export CSV</Button>
                            <Button icon={<FileExcelOutlined />} onClick={() => exportRows('xlsx')}>Export Excel</Button>
                        </Space>
                        <Popover content={columnSelector} trigger="click" placement="bottomRight">
                            <Button icon={<SettingOutlined />}>
                                คอลัมน์ {baseVisibleColumns.length}/{selectableColumns.length}
                            </Button>
                        </Popover>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16, padding: 16, background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0' }}>
                    <Input.Search allowClear placeholder="ค้นหา ชื่อ/รหัส/โทร/กิจกรรม" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
                    <Select allowClear placeholder="อำเภอ" value={filters.district} onChange={(value) => setFilter('district', value)} options={districtOptions} showSearch />
                    <Select allowClear placeholder="จังหวัด" value={filters.province} onChange={(value) => setFilter('province', value)} options={provinceOptions} showSearch />
                    <Select allowClear placeholder="สถานภาพเกษตรกร" value={filters.farmer_status} onChange={(value) => setFilter('farmer_status', value)} options={statusOptions} showSearch />
                    <Select allowClear placeholder="กิจกรรมทางการเกษตร" value={filters.agricultural_activity} onChange={(value) => setFilter('agricultural_activity', value)} options={activityOptions} showSearch />
                    <Select allowClear placeholder="การศึกษา" value={filters.education} onChange={(value) => setFilter('education', value)} options={educationOptions} showSearch />
                    <InputNumber placeholder="รายได้ต่ำสุด" value={filters.minIncome} onChange={(value) => setFilter('minIncome', value)} min={0} style={{ width: '100%' }} />
                    <InputNumber placeholder="รายได้สูงสุด" value={filters.maxIncome} onChange={(value) => setFilter('maxIncome', value)} min={0} style={{ width: '100%' }} />
                    <Button icon={<FilterOutlined />} onClick={() => setFilters({})} disabled={activeFilterCount === 0}>ล้างตัวกรอง {activeFilterCount ? `(${activeFilterCount})` : ''}</Button>
                </div>
                <div
                    ref={topScrollRef}
                    style={{ overflowX: 'auto', overflowY: 'hidden', height: 16, marginBottom: 8 }}
                >
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
            <CsvImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                tableName="young_smart_farmer_ysf"
                columns={importColumns}
                onSuccess={refetch}
            />
            <Modal
                title={editingRecord ? 'แก้ไขข้อมูล YSF' : 'เพิ่มข้อมูล YSF'}
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
                                <Form.Item name={column.dataIndex} label={column.title} rules={column.dataIndex === 'record_code' || column.dataIndex === 'data_year' ? [{ required: true }] : []}>
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


