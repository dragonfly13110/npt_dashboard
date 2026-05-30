import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Spin, Table, Tag, Upload, message } from 'antd';
import { BarChartOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../supabaseClient';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';
import EChart from '../../components/widgets/EChart';
import {
  COCONUT_ROUND_START,
  DISTRICT_SUBDISTRICTS,
  calculateCoconutRecord,
  getCoconutRound,
  normalizeImportedCoconutRow,
  toNumber,
} from '../../utils/coconutAromatic';
import { parseCsvFile } from '../../utils/csv';
import { getPublicColumns, getPublicSelectColumns } from '../../utils/dataPrivacy';

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
  { title: 'รอบ', dataIndex: 'round_label', width: 90, fixed: 'left' },
  { title: 'วันที่', dataIndex: 'record_date', width: 110 },
  { title: 'รหัส', dataIndex: 'farmer_code', width: 100 },
  { title: 'ชื่อ - สกุล', dataIndex: 'farmer_name', width: 180 },
  { title: 'อำเภอ', dataIndex: 'district', width: 120 },
  { title: 'ตำบล', dataIndex: 'subdistrict', width: 120 },
  { title: 'พื้นที่ปลูก', dataIndex: 'planted_area_rai', width: 110, align: 'right', render: value => formatNumber(value) },
  { title: 'ต้นทุน/ผล', dataIndex: 'cost_per_fruit', width: 110, align: 'right', render: value => formatNumber(value) },
  { title: 'ผลมาตรฐาน/ไร่', dataIndex: 'standard_fruit_per_rai', width: 130, align: 'right', render: value => formatNumber(value) },
  { title: '% มาตรฐาน', dataIndex: 'standard_percent', width: 110, align: 'right', render: value => `${formatNumber(value)}%` },
  { title: 'ผลเล็ก/ไร่', dataIndex: 'small_fruit_per_rai', width: 110, align: 'right', render: value => formatNumber(value) },
  { title: '% ผลเล็ก', dataIndex: 'small_percent', width: 100, align: 'right', render: value => `${formatNumber(value)}%` },
  { title: 'ผลทั้งหมด/ไร่', dataIndex: 'total_fruit_per_rai', width: 130, align: 'right', render: value => formatNumber(value) },
  { title: 'รายได้/ไร่', dataIndex: 'income_per_rai', width: 120, align: 'right', render: value => formatMoney(value) },
  { title: 'รายได้รวม', dataIndex: 'total_income', width: 130, align: 'right', render: value => formatMoney(value) },
];

