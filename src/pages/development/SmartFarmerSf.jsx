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
    { title: 'ลำดับ', dataIndex: 'sequence_no', key: 'sequence_no', width: 80, align: 'center', importHeader: 'ลำดับ' },
    { title: 'เลขบัตรประชาชน', dataIndex: 'citizen_id', key: 'citizen_id', width: 160, importHeader: 'เลขบัตรประชาชน' },
    { title: 'คำนำหน้า', dataIndex: 'title', key: 'title', width: 90, importHeader: 'คำนำหน้า' },
    { title: 'ชื่อ', dataIndex: 'first_name', key: 'first_name', width: 120, importHeader: 'ชื่อ' },
    { title: 'นามสกุล', dataIndex: 'last_name', key: 'last_name', width: 140, importHeader: 'นามสกุล' },
    { title: 'ชื่อ-สกุล', dataIndex: 'full_name', key: 'full_name', width: 180 },
    { title: 'อายุ', dataIndex: 'age', key: 'age', width: 80, align: 'center', importHeader: 'อายุ' },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130, importHeader: 'อำเภอ_จากที่อยู่' },
    { title: 'จังหวัด', dataIndex: 'province', key: 'province', width: 120, importHeader: 'จังหวัด_จากที่อยู่' },
    { title: 'สถานะ', dataIndex: 'farmer_status', key: 'farmer_status', width: 180, importHeader: 'สถานะเกษตรกร' },
    { title: 'กิจกรรมทางการเกษตร', dataIndex: 'agricultural_activity', key: 'agricultural_activity', width: 180, importHeader: 'กิจกรรมทางการเกษตร' },
    { title: 'เบอร์โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 130, importHeader: 'เบอร์โทรศัพท์มือถือ' },
    { title: 'การศึกษา', dataIndex: 'education', key: 'education', width: 160, importHeader: 'การศึกษา' },
    { title: 'มาตรฐานการผลิต', dataIndex: 'production_standard', key: 'production_standard', width: 180, importHeader: 'การได้รับการรับรองมาตรฐานการผลิต' },
    { title: 'ช่องทางจำหน่าย', dataIndex: 'sales_channel', key: 'sales_channel', width: 180, importHeader: 'ช่องทางการจำหน่ายผลผลิต/สินค้า' },
    { title: 'รายได้ภาคเกษตร', dataIndex: 'annual_agri_income', key: 'annual_agri_income', width: 140, align: 'right', importHeader: 'รายได้รวมภาคการเกษตรของครัวเรือนหรือเกษตรกรที่มีที่มาชัดเจน', render: (value) => value ? Number(value).toLocaleString('th-TH') : '-' },
    { title: 'พื้นที่การผลิต', dataIndex: 'production_area', key: 'production_area', width: 180, importHeader: 'พื้นที่การผลิต' },
];

const importColumns = columns.filter((column) => column.dataIndex !== 'full_name');
const requiredColumnKeys = ['sequence_no', 'record_code', 'full_name', 'district', 'agricultural_activity'];
const defaultOptionalColumnKeys = ['data_year', 'age', 'province', 'farmer_status', 'phone', 'education', 'annual_agri_income'];
const compactColumnConfig = {
    data_year: { title: 'ปี', width: 64 },
    record_code: { title: 'รหัส', width: 116, ellipsis: true },
    sequence_no: { width: 64 },
    citizen_id: { title: 'เลขบัตร', width: 132, ellipsis: true },
    title: { width: 76, ellipsis: true },
    first_name: { width: 104, ellipsis: true },
    last_name: { width: 120, ellipsis: true },
    full_name: { width: 160, ellipsis: true },
    age: { width: 60 },
    district: { width: 112, ellipsis: true },
    province: { width: 104, ellipsis: true },
    farmer_status: { width: 144, ellipsis: true },
    agricultural_activity: { title: 'กิจกรรม', width: 160, ellipsis: true },
    phone: { title: 'โทรศัพท์', width: 116, ellipsis: true },
    education: { width: 132, ellipsis: true },
    production_standard: { title: 'มาตรฐาน', width: 132, ellipsis: true },
    sales_channel: { title: 'ช่องทางขาย', width: 132, ellipsis: true },
    annual_agri_income: { title: 'รายได้', width: 118 },
    production_area: { title: 'พื้นที่', width: 120, ellipsis: true },
};

const numberFieldKeys = ['data_year', 'sequence_no', 'age', 'annual_agri_income'];
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

