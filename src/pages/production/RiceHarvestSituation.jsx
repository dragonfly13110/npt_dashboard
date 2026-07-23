import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import {
  BarChartOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { PageHeader } from '../../components/widgets/SharedDashboardUI';
import { supabase } from '../../supabaseClient';
import { downloadCsv } from '../../utils/csv';

const MONTH_LABELS = [
  '\u0e21.\u0e04.',
  '\u0e01.\u0e1e.',
  '\u0e21\u0e35.\u0e04.',
  '\u0e40\u0e21.\u0e22.',
  '\u0e1e.\u0e04.',
  '\u0e21\u0e34.\u0e22.',
  '\u0e01.\u0e04.',
  '\u0e2a.\u0e04.',
  '\u0e01.\u0e22.',
  '\u0e15.\u0e04.',
  '\u0e1e.\u0e22.',
  '\u0e18.\u0e04.',
];

const COPY = {
  title:
    '\u0e2a\u0e16\u0e32\u0e19\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e01\u0e32\u0e23\u0e40\u0e1e\u0e32\u0e30\u0e1b\u0e25\u0e39\u0e01\u0e02\u0e49\u0e32\u0e27',
  subtitle:
    '\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e41\u0e25\u0e30\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e02\u0e49\u0e32\u0e27\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e15\u0e32\u0e21\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27 (800 \u0e01\u0e01.\u0e15\u0e48\u0e2d\u0e44\u0e23\u0e48)',
  readError:
    '\u0e2d\u0e48\u0e32\u0e19\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
  empty:
    '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35 snapshot \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e02\u0e49\u0e32\u0e27',
  cropYear: '\u0e1b\u0e35\u0e01\u0e32\u0e23\u0e1c\u0e25\u0e34\u0e15',
  snapshot: '\u0e23\u0e2d\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25',
  updated: '\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25',
  totalArea:
    '\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e15\u0e32\u0e21\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e23\u0e27\u0e21 (\u0e44\u0e23\u0e48)',
  totalRice:
    '\u0e02\u0e49\u0e32\u0e27\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e23\u0e27\u0e21 (\u0e15\u0e31\u0e19)',
  firstSnapshot:
    '\u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e23\u0e2d\u0e1a\u0e41\u0e23\u0e01',
  monthlyChart:
    '\u0e02\u0e49\u0e32\u0e27\u0e04\u0e32\u0e14\u0e27\u0e48\u0e32\u0e08\u0e30\u0e2d\u0e2d\u0e01\u0e41\u0e15\u0e48\u0e25\u0e30\u0e40\u0e14\u0e37\u0e2d\u0e19 (\u0e15\u0e31\u0e19)',
  districtTable: (year) =>
    `\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e23\u0e32\u0e22\u0e2d\u0e33\u0e40\u0e20\u0e2d\u0e41\u0e25\u0e30\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27 (\u0e1b\u0e35 ${year})`,
  filterTitle: '\u0e01\u0e23\u0e2d\u0e07\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23',
  district: '\u0e2d\u0e33\u0e40\u0e20\u0e2d',
  month:
    '\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27',
  allDistricts: '\u0e17\u0e38\u0e01\u0e2d\u0e33\u0e40\u0e20\u0e2d',
  allMonths: '\u0e17\u0e38\u0e01\u0e40\u0e14\u0e37\u0e2d\u0e19',
  rows: '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23',
  exportCsv: '\u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01 CSV',
  changedFrom: (date) =>
    `\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e08\u0e32\u0e01 ${date} (\u0e15\u0e31\u0e19)`,
};

const COLUMNS = [
  {
    title: '\u0e2d\u0e33\u0e40\u0e20\u0e2d',
    dataIndex: 'district',
    key: 'district',
    fixed: 'left',
  },
  {
    title:
      '\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27',
    dataIndex: 'monthLabel',
    key: 'monthLabel',
  },
  {
    title: '\u0e04\u0e23\u0e31\u0e27\u0e40\u0e23\u0e37\u0e2d\u0e19',
    dataIndex: 'householdCount',
    key: 'householdCount',
    align: 'right',
    render: formatInteger,
  },
  {
    title: '\u0e41\u0e1b\u0e25\u0e07',
    dataIndex: 'plotCount',
    key: 'plotCount',
    align: 'right',
    render: formatInteger,
  },
  {
    title:
      '\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e17\u0e35\u0e48 (\u0e44\u0e23\u0e48)',
    dataIndex: 'areaRai',
    key: 'areaRai',
    align: 'right',
    render: formatDecimal,
  },
  {
    title:
      '\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e02\u0e49\u0e32\u0e27 (\u0e15\u0e31\u0e19)',
    dataIndex: 'estimatedTons',
    key: 'estimatedTons',
    align: 'right',
    render: formatDecimal,
  },
];

function formatInteger(value) {
  return Number(value || 0).toLocaleString('th-TH');
}

function formatDecimal(value) {
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function validRows(rows) {
  return (rows || []).filter(
    (row) =>
      row?.district_code &&
      Number.isInteger(Number(row.harvest_month)) &&
      Number(row.harvest_month) >= 1 &&
      Number(row.harvest_month) <= 12 &&
      Number(row.area_rai) >= 0 &&
      Number(row.estimated_tons) >= 0
  );
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(b).localeCompare(String(a), 'th')
  );
}

function formatHarvestMonth(month, cropYear) {
  const years = String(cropYear || '').split('/');
  const year = (years[month >= 7 ? 0 : 1] || years[0] || '').slice(-2);
  return `${MONTH_LABELS[month - 1]}${year ? ` (${year})` : ''}`;
}

function summarize(rows) {
  const monthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    areaRai: 0,
    estimatedTons: 0,
  }));
  const districtRows = new Map();
  for (const row of rows) {
    const month = Number(row.harvest_month);
    const areaRai = Number(row.area_rai) || 0;
    const estimatedTons = Number(row.estimated_tons) || 0;
    monthly[month - 1].areaRai += areaRai;
    monthly[month - 1].estimatedTons += estimatedTons;
    districtRows.set(`${row.district_code}:${month}`, {
      key: `${row.district_code}:${month}`,
      district: row.district,
      districtCode: row.district_code,
      harvestMonth: month,
      monthLabel: formatHarvestMonth(month, row.crop_year),
      householdCount: Number(row.household_count) || 0,
      plotCount: Number(row.plot_count) || 0,
      areaRai,
      estimatedTons,
    });
  }
  return {
    monthly,
    districtRows: [...districtRows.values()].sort(
      (a, b) =>
        a.district.localeCompare(b.district, 'th') ||
        a.harvestMonth - b.harvestMonth
    ),
    areaRai: monthly.reduce((sum, row) => sum + row.areaRai, 0),
    estimatedTons: monthly.reduce((sum, row) => sum + row.estimatedTons, 0),
  };
}

