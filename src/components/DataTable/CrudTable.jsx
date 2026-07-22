import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Drawer,
  Descriptions,
  Form,
  Space,
  Popconfirm,
  Tag,
  Tooltip,
  Empty,
  Select,
  message,
  Popover,
  Checkbox,
  InputNumber,
  Switch,
  Alert,
  Timeline,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FilterOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useSupabaseCrud } from '../../hooks/useSupabase';
import CsvImportModal from './CsvImportModal';
import { useAuth } from '../../contexts/AuthContext';
import { useApiCache } from '../../hooks/useApiCache';
import { supabase } from '../../supabaseClient';
import {
  getPublicColumns,
  getPublicSelectColumns,
} from '../../utils/dataPrivacy';
import { downloadCsv, objectsToCsv, rowsToCsv } from '../../utils/csv';
import {
  archiveCustomFieldDefinition,
  canUseCustomFields,
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
  fetchCustomFieldDefinitions,
  flattenCustomFields,
  formatCustomValue,
  isValidCustomFieldKey,
  makeCustomDataIndex,
  normalizeCustomFieldKey,
  parseCustomOptions,
  updateCustomFieldDefinition,
} from '../../utils/customFields';
import { getCrudLocationKeys, getSubdistrictsList } from './crudTableFilters';

