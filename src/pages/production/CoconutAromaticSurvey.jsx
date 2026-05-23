import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Spin, Table, Tag, Upload, message } from 'antd';
import { BarChartOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';
import {
  COCONUT_ROUND_START,
  DISTRICT_SUBDISTRICTS,
  calculateCoconutRecord,
  getCoconutRound,
  normalizeImportedCoconutRow,
  toNumber,
} from '../../utils/coconutAromatic';
import { parseCsvFile } from '../../utils/csv';

const COLORS = ['#1a7f37', '#0969da', '#bf8700', '#cf222e', '#8250df', '#0550ae', '#2da44e', '#d97706'];

const numericFields = [
  'own_area_rai',
  'rented_area_rai',
  'production_cost_per_rai',
  'standard_fruit_per_rai',
  'standard_price_per_fruit',
  'small_fruit_per_rai',
  'small_price_per_fruit',
];

const columns = [
  { title: 'à¸£à¸­à¸š', dataIndex: 'round_label', width: 90, fixed: 'left' },
  { title: 'à¸§à¸±à¸™à¸—à¸µà¹ˆ', dataIndex: 'record_date', width: 110 },
  { title: 'à¸£à¸«à¸±à¸ª', dataIndex: 'farmer_code', width: 100 },
  { title: 'à¸Šà¸·à¹ˆà¸­ - à¸ªà¸à¸¸à¸¥', dataIndex: 'farmer_name', width: 180 },
  { title: 'à¸­à¸³à¹€à¸ à¸­', dataIndex: 'district', width: 120 },
  { title: 'à¸•à¸³à¸šà¸¥', dataIndex: 'subdistrict', width: 120 },
  { title: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸›à¸¥à¸¹à¸', dataIndex: 'planted_area_rai', width: 110, align: 'right', render: value => formatNumber(value) },
  { title: 'à¸•à¹‰à¸™à¸—à¸¸à¸™/à¸œà¸¥', dataIndex: 'cost_per_fruit', width: 110, align: 'right', render: value => formatNumber(value) },
  { title: 'à¸œà¸¥à¸¡à¸²à¸•à¸£à¸à¸²à¸™/à¹„à¸£à¹ˆ', dataIndex: 'standard_fruit_per_rai', width: 130, align: 'right', render: value => formatNumber(value) },
  { title: '% à¸¡à¸²à¸•à¸£à¸à¸²à¸™', dataIndex: 'standard_percent', width: 110, align: 'right', render: value => `${formatNumber(value)}%` },
  { title: 'à¸œà¸¥à¹€à¸¥à¹‡à¸/à¹„à¸£à¹ˆ', dataIndex: 'small_fruit_per_rai', width: 110, align: 'right', render: value => formatNumber(value) },
  { title: '% à¸œà¸¥à¹€à¸¥à¹‡à¸', dataIndex: 'small_percent', width: 100, align: 'right', render: value => `${formatNumber(value)}%` },
  { title: 'à¸œà¸¥à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”/à¹„à¸£à¹ˆ', dataIndex: 'total_fruit_per_rai', width: 130, align: 'right', render: value => formatNumber(value) },
  { title: 'à¸£à¸²à¸¢à¹„à¸”à¹‰/à¹„à¸£à¹ˆ', dataIndex: 'income_per_rai', width: 120, align: 'right', render: value => formatMoney(value) },
  { title: 'à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡', dataIndex: 'total_income', width: 130, align: 'right', render: value => formatMoney(value) },
];

export default function CoconutAromaticSurvey() {
  const [form] = Form.useForm();
  const { canEdit } = useAuth();
  const userCanEdit = canEdit();
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ round_no: undefined, district: undefined, subdistrict: undefined, search: '' });
  const [calculated, setCalculated] = useState(calculateCoconutRecord({}));

  const fetchRows = async () => {
    let query = supabase.from('coconut_aromatic_surveys').select('*').order('record_date', { ascending: false });
    if (filters.round_no) query = query.eq('round_no', filters.round_no);
    if (filters.district) query = query.eq('district', filters.district);
    if (filters.subdistrict) query = query.eq('subdistrict', filters.subdistrict);
    if (filters.search) query = query.ilike('farmer_name', `%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const { data: rows = [], isLoading, refetch } = useApiCache(['coconut_aromatic_surveys', filters], fetchRows);

  const summary = useMemo(() => {
    const totals = rows.reduce((acc, item) => {
      acc.farmers += 1;
      acc.area += toNumber(item.planted_area_rai);
      acc.fruit += toNumber(item.total_fruit_per_rai) * toNumber(item.planted_area_rai);
      acc.income += toNumber(item.total_income);
      acc.cost += toNumber(item.production_cost_per_rai);
      return acc;
    }, { farmers: 0, area: 0, fruit: 0, income: 0, cost: 0 });
    return { ...totals, avgCost: totals.farmers ? totals.cost / totals.farmers : 0 };
  }, [rows]);

  const roundOptions = useMemo(() => {
    const today = dayjs().isAfter(dayjs(COCONUT_ROUND_START)) ? dayjs() : dayjs(COCONUT_ROUND_START);
    const count = Math.max(6, Math.ceil(today.diff(dayjs(COCONUT_ROUND_START), 'day') / 20) + 2);
    return Array.from({ length: count }, (_, index) => {
      const round = getCoconutRound(dayjs(COCONUT_ROUND_START).add(index * 20, 'day').format('YYYY-MM-DD'));
      return { label: `${round.round_label} (${toThaiDate(round.round_start_date)} - ${toThaiDate(round.round_end_date)})`, value: round.round_no };
    });
  }, []);

  const districtOptions = Object.keys(DISTRICT_SUBDISTRICTS).map(value => ({ label: value, value }));
  const subdistrictOptions = (filters.district ? DISTRICT_SUBDISTRICTS[filters.district] : Object.values(DISTRICT_SUBDISTRICTS).flat())
    .map(value => ({ label: value, value }));

  const districtChart = useMemo(() => {
    const map = new Map();
    rows.forEach(row => {
      const key = row.district || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸';
      map.set(key, (map.get(key) || 0) + toNumber(row.total_income));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const roundChart = useMemo(() => {
    const map = new Map();
    rows.forEach(row => {
      const key = row.round_label || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  const openAdd = () => {
    const round = getCoconutRound(COCONUT_ROUND_START);
    form.resetFields();
    form.setFieldsValue({ record_date: dayjs(COCONUT_ROUND_START), ...round });
    setCalculated(calculateCoconutRecord({}));
    setModalOpen(true);
  };

  const updateCalculated = (_, values) => {
    const calc = calculateCoconutRecord(values);
    setCalculated(calc);
    const recordDate = values.record_date ? values.record_date.format('YYYY-MM-DD') : COCONUT_ROUND_START;
    const round = getCoconutRound(recordDate);
    form.setFieldsValue({ ...round, ...calc });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const recordDate = values.record_date.format('YYYY-MM-DD');
    const payload = {
      ...values,
      record_date: recordDate,
      ...getCoconutRound(recordDate),
      ...calculateCoconutRecord(values),
    };
    const { error } = await supabase.from('coconut_aromatic_surveys').insert([payload]);
    if (error) {
      message.error(error.message);
      return;
    }
    message.success('à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸šà¸šà¹€à¸à¹‡à¸šà¸¡à¸°à¸žà¸£à¹‰à¸²à¸§à¸™à¹‰à¸³à¸«à¸­à¸¡à¹à¸¥à¹‰à¸§');
    setModalOpen(false);
    refetch();
  };

  const handleImport = async (file) => {
    try {
      const rowsRaw = await parseCsvFile(file);
      const header = (rowsRaw[2] || []).map(cleanHeader);
      const dataRows = rowsRaw.slice(3)
        .filter(row => row.some(cell => String(cell ?? '').trim()))
        .map(row => {
          const obj = {};
          header.forEach((name, index) => { obj[name] = row[index]; });
          return normalizeImportedCoconutRow(obj);
        })
        .filter(row => row.farmer_name || row.farmer_code);

      if (!dataRows.length) {
        message.warning('à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¸«à¸£à¸±à¸šà¸™à¸³à¹€à¸‚à¹‰à¸²');
        return false;
      }
      const { error } = await supabase.from('coconut_aromatic_surveys').insert(dataRows);
      if (error) throw error;
      message.success(`à¸™à¸³à¹€à¸‚à¹‰à¸² ${dataRows.length} à¸£à¸²à¸¢à¸à¸²à¸£à¹à¸¥à¹‰à¸§`);
      refetch();
    } catch (error) {
      message.error(error.message);
    }
    return false;
  };

  return (
    <div>
      <div className="md-page-header">
        <h2>à¹à¸šà¸šà¹€à¸à¹‡à¸šà¸¡à¸°à¸žà¸£à¹‰à¸²à¸§à¸™à¹‰à¸³à¸«à¸­à¸¡</h2>
        <p>à¸ˆà¸±à¸”à¹€à¸à¹‡à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸¸à¸ 20 à¸§à¸±à¸™ à¹€à¸£à¸´à¹ˆà¸¡à¸§à¸±à¸™à¸—à¸µà¹ˆ 1 à¸¡à¸´à¸–à¸¸à¸™à¸²à¸¢à¸™ 2569 à¸žà¸£à¹‰à¸­à¸¡à¸„à¸³à¸™à¸§à¸“à¸œà¸¥à¸œà¸¥à¸´à¸• à¸•à¹‰à¸™à¸—à¸¸à¸™ à¹à¸¥à¸°à¸£à¸²à¸¢à¹„à¸”à¹‰</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Stat title="à¹€à¸à¸©à¸•à¸£à¸à¸£" value={`${summary.farmers.toLocaleString()} à¸£à¸²à¸¢`} color="green" />
        <Stat title="à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸›à¸¥à¸¹à¸à¸£à¸§à¸¡" value={`${formatNumber(summary.area)} à¹„à¸£à¹ˆ`} color="blue" />
        <Stat title="à¸œà¸¥à¸œà¸¥à¸´à¸•à¸£à¸§à¸¡" value={`${formatNumber(summary.fruit)} à¸œà¸¥`} color="orange" />
        <Stat title="à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡" value={formatMoney(summary.income)} color="teal" />
      </Row>

      <Card style={{ marginBottom: 20 }}>
        <Space wrap>
          <Select placeholder="à¸£à¸­à¸šà¸ˆà¸±à¸”à¹€à¸à¹‡à¸š" allowClear options={roundOptions} value={filters.round_no} onChange={value => setFilters(prev => ({ ...prev, round_no: value }))} style={{ width: 260 }} />
          <Select placeholder="à¸­à¸³à¹€à¸ à¸­" allowClear options={districtOptions} value={filters.district} onChange={value => setFilters(prev => ({ ...prev, district: value, subdistrict: undefined }))} style={{ width: 160 }} />
          <Select placeholder="à¸•à¸³à¸šà¸¥" allowClear options={subdistrictOptions} value={filters.subdistrict} onChange={value => setFilters(prev => ({ ...prev, subdistrict: value }))} style={{ width: 160 }} />
          <Input.Search placeholder="à¸„à¹‰à¸™à¸«à¸²à¸Šà¸·à¹ˆà¸­à¹€à¸à¸©à¸•à¸£à¸à¸£" allowClear onSearch={value => setFilters(prev => ({ ...prev, search: value }))} style={{ width: 220 }} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>à¸£à¸µà¹€à¸Ÿà¸£à¸Š</Button>
          {userCanEdit && <Upload accept=".csv,text/csv" showUploadList={false} beforeUpload={handleImport}><Button icon={<UploadOutlined />}>Import CSV</Button></Upload>}
          {userCanEdit && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Button>}
        </Space>
      </Card>

      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡à¹à¸¢à¸à¸•à¸²à¸¡à¸­à¸³à¹€à¸ à¸­">
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatShort} />
                  <RechartsTooltip formatter={value => formatMoney(value)} />
                  <Bar dataKey="value" fill="#1a7f37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="à¸ˆà¸³à¸™à¸§à¸™à¸£à¸²à¸¢à¸à¸²à¸£à¹à¸¢à¸à¸•à¸²à¸¡à¸£à¸­à¸š">
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roundChart} dataKey="value" nameKey="name" outerRadius={95} label>
                    {roundChart.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`à¸•à¹‰à¸™à¸—à¸¸à¸™à¹€à¸‰à¸¥à¸µà¹ˆà¸¢ ${formatMoney(summary.avgCost)} à¸šà¸²à¸—/à¹„à¸£à¹ˆ/à¸›à¸µ à¸ˆà¸²à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸à¸£à¸­à¸‡à¸­à¸¢à¸¹à¹ˆ`} />

      <Table
        rowKey="id"
        dataSource={rows}
        columns={columns}
        loading={isLoading}
        size="small"
        scroll={{ x: 1600 }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal title="à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸šà¸šà¹€à¸à¹‡à¸šà¸¡à¸°à¸žà¸£à¹‰à¸²à¸§à¸™à¹‰à¸³à¸«à¸­à¸¡" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit} width={980} okText="à¸šà¸±à¸™à¸—à¸¶à¸" cancelText="à¸¢à¸à¹€à¸¥à¸´à¸">
        <Form form={form} layout="vertical" onValuesChange={updateCalculated}>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item name="record_date" label="à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¹€à¸à¹‡à¸š" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="round_label" label="à¸£à¸­à¸š"><Input disabled /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="farmer_code" label="à¸£à¸«à¸±à¸ª"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="prefix" label="à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²"><Input /></Form.Item></Col>
            <Col xs={24} md={18}><Form.Item name="farmer_name" label="à¸Šà¸·à¹ˆà¸­ - à¸ªà¸à¸¸à¸¥" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="house_no" label="à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¹€à¸¥à¸‚à¸—à¸µà¹ˆ"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="village_no" label="à¸«à¸¡à¸¹à¹ˆà¸—à¸µà¹ˆ"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="district" label="à¸­à¸³à¹€à¸ à¸­"><Select options={districtOptions} allowClear /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="subdistrict" label="à¸•à¸³à¸šà¸¥"><Input /></Form.Item></Col>
            {numericFields.map(field => (
              <Col xs={24} md={8} key={field}>
                <Form.Item name={field} label={fieldLabel(field)}><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item>
              </Col>
            ))}
            <Col span={24}>
              <Card size="small" title="à¸„à¹ˆà¸²à¸—à¸µà¹ˆà¸£à¸°à¸šà¸šà¸„à¸³à¸™à¸§à¸“à¹ƒà¸«à¹‰">
                <Row gutter={[12, 12]}>
                  {Object.entries(calculated).map(([key, value]) => (
                    <Col xs={12} md={6} key={key}><Tag color="green">{fieldLabel(key)}: {formatNumber(value)}</Tag></Col>
                  ))}
                </Row>
              </Card>
            </Col>
            <Col span={24}><Form.Item name="notes" label="à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

function Stat({ title, value, color }) {
  return (
    <Col xs={24} md={12} xl={6}>
      <div className="md-stat-card">
        <div className={`md-stat-icon ${color}`}><BarChartOutlined /></div>
        <div className="md-stat-info">
          <div className="md-stat-label">{title}</div>
          <div className="md-stat-value">{value}</div>
        </div>
      </div>
    </Col>
  );
}

function fieldLabel(field) {
  const labels = {
    own_area_rai: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸•à¸™à¹€à¸­à¸‡',
    rented_area_rai: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¹€à¸Šà¹ˆà¸²',
    planted_area_rai: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸›à¸¥à¸¹à¸',
    production_cost_per_rai: 'à¸•à¹‰à¸™à¸—à¸¸à¸™/à¹„à¸£à¹ˆ/à¸›à¸µ',
    cost_per_fruit: 'à¸•à¹‰à¸™à¸—à¸¸à¸™/à¸œà¸¥',
    standard_fruit_per_rai: 'à¸œà¸¥à¸¡à¸²à¸•à¸£à¸à¸²à¸™/à¹„à¸£à¹ˆ',
    standard_percent: '% à¸¡à¸²à¸•à¸£à¸à¸²à¸™',
    standard_price_per_fruit: 'à¸£à¸²à¸„à¸²à¸œà¸¥à¸¡à¸²à¸•à¸£à¸à¸²à¸™',
    standard_income_per_rai: 'à¸£à¸²à¸¢à¹„à¸”à¹‰à¸¡à¸²à¸•à¸£à¸à¸²à¸™/à¹„à¸£à¹ˆ',
    small_fruit_per_rai: 'à¸œà¸¥à¹€à¸¥à¹‡à¸/à¹„à¸£à¹ˆ',
    small_percent: '% à¸œà¸¥à¹€à¸¥à¹‡à¸',
    small_price_per_fruit: 'à¸£à¸²à¸„à¸²à¸œà¸¥à¹€à¸¥à¹‡à¸',
    small_income_per_rai: 'à¸£à¸²à¸¢à¹„à¸”à¹‰à¸œà¸¥à¹€à¸¥à¹‡à¸/à¹„à¸£à¹ˆ',
    total_fruit_per_rai: 'à¸œà¸¥à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”/à¹„à¸£à¹ˆ',
    income_per_rai: 'à¸£à¸²à¸¢à¹„à¸”à¹‰/à¹„à¸£à¹ˆ',
    total_income: 'à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡',
  };
  return labels[field] || field;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function formatMoney(value) {
  return toNumber(value).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function formatShort(value) {
  if (value >= 1000000) return `${Math.round(value / 1000000)}à¸¥.`;
  if (value >= 1000) return `${Math.round(value / 1000)}à¸ž.`;
  return value;
}

function toThaiDate(value) {
  const date = dayjs(value);
  return `${date.date()}/${date.month() + 1}/${date.year() + 543}`;
}

function cleanHeader(value) {
  return String(value || '').replace(/\s+/g, '').trim()
    .replace('7.à¸£à¸²à¸„à¸²à¹€à¸‰à¸¥à¸µà¹ˆà¸¢à¸•à¹ˆà¸­à¸œà¸¥(à¸šà¸²à¸—)', 'à¸£à¸²à¸„à¸²à¹€à¸‰à¸¥à¸µà¹ˆà¸¢à¸•à¹ˆà¸­à¸œà¸¥à¸¡à¸²à¸•à¸£à¸à¸²à¸™(à¸šà¸²à¸—)')
    .replace('10.à¸£à¸²à¸„à¸²à¹€à¸‰à¸¥à¸µà¹ˆà¸¢à¸•à¹ˆà¸­à¸œà¸¥(à¸šà¸²à¸—)', 'à¸£à¸²à¸„à¸²à¹€à¸‰à¸¥à¸µà¹ˆà¸¢à¸•à¹ˆà¸­à¸œà¸¥à¹€à¸¥à¹‡à¸(à¸šà¸²à¸—)')
    .replace(/^\d+\./, '');
}
