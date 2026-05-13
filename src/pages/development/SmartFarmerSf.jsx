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
    { title: 'à¸›à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥', dataIndex: 'data_year', key: 'data_year', width: 90, align: 'center', importHeader: 'à¸›à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥' },
    { title: 'à¸£à¸«à¸±à¸ªà¸£à¸°à¹€à¸šà¸µà¸¢à¸™', dataIndex: 'record_code', key: 'record_code', width: 130, importHeader: 'à¸£à¸«à¸±à¸ªà¸£à¸°à¹€à¸šà¸µà¸¢à¸™' },
    { title: 'à¸¥à¸³à¸”à¸±à¸š', dataIndex: 'sequence_no', key: 'sequence_no', width: 80, align: 'center', importHeader: 'à¸¥à¸³à¸”à¸±à¸š' },
    { title: 'à¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™', dataIndex: 'citizen_id', key: 'citizen_id', width: 160, importHeader: 'à¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™' },
    { title: 'à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²', dataIndex: 'title', key: 'title', width: 90, importHeader: 'à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²' },
    { title: 'à¸Šà¸·à¹ˆà¸­', dataIndex: 'first_name', key: 'first_name', width: 120, importHeader: 'à¸Šà¸·à¹ˆà¸­' },
    { title: 'à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥', dataIndex: 'last_name', key: 'last_name', width: 140, importHeader: 'à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥' },
    { title: 'à¸Šà¸·à¹ˆà¸­-à¸ªà¸à¸¸à¸¥', dataIndex: 'full_name', key: 'full_name', width: 180 },
    { title: 'à¸­à¸²à¸¢à¸¸', dataIndex: 'age', key: 'age', width: 80, align: 'center', importHeader: 'à¸­à¸²à¸¢à¸¸' },
    { title: 'à¸­à¸³à¹€à¸ à¸­', dataIndex: 'district', key: 'district', width: 130, importHeader: 'à¸­à¸³à¹€à¸ à¸­_à¸ˆà¸²à¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ' },
    { title: 'à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”', dataIndex: 'province', key: 'province', width: 120, importHeader: 'à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”_à¸ˆà¸²à¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ' },
    { title: 'à¸ªà¸–à¸²à¸™à¸°', dataIndex: 'farmer_status', key: 'farmer_status', width: 180, importHeader: 'à¸ªà¸–à¸²à¸™à¸°à¹€à¸à¸©à¸•à¸£à¸à¸£' },
    { title: 'à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£', dataIndex: 'agricultural_activity', key: 'agricultural_activity', width: 180, importHeader: 'à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£' },
    { title: 'à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ', dataIndex: 'phone', key: 'phone', width: 130, importHeader: 'à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œà¸¡à¸·à¸­à¸–à¸·à¸­' },
    { title: 'à¸à¸²à¸£à¸¨à¸¶à¸à¸©à¸²', dataIndex: 'education', key: 'education', width: 160, importHeader: 'à¸à¸²à¸£à¸¨à¸¶à¸à¸©à¸²' },
    { title: 'à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸à¸²à¸£à¸œà¸¥à¸´à¸•', dataIndex: 'production_standard', key: 'production_standard', width: 180, importHeader: 'à¸à¸²à¸£à¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸£à¸±à¸šà¸£à¸­à¸‡à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸à¸²à¸£à¸œà¸¥à¸´à¸•' },
    { title: 'à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢', dataIndex: 'sales_channel', key: 'sales_channel', width: 180, importHeader: 'à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸à¸²à¸£à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢à¸œà¸¥à¸œà¸¥à¸´à¸•/à¸ªà¸´à¸™à¸„à¹‰à¸²' },
    {
        title: 'à¸£à¸²à¸¢à¹„à¸”à¹‰à¸ à¸²à¸„à¹€à¸à¸©à¸•à¸£',
        dataIndex: 'annual_agri_income',
        key: 'annual_agri_income',
        width: 140,
        align: 'right',
        importHeader: 'à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡à¸ à¸²à¸„à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£à¸‚à¸­à¸‡à¸„à¸£à¸±à¸§à¹€à¸£à¸·à¸­à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£à¸›à¸µà¸—à¸µà¹ˆà¸œà¹ˆà¸²à¸™à¸¡à¸²',
        render: (value) => value ? Number(value).toLocaleString('th-TH') : '-',
    },
    { title: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸à¸²à¸£à¸œà¸¥à¸´à¸•', dataIndex: 'production_area', key: 'production_area', width: 180, importHeader: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸à¸²à¸£à¸œà¸¥à¸´à¸•' },
];

