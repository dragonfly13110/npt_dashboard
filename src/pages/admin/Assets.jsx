import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
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
  AppstoreOutlined,
  BankOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import EChart from '../../components/widgets/EChart';
import { downloadCsv, rowsToCsv } from '../../utils/csv';
import './Assets.css';

const { Text, Title } = Typography;

const chartColors = [
  '#1a7f37',
  '#0969da',
  '#8250df',
  '#bf8700',
  '#cf222e',
  '#0a7ea4',
  '#57606a',
  '#6f4e37',
];
const allValue = 'all';

function parseNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { detail: notes };
  }
}

function compactText(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function money(value) {
  return Number(value || 0).toLocaleString('th-TH', {
    maximumFractionDigits: 0,
  });
}

function compactMoney(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1_000_000)
    return `${(number / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`;
  if (Math.abs(number) >= 1_000)
    return `${(number / 1_000).toLocaleString('th-TH', { maximumFractionDigits: 0 })} พัน`;
  return money(number);
}

function normalizeCondition(value) {
  const text = compactText(value, 'ใช้งาน');
  if (/ชำรุดซ่อมได้/.test(text)) return 'ชำรุดซ่อมได้';
  if (/ชำรุดซ่อมไม่ได้/.test(text)) return 'ชำรุดซ่อมไม่ได้';
  if (/ชำรุด|เสีย|ซ่อม/.test(text)) return 'ชำรุด';
  if (/จำหน่าย|ตัด/.test(text)) return 'จำหน่าย';
  return text;
}

function parseAsset(row) {
  const notes = parseNotes(row.notes);
  return {
    ...row,
    notesData: notes,
    fiscalYear: notes.fiscalYear || null,
    acceptedDateThai: notes.acceptedDateThai || '',
    assetCode: notes.assetCode || row.serial_number || '',
    equipmentCode: notes.equipmentCode || '',
    oldEquipmentCode: notes.oldEquipmentCode || '',
    kind: notes.kind || row.name || '',
    model: notes.model || '',
    agency: notes.agency || '',
    assignedTo: notes.assignedTo || row.location || '',
    sourceStatus: notes.status || '',
    conditionGroup: normalizeCondition(row.condition || notes.status),
    valueNumber: Number(row.value || 0),
  };
}

function uniqOptions(rows, key, label = key) {
  return Array.from(
    new Set(rows.map((row) => compactText(row[key], '')).filter(Boolean))
  )
    .sort((a, b) => String(a).localeCompare(String(b), 'th'))
    .map((value) => ({ label: value, value, [label]: value }));
}

function groupBy(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const name = compactText(keyFn(row), 'ไม่ระบุ');
    const current = map.get(name) || { name, count: 0, value: 0 };
    current.count += 1;
    current.value += Number(row.valueNumber || 0);
    map.set(name, current);
  });
  return Array.from(map.values());
}

function topGroups(rows, keyFn, limit = 10) {
  return groupBy(rows, keyFn)
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, limit);
}

function conditionColor(condition) {
  if (condition === 'ดี' || condition === 'ใช้งาน') return 'green';
  if (/ชำรุด/.test(condition)) return 'gold';
  if (condition === 'จำหน่าย') return 'red';
  return 'blue';
}

function valueBand(value) {
  const number = Number(value || 0);
  if (number >= 100000) return '100k_up';
  if (number >= 30000) return '30k_100k';
  if (number >= 10000) return '10k_30k';
  if (number > 0) return 'under_10k';
  return 'no_value';
}

function matchesValueBand(row, band) {
  if (band === allValue) return true;
  return valueBand(row.valueNumber) === band;
}

const valueBandOptions = [
  { label: 'ทุกมูลค่า', value: allValue },
  { label: '100,000 บาทขึ้นไป', value: '100k_up' },
  { label: '30,000 - 99,999 บาท', value: '30k_100k' },
  { label: '10,000 - 29,999 บาท', value: '10k_30k' },
  { label: 'ต่ำกว่า 10,000 บาท', value: 'under_10k' },
  { label: 'ไม่มีมูลค่า', value: 'no_value' },
];