function chartOption(monthly) {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${formatDecimal(value)} ตัน`,
    },
    grid: { left: 48, right: 24, top: 24, bottom: 32 },
    xAxis: { type: 'category', data: MONTH_LABELS },
    yAxis: { type: 'value', name: '\u0e15\u0e31\u0e19' },
    series: [
      {
        name: '\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e02\u0e49\u0e32\u0e27',
        type: 'bar',
        itemStyle: { color: '#1a7f37' },
        data: monthly.map((row) => Number(row.estimatedTons.toFixed(2))),
      },
    ],
  };
}

export default function RiceHarvestSituation() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cropYear, setCropYear] = useState(null);
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [districtCode, setDistrictCode] = useState(null);
  const [harvestMonth, setHarvestMonth] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    document.title =
      '\u0e2a\u0e16\u0e32\u0e19\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e01\u0e32\u0e23\u0e40\u0e1e\u0e32\u0e30\u0e1b\u0e25\u0e39\u0e01\u0e02\u0e49\u0e32\u0e27 | \u0e28\u0e39\u0e19\u0e22\u0e4c\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e40\u0e01\u0e29\u0e15\u0e23\u0e19\u0e04\u0e23\u0e1b\u0e10\u0e21';
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('rice_harvest_snapshots')
        .select(
          'snapshot_date,scraped_at,source_cutoff_date,crop_year,district_code,district,harvest_month,household_count,plot_count,area_rai,estimated_tons'
        )
        .order('snapshot_date', { ascending: false })
        .order('harvest_month', { ascending: true })
        .order('district_code', { ascending: true });
      if (!active) return;
      if (queryError) setError(queryError.message);
      else setRows(validRows(data));
      setLoading(false);
    }
    load().catch((loadError) => {
      if (!active) return;
      setError(loadError.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const cropYears = useMemo(
    () => uniqueSorted(rows.map((row) => row.crop_year)),
    [rows]
  );
  const activeCropYear = cropYear || cropYears[0] || null;
  const snapshotDates = useMemo(
    () =>
      uniqueSorted(
        rows
          .filter((row) => row.crop_year === activeCropYear)
          .map((row) => row.snapshot_date)
      ),
    [rows, activeCropYear]
  );
  const activeSnapshotDate = snapshotDate || snapshotDates[0] || null;
  const currentRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.crop_year === activeCropYear &&
          row.snapshot_date === activeSnapshotDate
      ),
    [rows, activeCropYear, activeSnapshotDate]
  );
  const previousSnapshotDate = snapshotDates.find(
    (date) => date < activeSnapshotDate
  );
  const previousRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.crop_year === activeCropYear &&
          row.snapshot_date === previousSnapshotDate
      ),
    [rows, activeCropYear, previousSnapshotDate]
  );
  const filteredRows = useMemo(
    () =>
      currentRows.filter(
        (row) =>
          (!districtCode || row.district_code === districtCode) &&
          (!harvestMonth || Number(row.harvest_month) === harvestMonth)
      ),
    [currentRows, districtCode, harvestMonth]
  );
  const filteredPreviousRows = useMemo(
    () =>
      previousRows.filter(
        (row) =>
          (!districtCode || row.district_code === districtCode) &&
          (!harvestMonth || Number(row.harvest_month) === harvestMonth)
      ),
    [previousRows, districtCode, harvestMonth]
  );
  const summary = useMemo(() => summarize(filteredRows), [filteredRows]);
  const previousSummary = useMemo(
    () => summarize(filteredPreviousRows),
    [filteredPreviousRows]
  );
  const deltaTons = summary.estimatedTons - previousSummary.estimatedTons;
  const latestMeta = currentRows[0];
  const districtOptions = useMemo(
    () =>
      [...new Map(currentRows.map((row) => [row.district_code, row.district]))]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'th')),
    [currentRows]
  );
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: formatHarvestMonth(index + 1, activeCropYear),
      })),
    [activeCropYear]
  );

  function exportCsv() {
    setExporting(true);
    try {
      const selectedDistrict = districtOptions.find(
        (option) => option.value === districtCode
      )?.label;
      const selectedMonth = monthOptions.find(
        (option) => option.value === harvestMonth
      )?.label;
      downloadCsv(
        `rice-harvest-${String(activeCropYear || 'report').replace('/', '-')}-${activeSnapshotDate || 'snapshot'}.csv`,
        [
          [COPY.title],
          [
            `${COPY.cropYear}: ${activeCropYear || '-'} | ${COPY.snapshot}: ${activeSnapshotDate || '-'}`,
          ],
          [
            `${COPY.district}: ${selectedDistrict || COPY.allDistricts} | ${COPY.month}: ${selectedMonth || COPY.allMonths}`,
          ],
          [
            `${COPY.totalArea}: ${formatDecimal(summary.areaRai)} | ${COPY.totalRice}: ${formatDecimal(summary.estimatedTons)}`,
          ],
          [],
          [
            COPY.district,
            COPY.month,
            '\u0e04\u0e23\u0e31\u0e27\u0e40\u0e23\u0e37\u0e2d\u0e19',
            '\u0e41\u0e1b\u0e25\u0e07',
            '\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e17\u0e35\u0e48 (\u0e44\u0e23\u0e48)',
            '\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e02\u0e49\u0e32\u0e27 (\u0e15\u0e31\u0e19)',
          ],
          ...summary.districtRows.map((row) => [
            row.district,
            row.monthLabel,
            row.householdCount,
            row.plotCount,
            row.areaRai,
            row.estimatedTons,
          ]),
        ]
      );
    } catch (exportError) {
      setError(exportError.message || COPY.readError);
    } finally {
      setExporting(false);
    }
  }
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={COPY.title}
        subtitle={COPY.subtitle}
        icon={BarChartOutlined}
      />

      {error && (
        <Alert
          type="error"
          showIcon
          message={COPY.readError}
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {!rows.length ? (
        <Card>
          <Empty description={COPY.empty} />
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <span>{COPY.cropYear}</span>
                <Select
                  value={activeCropYear}
                  onChange={(value) => {
                    setCropYear(value);
                    setSnapshotDate(null);
                    setDistrictCode(null);
                    setHarvestMonth(null);
                  }}
                  options={cropYears.map((value) => ({ value, label: value }))}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col xs={24} md={8}>
                <span>{COPY.snapshot}</span>
                <Select
                  value={activeSnapshotDate}
                  onChange={(value) => {
                    setSnapshotDate(value);
                    setDistrictCode(null);
                    setHarvestMonth(null);
                  }}
                  options={snapshotDates.map((value) => ({
                    value,
                    label: value,
                  }))}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Tag
                  icon={<DatabaseOutlined />}
                  color="green"
                  style={{ marginTop: 20 }}
                >
                  DOAE: {latestMeta?.source_cutoff_date || '-'} | {COPY.updated}
                  :{' '}
                  {latestMeta?.scraped_at
                    ? new Date(latestMeta.scraped_at).toLocaleString('th-TH')
                    : '-'}
                </Tag>
              </Col>
            </Row>
          </Card>

          <Card
            title={
              <span style={{ color: '#15803d' }}>
                <FilterOutlined style={{ marginRight: 8 }} />
                {COPY.filterTitle}
              </span>
            }
            extra={
              <Button
                icon={<DownloadOutlined />}
                loading={exporting}
                onClick={exportCsv}
                type="primary"
              >
                {COPY.exportCsv}
              </Button>
            }
            style={{ marginBottom: 16 }}
            styles={{
              header: { background: '#f0fdf4', borderBottomColor: '#bbf7d0' },
            }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <div
                  style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}
                >
                  {COPY.district}
                </div>
                <Select
                  allowClear
                  value={districtCode}
                  onChange={setDistrictCode}
                  options={districtOptions}
                  placeholder={COPY.allDistricts}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} md={12}>
                <div
                  style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}
                >
                  {COPY.month}
                </div>
                <Select
                  allowClear
                  value={harvestMonth}
                  onChange={setHarvestMonth}
                  options={monthOptions}
                  placeholder={COPY.allMonths}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title={COPY.totalArea}
                  value={summary.areaRai}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title={COPY.totalRice}
                  value={summary.estimatedTons}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title={
                    previousSnapshotDate
                      ? COPY.changedFrom(previousSnapshotDate)
                      : COPY.firstSnapshot
                  }
                  value={previousSnapshotDate ? deltaTons : 0}
                  precision={2}
                  styles={{
                    content: { color: deltaTons >= 0 ? '#1a7f37' : '#cf222e' },
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title={COPY.monthlyChart}>
                <EChart
                  option={chartOption(summary.monthly)}
                  style={{ height: 320 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <BarChartOutlined style={{ color: '#15803d' }} />
                    {COPY.districtTable(activeCropYear)}
                  </span>
                }
                extra={
                  <Tag color="green">
                    {summary.districtRows.length} {COPY.rows}
                  </Tag>
                }
                styles={{
                  header: {
                    background: '#f0fdf4',
                    borderBottomColor: '#bbf7d0',
                  },
                  body: { paddingTop: 16 },
                }}
              >
                <Table
                  columns={COLUMNS}
                  dataSource={summary.districtRows}
                  pagination={{ pageSize: 14, showSizeChanger: false }}
                  scroll={{ x: 780 }}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