const importColumns = columns.filter((column) => column.dataIndex !== 'full_name');
const requiredColumnKeys = ['sequence_no', 'record_code', 'full_name', 'district', 'agricultural_activity'];
const defaultOptionalColumnKeys = ['data_year', 'age', 'province', 'farmer_status', 'phone', 'education', 'annual_agri_income'];
const compactColumnConfig = {
    data_year: { title: 'à¸›à¸µ', width: 64 },
    record_code: { title: 'à¸£à¸«à¸±à¸ª', width: 116, ellipsis: true },
    sequence_no: { width: 64 },
    citizen_id: { title: 'à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£', width: 132, ellipsis: true },
    title: { width: 76, ellipsis: true },
    first_name: { width: 104, ellipsis: true },
    last_name: { width: 120, ellipsis: true },
    full_name: { width: 160, ellipsis: true },
    age: { width: 60 },
    district: { width: 112, ellipsis: true },
    province: { width: 104, ellipsis: true },
    farmer_status: { width: 144, ellipsis: true },
    agricultural_activity: { title: 'à¸à¸´à¸ˆà¸à¸£à¸£à¸¡', width: 160, ellipsis: true },
    phone: { title: 'à¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ', width: 116, ellipsis: true },
    education: { width: 132, ellipsis: true },
    production_standard: { title: 'à¸¡à¸²à¸•à¸£à¸à¸²à¸™', width: 132, ellipsis: true },
    sales_channel: { title: 'à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸‚à¸²à¸¢', width: 132, ellipsis: true },
    annual_agri_income: { title: 'à¸£à¸²à¸¢à¹„à¸”à¹‰', width: 118 },
    production_area: { title: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆ', width: 120, ellipsis: true },
};

const numberFieldKeys = ['data_year', 'sequence_no', 'age', 'annual_agri_income'];
const editableColumns = columns.filter((column) => column.dataIndex && !['id', 'full_name', 'created_at', 'updated_at'].includes(column.dataIndex));

function countBy(rows, key, limit = 12) {
    const counts = rows.reduce((acc, row) => {
        const name = row[key] || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸';
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
        document.title = 'à¹€à¸à¸©à¸•à¸£à¸à¸£à¸›à¸£à¸²à¸”à¹€à¸›à¸£à¸·à¹ˆà¸­à¸‡ (SF) | à¸¨à¸¹à¸™à¸¢à¹Œà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£à¸™à¸„à¸£à¸›à¸à¸¡';
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
            message.warning('à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹à¸à¹‰à¹„à¸‚');
            return;
        }
        setEditingRecord(record);
        form.setFieldsValue(record);
        setEditOpen(true);
    };

    const handleAdd = () => {
        if (!userCanEdit) {
            message.warning('à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥');
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
        title: 'à¸ˆà¸±à¸”à¸à¸²à¸£',
        key: 'actions',
        width: userCanDelete ? 96 : 56,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
            <Space size={4}>
                <Tooltip title="à¹à¸à¹‰à¹„à¸‚">
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                </Tooltip>
                {userCanDelete && (
                    <Popconfirm title="à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸š" description="à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¥à¸šà¸£à¸²à¸¢à¸à¸²à¸£à¸™à¸µà¹‰à¹ƒà¸Šà¹ˆà¹„à¸«à¸¡?" okText="à¸¥à¸š" cancelText="à¸¢à¸à¹€à¸¥à¸´à¸" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record)}>
                        <Tooltip title="à¸¥à¸š"><Button danger icon={<DeleteOutlined />} /></Tooltip>
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
            <div style={{ fontWeight: 700, marginBottom: 8 }}>à¹€à¸¥à¸·à¸­à¸à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œà¸—à¸µà¹ˆà¹à¸ªà¸”à¸‡</div>
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
                            {column.title}{locked ? ' (à¸«à¸¥à¸±à¸)' : ''}
                        </Checkbox>
                    );
                })}
            </div>
            <Space style={{ marginTop: 12 }}>
                <Button size="small" onClick={() => setVisibleOptionalColumns(selectableColumns.filter((column) => !requiredColumnKeys.includes(column.dataIndex)).map((column) => column.dataIndex))}>à¹€à¸¥à¸·à¸­à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns(defaultOptionalColumnKeys)}>à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns([])}>à¸«à¸¥à¸±à¸à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™</Button>
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
        return <div style={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin tip="à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ SF..." /></div>;
    }

    return (
        <div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TeamOutlined style={{ fontSize: 20, color: '#1a7f37' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2328' }}>à¹€à¸à¸©à¸•à¸£à¸à¸£à¸›à¸£à¸²à¸”à¹€à¸›à¸£à¸·à¹ˆà¸­à¸‡ (SF)</span>
                        <Tag color="green">à¸›à¸µ {activeYear || '-'}</Tag>
                    </div>
                </div>
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={8}><Card size="small"><Statistic title="à¸ˆà¸³à¸™à¸§à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£" value={filteredRows.length} suffix={`à¸ˆà¸²à¸ ${yearRows.length} à¸£à¸²à¸¢`} /></Card></Col>
                    <Col xs={24} md={8}><Card size="small"><Statistic title="à¸ˆà¸³à¸™à¸§à¸™à¸­à¸³à¹€à¸ à¸­/à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆ" value={districtData.length} suffix="à¹à¸«à¹ˆà¸‡" /></Card></Col>
                    <Col xs={24} md={8}><Card size="small"><Statistic title="à¸£à¸²à¸¢à¹„à¸”à¹‰à¸ à¸²à¸„à¹€à¸à¸©à¸•à¸£à¸£à¸§à¸¡" value={totalIncome} formatter={(value) => Number(value).toLocaleString('th-TH')} suffix="à¸šà¸²à¸—" /></Card></Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title="à¸ˆà¸³à¸™à¸§à¸™ SF à¹à¸¢à¸à¸•à¸²à¸¡à¸­à¸³à¹€à¸ à¸­" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={districtData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" name="à¸ˆà¸³à¸™à¸§à¸™" fill="#1a7f37" maxBarSize={42} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£à¸¢à¸­à¸”à¸™à¸´à¸¢à¸¡" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                            <div style={{ height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activityData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" name="à¸ˆà¸³à¸™à¸§à¸™" fill="#0969da" maxBarSize={28} />
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
                        <span className="crud-title">à¸•à¸²à¸£à¸²à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ SF à¸›à¸µ {activeYear || '-'}</span>
                        <Tag className="crud-count">{filteredRows.length} à¸£à¸²à¸¢à¸à¸²à¸£</Tag>
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
                                à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œ {baseVisibleColumns.length}/{selectableColumns.length}
                            </Button>
                        </Popover>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16, padding: 16, background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0' }}>
                    <Input.Search allowClear placeholder="à¸„à¹‰à¸™à¸«à¸² à¸Šà¸·à¹ˆà¸­/à¸£à¸«à¸±à¸ª/à¹‚à¸—à¸£/à¸à¸´à¸ˆà¸à¸£à¸£à¸¡" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
                    <Select allowClear placeholder="à¸­à¸³à¹€à¸ à¸­" value={filters.district} onChange={(value) => setFilter('district', value)} options={districtOptions} showSearch />
                    <Select allowClear placeholder="à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”" value={filters.province} onChange={(value) => setFilter('province', value)} options={provinceOptions} showSearch />
                    <Select allowClear placeholder="à¸ªà¸–à¸²à¸™à¸°à¹€à¸à¸©à¸•à¸£à¸à¸£" value={filters.farmer_status} onChange={(value) => setFilter('farmer_status', value)} options={statusOptions} showSearch />
                    <Select allowClear placeholder="à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£" value={filters.agricultural_activity} onChange={(value) => setFilter('agricultural_activity', value)} options={activityOptions} showSearch />
                    <Select allowClear placeholder="à¸à¸²à¸£à¸¨à¸¶à¸à¸©à¸²" value={filters.education} onChange={(value) => setFilter('education', value)} options={educationOptions} showSearch />
                    <InputNumber placeholder="à¸£à¸²à¸¢à¹„à¸”à¹‰à¸•à¹ˆà¸³à¸ªà¸¸à¸”" value={filters.minIncome} onChange={(value) => setFilter('minIncome', value)} min={0} style={{ width: '100%' }} />
                    <InputNumber placeholder="à¸£à¸²à¸¢à¹„à¸”à¹‰à¸ªà¸¹à¸‡à¸ªà¸¸à¸”" value={filters.maxIncome} onChange={(value) => setFilter('maxIncome', value)} min={0} style={{ width: '100%' }} />
                    <Button icon={<FilterOutlined />} onClick={() => setFilters({})} disabled={activeFilterCount === 0}>à¸¥à¹‰à¸²à¸‡à¸•à¸±à¸§à¸à¸£à¸­à¸‡ {activeFilterCount ? `(${activeFilterCount})` : ''}</Button>
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
                okText="à¸šà¸±à¸™à¸—à¸¶à¸"
                cancelText="à¸¢à¸à¹€à¸¥à¸´à¸"
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