function AssetName({ record }) {
  const title = compactText(record.kind || record.name);
  const subtitle = compactText(record.model, '');
  return (
    <div className="assets-name-cell">
      <Tooltip title={title}>
        <Text strong className="assets-clamp assets-clamp-1">
          {title}
        </Text>
      </Tooltip>
      {subtitle ? (
        <Tooltip title={subtitle}>
          <Text type="secondary" className="assets-clamp assets-clamp-2">
            {subtitle}
          </Text>
        </Tooltip>
      ) : null}
    </div>
  );
}

export default function Assets() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(allValue);
  const [conditionFilter, setConditionFilter] = useState(allValue);
  const [fiscalYearFilter, setFiscalYearFilter] = useState(allValue);
  const [locationFilter, setLocationFilter] = useState(allValue);
  const [valueFilter, setValueFilter] = useState(allValue);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      message.error(`โหลดข้อมูลทรัพย์สินไม่สำเร็จ: ${error.message}`);
      setRows([]);
    } else {
      setRows((data || []).map(parseAsset));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);

  const filters = useMemo(() => {
    const yearOptions = Array.from(
      new Set(rows.map((row) => row.fiscalYear).filter(Boolean))
    )
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({ label: `ปีงบ ${year}`, value: String(year) }));

    return {
      categories: [
        { label: 'ทุกประเภท', value: allValue },
        ...uniqOptions(rows, 'category'),
      ],
      conditions: [
        { label: 'ทุกสภาพ', value: allValue },
        ...uniqOptions(rows, 'conditionGroup'),
      ],
      years: [{ label: 'ทุกปีงบประมาณ', value: allValue }, ...yearOptions],
      locations: [
        { label: 'ทุกหน่วย/ที่ใช้งาน', value: allValue },
        ...uniqOptions(rows, 'assignedTo'),
      ],
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (categoryFilter !== allValue && row.category !== categoryFilter)
        return false;
      if (
        conditionFilter !== allValue &&
        row.conditionGroup !== conditionFilter
      )
        return false;
      if (
        fiscalYearFilter !== allValue &&
        String(row.fiscalYear) !== String(fiscalYearFilter)
      )
        return false;
      if (locationFilter !== allValue && row.assignedTo !== locationFilter)
        return false;
      if (!matchesValueBand(row, valueFilter)) return false;
      if (!query) return true;
      return [
        row.name,
        row.category,
        row.serial_number,
        row.location,
        row.condition,
        row.kind,
        row.model,
        row.agency,
        row.assignedTo,
        row.assetCode,
        row.equipmentCode,
        row.sourceStatus,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [
    categoryFilter,
    conditionFilter,
    fiscalYearFilter,
    keyword,
    locationFilter,
    rows,
    valueFilter,
  ]);

  const stats = useMemo(() => {
    const totalValue = filteredRows.reduce(
      (sum, row) => sum + Number(row.valueNumber || 0),
      0
    );
    const active = filteredRows.filter(
      (row) => row.conditionGroup === 'ดี' || row.conditionGroup === 'ใช้งาน'
    ).length;
    const units = new Set(
      filteredRows.map((row) => row.assignedTo).filter(Boolean)
    ).size;
    const avgValue = filteredRows.length ? totalValue / filteredRows.length : 0;
    return { totalValue, active, units, avgValue };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const byCategory = topGroups(filteredRows, (row) => row.category, 8);
    const byLocation = topGroups(filteredRows, (row) => row.assignedTo, 8);
    const byYear = groupBy(filteredRows, (row) =>
      row.fiscalYear ? `ปีงบ ${row.fiscalYear}` : 'ไม่ระบุ'
    ).sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
    const byCondition = groupBy(filteredRows, (row) => row.conditionGroup).sort(
      (a, b) => b.count - a.count
    );

    return { byCategory, byLocation, byYear, byCondition };
  }, [filteredRows]);

  const resetFilters = () => {
    setKeyword('');
    setCategoryFilter(allValue);
    setConditionFilter(allValue);
    setFiscalYearFilter(allValue);
    setLocationFilter(allValue);
    setValueFilter(allValue);
  };

  const exportRows = () => {
    const csv = rowsToCsv([
      [
        'ชื่อรายการ',
        'ประเภท',
        'รหัสสินทรัพย์',
        'รหัสครุภัณฑ์',
        'สภาพ',
        'สถานะ',
        'หน่วยงาน',
        'ใช้ประจำที่',
        'ปีงบประมาณ',
        'วันที่ตรวจรับ',
        'มูลค่า',
      ],
      ...filteredRows.map((row) => [
        row.kind || row.name,
        row.category,
        row.assetCode,
        row.equipmentCode,
        row.conditionGroup,
        row.sourceStatus,
        row.agency,
        row.assignedTo,
        row.fiscalYear,
        row.acceptedDateThai,
        row.valueNumber,
      ]),
    ]);
    downloadCsv(`assets-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const columns = [
    {
      title: 'รายการทรัพย์สิน',
      key: 'name',
      width: 320,
      fixed: 'left',
      render: (_, record) => <AssetName record={record} />,
    },
    {
      title: 'ประเภท',
      dataIndex: 'category',
      key: 'category',
      width: 170,
      render: (value) => <Tag color="blue">{compactText(value)}</Tag>,
    },
    {
      title: 'รหัส',
      key: 'code',
      width: 180,
      render: (_, record) => (
        <div className="assets-code-cell">
          <Text>{compactText(record.assetCode || record.serial_number)}</Text>
          {record.equipmentCode ? (
            <Text type="secondary">{record.equipmentCode}</Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'สภาพ',
      dataIndex: 'conditionGroup',
      key: 'conditionGroup',
      width: 110,
      render: (value) => (
        <Tag color={conditionColor(value)}>{compactText(value)}</Tag>
      ),
    },
    {
      title: 'ใช้ประจำที่',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 220,
      render: (value) => (
        <Text className="assets-clamp assets-clamp-1">
          {compactText(value)}
        </Text>
      ),
    },
    {
      title: 'หน่วยงาน',
      dataIndex: 'agency',
      key: 'agency',
      width: 220,
      render: (value) => (
        <Text className="assets-clamp assets-clamp-1">
          {compactText(value)}
        </Text>
      ),
    },
    {
      title: 'ปีงบ',
      dataIndex: 'fiscalYear',
      key: 'fiscalYear',
      width: 92,
      align: 'center',
      sorter: (a, b) => Number(a.fiscalYear || 0) - Number(b.fiscalYear || 0),
      render: (value) => compactText(value),
    },
    {
      title: 'มูลค่า',
      dataIndex: 'valueNumber',
      key: 'valueNumber',
      width: 130,
      align: 'right',
      sorter: (a, b) => Number(a.valueNumber || 0) - Number(b.valueNumber || 0),
      render: (value) => `${money(value)} บาท`,
    },
  ];

  return (
    <div className="assets-page">
      <Space direction="vertical" size={16} className="assets-stack">
        <section className="assets-hero">
          <div>
            <Space size={8} wrap className="assets-hero-tags">
              <Tag color="green">ข้อมูลนำเข้าจากระบบบริหารจัดการทรัพย์สิน</Tag>
              <Tag color="blue">
                {rows.length.toLocaleString('th-TH')} รายการทั้งหมด
              </Tag>
            </Space>
            <Title level={2} className="assets-title">
              ทะเบียนทรัพย์สินและครุภัณฑ์
            </Title>
            <Text className="assets-subtitle">
              ดูภาพรวมมูลค่าทรัพย์สิน สภาพการใช้งาน ปีงบประมาณที่ตรวจรับ
              และหน่วยงานที่ใช้งาน พร้อมค้นหาและกรองรายการจากข้อมูลจริงใน
              Supabase
            </Text>
          </div>
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              รีโหลด
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportRows}
              disabled={!filteredRows.length}
            >
              ส่งออก CSV
            </Button>
          </Space>
        </section>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <Card className="assets-stat-card">
              <Statistic
                title="รายการตามตัวกรอง"
                value={filteredRows.length}
                suffix="รายการ"
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="assets-stat-card">
              <Statistic
                title="มูลค่ารวม"
                value={compactMoney(stats.totalValue)}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="assets-stat-card">
              <Statistic
                title="ใช้งาน/สภาพดี"
                value={stats.active}
                suffix="รายการ"
                prefix={<SafetyCertificateOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="assets-stat-card">
              <Statistic
                title="หน่วยที่ใช้งาน"
                value={stats.units}
                suffix="หน่วย"
                prefix={<ToolOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card className="assets-filter-card">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} xl={8}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="ค้นหาชื่อ รุ่น รหัส หน่วยงาน หรือสถานที่ใช้งาน..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </Col>
            <Col xs={12} md={8} xl={4}>
              <Select
                value={categoryFilter}
                options={filters.categories}
                onChange={setCategoryFilter}
              />
            </Col>
            <Col xs={12} md={8} xl={4}>
              <Select
                value={conditionFilter}
                options={filters.conditions}
                onChange={setConditionFilter}
              />
            </Col>
            <Col xs={12} md={8} xl={4}>
              <Select
                value={fiscalYearFilter}
                options={filters.years}
                onChange={setFiscalYearFilter}
              />
            </Col>
            <Col xs={12} md={8} xl={4}>
              <Select
                value={valueFilter}
                options={valueBandOptions}
                onChange={setValueFilter}
              />
            </Col>
            <Col xs={24} md={16} xl={20}>
              <Select
                showSearch
                value={locationFilter}
                options={filters.locations}
                onChange={setLocationFilter}
                optionFilterProp="label"
              />
            </Col>
            <Col xs={24} md={8} xl={4}>
              <Button block onClick={resetFilters}>
                ล้างตัวกรอง
              </Button>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="มูลค่าตามประเภททรัพย์สิน">
              <EChart
                style={{ height: 320 }}
                option={barOption(
                  chartData.byCategory,
                  [{ key: 'value', name: 'มูลค่า', color: '#1a7f37' }],
                  {
                    layout: 'vertical',
                    unit: 'บาท',
                    compact: true,
                    grid: { left: 120 },
                  }
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="สัดส่วนสภาพทรัพย์สิน">
              {chartData.byCondition.length ? (
                <EChart
                  style={{ height: 320 }}
                  option={pieOption(
                    chartData.byCondition.map((item, index) => ({
                      name: item.name,
                      value: item.count,
                      color: chartColors[index % chartColors.length],
                    })),
                    { unit: 'รายการ', legend: 'right' }
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="หน่วยงาน/จุดใช้งานที่มีมูลค่าสูง">
              <EChart
                style={{ height: 340 }}
                option={barOption(
                  chartData.byLocation,
                  [{ key: 'value', name: 'มูลค่า', color: '#0969da' }],
                  {
                    layout: 'vertical',
                    unit: 'บาท',
                    compact: true,
                    grid: { left: 160 },
                  }
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="จำนวนทรัพย์สินตามปีงบประมาณที่ตรวจรับ">
              <EChart
                style={{ height: 340 }}
                option={barOption(
                  chartData.byYear,
                  [{ key: 'count', name: 'จำนวนรายการ', color: '#8250df' }],
                  { unit: 'รายการ', compact: true, legend: false }
                )}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="รายการทรัพย์สิน"
          extra={
            <Text type="secondary">
              เฉลี่ย {money(stats.avgValue)} บาท/รายการ
            </Text>
          }
        >
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            scroll={{ x: 1450 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${total.toLocaleString('th-TH')} รายการ`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="ไม่พบข้อมูลตามตัวกรอง"
                />
              ),
            }}
          />
        </Card>
      </Space>
    </div>
  );
}