export default function CrudTable({
  tableName,
  title,
  columns,
  formFields,
  searchField,
  searchFields,
  filterConfig = [],
  scrollX = 1000,
  defaultSort = null,
  extraActions = null,
  fetchDataOverride = null,
  fetchDataVersion = null,
  fetchAllOverride = null,
  requiredColumns = null,
  defaultColumns = null,
  readOnly = false,
  importPolicy = null,
  transformRecordForForm = null,
  transformValuesBeforeSave = null,
  onMutationSuccess = null,
  controlledFilters = null,
  onFiltersChange = null,
  hideFilterBar = false,
  canEditRecord = null,
}) {
  const { createRecord, updateRecord, deleteRecord, fetchAll } =
    useSupabaseCrud(tableName);
  const { canEdit, canDelete, role } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(true);
  const [sorter, setSorter] = useState(
    defaultSort || { field: null, order: null }
  );
  const [customFields, setCustomFields] = useState([]);
  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [form] = Form.useForm();
  const [customFieldForm] = Form.useForm();
  const activeFilters = controlledFilters || filters;

  const keys = useMemo(() => getCrudLocationKeys(columns), [columns]);

  // ponytail: automatically augment filterConfig with district & subdistrict if present in columns
  const finalFilterConfig = useMemo(() => {
    let conf = [...(filterConfig || [])];

    if (keys.district && keys.subdistrict) {
      // Ensure 'district' filter is in config
      let distIndex = conf.findIndex((c) => c.key === keys.district);
      if (distIndex === -1) {
        conf.unshift({
          key: keys.district,
          label: 'อำเภอ',
          options: [
            'เมืองนครปฐม',
            'นครชัยศรี',
            'สามพราน',
            'ดอนตูม',
            'บางเลน',
            'กำแพงแสน',
            'พุทธมณฑล',
          ],
        });
        distIndex = 0;
      }

      // Ensure 'subdistrict' filter is in config
      const subdistIndex = conf.findIndex((c) => c.key === keys.subdistrict);
      if (subdistIndex === -1) {
        // Insert subdistrict immediately after district
        conf.splice(distIndex + 1, 0, {
          key: keys.subdistrict,
          label: 'ตำบล',
          options: [], // populated dynamically
        });
      }
    }

    // Populate subdistrict options dynamically based on selected district
    return conf.map((c) => {
      if (keys.subdistrict && c.key === keys.subdistrict) {
        const selectedDistrict = activeFilters[keys.district];
        const options = getSubdistrictsList(selectedDistrict);
        return {
          ...c,
          options,
        };
      }
      return c;
    });
  }, [filterConfig, keys, activeFilters]);

  useEffect(() => {
    if (detailRecord && role === 'admin') {
      setLoadingHistory(true);
      supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', String(detailRecord.id))
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching audit logs:', error);
            setEditHistory([]);
          } else {
            setEditHistory(data || []);
          }
          setLoadingHistory(false);
        });
    } else {
      setEditHistory([]);
    }
  }, [detailRecord, role, tableName]);

  const userCanEdit = readOnly ? false : canEdit(tableName);
  const userCanDelete = readOnly ? false : canDelete();
  const customFieldsEnabled = canUseCustomFields(tableName);
  const userCanManageCustomFields = customFieldsEnabled && role === 'admin';

  const loadCustomFields = useCallback(async () => {
    if (!customFieldsEnabled) {
      setCustomFields([]);
      return;
    }

    try {
      setCustomFields(await fetchCustomFieldDefinitions(tableName));
    } catch (err) {
      console.error('Custom fields load error:', err);
      setCustomFields([]);
    }
  }, [customFieldsEnabled, tableName]);

  useEffect(() => {
    loadCustomFields();
  }, [loadCustomFields]);

  // Column picker: derive selectable, required, default, and optional column keys
  const selectableColumnKeys = useMemo(
    () => columns.filter((c) => c.dataIndex).map((c) => c.dataIndex),
    [columns]
  );
  const requiredColumnKeys = useMemo(() => {
    if (requiredColumns) return requiredColumns;
    // Default: first 4 data columns are required
    return selectableColumnKeys.slice(
      0,
      Math.min(4, selectableColumnKeys.length)
    );
  }, [requiredColumns, selectableColumnKeys]);
  const defaultOptionalColumnKeys = useMemo(() => {
    if (defaultColumns)
      return defaultColumns.filter((k) => !requiredColumnKeys.includes(k));
    // Default: show first 8 optional columns
    return selectableColumnKeys
      .filter((k) => !requiredColumnKeys.includes(k))
      .slice(0, 8);
  }, [defaultColumns, requiredColumnKeys, selectableColumnKeys]);
  const [visibleOptionalColumns, setVisibleOptionalColumns] = useState(
    () => defaultOptionalColumnKeys
  );

  const publicSearchFields = useMemo(() => {
    const fields = searchFields?.length
      ? searchFields
      : searchField
        ? [searchField]
        : [];
    return getPublicColumns(
      tableName,
      fields.map((field) => ({ dataIndex: field })),
      role
    ).map((column) => column.dataIndex);
  }, [role, searchField, searchFields, tableName]);

  const publicSearchField = useMemo(
    () =>
      searchField && publicSearchFields.includes(searchField)
        ? searchField
        : publicSearchFields[0],
    [publicSearchFields, searchField]
  );

  const fetchTableData = async () => {
    if (fetchDataOverride) {
      return fetchDataOverride({
        pagination,
        search,
        searchField,
        searchFields,
        filters: activeFilters,
        filterConfig: finalFilterConfig,
        sorter,
        defaultSort,
      });
    }

    const transformedFilters = {};
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        const conf = finalFilterConfig?.find((c) => c.key === key);
        if (conf && conf.operator) {
          transformedFilters[key] = {
            operator: conf.operator,
            value: conf.operator === 'ilike' ? `%${val}%` : val,
          };
        } else {
          transformedFilters[key] = val;
        }
      }
    });

    const from = (pagination.current - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    const selectColumns = getPublicSelectColumns(
      tableName,
      columns,
      role,
      customFieldsEnabled ? ['custom_fields'] : []
    );
    let query = supabase
      .from(tableName)
      .select(selectColumns, { count: 'exact' });

    if (search) {
      if (publicSearchField) {
        query = query.ilike(publicSearchField, `%${search}%`);
      } else if (publicSearchFields.length > 0) {
        const orString = publicSearchFields
          .map((field) => `${field}.ilike.%${search}%`)
          .join(',');
        query = query.or(orString);
      }
    }

    Object.entries(transformedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          value.operator
        ) {
          if (value.operator === 'ilike') query = query.ilike(key, value.value);
          else if (value.operator === 'contains')
            query = query.contains(key, value.value);
          else if (value.operator === 'month') {
            query = query
              .gte(key, `${value.value}-01`)
              .lte(key, `${value.value}-31`);
          }
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const activeSort = sorter.field && sorter.order ? sorter : defaultSort;
    if (activeSort?.field && activeSort?.order) {
      query = query.order(activeSort.field, {
        ascending: activeSort.order === 'ascend',
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw error;

    return {
      data: (rows || []).map((row) => flattenCustomFields(row, customFields)),
      total: count || 0,
    };
  };

  const queryKey = useMemo(
    () => [
      'crud',
      tableName,
      pagination.current,
      pagination.pageSize,
      search,
      publicSearchField,
      publicSearchFields,
      activeFilters,
      sorter,
      defaultSort,
      JSON.stringify(finalFilterConfig),
      customFields.map((field) => field.id).join(','),
      fetchDataVersion,
    ],
    [
      tableName,
      pagination,
      search,
      publicSearchField,
      publicSearchFields,
      activeFilters,
      sorter,
      defaultSort,
      finalFilterConfig,
      customFields,
      fetchDataVersion,
    ]
  );

  const {
    data: result = { data: [], total: 0 },
    isLoading: loading,
    refetch: loadData,
  } = useApiCache(queryKey, fetchTableData);

  const data = result.data;
  const total = result.total;

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(
      transformRecordForForm ? transformRecordForForm(record) : record
    );
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    const ok = await deleteRecord(id);
    if (ok) {
      loadData();
      onMutationSuccess?.();
    }
  };

  const handleSubmit = async () => {
    try {
      let values = await form.validateFields();
      if (transformValuesBeforeSave) {
        values = transformValuesBeforeSave(values, editingRecord);
      }
      if (values.custom_fields) {
        values.custom_fields = Object.fromEntries(
          Object.entries(values.custom_fields).filter(
            ([, value]) => value !== undefined
          )
        );
      }
      if (editingRecord && customFieldsEnabled) {
        values.custom_fields = {
          ...(editingRecord.custom_fields || {}),
          ...(values.custom_fields || {}),
        };
      }
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
        onMutationSuccess?.();
      }
    } catch {
      /* validation error, ant handles display */
    }
  };

  const handleTableChange = (pag, _filters, tableSorter) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize });
    if (tableSorter) {
      setSorter({
        field: tableSorter.field || tableSorter.columnKey,
        order: tableSorter.order || null,
      });
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...activeFilters, [key]: value };
    // ponytail: reset subdistrict filter if district changes
    if (keys.district && key === keys.district && keys.subdistrict) {
      newFilters[keys.subdistrict] = undefined;
    }
    if (controlledFilters) onFiltersChange?.(newFilters);
    else setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
  };

  const handleClearFilters = () => {
    if (controlledFilters) onFiltersChange?.({});
    else setFilters({});
    setPagination({ ...pagination, current: 1 });
  };

  const handleClearAll = () => {
    setSearch('');
    setSearchText('');
    if (controlledFilters) onFiltersChange?.({});
    else setFilters({});
    setPagination({ ...pagination, current: 1 });
  };

  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== null && v !== ''
  ).length;
  const hasActiveSearchOrFilters = Boolean(search) || activeFilterCount > 0;

  const customColumns = useMemo(
    () =>
      customFields.map((field) => ({
        title: field.label,
        dataIndex: makeCustomDataIndex(field.field_key),
        key: makeCustomDataIndex(field.field_key),
        customField: true,
        width: 160,
        render: (_, record) =>
          formatCustomValue(record.custom_fields?.[field.field_key], field),
      })),
    [customFields]
  );

  // Filter out name columns for guest, except for presidents
  const allPublicColumns = useMemo(() => {
    return [...getPublicColumns(tableName, columns, role), ...customColumns];
  }, [columns, customColumns, role, tableName]);

  // Apply column picker filter and freeze key columns
  const visibleColumns = useMemo(() => {
    return allPublicColumns
      .map((col) => {
        const dataIdx = col.dataIndex;
        if (!dataIdx) return col;

        const shouldFreeze = [
          'record_code',
          'group_name',
          'enterprise_name',
          'spot_name',
          'farmer_name',
          'full_name',
          'district',
        ].includes(dataIdx);

        if (shouldFreeze) {
          return {
            ...col,
            fixed: 'left',
            width: col.width || 120, // ensure width is set for fixed column
          };
        }
        return col;
      })
      .filter((col) => {
        if (!col.dataIndex) return true; // keep action columns etc.
        return (
          requiredColumnKeys.includes(col.dataIndex) ||
          visibleOptionalColumns.includes(col.dataIndex)
        );
      });
  }, [allPublicColumns, requiredColumnKeys, visibleOptionalColumns]);

  // Column selector popover content
  const columnSelector = useMemo(
    () => (
      <div
        style={{ width: 280, maxHeight: 420, overflowY: 'auto', padding: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          เลือกคอลัมน์ที่แสดง
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {allPublicColumns
            .filter((c) => c.dataIndex)
            .map((col) => {
              const locked = requiredColumnKeys.includes(col.dataIndex);
              return (
                <Checkbox
                  key={col.dataIndex}
                  checked={
                    locked || visibleOptionalColumns.includes(col.dataIndex)
                  }
                  disabled={locked}
                  onChange={(e) => {
                    setVisibleOptionalColumns((prev) =>
                      e.target.checked
                        ? [...prev, col.dataIndex]
                        : prev.filter((k) => k !== col.dataIndex)
                    );
                  }}
                >
                  {typeof col.title === 'string' ? col.title : col.dataIndex}
                  {locked ? ' (หลัก)' : ''}
                </Checkbox>
              );
            })}
        </div>
        <Space style={{ marginTop: 12 }}>
          <Button
            size="small"
            onClick={() =>
              setVisibleOptionalColumns(
                allPublicColumns
                  .filter(
                    (c) =>
                      c.dataIndex && !requiredColumnKeys.includes(c.dataIndex)
                  )
                  .map((c) => c.dataIndex)
              )
            }
          >
            เลือกทั้งหมด
          </Button>
          <Button
            size="small"
            onClick={() => setVisibleOptionalColumns(defaultOptionalColumnKeys)}
          >
            ค่าเริ่มต้น
          </Button>
          <Button size="small" onClick={() => setVisibleOptionalColumns([])}>
            หลักเท่านั้น
          </Button>
        </Space>
      </div>
    ),
    [
      allPublicColumns,
      requiredColumnKeys,
      visibleOptionalColumns,
      defaultOptionalColumnKeys,
    ]
  );

  const getExportValue = (row, key) => {
    if (String(key).startsWith('custom__')) {
      const fieldKey = String(key).replace(/^custom__/, '');
      const definition = customFields.find(
        (field) => field.field_key === fieldKey
      );
      return formatCustomValue(row.custom_fields?.[fieldKey], definition);
    }

    return row[key] ?? '';
  };

  const getDetailValue = (record, column) => {
    if (!record || !column?.dataIndex) return null;
    if (column.customField) {
      const fieldKey = String(column.dataIndex).replace(/^custom__/, '');
      const definition = customFields.find(
        (field) => field.field_key === fieldKey
      );
      return formatCustomValue(record.custom_fields?.[fieldKey], definition);
    }
    if (column.render) return column.render(record[column.dataIndex], record);
    return record[column.dataIndex];
  };

  const renderDetailValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="detail-empty-value">ไม่มีข้อมูล</span>;
    }
    if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่ใช่';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value.$$typeof) return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const detailColumns = useMemo(
    () => allPublicColumns.filter((column) => column.dataIndex),
    [allPublicColumns]
  );

  const getChangedFieldsText = (historyItem) => {
    if (historyItem.action !== 'UPDATE') return '';
    const oldVal = historyItem.old_data || {};
    const newVal = historyItem.new_data || {};
    const changed = [];
    Object.keys(newVal).forEach((key) => {
      if (key === 'updated_at' || key === 'id' || key === 'created_at') return;
      if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
        const col = detailColumns.find((c) => c.dataIndex === key);
        const colName = col
          ? typeof col.title === 'string'
            ? col.title
            : col.dataIndex
          : key;
        changed.push(colName);
      }
    });
    if (changed.length === 0) return 'แก้ไข (ไม่มีฟิลด์หลักเปลี่ยน)';
    return `แก้ไขฟิลด์: ${changed.join(', ')}`;
  };

  const handleExportCSV = () => {
    if (!data.length) return;
    const headers = visibleColumns
      .filter((c) => c.dataIndex)
      .map((c) => c.title);
    const keys = visibleColumns
      .filter((c) => c.dataIndex)
      .map((c) => c.dataIndex);
    const csvContent = rowsToCsv([
      headers,
      ...data.map((row) => keys.map((key) => getExportValue(row, key))),
    ]);
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
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
          ? (
              await supabase
                .from(tableName)
                .select(
                  getPublicSelectColumns(
                    tableName,
                    columns,
                    role,
                    customFieldsEnabled ? ['custom_fields'] : []
                  )
                )
            ).data || []
          : await fetchAll();
      if (!allData.length) return;

      const headers = visibleColumns
        .filter((c) => c.dataIndex)
        .map((c) => c.title);
      const keys = visibleColumns
        .filter((c) => c.dataIndex)
        .map((c) => c.dataIndex);
      const rows = allData.map((row) => {
        const obj = {};
        keys.forEach((k, i) => {
          obj[headers[i]] = getExportValue(row, k);
        });
        return obj;
      });

      downloadCsv(
        `${tableName}_${new Date().toISOString().slice(0, 10)}_all.csv`,
        objectsToCsv(rows)
      );
    } catch (err) {
      console.error('CSV export error:', err);
    }
  };

  // Auto-apply sorter to data columns
  const sortableColumns = visibleColumns.map((col) =>
    col.dataIndex && !col.customField ? { ...col, sorter: true } : col
  );

  // Action column - present for all roles to view details, and for admin/editor to edit/delete
  const actionColumn = {
    title: 'จัดการ',
    key: 'actions',
    width: userCanEdit ? (userCanDelete ? 140 : 100) : 60,
    fixed: 'right',
    align: 'center',
    render: (_, record) => {
      const canEditThisRecord =
        userCanEdit && (!canEditRecord || canEditRecord(record));
      return (
        <Space size={4}>
          <Tooltip title="ดูรายละเอียด">
            <Button
              className="action-btn view"
              icon={<EyeOutlined />}
              style={{ color: 'var(--primary)' }}
              onClick={(e) => {
                e.stopPropagation(); // prevent row click double trigger
                setDetailRecord(record);
              }}
            />
          </Tooltip>
          {canEditThisRecord && (
            <Tooltip title="แก้ไข">
              <Button
                className="action-btn edit"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canEditThisRecord) {
                    message.warning('คุณไม่มีสิทธิ์แก้ไข');
                    return;
                  }
                  handleEdit(record);
                }}
              />
            </Tooltip>
          )}
          {canEditThisRecord && userCanDelete && (
            <Popconfirm
              title="ยืนยันการลบ"
              description="คุณต้องการลบข้อมูลนี้ใช่หรือไม่?"
              onConfirm={() => handleDelete(record.id)}
              okText="ลบ"
              cancelText="ยกเลิก"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="ลบ">
                <Button
                  className="action-btn delete"
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      );
    },
  };

  const allColumns = [...sortableColumns, actionColumn];

  const openCreateCustomField = () => {
    setEditingCustomField(null);
    customFieldForm.resetFields();
    customFieldForm.setFieldsValue({
      field_type: 'text',
      is_visible: true,
      is_required: false,
      display_order: customFields.length + 1,
    });
    setCustomFieldModalOpen(true);
  };

  const openEditCustomField = (definition) => {
    setEditingCustomField(definition);
    customFieldForm.setFieldsValue({
      label: definition.label,
      field_key: definition.field_key,
      field_type: definition.field_type,
      options: (definition.options || []).join('\n'),
      is_required: definition.is_required,
      is_visible: definition.is_visible,
      display_order: definition.display_order,
    });
    setCustomFieldModalOpen(true);
  };

  const handleSaveCustomField = async () => {
    try {
      const values = await customFieldForm.validateFields();
      values.field_key = normalizeCustomFieldKey(values.field_key);

      const baseKeys = new Set(
        columns.map((column) => column.dataIndex).filter(Boolean)
      );
      const existingKeys = new Set(
        customFields
          .filter((field) => field.id !== editingCustomField?.id)
          .map((field) => field.field_key)
      );

      if (!editingCustomField && customFields.length >= 30) {
        message.error('Custom field limit reached: 30 per table');
        return;
      }

      if (!isValidCustomFieldKey(values.field_key)) {
        message.error(
          'Field key must start with a letter and use lowercase a-z, 0-9, underscore'
        );
        return;
      }

      if (
        baseKeys.has(values.field_key) ||
        existingKeys.has(values.field_key)
      ) {
        message.error('Field key already exists');
        return;
      }

      if (
        values.field_type === 'select' &&
        parseCustomOptions(values.options).length === 0
      ) {
        message.error('Select field needs at least one option');
        return;
      }

      if (editingCustomField) {
        await updateCustomFieldDefinition(
          editingCustomField.id,
          editingCustomField,
          values
        );
      } else {
        await createCustomFieldDefinition(tableName, values);
      }

      message.success('Custom field saved');
      setCustomFieldModalOpen(false);
      customFieldForm.resetFields();
      await loadCustomFields();
      loadData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message || 'Save custom field failed');
    }
  };

  const handleArchiveCustomField = async (definition) => {
    try {
      await archiveCustomFieldDefinition(definition);
      message.success('Custom field archived');
      await loadCustomFields();
      loadData();
    } catch (err) {
      message.error(err.message || 'Archive custom field failed');
    }
  };

  const handleDeleteCustomField = async (definition) => {
    try {
      const result = await deleteCustomFieldDefinition(definition);
      message.success(
        `ลบคอลัมน์แล้ว (${result.affected_rows || 0} แถวถูกลบค่าคอลัมน์นี้)`
      );
      setCustomFieldModalOpen(false);
      await loadCustomFields();
      loadData();
    } catch (err) {
      message.error(err.message || 'ลบคอลัมน์ไม่สำเร็จ');
    }
  };

  const renderCustomFieldInput = (field) => {
    if (field.field_type === 'textarea') return <Input.TextArea rows={3} />;
    if (field.field_type === 'number')
      return <InputNumber style={{ width: '100%' }} />;
    if (field.field_type === 'date') return <Input type="date" />;
    if (field.field_type === 'boolean') {
      return (
        <Select
          allowClear
          options={[
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ]}
        />
      );
    }
    if (field.field_type === 'select') {
      return (
        <Select
          allowClear
          options={(field.options || []).map((option) => ({
            label: option,
            value: option,
          }))}
        />
      );
    }
    return <Input />;
  };

  const customFieldFormItems = customFields.map((field) => (
    <Form.Item
      key={field.id}
      name={['custom_fields', field.field_key]}
      label={field.label}
      rules={field.is_required ? [{ required: true, message: 'Required' }] : []}
    >
      {renderCustomFieldInput(field)}
    </Form.Item>
  ));

  return (
    <div className="crud-container">
      {/* Advanced Filter Bar */}
      {finalFilterConfig.length > 0 && showFilters && !hideFilterBar && (
        <div className="filter-bar">
          <div className="filter-bar-inner">
            {finalFilterConfig.map((f) => (
              <div key={f.key} className="filter-item">
                <label className="filter-label">{f.label}</label>
                <Select
                  placeholder={`เลือก${f.label}`}
                  allowClear
                  value={activeFilters[f.key] || undefined}
                  onChange={(val) => handleFilterChange(f.key, val)}
                  style={{ width: 160 }}
                  size="small"
                  options={f.options.map((o) =>
                    typeof o === 'object' ? o : { label: String(o), value: o }
                  )}
                />
              </div>
            ))}
            {activeFilterCount > 0 && (
              <Button
                size="small"
                onClick={handleClearFilters}
                style={{ alignSelf: 'flex-end' }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="crud-header">
        <div
          className="crud-header-left"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span className="crud-title">{title}</span>
          <Tag
            className="crud-count"
            color={hasActiveSearchOrFilters ? 'blue' : 'default'}
          >
            {hasActiveSearchOrFilters
              ? `พบผลลัพธ์ ${total} รายการ`
              : `ทั้งหมด ${total} รายการ`}
          </Tag>
          {hasActiveSearchOrFilters && (
            <Button
              type="link"
              size="small"
              danger
              onClick={handleClearAll}
              style={{ padding: '0 4px', fontSize: 13, height: 'auto' }}
            >
              ล้างการค้นหาและตัวกรอง
            </Button>
          )}
        </div>
        <div className="crud-header-right">
          {publicSearchFields.length > 0 && (
            <Input.Search
              placeholder="ค้นหา..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 220 }}
              prefix={<SearchOutlined />}
            />
          )}
          {finalFilterConfig.length > 0 && (
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
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              className="export-btn"
            />
          </Tooltip>
          {typeof extraActions === 'function'
            ? extraActions({ refetch: loadData })
            : extraActions}
          {userCanEdit && (
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                if (!userCanEdit) {
                  message.warning('คุณไม่มีสิทธิ์แก้ไข');
                  return;
                }
                setImportModalOpen(true);
              }}
              className="export-btn"
            >
              Import CSV
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
            className="export-btn"
          >
            Export CSV
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportAllCSV}
            className="export-btn export-excel-btn"
          >
            Export All CSV
          </Button>
          <Popover
            content={columnSelector}
            trigger="click"
            placement="bottomRight"
          >
            <Button icon={<SettingOutlined />} className="export-btn">
              คอลัมน์ {visibleColumns.filter((c) => c.dataIndex).length}/
              {allPublicColumns.filter((c) => c.dataIndex).length}
            </Button>
          </Popover>
          {userCanManageCustomFields && (
            <Button
              icon={<SettingOutlined />}
              onClick={openCreateCustomField}
              className="export-btn"
            >
              เพิ่มคอลัมน์
            </Button>
          )}
          {userCanEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="add-btn"
            >
              เพิ่มข้อมูล
            </Button>
          )}
        </div>
      </div>

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
        onRow={(record) => ({
          onClick: (event) => {
            const isAction =
              event.target.closest('.action-btn') ||
              event.target.closest('.ant-popconfirm') ||
              event.target.closest('.ant-popover') ||
              event.target.closest('.ant-modal');
            if (isAction) return;
            setDetailRecord(record);
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title={editingRecord ? `แก้ไข${title}` : `เพิ่ม${title}`}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText={editingRecord ? 'บันทึก' : 'เพิ่ม'}
        cancelText="ยกเลิก"
        width={640}
        className="crud-modal"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {formFields}
          {customFieldFormItems.length > 0 && (
            <>
              <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>
                คอลัมน์เสริม
              </div>
              {customFieldFormItems}
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title={
          editingCustomField
            ? 'แก้ไขคอลัมน์เสริม'
            : `เพิ่มคอลัมน์เสริม: ${title}`
        }
        open={customFieldModalOpen}
        onCancel={() => setCustomFieldModalOpen(false)}
        onOk={handleSaveCustomField}
        okText="บันทึก"
        cancelText="ยกเลิก"
        width={720}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="คอลัมน์เสริมจะถูกเพิ่มให้ทุกคนเห็นในตารางนี้"
          description="ใช้สำหรับข้อมูลที่ยังไม่แน่นิ่งหรืออยากทดลองเก็บก่อน อย่าใส่ข้อมูลลับ เช่น เลขบัตรประชาชน เบอร์โทร ที่อยู่ละเอียด หรือข้อมูลส่วนบุคคลที่ไม่ควรเผยแพร่ หากโครงสร้างนิ่งแล้วค่อยย้ายเป็นคอลัมน์จริงในฐานข้อมูลภายหลังได้"
        />
        <Form
          form={customFieldForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="label"
            label="ชื่อคอลัมน์ที่แสดง"
            extra="ชื่อที่ผู้ใช้จะเห็นบนหัวตาราง เช่น ระดับความเสี่ยง, วันที่สำรวจเพิ่มเติม"
            rules={[{ required: true, message: 'กรุณากรอกชื่อคอลัมน์' }]}
          >
            <Input placeholder="เช่น ระดับความเสี่ยง" />
          </Form.Item>
          <Form.Item
            name="field_key"
            label="รหัสคอลัมน์"
            extra="ใช้ภาษาอังกฤษตัวเล็ก ตัวเลข และขีดล่างเท่านั้น เช่น risk_level แก้ไม่ได้หลังสร้าง เพื่อกันข้อมูลพัง"
            rules={[{ required: true, message: 'กรุณากรอกรหัสคอลัมน์' }]}
          >
            <Input
              disabled={Boolean(editingCustomField)}
              placeholder="risk_level"
            />
          </Form.Item>
          <Form.Item
            name="field_type"
            label="ชนิดข้อมูล"
            extra="เลือกให้ตรงกับข้อมูลจริง เพราะหลังสร้างแล้วจะไม่ให้เปลี่ยนชนิดข้อมูล"
            rules={[{ required: true, message: 'กรุณาเลือกชนิดข้อมูล' }]}
          >
            <Select
              disabled={Boolean(editingCustomField)}
              options={[
                { label: 'ข้อความสั้น', value: 'text' },
                { label: 'ข้อความยาว', value: 'textarea' },
                { label: 'ตัวเลข', value: 'number' },
                { label: 'วันที่', value: 'date' },
                { label: 'ตัวเลือก', value: 'select' },
                { label: 'ใช่/ไม่ใช่', value: 'boolean' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.field_type !== next.field_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('field_type') === 'select' ? (
                <Form.Item
                  name="options"
                  label="รายการตัวเลือก"
                  extra="ใส่ทีละบรรทัด หรือคั่นด้วยเครื่องหมาย comma เช่น ต่ำ, กลาง, สูง"
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Space size="large" align="start">
            <Form.Item
              name="is_required"
              label="จำเป็นต้องกรอก"
              valuePropName="checked"
              extra="ถ้าเปิด ผู้ใช้จะบันทึกแถวไม่ได้จนกว่าจะกรอกช่องนี้"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="is_visible"
              label="แสดงในตาราง"
              valuePropName="checked"
              extra="ถ้าปิด คอลัมน์จะถูกซ่อน แต่ข้อมูลเดิมยังอยู่"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="display_order"
              label="ลำดับ"
              extra="เลขน้อยอยู่ก่อน"
            >
              <InputNumber min={0} max={999} />
            </Form.Item>
          </Space>
        </Form>

        {userCanManageCustomFields && customFields.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              คอลัมน์เสริมที่มีอยู่
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              {customFields.map((field) => (
                <div
                  key={field.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{field.label}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {field.field_key} · {field.field_type}
                    </div>
                  </div>
                  <Space>
                    <Button
                      size="small"
                      onClick={() => openEditCustomField(field)}
                    >
                      แก้ไข
                    </Button>
                    <Popconfirm
                      title="ซ่อนคอลัมน์นี้?"
                      description="คอลัมน์จะหายจากตาราง แต่ค่าที่เคยกรอกยังอยู่ในฐานข้อมูล"
                      onConfirm={() => handleArchiveCustomField(field)}
                      okText="ซ่อน"
                      cancelText="ยกเลิก"
                    >
                      <Button size="small" danger>
                        ซ่อน
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title="ลบคอลัมน์นี้ถาวร?"
                      description="คอลัมน์และค่าที่เคยกรอกในทุกแถวจะถูกลบถาวร ใช้เฉพาะตอนสร้างผิดหรือแน่ใจว่าไม่ต้องใช้แล้ว"
                      onConfirm={() => handleDeleteCustomField(field)}
                      okText="ลบถาวร"
                      cancelText="ยกเลิก"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" danger type="primary">
                        ลบถาวร
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              ))}
            </Space>
          </div>
        )}
      </Modal>

      <CsvImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        tableName={tableName}
        columns={[...columns, ...customColumns]}
        importPolicy={importPolicy}
        onSuccess={() => {
          loadData();
          onMutationSuccess?.();
        }}
      />

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EyeOutlined style={{ color: 'var(--primary)' }} />
            <span>รายละเอียดข้อมูล</span>
          </div>
        }
        placement="right"
        onClose={() => setDetailRecord(null)}
        open={Boolean(detailRecord)}
        width={window.innerWidth > 768 ? 600 : '100%'}
        destroyOnClose
        className="detail-drawer"
      >
        {detailRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: 16,
                  fontWeight: 700,
                  borderBottom: '2px solid var(--border-light)',
                  paddingBottom: 8,
                }}
              >
                ข้อมูลพื้นฐาน
              </h3>
              <Descriptions
                bordered
                column={1}
                size="small"
                labelStyle={{ width: 150, fontWeight: 600 }}
              >
                {detailColumns.map((col) => {
                  const val = getDetailValue(detailRecord, col);
                  return (
                    <Descriptions.Item
                      key={col.dataIndex}
                      label={col.title || col.dataIndex}
                    >
                      {renderDetailValue(val)}
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            </div>

            {role === 'admin' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: 16,
                    fontWeight: 700,
                    borderBottom: '2px solid var(--border-light)',
                    paddingBottom: 8,
                  }}
                >
                  ประวัติการแก้ไขข้อมูล
                </h3>
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    กำลังโหลด...
                  </div>
                ) : editHistory.length === 0 ? (
                  <div style={{ color: '#656d76', fontStyle: 'italic' }}>
                    ไม่มีประวัติการแก้ไข
                  </div>
                ) : (
                  <div style={{ padding: '8px 16px' }}>
                    <Timeline mode="left">
                      {editHistory.map((item, idx) => {
                        let color = 'blue';
                        if (item.action === 'CREATE') color = 'green';
                        if (item.action === 'DELETE') color = 'red';

                        const timeStr = item.created_at
                          ? new Date(item.created_at).toLocaleString('th-TH')
                          : '-';

                        return (
                          <Timeline.Item key={item.id || idx} color={color}>
                            <div style={{ fontWeight: 600 }}>
                              {item.action === 'CREATE'
                                ? 'เพิ่มข้อมูล'
                                : item.action === 'DELETE'
                                  ? 'ลบข้อมูล'
                                  : 'แก้ไขข้อมูล'}
                            </div>
                            <div style={{ fontSize: 12, color: '#656d76' }}>
                              โดย: {item.user_email || 'ระบบ'}
                            </div>
                            <div style={{ fontSize: 12, color: '#656d76' }}>
                              เมื่อ: {timeStr}
                            </div>
                            {item.action === 'UPDATE' && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#0969da',
                                  marginTop: 4,
                                }}
                              >
                                {getChangedFieldsText(item)}
                              </div>
                            )}
                          </Timeline.Item>
                        );
                      })}
                    </Timeline>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
