import { useState, useMemo } from 'react';
import {
    Table, Button, Input, Modal, Form, Space, Popconfirm, Tag, Tooltip, Empty, Select, message, Popover, Checkbox
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, DownloadOutlined, ReloadOutlined, UploadOutlined,
    FileExcelOutlined, FilterOutlined, SettingOutlined
} from '@ant-design/icons';
import { useSupabaseCrud } from '../../hooks/useSupabase';
import CsvImportModal from './CsvImportModal';
import { useAuth } from '../../contexts/AuthContext';
import { useApiCache } from '../../hooks/useApiCache';
import { supabase } from '../../supabaseClient';
import { getPublicColumns, getPublicSelectColumns } from '../../utils/dataPrivacy';
import { downloadCsv, objectsToCsv } from '../../utils/csv';

export default function CrudTable({ tableName, title, columns, formFields, searchField, searchFields, filterConfig = [], scrollX = 1000, defaultSort = null, extraActions = null, fetchDataOverride = null, fetchAllOverride = null, requiredColumns = null, defaultColumns = null }) {
    const { createRecord, updateRecord, deleteRecord, fetchAll } = useSupabaseCrud(tableName);
    const { canEdit, canDelete, role } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [filters, setFilters] = useState({});
    const [showFilters, setShowFilters] = useState(true);
    const [sorter, setSorter] = useState(defaultSort || { field: null, order: null });
    const [form] = Form.useForm();

    const userCanEdit = canEdit();
    const userCanDelete = canDelete();

    // Column picker: derive selectable, required, default, and optional column keys
    const selectableColumnKeys = useMemo(() => columns.filter(c => c.dataIndex).map(c => c.dataIndex), [columns]);
    const requiredColumnKeys = useMemo(() => {
        if (requiredColumns) return requiredColumns;
        // Default: first 4 data columns are required
        return selectableColumnKeys.slice(0, Math.min(4, selectableColumnKeys.length));
    }, [requiredColumns, selectableColumnKeys]);
    const defaultOptionalColumnKeys = useMemo(() => {
        if (defaultColumns) return defaultColumns.filter(k => !requiredColumnKeys.includes(k));
        // Default: show first 8 optional columns
        return selectableColumnKeys.filter(k => !requiredColumnKeys.includes(k)).slice(0, 8);
    }, [defaultColumns, requiredColumnKeys, selectableColumnKeys]);
    const [visibleOptionalColumns, setVisibleOptionalColumns] = useState(() => defaultOptionalColumnKeys);

    const fetchTableData = async () => {
        if (fetchDataOverride) {
            return fetchDataOverride({ pagination, search, searchField, searchFields, filters, filterConfig, sorter, defaultSort });
        }

        const transformedFilters = {};
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                const conf = filterConfig?.find(c => c.key === key);
                if (conf && conf.operator) {
                    transformedFilters[key] = { operator: conf.operator, value: conf.operator === 'ilike' ? `%${val}%` : val };
                } else {
                    transformedFilters[key] = val;
                }
            }
        });

        const from = (pagination.current - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;

        const selectColumns = getPublicSelectColumns(tableName, columns, role);
        let query = supabase.from(tableName).select(selectColumns, { count: 'exact' });

        if (search) {
            if (searchField) {
                query = query.ilike(searchField, `%${search}%`);
            } else if (searchFields && searchFields.length > 0) {
                const orString = searchFields.map(field => `${field}.ilike.%${search}%`).join(',');
                query = query.or(orString);
            }
        }

        Object.entries(transformedFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (typeof value === 'object' && !Array.isArray(value) && value.operator) {
                    if (value.operator === 'ilike') query = query.ilike(key, value.value);
                    else if (value.operator === 'contains') query = query.contains(key, value.value);
                    else if (value.operator === 'month') {
                        query = query.gte(key, `${value.value}-01`).lte(key, `${value.value}-31`);
                    }
                } else {
                    query = query.eq(key, value);
                }
            }
        });

        const activeSort = sorter.field && sorter.order ? sorter : defaultSort;
        if (activeSort?.field && activeSort?.order) {
            query = query.order(activeSort.field, { ascending: activeSort.order === 'ascend' });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        query = query.range(from, to);

        const { data: rows, error, count } = await query;
        if (error) throw error;
        
        return { data: rows || [], total: count || 0 };
    };

    const queryKey = useMemo(() => [
        'crud', tableName, pagination.current, pagination.pageSize, search, searchField, searchFields, filters, sorter, defaultSort, JSON.stringify(filterConfig)
    ], [tableName, pagination, search, searchField, searchFields, filters, sorter, defaultSort, filterConfig]);
    
    const { data: result = { data: [], total: 0 }, isLoading: loading, refetch: loadData } = useApiCache(queryKey, fetchTableData);
    
    const data = result.data;
    const total = result.total;

    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        const ok = await deleteRecord(id);
        if (ok) loadData();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            let ok;
            if (editingRecord) {
                ok = await updateRecord(editingRecord.id, values);
            } else {
                ok = await createRecord(values);
            }
            if (ok) {
                setModalOpen(false);
                form.resetFields();
                loadData();
            }
        } catch {
            /* validation error, ant handles display */
        }
    };

    const handleTableChange = (pag, _filters, tableSorter) => {
        setPagination({ current: pag.current, pageSize: pag.pageSize });
        if (tableSorter) {
            setSorter({ field: tableSorter.field || tableSorter.columnKey, order: tableSorter.order || null });
        }
    };

    const handleSearch = (value) => {
        setSearch(value);
        setPagination({ ...pagination, current: 1 });
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        setPagination({ ...pagination, current: 1 });
    };

    const handleClearFilters = () => {
        setFilters({});
        setPagination({ ...pagination, current: 1 });
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;

    // Filter out name columns for guest, except for presidents
    const allPublicColumns = useMemo(() => {
        return getPublicColumns(tableName, columns, role);
    }, [columns, role, tableName]);

    // Apply column picker filter
    const visibleColumns = useMemo(() => {
        return allPublicColumns.filter(col => {
            if (!col.dataIndex) return true; // keep action columns etc.
            return requiredColumnKeys.includes(col.dataIndex) || visibleOptionalColumns.includes(col.dataIndex);
        });
    }, [allPublicColumns, requiredColumnKeys, visibleOptionalColumns]);

    // Column selector popover content
    const columnSelector = useMemo(() => (
        <div style={{ width: 280, maxHeight: 420, overflowY: 'auto', padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>เลือกคอลัมน์ที่แสดง</div>
            <div style={{ display: 'grid', gap: 6 }}>
                {allPublicColumns.filter(c => c.dataIndex).map(col => {
                    const locked = requiredColumnKeys.includes(col.dataIndex);
                    return (
                        <Checkbox
                            key={col.dataIndex}
                            checked={locked || visibleOptionalColumns.includes(col.dataIndex)}
                            disabled={locked}
                            onChange={(e) => {
                                setVisibleOptionalColumns(prev => e.target.checked
                                    ? [...prev, col.dataIndex]
                                    : prev.filter(k => k !== col.dataIndex)
                                );
                            }}
                        >
                            {typeof col.title === 'string' ? col.title : col.dataIndex}{locked ? ' (หลัก)' : ''}
                        </Checkbox>
                    );
                })}
            </div>
            <Space style={{ marginTop: 12 }}>
                <Button size="small" onClick={() => setVisibleOptionalColumns(allPublicColumns.filter(c => c.dataIndex && !requiredColumnKeys.includes(c.dataIndex)).map(c => c.dataIndex))}>เลือกทั้งหมด</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns(defaultOptionalColumnKeys)}>ค่าเริ่มต้น</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns([])}>หลักเท่านั้น</Button>
            </Space>
        </div>
    ), [allPublicColumns, requiredColumnKeys, visibleOptionalColumns, defaultOptionalColumnKeys]);

    const handleExportCSV = () => {
        if (!data.length) return;
        const headers = visibleColumns.filter(c => c.dataIndex).map(c => c.title);
        const keys = visibleColumns.filter(c => c.dataIndex).map(c => c.dataIndex);
        const csvContent = [
            headers.join(','),
            ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportAllCSV = async () => {
        try {
            const allData = fetchAllOverride
                ? await fetchAllOverride()
                : role === 'guest'
                    ? (await supabase.from(tableName).select(getPublicSelectColumns(tableName, columns, role))).data || []
                    : await fetchAll();
            if (!allData.length) return;

            const headers = visibleColumns.filter(c => c.dataIndex).map(c => c.title);
            const keys = visibleColumns.filter(c => c.dataIndex).map(c => c.dataIndex);
            const rows = allData.map(row => {
                const obj = {};
                keys.forEach((k, i) => { obj[headers[i]] = row[k] ?? ''; });
                return obj;
            });

            downloadCsv(`${tableName}_${new Date().toISOString().slice(0, 10)}_all.csv`, objectsToCsv(rows));
        } catch (err) {
            console.error('CSV export error:', err);
        }
    };

    // Auto-apply sorter to data columns
    const sortableColumns = visibleColumns.map(col => col.dataIndex ? { ...col, sorter: true } : col);

    // Action column — ซ่อนตาม role
    const actionColumn = userCanEdit ? {
        title: 'จัดการ',
        key: 'actions',
        width: userCanDelete ? 100 : 70,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
            <Space size={4}>
                <Tooltip title="แก้ไข">
                    <Button className="action-btn edit" icon={<EditOutlined />} onClick={() => {
                        if (!userCanEdit) {
                            message.warning('คุณไม่มีสิทธิ์แก้ไข');
                            return;
                        }
                        handleEdit(record);
                    }} />
                </Tooltip>
                {userCanDelete && (
                    <Popconfirm
                        title="ยืนยันการลบ"
                        description="คุณต้องการลบข้อมูลนี้ใช่หรือไม่?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="ลบ"
                        cancelText="ยกเลิก"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="ลบ">
                            <Button className="action-btn delete" icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                )}
            </Space>
        ),
    } : null;

    const allColumns = actionColumn ? [...sortableColumns, actionColumn] : [...sortableColumns];

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="crud-header-left">
                    <span className="crud-title">{title}</span>
                    <Tag className="crud-count">{total} รายการ</Tag>
                </div>
                <div className="crud-header-right">
                    {(searchField || (searchFields && searchFields.length > 0)) && (
                        <Input.Search
                            placeholder="ค้นหา..."
                            allowClear
                            onSearch={handleSearch}
                            style={{ width: 220 }}
                            prefix={<SearchOutlined />}
                        />
                    )}
                    {filterConfig.length > 0 && (
                        <Tooltip title="กรองข้อมูล">
                            <Button
                                icon={<FilterOutlined />}
                                onClick={() => setShowFilters(!showFilters)}
                                className={`export-btn ${activeFilterCount > 0 ? 'filter-active' : ''}`}
                            >
                                กรอง {activeFilterCount > 0 && `(${activeFilterCount})`}
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="รีเฟรช">
                        <Button icon={<ReloadOutlined />} onClick={loadData} className="export-btn" />
                    </Tooltip>
                    {typeof extraActions === 'function' ? extraActions({ refetch: loadData }) : extraActions}
                    {userCanEdit && (
                        <Button icon={<UploadOutlined />} onClick={() => {
                            if (!userCanEdit) {
                                message.warning('คุณไม่มีสิทธิ์แก้ไข');
                                return;
                            }
                            setImportModalOpen(true);
                        }} className="export-btn">
                            Import CSV
                        </Button>
                    )}
                    <Button icon={<DownloadOutlined />} onClick={handleExportCSV} className="export-btn">
                        Export CSV
                    </Button>
                    <Button icon={<FileExcelOutlined />} onClick={handleExportAllCSV} className="export-btn export-excel-btn">
                        Export All CSV
                    </Button>
                    <Popover content={columnSelector} trigger="click" placement="bottomRight">
                        <Button icon={<SettingOutlined />} className="export-btn">
                            คอลัมน์ {visibleColumns.filter(c => c.dataIndex).length}/{allPublicColumns.filter(c => c.dataIndex).length}
                        </Button>
                    </Popover>
                    {userCanEdit && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">
                            เพิ่มข้อมูล
                        </Button>
                    )}
                </div>
            </div>

            {/* Advanced Filter Bar */}
            {filterConfig.length > 0 && showFilters && (
                <div className="filter-bar">
                    <div className="filter-bar-inner">
                        {filterConfig.map(f => (
                            <div key={f.key} className="filter-item">
                                <label className="filter-label">{f.label}</label>
                                <Select
                                    placeholder={`เลือก${f.label}`}
                                    allowClear
                                    value={filters[f.key] || undefined}
                                    onChange={val => handleFilterChange(f.key, val)}
                                    style={{ width: 160 }}
                                    size="small"
                                    options={f.options.map(o => typeof o === 'object' ? o : { label: String(o), value: o })}
                                />
                            </div>
                        ))}
                        {activeFilterCount > 0 && (
                            <Button size="small" onClick={handleClearFilters} style={{ alignSelf: 'flex-end' }}>
                                ล้างตัวกรอง
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <Table
                dataSource={data}
                columns={allColumns}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total,
                    showSizeChanger: true,
                    showTotal: (t) => `ทั้งหมด ${t} รายการ`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                locale={{ emptyText: <Empty description="ยังไม่มีข้อมูล" /> }}
                scroll={{ x: scrollX }}
            />

            <Modal
                title={editingRecord ? `แก้ไข${title}` : `เพิ่ม${title}`}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); }}
                onOk={handleSubmit}
                okText={editingRecord ? 'บันทึก' : 'เพิ่ม'}
                cancelText="ยกเลิก"
                width={640}
                className="crud-modal"
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {formFields}
                </Form>
            </Modal>

            <CsvImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                tableName={tableName}
                columns={columns}
                onSuccess={loadData}
            />
        </div>
    );
}
