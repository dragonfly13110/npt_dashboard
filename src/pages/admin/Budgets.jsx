import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm,
    Progress, Row, Select, Space, Statistic, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseCrud } from '../../hooks/useSupabase';
import budgetSeed from '../../data/budgetRound2_2569.json';
import '../../styles/budgets.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const money = (value) => Number(value || 0).toLocaleString('th-TH');
const chartColors = ['#1a7f37', '#0969da', '#8250df', '#bf8700', '#cf222e', '#0a7ea4', '#6f4e37', '#57606a'];
const budgetStatusOptions = [
    { label: 'ยังไม่เริ่ม', value: 'ยังไม่เริ่ม', color: 'default', progress: 0 },
    { label: 'เตรียมดำเนินการ', value: 'เตรียมดำเนินการ', color: 'blue', progress: 20 },
    { label: 'กำลังดำเนินการ', value: 'กำลังดำเนินการ', color: 'processing', progress: 50 },
    { label: 'ส่งเบิกแล้ว', value: 'ส่งเบิกแล้ว', color: 'gold', progress: 75 },
    { label: 'เบิกจ่ายแล้ว', value: 'เบิกจ่ายแล้ว', color: 'cyan', progress: 90 },
    { label: 'เสร็จสิ้น', value: 'เสร็จสิ้น', color: 'success', progress: 100 },
];
const defaultBudgetStatus = 'ยังไม่เริ่ม';

function compactText(value, fallback = '-') {
    const text = String(value || '').trim();
    return text || fallback;
}