export default function CoconutAromaticSurvey() {
  const [form] = Form.useForm();
  const { canEdit, role } = useAuth();
  const userCanEdit = canEdit();
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ round_no: undefined, district: undefined, subdistrict: undefined, search: '' });
  const [calculated, setCalculated] = useState(calculateCoconutRecord({}));

  const fetchRows = async () => {
    let query = supabase.from('coconut_aromatic_surveys')
      .select(getPublicSelectColumns('coconut_aromatic_surveys', columns, role))
      .order('record_date', { ascending: false });
    if (filters.round_no) query = query.eq('round_no', filters.round_no);
    if (filters.district) query = query.eq('district', filters.district);
    if (filters.subdistrict) query = query.eq('subdistrict', filters.subdistrict);
    if (role !== 'guest' && filters.search) query = query.ilike('farmer_name', `%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const { data: rows = [], isLoading, refetch } = useApiCache(['coconut_aromatic_surveys', role, filters], fetchRows);
  const visibleColumns = useMemo(() => getPublicColumns('coconut_aromatic_surveys', columns, role), [role]);

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
      const key = row.district || 'ไม่ระบุ';
      map.set(key, (map.get(key) || 0) + toNumber(row.total_income));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const roundChart = useMemo(() => {
    const map = new Map();
    rows.forEach(row => {
      const key = row.round_label || 'ไม่ระบุ';
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
    message.success('บันทึกข้อมูลแบบเก็บมะพร้าวน้ำหอมแล้ว');
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
        message.warning('ไม่พบข้อมูลสำหรับนำเข้า');
        return false;
      }
      const { error } = await supabase.from('coconut_aromatic_surveys').insert(dataRows);
      if (error) throw error;
      message.success(`นำเข้า ${dataRows.length} รายการแล้ว`);
      refetch();
    } catch (error) {
      message.error(error.message);
    }
    return false;
  };

  return (
    <div>
      <div className="md-page-header">
        <h2>แบบเก็บมะพร้าวน้ำหอม</h2>
        <p>จัดเก็บข้อมูลทุก 20 วัน เริ่มวันที่ 1 มิถุนายน 2569 พร้อมคำนวณผลผลิต ต้นทุน และรายได้</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Stat title="เกษตรกร" value={`${summary.farmers.toLocaleString()} ราย`} color="green" />
        <Stat title="พื้นที่ปลูกรวม" value={`${formatNumber(summary.area)} ไร่`} color="blue" />
        <Stat title="ผลผลิตรวม" value={`${formatNumber(summary.fruit)} ผล`} color="orange" />
        <Stat title="รายได้รวม" value={formatMoney(summary.income)} color="teal" />
      </Row>

      <Card style={{ marginBottom: 20 }}>
        <Space wrap>
          <Select placeholder="รอบจัดเก็บ" allowClear options={roundOptions} value={filters.round_no} onChange={value => setFilters(prev => ({ ...prev, round_no: value }))} style={{ width: 260 }} />
          <Select placeholder="อำเภอ" allowClear options={districtOptions} value={filters.district} onChange={value => setFilters(prev => ({ ...prev, district: value, subdistrict: undefined }))} style={{ width: 160 }} />
          <Select placeholder="ตำบล" allowClear options={subdistrictOptions} value={filters.subdistrict} onChange={value => setFilters(prev => ({ ...prev, subdistrict: value }))} style={{ width: 160 }} />
          {role !== 'guest' && <Input.Search placeholder="ค้นหาชื่อเกษตรกร" allowClear onSearch={value => setFilters(prev => ({ ...prev, search: value }))} style={{ width: 220 }} />}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>รีเฟรช</Button>
          {userCanEdit && <Upload accept=".csv,text/csv" showUploadList={false} beforeUpload={handleImport}><Button icon={<UploadOutlined />}>Import CSV</Button></Upload>}
          {userCanEdit && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>เพิ่มข้อมูล</Button>}
        </Space>
      </Card>

      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="รายได้รวมแยกตามอำเภอ">
            <div style={{ height: 280 }}>
              <EChart option={barOption(
                districtChart,
                [{ key: 'value', name: 'รายได้รวม', color: '#1a7f37' }],
                { unit: 'บาท' }
              )} />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="จำนวนรายการแยกตามรอบ">
            <div style={{ height: 280 }}>
              <EChart option={pieOption(roundChart, { colors: COLORS, unit: 'รายการ', radius: ['0%', '68%'] })} />
            </div>
          </Card>
        </Col>
      </Row>

      <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`ต้นทุนเฉลี่ย ${formatMoney(summary.avgCost)} บาท/ไร่/ปี จากข้อมูลที่กรองอยู่`} />

      <Table
        rowKey="id"
        dataSource={rows}
        columns={visibleColumns}
        loading={isLoading}
        size="small"
        scroll={{ x: 1600 }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal title="เพิ่มข้อมูลแบบเก็บมะพร้าวน้ำหอม" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit} width={980} okText="บันทึก" cancelText="ยกเลิก">
        <Form form={form} layout="vertical" onValuesChange={updateCalculated}>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item name="record_date" label="วันที่จัดเก็บ" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="round_label" label="รอบ"><Input disabled /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="farmer_code" label="รหัส"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="prefix" label="คำนำหน้า"><Input /></Form.Item></Col>
            <Col xs={24} md={18}><Form.Item name="farmer_name" label="ชื่อ - สกุล" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="house_no" label="ที่อยู่เลขที่"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="village_no" label="หมู่ที่"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="district" label="อำเภอ"><Select options={districtOptions} allowClear /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item></Col>
            {numericFields.map(field => (
              <Col xs={24} md={8} key={field}>
                <Form.Item name={field} label={fieldLabel(field)}><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item>
              </Col>
            ))}
            <Col span={24}>
              <Card size="small" title="ค่าที่ระบบคำนวณให้">
                <Row gutter={[12, 12]}>
                  {Object.entries(calculated).map(([key, value]) => (
                    <Col xs={12} md={6} key={key}><Tag color="green">{fieldLabel(key)}: {formatNumber(value)}</Tag></Col>
                  ))}
                </Row>
              </Card>
            </Col>
            <Col span={24}><Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item></Col>
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
    own_area_rai: 'พื้นที่ตนเอง',
    rented_area_rai: 'พื้นที่เช่า',
    planted_area_rai: 'พื้นที่ปลูก',
    production_cost_per_rai: 'ต้นทุน/ไร่/ปี',
    cost_per_fruit: 'ต้นทุน/ผล',
    standard_fruit_per_rai: 'ผลมาตรฐาน/ไร่',
    standard_percent: '% มาตรฐาน',
    standard_price_per_fruit: 'ราคาผลมาตรฐาน',
    standard_income_per_rai: 'รายได้มาตรฐาน/ไร่',
    small_fruit_per_rai: 'ผลเล็ก/ไร่',
    small_percent: '% ผลเล็ก',
    small_price_per_fruit: 'ราคาผลเล็ก',
    small_income_per_rai: 'รายได้ผลเล็ก/ไร่',
    total_fruit_per_rai: 'ผลทั้งหมด/ไร่',
    income_per_rai: 'รายได้/ไร่',
    total_income: 'รายได้รวม',
  };
  return labels[field] || field;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function formatMoney(value) {
  return toNumber(value).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function toThaiDate(value) {
  const date = dayjs(value);
  return `${date.date()}/${date.month() + 1}/${date.year() + 543}`;
}

function cleanHeader(value) {
  return String(value || '').replace(/\s+/g, '').trim()
    .replace('7.ราคาเฉลี่ยต่อผล(บาท)', 'ราคาเฉลี่ยต่อผลมาตรฐาน(บาท)')
    .replace('10.ราคาเฉลี่ยต่อผล(บาท)', 'ราคาเฉลี่ยต่อผลเล็ก(บาท)')
    .replace(/^\d+\./, '');
}