export default function SmartFarmerSf() {
    const tableWrapRef = useRef(null);
    const topScrollRef = useRef(null);
    const tableScrollX = 1680;
    const { role, canEdit, canDelete } = useAuth();
    const { createRecord, updateRecord, deleteRecord } = useSupabaseCrud('smart_farmer_sf');
    const [form] = Form.useForm();
    const [editingRecord, setEditingRecord] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const userCanEdit = canEdit();
    const userCanDelete = canDelete();

    useEffect(() => {
        document.title = 'เกษตรกรปราดเปรื่อง (SF) | ศูนย์ข้อมูลการเกษตรนครปฐม';
    }, []);

    const fetchRows = async () => {
        const { data, error } = await supabase
            .from('smart_farmer_sf')
            .select('*')
            .order('data_year', { ascending: false })
            .order('sequence_no', { ascending: true });
        if (error) throw error;
        return data || [];
    };

    const { data: rows = [], isLoading, refetch } = useApiCache('smart_farmer_sf_all', fetchRows);
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
    const activityData = useMemo(() => countBy(filteredRows, 'agricultural_activity', 10), [filteredRows]);
    const totalIncome = useMemo(() => filteredRows.reduce((sum, row) => sum + (Number(row.annual_agri_income) || 0), 0), [filteredRows]);
    const activeFilterCount = Object.values(filters).filter((value) => value !== undefined && value !== null && value !== '').length;
    const baseVisibleColumns = useMemo(() => getPublicColumns('smart_farmer_sf', columns, role)
        .filter((column) => (
            requiredColumnKeys.includes(column.dataIndex) || visibleOptionalColumns.includes(column.dataIndex)
        ))
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
        title: 'การจัดการ',
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

    const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
    const selectableColumns = getPublicColumns('smart_farmer_sf', columns, role);

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
                <Button size="small" onClick={() => setVisibleOptionalColumns(selectableColumns.filter((column) => !requiredColumnKeys.includes(column.dataIndex)).map((column) => column.dataIndex))}>�¹��¸¥�¸·�¸­�¸�¸��¸±�¹��¸��¸«�¸¡�¸�</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns(defaultOptionalColumnKeys)}>�¸��¹��¸²�¹��¸£�¸´�¹��¸¡�¸��¹��¸�</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns([])}>�¸«�¸¥�¸±�¸�¹��¸��¹��¸²�¸��¸±�¹��¸�</Button>
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
        const exportColumns = getPublicColumns('smart_farmer_sf', columns, role).filter((column) => column.dataIndex);
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
                utils.book_append_sheet(workbook, worksheet, `SF_${activeYear || 'all'}`);
                writeFile(workbook, `smart_farmer_sf_${activeYear || 'all'}.xlsx`);
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
        link.download = `smart_farmer_sf_${activeYear || 'all'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return <div style={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin tip="กำลังโหลดข้อมูล SF..." /></div>;
    }

    return (
        <div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TeamOutlined style={{ fontSize: 20, color: '#1a7f37' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2328' }}>เกษตรกรปราดเปรื่อง (SF)</span>
                        <Tag color="green">ปี {activeYear || '-'}</Tag>
                    </div>
                </div>
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={role === 'guest' ? 12 : 8}><Card size="small"><Statistic title="จำนวนเกษตรกร" value={filteredRows.length} suffix={`จาก ${yearRows.length} ราย`} /></Card></Col>
                    <Col xs={24} md={role === 'guest' ? 12 : 8}><Card size="small"><Statistic title="จำนวนอำเภอ/พื้นที่" value={districtData.length} suffix="แห่ง" /></Card></Col>
                    {role !== 'guest' && (
                        <Col xs={24} md={8}><Card size="small"><Statistic title="รายได้ภาคเกษตรรวม" value={totalIncome} formatter={(value) => Number(value).toLocaleString('th-TH')} suffix="บาท" /></Card></Col>
                    )}
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title="จำนวน SF แยกตามอำเภอ" size="small" bordered={false} style={{ background: '#fafbfc' }}>
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
                        <Card title="กิจกรรมทางการเกษตรยอดนิยม" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activityData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" name="จำนวน" fill="#0969da" maxBarSize={28} />
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
                        <span className="crud-title">ตารางข้อมูล SF ปี {activeYear || '-'}</span>
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
                    <Select allowClear placeholder="จังหวัด" value={filters.province} onChange={(value) => setFilter('province', value)} options={provinceOptions} showSearch />
                    <Select allowClear placeholder="สถานะเกษตรกร" value={filters.farmer_status} onChange={(value) => setFilter('farmer_status', value)} options={statusOptions} showSearch />
                    <Select allowClear placeholder="กิจกรรมทางการเกษตร" value={filters.agricultural_activity} onChange={(value) => setFilter('agricultural_activity', value)} options={activityOptions} showSearch />
                    <Select allowClear placeholder="การศึกษา" value={filters.education} onChange={(value) => setFilter('education', value)} options={educationOptions} showSearch />
                    {role !== 'guest' && (
                        <>
                            <InputNumber placeholder="รายได้ต่ำสุด" value={filters.minIncome} onChange={(value) => setFilter('minIncome', value)} min={0} style={{ width: '100%' }} />
                            <InputNumber placeholder="รายได้สูงสุด" value={filters.maxIncome} onChange={(value) => setFilter('maxIncome', value)} min={0} style={{ width: '100%' }} />
                        </>
                    )}
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
                tableName="smart_farmer_sf"
                columns={importColumns}
                onSuccess={refetch}
            />
            <Modal
                title={editingRecord ? 'แก้ไขข้อมูล SF' : 'เพิ่มข้อมูล SF'}
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
