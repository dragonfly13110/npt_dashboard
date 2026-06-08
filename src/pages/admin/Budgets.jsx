import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  DatePicker,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseCrud } from '../../hooks/useSupabase';
import EChart from '../../components/widgets/EChart';
import budgetSeed from '../../data/budgetRound2_2569.json';
import { downloadCsv, rowsToCsv } from '../../utils/csv';
import '../../styles/budgets.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const money = (value) => Number(value || 0).toLocaleString('th-TH');
const chartColors = [
  '#1a7f37',
  '#0969da',
  '#8250df',
  '#bf8700',
  '#cf222e',
  '#0a7ea4',
  '#6f4e37',
  '#57606a',
];
const budgetStatusOptions = [
  {
    label: 'กำลังดำเนินการ',
    value: 'กำลังดำเนินการ',
    color: 'processing',
    progress: 50,
  },
  { label: 'ส่งเบิกแล้ว', value: 'ส่งเบิกแล้ว', color: 'gold', progress: 75 },
  {
    label: 'เบิกจ่ายเสร็จสิ้น',
    value: 'เบิกจ่ายเสร็จสิ้น',
    color: 'success',
    progress: 100,
  },
];
const defaultBudgetStatus = 'กำลังดำเนินการ';
const defaultFiscalYear = Number(budgetSeed.meta.fiscalYear || 2569);
const defaultBudgetRound = Number(budgetSeed.meta.round || 2);
const budgetTableScrollX = 1534;
const exportHeaders = [
  'ลำดับ',
  'แผนงาน',
  'โครงการ',
  'กิจกรรม',
  'กิจกรรมย่อย',
  'รายละเอียด',
  'อำเภอ',
  'ตำบล',
  'หมู่',
  'เป้าหมาย',
  'หน่วยนับ',
  'งบประมาณ',
  'เบิกจ่ายแล้ว',
  'คงเหลือ',
  'สถานะ',
  'แผนดำเนินงาน',
  'แผนใช้จ่ายเงิน',
  'ผู้รับผิดชอบ',
  'รายละเอียดการใช้จ่าย',
  'วันที่ส่งเบิก',
  'ปีงบประมาณ',
  'รอบ',
];

function compactText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function clampPercent(value) {
  const clamped = Math.max(0, Math.min(100, Number(value || 0)));
  return Math.round(clamped * 100) / 100;
}

function getBudgetStatusMeta(status) {
  const normalized = normalizeBudgetStatus(status);
  return (
    budgetStatusOptions.find((option) => option.value === normalized) ||
    budgetStatusOptions[0]
  );
}

function normalizeBudgetStatus(status) {
  if (status === 'ส่งเบิกแล้ว') return 'ส่งเบิกแล้ว';
  if (
    status === 'เสร็จสิ้น' ||
    status === 'เบิกจ่ายแล้ว' ||
    status === 'เบิกจ่ายเสร็จสิ้น'
  )
    return 'เบิกจ่ายเสร็จสิ้น';
  return 'กำลังดำเนินการ';
}

function parseNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { detail: notes };
  }
}