function clampPercent(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function getBudgetStatusMeta(status) {
    return budgetStatusOptions.find(option => option.value === status) || budgetStatusOptions[0];
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
        fiscalYear: row.fiscal_year || notes.fiscalYear || 2569,
        round: notes.round || 2,
        status: row.status || notes.status || defaultBudgetStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

function serializeBudget(values) {
    const budget = Number(values.budget || 0);
    const spentAmount = Math.min(Number(values.spentAmount || 0), budget || Number(values.spentAmount || 0));
    const detail = {
        ...values,
        budget,
        spentAmount,
        fiscalYear: 2569,
        round: 2,
        sourceFile: budgetSeed.meta.sourceFile,
    };

    return {
        project_name: [values.project, values.activity].filter(Boolean).join(' / ') || 'รายการงบประมาณ',
        fiscal_year: 2569,
        budget_source: values.plan || 'งบรอบ 2 ปี 2569',
        budget_amount: budget,
        spent_amount: spentAmount,
        status: values.status || defaultBudgetStatus,
        notes: JSON.stringify(detail),
    };
}

function ownerKey(owner) {
    return String(owner || '').split(':')[0].trim();
}

function sumBy(rows, keyFn, extraFn = () => ({})) {
    const map = new Map();
    rows.forEach((row) => {
        const name = compactText(keyFn(row), 'ไม่ระบุ');
        const current = map.get(name) || { name, budget: 0, activities: 0, ...extraFn(row) };
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
            <span className={`budget-clamp budget-clamp-${lines}${strong ? ' budget-strong' : ''}${muted ? ' budget-muted' : ''}`}>
                {content}
            </span>
        </Tooltip>
    );
}

const compactColumns = [
    { title: 'ชื่อ', dataIndex: 'name', key: 'name', render: (value) => <Text>{value}</Text> },
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
    { title: 'สถานะ', dataIndex: 'name', key: 'name', render: (value, record) => <Tag color={getBudgetStatusMeta(record.status).color}>{value}</Tag> },
    { title: 'รายการ', dataIndex: 'activities', key: 'activities', width: 96, align: 'center', render: value => <Text>{value}</Text> },
    { title: 'งบประมาณ', dataIndex: 'budget', key: 'budget', width: 140, align: 'right', render: value => `${money(value)} บาท` },
    { title: 'เบิกแล้ว', dataIndex: 'spent', key: 'spent', width: 140, align: 'right', render: value => `${money(value)} บาท` },
];

export default function Budgets() {
    const { createRecord, updateRecord, deleteRecord } = useSupabaseCrud('budgets');
    const { canEdit, canDelete, role } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usingFallback, setUsingFallback] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [planFilter, setPlanFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('all');
    const [operationPlanFilter, setOperationPlanFilter] = useState('all');
    const [budgetRangeFilter, setBudgetRangeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [form] = Form.useForm();

    const userCanEdit = canEdit();
    const userCanDelete = canDelete();

    const loadData = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('fiscal_year', 2569)
            .order('created_at', { ascending: false })
            .limit(10000);

        if (error) {
            message.error(`โหลดงบจาก Supabase ไม่สำเร็จ: ${error.message}`);
            setRows(budgetSeed.rows);
            setUsingFallback(true);
        } else {
            setRows((data || []).map(parseBudgetRow).sort((a, b) => (a.sourceId || 9999) - (b.sourceId || 9999)));
            setUsingFallback(false);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadData);
    }, [loadData]);

    const optionsFromRows = useCallback((label, getter) => {
        const values = Array.from(new Set(rows.map(getter).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'th'));
        return [{ label, value: 'all' }, ...values.map(value => ({ label: value, value }))];
    }, [rows]);

    const planOptions = useMemo(() => optionsFromRows('ทุกแผนงาน', row => row.plan), [optionsFromRows]);
    const districtOptions = useMemo(() => optionsFromRows('ทุกพื้นที่', row => row.district), [optionsFromRows]);
    const projectOptions = useMemo(() => optionsFromRows('ทุกโครงการ', row => row.project), [optionsFromRows]);
    const ownerOptions = useMemo(() => optionsFromRows('ทุกผู้รับผิดชอบ', row => ownerKey(row.owner)), [optionsFromRows]);
    const operationPlanOptions = useMemo(() => optionsFromRows('ทุกช่วงดำเนินงาน', row => row.operationPlan), [optionsFromRows]);
    const statusOptions = useMemo(() => [
        { label: 'ทุกสถานะ', value: 'all' },
        ...budgetStatusOptions.map(option => ({ label: option.label, value: option.value })),
    ], []);

    const budgetRangeOptions = [
        { label: 'ทุกช่วงงบ', value: 'all' },
        { label: 'ไม่เกิน 5,000', value: 'lte5000' },
        { label: '5,001 - 20,000', value: '5001to20000' },
        { label: 'มากกว่า 20,000', value: 'gt20000' },
    ];

    const filteredRows = useMemo(() => {
        const needle = keyword.trim().toLowerCase();
        return rows.filter(row => {
            if (planFilter !== 'all' && row.plan !== planFilter) return false;
            if (districtFilter !== 'all' && row.district !== districtFilter) return false;
            if (projectFilter !== 'all' && row.project !== projectFilter) return false;
            if (ownerFilter !== 'all' && ownerKey(row.owner) !== ownerFilter) return false;
            if (operationPlanFilter !== 'all' && row.operationPlan !== operationPlanFilter) return false;
            if (statusFilter !== 'all' && row.status !== statusFilter) return false;
            if (budgetRangeFilter === 'lte5000' && row.budget > 5000) return false;
            if (budgetRangeFilter === '5001to20000' && (row.budget <= 5000 || row.budget > 20000)) return false;
            if (budgetRangeFilter === 'gt20000' && row.budget <= 20000) return false;
            if (!needle) return true;
            return [
                row.plan, row.project, row.activity, row.subActivity, row.detail,
                row.district, row.subdistrict, row.owner, row.expenseDetail,
            ].some(value => String(value || '').toLowerCase().includes(needle));
        });
    }, [budgetRangeFilter, districtFilter, keyword, operationPlanFilter, ownerFilter, planFilter, projectFilter, rows, statusFilter]);

    const filteredBudget = useMemo(() => filteredRows.reduce((sum, row) => sum + Number(row.budget || 0), 0), [filteredRows]);
    const totalBudget = useMemo(() => rows.reduce((sum, row) => sum + Number(row.budget || 0), 0), [rows]);
    const totalSpent = useMemo(() => rows.reduce((sum, row) => sum + Number(row.spentAmount || 0), 0), [rows]);
    const filteredSpent = useMemo(() => filteredRows.reduce((sum, row) => sum + Number(row.spentAmount || 0), 0), [filteredRows]);
    const spendingPercent = useMemo(() => clampPercent(totalBudget ? (totalSpent / totalBudget) * 100 : 0), [totalBudget, totalSpent]);
    const filteredSpendingPercent = useMemo(() => clampPercent(filteredBudget ? (filteredSpent / filteredBudget) * 100 : 0), [filteredBudget, filteredSpent]);
    const completedRows = useMemo(() => rows.filter(row => row.status === 'เสร็จสิ้น').length, [rows]);
    const reimbursementRows = useMemo(() => rows.filter(row => ['ส่งเบิกแล้ว', 'เบิกจ่ายแล้ว', 'เสร็จสิ้น'].includes(row.status)).length, [rows]);
    const projectSummary = useMemo(() => sumBy(rows, row => row.project, row => ({ project: row.project, plan: row.plan })), [rows]);
    const districtSummary = useMemo(() => sumBy(rows, row => row.district), [rows]);
    const ownerSummary = useMemo(() => sumBy(rows, row => ownerKey(row.owner)), [rows]);
    const statusSummary = useMemo(() => {
        const map = new Map(budgetStatusOptions.map(option => [option.value, {
            name: option.label,
            status: option.value,
            budget: 0,
            spent: 0,
            activities: 0,
        }]));
        rows.forEach((row) => {
            const meta = getBudgetStatusMeta(row.status);
            const current = map.get(meta.value);
            current.budget += Number(row.budget || 0);
            current.spent += Number(row.spentAmount || 0);
            current.activities += 1;
        });
        return Array.from(map.values()).filter(item => item.activities > 0);
    }, [rows]);
    const topProjects = useMemo(() => projectSummary.slice(0, 8), [projectSummary]);

    const openAdd = () => {
        if (!userCanEdit) {
            message.warning('คุณไม่มีสิทธิ์แก้ไข');
            return;
        }
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({ status: defaultBudgetStatus, spentAmount: 0 });
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

    const handleStatusChange = async (record, status) => {
        const payload = serializeBudget({ ...record, status });
        const ok = await updateRecord(record.id, payload);
        if (ok) {
            setRows(current => current.map(row => (row.id === record.id ? { ...row, status } : row)));
            message.success('อัปเดตสถานะแล้ว');
        }
    };

    const summaryColumns = [
        {
            title: 'โครงการ',
            dataIndex: 'project',
            key: 'project',
            width: 320,
            render: (value, record) => (
                <div className="budget-stack">
                    <ClampText strong lines={2}>{value}</ClampText>
                    <ClampText muted>{record.plan}</ClampText>
                </div>
            ),
        },
        { title: 'กิจกรรม', dataIndex: 'activities', key: 'activities', width: 100, align: 'center', render: value => <Tag color="blue">{value} รายการ</Tag> },
        { title: 'งบประมาณ', dataIndex: 'budget', key: 'budget', width: 150, align: 'right', sorter: (a, b) => a.budget - b.budget, render: value => `${money(value)} บาท` },
    ];

    const detailColumns = [
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
                            {compactText(record.subdistrict, '')}{record.village ? ` หมู่ ${record.village}` : ''}
                        </Text>
                    )}
                </div>
            ),
        },
        { title: 'เป้าหมาย', key: 'target', width: 104, align: 'center', render: (_, record) => <Text className="budget-nowrap">{compactText(record.target)} {compactText(record.unit, '')}</Text> },
        { title: 'งบประมาณ', dataIndex: 'budget', key: 'budget', width: 112, align: 'right', sorter: (a, b) => a.budget - b.budget, render: value => <Text strong>{money(value)}</Text> },
        { title: 'เบิกแล้ว', dataIndex: 'spentAmount', key: 'spentAmount', width: 108, align: 'right', sorter: (a, b) => a.spentAmount - b.spentAmount, render: value => <Text>{money(value)}</Text> },
        { title: 'แผนดำเนินงาน', dataIndex: 'operationPlan', key: 'operationPlan', width: 108, align: 'center', render: value => <Text className="budget-nowrap">{compactText(value)}</Text> },
        { title: 'แผนใช้จ่ายเงิน', dataIndex: 'paymentPlan', key: 'paymentPlan', width: 108, align: 'center', render: value => <Text className="budget-nowrap">{compactText(value)}</Text> },
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
                                options={budgetStatusOptions.map(option => ({ label: option.label, value: option.value }))}
                                onChange={nextStatus => handleStatusChange(record, nextStatus)}
                            />
                        ) : (
                            <Tag color={meta.color}>{meta.label}</Tag>
                        )}
                        <Progress percent={meta.progress} size="small" showInfo={false} />
                    </div>
                );
            },
        },
        { title: 'ผู้รับผิดชอบ', dataIndex: 'owner', key: 'owner', width: 150, render: value => <ClampText>{value}</ClampText> },
        {
            title: 'จัดการ',
            key: 'actions',
            fixed: 'right',
            width: userCanDelete ? 82 : 52,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="แก้ไข">
                        <Button className="action-btn edit" icon={<EditOutlined />} onClick={() => openEdit(record)} />
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
                                <Button className="action-btn delete" icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div>
                    <Tag color="green">รอบ 2</Tag>
                    <Tag color="blue">ปีงบประมาณ 2569</Tag>
                    <Tag color={usingFallback ? 'orange' : 'cyan'}>{usingFallback ? 'ข้อมูลสำรองในไฟล์' : 'ข้อมูลจาก Supabase'}</Tag>
                    <Title level={2} style={{ margin: '8px 0 4px' }}>ข้อมูลงบประมาณส่งเสริมการเกษตร</Title>
                    <Text type="secondary">
                        งบรอบ 2 ปี 2569 แสดงหัวตารางจำเป็น: แผนงาน โครงการ กิจกรรม พื้นที่ เป้าหมาย งบประมาณ แผนดำเนินงาน แผนใช้จ่ายเงิน และผู้รับผิดชอบ
                    </Text>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="งบประมาณรวม" value={totalBudget} formatter={value => `${money(value)} บาท`} /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="เบิกจ่ายแล้ว" value={totalSpent} formatter={value => `${money(value)} บาท`} /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="ความคืบหน้างบ" value={spendingPercent} suffix="%" /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="ส่งเบิก/จบแล้ว" value={reimbursementRows} suffix={`จาก ${rows.length} รายการ`} /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="จำนวนโครงการ" value={projectSummary.length} suffix="โครงการ" /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="เสร็จสิ้น" value={completedRows} suffix="รายการ" /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="งบตามตัวกรอง" value={filteredBudget} formatter={value => `${money(value)} บาท`} /></Card></Col>
                    <Col xs={24} sm={12} lg={6}><Card><Statistic title="คืบหน้าตามตัวกรอง" value={filteredSpendingPercent} suffix="%" /></Card></Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} xl={15}>
                        <Card title="กราฟงบประมาณสูงสุดตามโครงการ">
                            <div style={{ width: '100%', height: 360 }}>
                                <ResponsiveContainer>
                                    <BarChart data={topProjects} layout="vertical" margin={{ top: 8, right: 24, left: 18, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={value => `${Math.round(value / 1000)}k`} />
                                        <YAxis type="category" dataKey="project" width={210} tick={{ fontSize: 11 }} tickFormatter={value => String(value).replace(/^\d+\s*/, '').slice(0, 28)} />
                                        <ChartTooltip formatter={value => [`${money(value)} บาท`, 'งบประมาณ']} />
                                        <Bar dataKey="budget" fill="#1a7f37" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} xl={9}>
                        <Card title="สถานะความคืบหน้าโครงการ">
                            <div style={{ width: '100%', height: 360 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={statusSummary} dataKey="activities" nameKey="name" innerRadius={72} outerRadius={118} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {statusSummary.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                                        </Pie>
                                        <ChartTooltip formatter={value => [`${money(value)} รายการ`, 'จำนวน']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card title="ตัวกรองข้อมูล">
                    <Row gutter={[12, 12]}>
                        <Col xs={24} md={12} xl={6}><Select value={planFilter} options={planOptions} style={{ width: '100%' }} onChange={setPlanFilter} /></Col>
                        <Col xs={24} md={12} xl={6}><Select value={projectFilter} options={projectOptions} style={{ width: '100%' }} onChange={setProjectFilter} showSearch optionFilterProp="label" /></Col>
                        <Col xs={24} md={12} xl={4}><Select value={districtFilter} options={districtOptions} style={{ width: '100%' }} onChange={setDistrictFilter} /></Col>
                        <Col xs={24} md={12} xl={4}><Select value={ownerFilter} options={ownerOptions} style={{ width: '100%' }} onChange={setOwnerFilter} showSearch optionFilterProp="label" /></Col>
                        <Col xs={24} md={12} xl={4}><Select value={budgetRangeFilter} options={budgetRangeOptions} style={{ width: '100%' }} onChange={setBudgetRangeFilter} /></Col>
                        <Col xs={24} md={12} xl={6}><Select value={operationPlanFilter} options={operationPlanOptions} style={{ width: '100%' }} onChange={setOperationPlanFilter} /></Col>
                        <Col xs={24} md={12} xl={4}><Select value={statusFilter} options={statusOptions} style={{ width: '100%' }} onChange={setStatusFilter} /></Col>
                        <Col xs={24} md={12} xl={8}>
                            <Input.Search allowClear placeholder="ค้นหาโครงการ กิจกรรม พื้นที่ ผู้รับผิดชอบ" value={keyword} onChange={event => setKeyword(event.target.value)} />
                        </Col>
                        <Col xs={24} md={12} xl={10}>
                            <Space wrap>
                                <Tag color="green">พบ {filteredRows.length} รายการ</Tag>
                                <Tag color="blue">งบ {money(filteredBudget)} บาท</Tag>
                                <Tag color="cyan">เบิกแล้ว {money(filteredSpent)} บาท</Tag>
                                <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>รีเฟรช</Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} disabled={!userCanEdit}>เพิ่มรายการ</Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                <Card title={`รายละเอียดรายการงบประมาณ (${filteredRows.length} รายการ)`}>
                    <Table
                        rowKey="id"
                        columns={detailColumns}
                        dataSource={filteredRows}
                        loading={loading}
                        size="small"
                        className="budget-detail-table"
                        tableLayout="fixed"
                        scroll={{ x: 1510 }}
                        locale={{ emptyText: <Empty description="ยังไม่มีข้อมูล" /> }}
                        pagination={{
                            defaultPageSize: 30,
                            pageSizeOptions: [30, 50, 100],
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} จาก ${total} รายการ`,
                        }}
                    />
                </Card>

                <Row gutter={[16, 16]}>
                    <Col xs={24} xl={14}>
                        <Card title="สรุปงบประมาณตามโครงการ">
                            <Table rowKey="name" columns={summaryColumns} dataSource={projectSummary} size="small" pagination={{ pageSize: 8 }} />
                        </Card>
                    </Col>
                    <Col xs={24} xl={10}>
                        <Card title="งบประมาณตามพื้นที่">
                            <Table rowKey="name" columns={compactColumns} dataSource={districtSummary} size="small" pagination={false} />
                        </Card>
                    </Col>
                </Row>

                <Card title="สรุปความคืบหน้าและการเบิกจ่าย">
                    <Table rowKey="status" columns={statusColumns} dataSource={statusSummary} size="small" pagination={false} />
                </Card>

                <Card title="งบประมาณตามผู้รับผิดชอบ">
                    <Table rowKey="name" columns={compactColumns} dataSource={ownerSummary} size="small" pagination={{ pageSize: 8 }} />
                </Card>
            </Space>

            <Modal
                title={editingRecord ? 'แก้ไขรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); }}
                onOk={handleSubmit}
                okText="บันทึก"
                cancelText="ยกเลิก"
                width={860}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="plan" label="แผนงาน" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="project" label="โครงการ" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="activity" label="กิจกรรม"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="subActivity" label="กิจกรรมย่อย"><Input /></Form.Item></Col>
                        <Col span={24}><Form.Item name="detail" label="รายละเอียด"><TextArea rows={2} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="district" label="อำเภอ"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="village" label="หมู่"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="target" label="เป้าหมาย"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="unit" label="หน่วยวัด"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="budget" label="งบประมาณ" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="spentAmount" label="เบิกจ่ายแล้ว"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="operationPlan" label="แผนดำเนินงาน"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="paymentPlan" label="แผนใช้จ่ายเงิน"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="status" label="สถานะ"><Select options={budgetStatusOptions.map(option => ({ label: option.label, value: option.value }))} /></Form.Item></Col>
                        <Col span={24}><Form.Item name="owner" label="ผู้รับผิดชอบ"><Input /></Form.Item></Col>
                        <Col span={24}><Form.Item name="expenseDetail" label="รายละเอียดการใช้จ่าย"><TextArea rows={2} /></Form.Item></Col>
                    </Row>
                    {!userCanEdit && role === 'guest' && <Text type="secondary">โหมดผู้เยี่ยมชมดูได้อย่างเดียว</Text>}
                </Form>
            </Modal>
        </div>
    );
}