function parseBudgetRow(row) {
  const notes = parseNotes(row.notes);
  return {
    ...notes,
    id: row.id,
    sourceId: notes.sourceId,
    plan: notes.plan || row.budget_source || '',
    project: notes.project || row.project_name || '',
    activity: notes.activity || '',
    subActivity: notes.subActivity || '',
    detail: notes.detail || '',
    district: notes.district || '',
    subdistrict: notes.subdistrict || '',
    village: notes.village || '',
    target: notes.target || '',
    unit: notes.unit || '',
    budget: Number(row.budget_amount ?? notes.budget ?? 0),
    spentAmount: Number(row.spent_amount ?? notes.spentAmount ?? 0),
    operationPlan: notes.operationPlan || '',
    paymentPlan: notes.paymentPlan || '',
    owner: notes.owner || '',
    expenseDetail: notes.expenseDetail || '',
    reimbursementDate: notes.reimbursementDate || '',
    fiscalYear: row.fiscal_year || notes.fiscalYear || 2569,
    round: row.budget_round || notes.round || 2,
    sourceFile: row.source_file || notes.sourceFile || '',
    sourceRowId: row.source_row_id || notes.sourceId,
    status: normalizeBudgetStatus(
      row.status || notes.status || defaultBudgetStatus
    ),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeBudget(values) {
  const budget = Number(values.budget || 0);
  const spentAmount = Math.min(
    Number(values.spentAmount || 0),
    budget || Number(values.spentAmount || 0)
  );
  const fiscalYear = Number(values.fiscalYear || defaultFiscalYear);
  const round = Number(values.round || defaultBudgetRound);
  const sourceFile = values.sourceFile || budgetSeed.meta.sourceFile;
  const sourceRowId = values.sourceRowId || values.sourceId || null;
  const detail = {
    ...values,
    budget,
    spentAmount,
    fiscalYear,
    round,
    sourceFile,
    sourceId: sourceRowId,
  };

  return {
    project_name:
      [values.project, values.activity].filter(Boolean).join(' / ') ||
      'รายการงบประมาณ',
    fiscal_year: fiscalYear,
    budget_round: round,
    budget_source: values.plan || `งบรอบ ${round} ปี ${fiscalYear}`,
    budget_amount: budget,
    spent_amount: spentAmount,
    status: normalizeBudgetStatus(values.status || defaultBudgetStatus),
    source_file: sourceFile,
    source_row_id: sourceRowId,
    notes: JSON.stringify(detail),
  };
}

function ownerKey(owner) {
  return String(owner || '')
    .split(':')[0]
    .trim();
}

function sumBy(rows, keyFn, extraFn = () => ({})) {
  const map = new Map();
  rows.forEach((row) => {
    const name = compactText(keyFn(row), 'ไม่ระบุ');
    const current = map.get(name) || {
      name,
      budget: 0,
      activities: 0,
      ...extraFn(row),
    };
    current.budget += Number(row.budget || 0);
    current.activities += 1;
    map.set(name, current);
  });
  return Array.from(map.values()).sort((a, b) => b.budget - a.budget);
}

function ClampText({ children, lines = 1, strong = false, muted = false }) {
  const content = compactText(children);
  return (
    <Tooltip title={content}>
      <span
        className={`budget-clamp budget-clamp-${lines}${strong ? ' budget-strong' : ''}${muted ? ' budget-muted' : ''}`}
      >
        {content}
      </span>
    </Tooltip>
  );
}

const compactColumns = [
  {
    title: 'ชื่อ',
    dataIndex: 'name',
    key: 'name',
    render: (value) => <Text>{value}</Text>,
  },
  {
    title: 'งบประมาณ',
    dataIndex: 'budget',
    key: 'budget',
    width: 140,
    align: 'right',
    render: (value) => `${money(value)} บาท`,
  },
];

const statusColumns = [
  {
    title: 'สถานะ',
    dataIndex: 'name',
    key: 'name',
    render: (value, record) => (
      <Tag color={getBudgetStatusMeta(record.status).color}>{value}</Tag>
    ),
  },
  {
    title: 'รายการ',
    dataIndex: 'activities',
    key: 'activities',
    width: 96,
    align: 'center',
    render: (value) => <Text>{value}</Text>,
  },
  {
    title: 'งบประมาณ',
    dataIndex: 'budget',
    key: 'budget',
    width: 140,
    align: 'right',
    render: (value) => `${money(value)} บาท`,
  },
  {
    title: 'เบิกแล้ว',
    dataIndex: 'spent',
    key: 'spent',
    width: 140,
    align: 'right',
    render: (value) => `${money(value)} บาท`,
  },
];

export default function Budgets() {
  const { createRecord, updateRecord, deleteRecord } =
    useSupabaseCrud('budgets');
  const { canEdit, canDelete, role } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [reimbursementOpen, setReimbursementOpen] = useState(false);
  const [reimbursementRecord, setReimbursementRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [fiscalYearFilter, setFiscalYearFilter] = useState(defaultFiscalYear);
  const [roundFilter, setRoundFilter] = useState(defaultBudgetRound);
  const [planFilter, setPlanFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [operationPlanFilter, setOperationPlanFilter] = useState('all');
  const [budgetRangeFilter, setBudgetRangeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm();
  const [reimbursementForm] = Form.useForm();
  const tableWrapRef = useRef(null);

  const userCanEdit = canEdit();
  const userCanDelete = canDelete();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      message.error(`โหลดงบจาก Supabase ไม่สำเร็จ: ${error.message}`);
      setRows(
        budgetSeed.rows.map((row) => ({
          ...row,
          fiscalYear: row.fiscalYear || defaultFiscalYear,
          round: row.round || defaultBudgetRound,
          sourceFile: budgetSeed.meta.sourceFile,
          sourceRowId: row.sourceId || row.id,
        }))
      );
      setUsingFallback(true);
    } else {
      setRows(
        (data || [])
          .map(parseBudgetRow)
          .sort(
            (a, b) =>
              Number(b.fiscalYear || 0) - Number(a.fiscalYear || 0) ||
              Number(b.round || 0) - Number(a.round || 0) ||
              (a.sourceId || a.sourceRowId || 9999) -
                (b.sourceId || b.sourceRowId || 9999)
          )
      );
      setUsingFallback(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);

  const periodRows = useMemo(
    () =>
      rows.filter((row) => {
        if (
          fiscalYearFilter !== 'all' &&
          Number(row.fiscalYear) !== Number(fiscalYearFilter)
        )
          return false;
        if (roundFilter !== 'all' && Number(row.round) !== Number(roundFilter))
          return false;
        return true;
      }),
    [fiscalYearFilter, roundFilter, rows]
  );

  const fiscalYearOptions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => row.fiscalYear).filter(Boolean))
    ).sort((a, b) => Number(b) - Number(a));
    return [
      { label: 'ทุกปีงบประมาณ', value: 'all' },
      ...values.map((value) => ({ label: `ปีงบประมาณ ${value}`, value })),
    ];
  }, [rows]);

  const roundOptions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => row.round).filter(Boolean))
    ).sort((a, b) => Number(a) - Number(b));
    return [
      { label: 'ทุกรอบ', value: 'all' },
      ...values.map((value) => ({ label: `รอบ ${value}`, value })),
    ];
  }, [rows]);

  const periodLabel = useMemo(() => {
    const yearText =
      fiscalYearFilter === 'all'
        ? 'ทุกปีงบประมาณ'
        : `ปีงบประมาณ ${fiscalYearFilter}`;
    const roundText = roundFilter === 'all' ? 'ทุกรอบ' : `รอบ ${roundFilter}`;
    return `${yearText} ${roundText}`;
  }, [fiscalYearFilter, roundFilter]);

  const optionsFromRows = useCallback(
    (label, getter) => {
      const values = Array.from(
        new Set(periodRows.map(getter).filter(Boolean))
      ).sort((a, b) => String(a).localeCompare(String(b), 'th'));
      return [
        { label, value: 'all' },
        ...values.map((value) => ({ label: value, value })),
      ];
    },
    [periodRows]
  );

  const planOptions = useMemo(
    () => optionsFromRows('ทุกแผนงาน', (row) => row.plan),
    [optionsFromRows]
  );
  const districtOptions = useMemo(
    () => optionsFromRows('ทุกพื้นที่', (row) => row.district),
    [optionsFromRows]
  );
  const projectOptions = useMemo(
    () => optionsFromRows('ทุกโครงการ', (row) => row.project),
    [optionsFromRows]
  );
  const ownerOptions = useMemo(
    () => optionsFromRows('ทุกผู้รับผิดชอบ', (row) => ownerKey(row.owner)),
    [optionsFromRows]
  );
  const operationPlanOptions = useMemo(
    () => optionsFromRows('ทุกช่วงดำเนินงาน', (row) => row.operationPlan),
    [optionsFromRows]
  );
  const statusOptions = useMemo(
    () => [
      { label: 'ทุกสถานะ', value: 'all' },
      ...budgetStatusOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    ],
    []
  );

  const budgetRangeOptions = [
    { label: 'ทุกช่วงงบ', value: 'all' },
    { label: 'ไม่เกิน 5,000', value: 'lte5000' },
    { label: '5,001 - 20,000', value: '5001to20000' },
    { label: 'มากกว่า 20,000', value: 'gt20000' },
  ];

  const filteredRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return periodRows.filter((row) => {
      if (planFilter !== 'all' && row.plan !== planFilter) return false;
      if (districtFilter !== 'all' && row.district !== districtFilter)
        return false;
      if (projectFilter !== 'all' && row.project !== projectFilter)
        return false;
      if (ownerFilter !== 'all' && ownerKey(row.owner) !== ownerFilter)
        return false;
      if (
        operationPlanFilter !== 'all' &&
        row.operationPlan !== operationPlanFilter
      )
        return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (budgetRangeFilter === 'lte5000' && row.budget > 5000) return false;
      if (
        budgetRangeFilter === '5001to20000' &&
        (row.budget <= 5000 || row.budget > 20000)
      )
        return false;
      if (budgetRangeFilter === 'gt20000' && row.budget <= 20000) return false;
      if (!needle) return true;
      return [
        row.plan,
        row.project,
        row.activity,
        row.subActivity,
        row.detail,
        row.district,
        row.subdistrict,
        row.owner,
        row.expenseDetail,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(needle)
      );
    });
  }, [
    budgetRangeFilter,
    districtFilter,
    keyword,
    operationPlanFilter,
    ownerFilter,
    periodRows,
    planFilter,
    projectFilter,
    statusFilter,
  ]);

  const filteredBudget = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.budget || 0), 0),
    [filteredRows]
  );
  const totalBudget = useMemo(
    () => periodRows.reduce((sum, row) => sum + Number(row.budget || 0), 0),
    [periodRows]
  );
  const totalSpent = useMemo(
    () =>
      periodRows.reduce((sum, row) => sum + Number(row.spentAmount || 0), 0),
    [periodRows]
  );
  const filteredSpent = useMemo(
    () =>
      filteredRows.reduce((sum, row) => sum + Number(row.spentAmount || 0), 0),
    [filteredRows]
  );
  const spendingPercent = useMemo(
    () => clampPercent(totalBudget ? (totalSpent / totalBudget) * 100 : 0),
    [totalBudget, totalSpent]
  );
  const filteredSpendingPercent = useMemo(
    () =>
      clampPercent(filteredBudget ? (filteredSpent / filteredBudget) * 100 : 0),
    [filteredBudget, filteredSpent]
  );
  const completedRows = useMemo(
    () => periodRows.filter((row) => row.status === 'เบิกจ่ายเสร็จสิ้น').length,
    [periodRows]
  );
  const reimbursementRows = useMemo(
    () =>
      periodRows.filter((row) =>
        ['ส่งเบิกแล้ว', 'เบิกจ่ายเสร็จสิ้น'].includes(row.status)
      ).length,
    [periodRows]
  );
  const projectSummary = useMemo(
    () =>
      sumBy(
        periodRows,
        (row) => row.project,
        (row) => ({ project: row.project, plan: row.plan })
      ),
    [periodRows]
  );
  const districtSummary = useMemo(
    () => sumBy(periodRows, (row) => row.district),
    [periodRows]
  );
  const ownerSummary = useMemo(
    () => sumBy(periodRows, (row) => ownerKey(row.owner)),
    [periodRows]
  );
  const statusSummary = useMemo(() => {
    const map = new Map(
      budgetStatusOptions.map((option) => [
        option.value,
        {
          name: option.label,
          status: option.value,
          budget: 0,
          spent: 0,
          activities: 0,
        },
      ])
    );
    periodRows.forEach((row) => {
      const meta = getBudgetStatusMeta(row.status);
      const current = map.get(meta.value);
      current.budget += Number(row.budget || 0);
      current.spent += Number(row.spentAmount || 0);
      current.activities += 1;
    });
    return Array.from(map.values()).filter((item) => item.activities > 0);
  }, [periodRows]);
  const topProjects = useMemo(
    () => projectSummary.slice(0, 8),
    [projectSummary]
  );

  const openAdd = () => {
    if (!userCanEdit) {
      message.warning('คุณไม่มีสิทธิ์แก้ไข');
      return;
    }
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      status: defaultBudgetStatus,
      spentAmount: 0,
      fiscalYear:
        fiscalYearFilter === 'all' ? defaultFiscalYear : fiscalYearFilter,
      round: roundFilter === 'all' ? defaultBudgetRound : roundFilter,
      sourceFile: budgetSeed.meta.sourceFile,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    if (!userCanEdit) {
      message.warning('คุณไม่มีสิทธิ์แก้ไข');
      return;
    }
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = serializeBudget(values);
      const ok = editingRecord
        ? await updateRecord(editingRecord.id, payload)
        : await createRecord(payload);

      if (ok) {
        setModalOpen(false);
        form.resetFields();
        loadData();
      }
    } catch {
      /* validation errors are shown by Ant Design */
    }
  };

  const handleDelete = async (id) => {
    const ok = await deleteRecord(id);
    if (ok) loadData();
  };

  const updateBudgetRow = async (record, values) => {
    const payload = serializeBudget({ ...record, ...values });
    const ok = await updateRecord(record.id, payload);
    if (ok) {
      setRows((current) =>
        current.map((row) =>
          row.id === record.id
            ? {
                ...row,
                ...values,
                status: normalizeBudgetStatus(values.status || row.status),
              }
            : row
        )
      );
      message.success('อัปเดตสถานะแล้ว');
    }
    return ok;
  };

  const handleStatusChange = async (record, status) => {
    const nextStatus = normalizeBudgetStatus(status);
    if (nextStatus === 'ส่งเบิกแล้ว') {
      setReimbursementRecord(record);
      reimbursementForm.setFieldsValue({
        spentAmount: record.spentAmount || record.budget || 0,
        reimbursementDate: null,
      });
      setReimbursementOpen(true);
      return;
    }
    await updateBudgetRow(record, {
      status: nextStatus,
      spentAmount:
        nextStatus === 'เบิกจ่ายเสร็จสิ้น' ? record.budget : record.spentAmount,
    });
  };

  const handleReimbursementSubmit = async () => {
    try {
      const values = await reimbursementForm.validateFields();
      const spentAmount = Math.min(
        Number(values.spentAmount || 0),
        Number(reimbursementRecord.budget || 0)
      );
      const reimbursementDate =
        values.reimbursementDate?.format?.('YYYY-MM-DD') || '';
      const ok = await updateBudgetRow(reimbursementRecord, {
        status: 'ส่งเบิกแล้ว',
        spentAmount,
        reimbursementDate,
      });
      if (ok) {
        setReimbursementOpen(false);
        reimbursementForm.resetFields();
        setReimbursementRecord(null);
      }
    } catch {
      /* validation errors are shown by Ant Design */
    }
  };

  const buildExportRows = useCallback(
    () => [
      exportHeaders,
      ...filteredRows.map((row, index) => [
        index + 1,
        row.plan,
        row.project,
        row.activity,
        row.subActivity,
        row.detail,
        row.district,
        row.subdistrict,
        row.village,
        row.target,
        row.unit,
        Number(row.budget || 0),
        Number(row.spentAmount || 0),
        Math.max(0, Number(row.budget || 0) - Number(row.spentAmount || 0)),
        getBudgetStatusMeta(row.status).label,
        row.operationPlan,
        row.paymentPlan,
        row.owner,
        row.expenseDetail,
        row.reimbursementDate,
        row.fiscalYear,
        row.round,
      ]),
    ],
    [filteredRows]
  );

  const exportFileBaseName = useCallback(
    (extension) => {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const yearPart =
        fiscalYearFilter === 'all' ? 'all_years' : `fy${fiscalYearFilter}`;
      const roundPart =
        roundFilter === 'all' ? 'all_rounds' : `round${roundFilter}`;
      return `budget_${yearPart}_${roundPart}_${filteredRows.length}_rows_${dateStamp}.${extension}`;
    },
    [filteredRows.length, fiscalYearFilter, roundFilter]
  );

  const handleExportCsv = useCallback(() => {
    downloadCsv(exportFileBaseName('csv'), rowsToCsv(buildExportRows()));
  }, [buildExportRows, exportFileBaseName]);

  const handleTopScroll = (event) => {
    const body = tableWrapRef.current?.querySelector(
      '.ant-table-body, .ant-table-content'
    );
    if (body) body.scrollLeft = event.currentTarget.scrollLeft;
  };

  const handleTableScroll = (event) => {
    const top = tableWrapRef.current?.querySelector('.budget-top-scroll');
    if (top) top.scrollLeft = event.currentTarget.scrollLeft;
  };

  useEffect(() => {
    const wrap = tableWrapRef.current;
    const body = wrap?.querySelector('.ant-table-body, .ant-table-content');
    if (!body) return undefined;
    body.addEventListener('scroll', handleTableScroll, { passive: true });
    return () => body.removeEventListener('scroll', handleTableScroll);
  }, [filteredRows.length]);

  const summaryColumns = [
    {
      title: 'โครงการ',
      dataIndex: 'project',
      key: 'project',
      width: 320,
      render: (value, record) => (
        <div className="budget-stack">
          <ClampText strong lines={2}>
            {value}
          </ClampText>
          <ClampText muted>{record.plan}</ClampText>
        </div>
      ),
    },
    {
      title: 'กิจกรรม',
      dataIndex: 'activities',
      key: 'activities',
      width: 100,
      align: 'center',
      render: (value) => <Tag color="blue">{value} รายการ</Tag>,
    },
    {
      title: 'งบประมาณ',
      dataIndex: 'budget',
      key: 'budget',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.budget - b.budget,
      render: (value) => `${money(value)} บาท`,
    },
  ];

  const detailColumns = [
    {
      title: 'ปี/รอบ',
      key: 'period',
      width: 118,
      render: (_, record) => (
        <div className="budget-stack">
          <Tag color="blue">{record.fiscalYear}</Tag>
          <Tag color="green">รอบ {record.round}</Tag>
        </div>
      ),
    },
    {
      title: 'โครงการ / กิจกรรม',
      dataIndex: 'project',
      key: 'project',
      width: 420,
      render: (_, record) => (
        <div className="budget-stack">
          <ClampText strong>{record.project}</ClampText>
          <ClampText>{record.activity}</ClampText>
          <ClampText muted>{record.detail}</ClampText>
        </div>
      ),
    },
    {
      title: 'พื้นที่',
      dataIndex: 'district',
      key: 'district',
      width: 128,
      render: (_, record) => (
        <div className="budget-stack">
          <Text className="budget-nowrap">{record.district}</Text>
          {(record.subdistrict || record.village) && (
            <Text type="secondary" className="budget-subtext">
              {compactText(record.subdistrict, '')}
              {record.village ? ` หมู่ ${record.village}` : ''}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'เป้าหมาย',
      key: 'target',
      width: 104,
      align: 'center',
      render: (_, record) => (
        <Text className="budget-nowrap">
          {compactText(record.target)} {compactText(record.unit, '')}
        </Text>
      ),
    },
    {
      title: 'งบประมาณ',
      dataIndex: 'budget',
      key: 'budget',
      width: 112,
      align: 'right',
      sorter: (a, b) => a.budget - b.budget,
      render: (value) => <Text strong>{money(value)}</Text>,
    },
    {
      title: 'เบิกแล้ว',
      dataIndex: 'spentAmount',
      key: 'spentAmount',
      width: 108,
      align: 'right',
      sorter: (a, b) => a.spentAmount - b.spentAmount,
      render: (value) => <Text>{money(value)}</Text>,
    },
    {
      title: 'ความคืบหน้า',
      dataIndex: 'status',
      key: 'status',
      width: 184,
      render: (value, record) => {
        const meta = getBudgetStatusMeta(value);
        return (
          <div className="budget-progress-cell">
            {userCanEdit ? (
              <Select
                size="small"
                value={meta.value}
                options={budgetStatusOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                onChange={(nextStatus) =>
                  handleStatusChange(record, nextStatus)
                }
              />
            ) : (
              <Tag color={meta.color}>{meta.label}</Tag>
            )}
            <Progress percent={meta.progress} size="small" showInfo={false} />
          </div>
        );
      },
    },
    {
      title: 'เบิกจ่ายคงเหลือ',
      key: 'remainingBudget',
      width: 128,
      align: 'right',
      sorter: (a, b) => a.budget - a.spentAmount - (b.budget - b.spentAmount),
      render: (_, record) => {
        const remaining = Math.max(
          0,
          Number(record.budget || 0) - Number(record.spentAmount || 0)
        );
        return <Text strong={remaining > 0}>{money(remaining)}</Text>;
      },
    },
    {
      title: 'ผู้รับผิดชอบ',
      dataIndex: 'owner',
      key: 'owner',
      width: 150,
      render: (value) => <ClampText>{value}</ClampText>,
    },
    {
      title: 'จัดการ',
      key: 'actions',
      fixed: 'right',
      width: userCanDelete ? 82 : 52,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="แก้ไข">
            <Button
              className="action-btn edit"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          {userCanDelete && (
            <Popconfirm
              title="ยืนยันการลบ"
              description="ต้องการลบรายการงบนี้ใช่ไหม?"
              okText="ลบ"
              cancelText="ยกเลิก"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title="ลบ">
                <Button
                  className="action-btn delete"
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="budget-apple-page">
      <Space className="budget-apple-stack" direction="vertical" size={20}>
        <div
          className="budget-apple-hero"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ flex: '1 1 500px' }}>
            <div className="budget-apple-tags">
              <Tag color="green">
                {roundFilter === 'all' ? 'ทุกรอบ' : `รอบ ${roundFilter}`}
              </Tag>
              <Tag color="blue">
                {fiscalYearFilter === 'all'
                  ? 'ทุกปีงบประมาณ'
                  : `ปีงบประมาณ ${fiscalYearFilter}`}
              </Tag>
              <Tag color={usingFallback ? 'orange' : 'cyan'}>
                {usingFallback ? 'ข้อมูลสำรองในไฟล์' : 'ข้อมูลจาก Supabase'}
              </Tag>
            </div>
            <Title className="budget-apple-title" level={2}>
              ข้อมูลงบประมาณส่งเสริมการเกษตร
            </Title>
            <Text className="budget-apple-subtitle">
              {periodLabel} แสดงหัวตารางจำเป็น: แผนงาน โครงการ กิจกรรม พื้นที่
              เป้าหมาย งบประมาณ แผนดำเนินงาน แผนใช้จ่ายเงิน และผู้รับผิดชอบ
            </Text>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              background: '#f8fafc',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                ปีงบประมาณ
              </span>
              <Select
                value={fiscalYearFilter}
                options={fiscalYearOptions}
                style={{ width: 150 }}
                onChange={setFiscalYearFilter}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                รอบ
              </span>
              <Select
                value={roundFilter}
                options={roundOptions}
                style={{ width: 100 }}
                onChange={setRoundFilter}
              />
            </div>
          </div>
        </div>

        <Row className="budget-stat-grid" gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="งบประมาณรวม"
                value={totalBudget}
                formatter={(value) => `${money(value)} บาท`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="เบิกจ่ายแล้ว"
                value={totalSpent}
                formatter={(value) => `${money(value)} บาท`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="ความคืบหน้างบ"
                value={spendingPercent}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="ส่งเบิก/เบิกจ่ายเสร็จสิ้น"
                value={reimbursementRows}
                suffix={`จาก ${rows.length} รายการ`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="จำนวนโครงการ"
                value={projectSummary.length}
                suffix="โครงการ"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="เบิกจ่ายเสร็จสิ้น"
                value={completedRows}
                suffix="รายการ"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="งบตามตัวกรอง"
                value={filteredBudget}
                formatter={(value) => `${money(value)} บาท`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="budget-stat-card">
              <Statistic
                title="คืบหน้าตามตัวกรอง"
                value={filteredSpendingPercent}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Card title="กราฟงบประมาณสูงสุดตามโครงการ">
              <div style={{ width: '100%', height: 360 }}>
                <EChart
                  option={barOption(
                    topProjects,
                    [{ key: 'budget', name: 'งบประมาณ', color: '#1a7f37' }],
                    {
                      categoryKey: 'project',
                      layout: 'vertical',
                      unit: 'บาท',
                      grid: { left: 170 },
                    }
                  )}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={9}>
            <Card title="สถานะความคืบหน้าโครงการ">
              <div style={{ width: '100%', height: 360 }}>
                <EChart
                  option={pieOption(
                    statusSummary.map((item) => ({
                      name: item.name,
                      value: item.activities,
                    })),
                    { colors: chartColors, unit: 'รายการ' }
                  )}
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="ตัวกรองข้อมูล">
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} xl={6}>
              <Select
                value={planFilter}
                options={planOptions}
                style={{ width: '100%' }}
                onChange={setPlanFilter}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Select
                value={projectFilter}
                options={projectOptions}
                style={{ width: '100%' }}
                onChange={setProjectFilter}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Select
                value={districtFilter}
                options={districtOptions}
                style={{ width: '100%' }}
                onChange={setDistrictFilter}
              />
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Select
                value={ownerFilter}
                options={ownerOptions}
                style={{ width: '100%' }}
                onChange={setOwnerFilter}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Select
                value={budgetRangeFilter}
                options={budgetRangeOptions}
                style={{ width: '100%' }}
                onChange={setBudgetRangeFilter}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Select
                value={operationPlanFilter}
                options={operationPlanOptions}
                style={{ width: '100%' }}
                onChange={setOperationPlanFilter}
              />
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Select
                value={statusFilter}
                options={statusOptions}
                style={{ width: '100%' }}
                onChange={setStatusFilter}
              />
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Input.Search
                allowClear
                placeholder="ค้นหาโครงการ กิจกรรม พื้นที่ ผู้รับผิดชอบ"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </Col>
            <Col xs={24} md={12} xl={10}>
              <Space wrap>
                <Tag color="green">พบ {filteredRows.length} รายการ</Tag>
                <Tag color="purple">ชุดนี้ {periodRows.length} รายการ</Tag>
                <Tag color="blue">งบ {money(filteredBudget)} บาท</Tag>
                <Tag color="cyan">เบิกแล้ว {money(filteredSpent)} บาท</Tag>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadData}
                  loading={loading}
                >
                  รีเฟรช
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportCsv}
                  disabled={!filteredRows.length}
                >
                  CSV
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAdd}
                  disabled={!userCanEdit}
                >
                  เพิ่มรายการ
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card
          title={`รายละเอียดรายการงบประมาณ (${filteredRows.length} รายการ)`}
        >
          <div ref={tableWrapRef}>
            <div className="budget-top-scroll" onScroll={handleTopScroll}>
              <div style={{ width: budgetTableScrollX, height: 1 }} />
            </div>
            <Table
              rowKey="id"
              columns={detailColumns}
              dataSource={filteredRows}
              loading={loading}
              size="small"
              className="budget-detail-table"
              tableLayout="fixed"
              scroll={{ x: budgetTableScrollX }}
              locale={{ emptyText: <Empty description="ยังไม่มีข้อมูล" /> }}
              pagination={{
                defaultPageSize: 30,
                pageSizeOptions: [30, 50, 100],
                showSizeChanger: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} จาก ${total} รายการ`,
              }}
            />
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card title="สรุปงบประมาณตามโครงการ">
              <Table
                rowKey="name"
                columns={summaryColumns}
                dataSource={projectSummary}
                size="small"
                pagination={{ pageSize: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card title="งบประมาณตามพื้นที่">
              <Table
                rowKey="name"
                columns={compactColumns}
                dataSource={districtSummary}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Card title="สรุปความคืบหน้าและการเบิกจ่าย">
          <Table
            rowKey="status"
            columns={statusColumns}
            dataSource={statusSummary}
            size="small"
            pagination={false}
          />
        </Card>

        <Card title="งบประมาณตามผู้รับผิดชอบ">
          <Table
            rowKey="name"
            columns={compactColumns}
            dataSource={ownerSummary}
            size="small"
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </Space>

      <Modal
        title={editingRecord ? 'แก้ไขรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText="บันทึก"
        cancelText="ยกเลิก"
        width={860}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="fiscalYear"
                label="ปีงบประมาณ"
                rules={[{ required: true }]}
              >
                <InputNumber min={2500} max={2700} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="round" label="รอบ" rules={[{ required: true }]}>
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sourceFile" label="ไฟล์ต้นทาง">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="plan"
                label="แผนงาน"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="project"
                label="โครงการ"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activity" label="กิจกรรม">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subActivity" label="กิจกรรมย่อย">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="detail" label="รายละเอียด">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="อำเภอ">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="subdistrict" label="ตำบล">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="village" label="หมู่">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="target" label="เป้าหมาย">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="หน่วยวัด">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="budget"
                label="งบประมาณ"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="spentAmount" label="เบิกจ่ายแล้ว">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="operationPlan" label="แผนดำเนินงาน">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentPlan" label="แผนใช้จ่ายเงิน">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="สถานะ">
                <Select
                  options={budgetStatusOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="owner" label="ผู้รับผิดชอบ">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="expenseDetail" label="รายละเอียดการใช้จ่าย">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
          {!userCanEdit && role === 'guest' && (
            <Text type="secondary">โหมดผู้เยี่ยมชมดูได้อย่างเดียว</Text>
          )}
        </Form>
      </Modal>
      <Modal
        title="บันทึกข้อมูลส่งเบิก"
        open={reimbursementOpen}
        onCancel={() => {
          setReimbursementOpen(false);
          reimbursementForm.resetFields();
          setReimbursementRecord(null);
        }}
        onOk={handleReimbursementSubmit}
        okText="บันทึกส่งเบิก"
        cancelText="ยกเลิก"
        width={420}
        destroyOnClose
      >
        <Form
          form={reimbursementForm}
          layout="vertical"
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="spentAmount"
            label="ส่งเบิกมากี่บาท"
            rules={[{ required: true, message: 'กรอกจำนวนเงินที่ส่งเบิก' }]}
          >
            <InputNumber
              min={0}
              max={reimbursementRecord?.budget || undefined}
              style={{ width: '100%' }}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item
            name="reimbursementDate"
            label="วันที่ส่งเบิก"
            rules={[{ required: true, message: 'เลือกวันที่ส่งเบิก' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          {reimbursementRecord && (
            <Text type="secondary">
              งบประมาณรายการนี้ {money(reimbursementRecord.budget)} บาท
            </Text>
          )}
        </Form>
      </Modal>
    </div>
  );
}
