import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import {
  BarChartOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/widgets/SharedDashboardUI';
import EChart from '../../components/widgets/EChart';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import {
  filterTbkCultivationRows,
  summarizeTbkCultivationRows,
} from '../../utils/tbkCultivation';
import { downloadCsv } from '../../utils/csv';

const EMPTY_TEXT = 'ยังไม่มี snapshot ข้อมูลพื้นที่ตาม ทบก.';
const CHART_METRICS = {
  areaRai: { label: 'พื้นที่', unit: 'ไร่' },
  plotCount: { label: 'จำนวนแปลง', unit: 'แปลง' },
  householdCount: { label: 'ครัวเรือน', unit: 'ครัวเรือน' },
};

function formatInteger(value) {
  return Number(value || 0).toLocaleString('th-TH');
}

function formatDecimal(value) {
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeRows(rows) {
  return (rows || []).map((row) => ({
    key: row.id,
    dataYear: row.data_year,
    snapshotDate: row.snapshot_date,
    scrapedAt: row.scraped_at,
    groupCode: row.group_code,
    groupName: row.group_name,
    locationCode: row.location_code,
    locationName: row.location_name,
    itemBreed: row.item_breed,
    householdCount: Number(row.household_count) || 0,
    plotCount: Number(row.plot_count) || 0,
    areaRai: Number(row.area_rai) || 0,
    disasterHouseholdCount: Number(row.disaster_household_count) || 0,
    disasterPlotCount: Number(row.disaster_plot_count) || 0,
    disasterAreaRai: Number(row.disaster_area_rai) || 0,
    remainingAreaRai: Number(row.remaining_area_rai) || 0,
  }));
}

function aggregateChartItems(rows, labelKey, valueKey = 'areaRai', limit = 8) {
  const totals = new Map();
  rows.forEach((row) =>
    totals.set(row[labelKey], (totals.get(row[labelKey]) || 0) + row[valueKey])
  );
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function cultivationChartOption(items, metric) {
  const { unit } = CHART_METRICS[metric];
  return {
    aria: {
      enabled: true,
      description: 'กราฟ 10 ชนิดหรือพันธุ์ที่มีพื้นที่เพาะปลูกมากที่สุด',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `${formatDecimal(value)} ${unit}`,
    },
    grid: { left: 16, right: 96, top: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value) => formatInteger(value) },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map((item) => item.name),
      axisLabel: { width: 220, overflow: 'truncate' },
    },
    series: [
      {
        name: unit,
        type: 'bar',
        barMaxWidth: 30,
        data: items.map((item) => Number(item.value.toFixed(2))),
        label: {
          show: true,
          position: 'right',
          formatter: ({ value }) => formatDecimal(value),
        },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#15803d' },
              { offset: 1, color: '#4ade80' },
            ],
          },
        },
      },
    ],
  };
}

function pieChartOption(items) {
  return {
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) =>
        `${name}<br/>${formatDecimal(value)} ไร่ (${percent}%)`,
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 'middle',
      width: 90,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '64%'],
        center: ['30%', '50%'],
        data: items,
        label: { show: false },
      },
    ],
  };
}

function compactBarOption(items) {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `${formatDecimal(value)} ไร่`,
    },
    grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        hideOverlap: true,
        formatter: (value) =>
          Number(value).toLocaleString('th-TH', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }),
      },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map((item) => item.name),
      axisLabel: { width: 110, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: items.map((item) => Number(item.value.toFixed(2))),
        barMaxWidth: 18,
        label: { show: false },
        itemStyle: { color: '#0ea5e9' },
      },
    ],
  };
}

const COLUMNS = [
  {
    title: 'รหัส',
    dataIndex: 'locationCode',
    width: 90,
    fixed: 'left',
  },
  {
    title: 'จังหวัด/อำเภอ/ตำบล/หมู่',
    dataIndex: 'locationName',
    width: 180,
  },
  {
    title: 'กลุ่มข้อมูล',
    dataIndex: 'groupName',
    width: 190,
    render: (value) => <Tag color="green">{value}</Tag>,
  },
  {
    title: 'พืช/พันธุ์พืช',
    dataIndex: 'itemBreed',
    width: 320,
  },
  {
    title: 'ครัวเรือน',
    dataIndex: 'householdCount',
    align: 'right',
    width: 110,
    render: formatInteger,
  },
  {
    title: 'แปลง',
    dataIndex: 'plotCount',
    align: 'right',
    width: 100,
    render: formatInteger,
  },
  {
    title: 'เนื้อที่ (ไร่)',
    dataIndex: 'areaRai',
    align: 'right',
    width: 130,
    render: formatDecimal,
  },
  {
    title: 'ครัวเรือนประสบภัย',
    dataIndex: 'disasterHouseholdCount',
    align: 'right',
    width: 150,
    render: formatInteger,
  },
  {
    title: 'แปลงประสบภัย',
    dataIndex: 'disasterPlotCount',
    align: 'right',
    width: 130,
    render: formatInteger,
  },
  {
    title: 'เนื้อที่ประสบภัย (ไร่)',
    dataIndex: 'disasterAreaRai',
    align: 'right',
    width: 160,
    render: formatDecimal,
  },
  {
    title: 'เนื้อที่คงเหลือ (ไร่)',
    dataIndex: 'remainingAreaRai',
    align: 'right',
    width: 160,
    render: formatDecimal,
  },
];

export default function TbkCultivationArea() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [groupCode, setGroupCode] = useState('');
  const [locationName, setLocationName] = useState('');
  const [chartMetric, setChartMetric] = useState('areaRai');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: latest, error: latestError } = await supabase
        .from('tbk_cultivation_snapshots')
        .select('data_year,snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;
      if (!latest) {
        setMeta(null);
        setRows([]);
        return;
      }
      const { data, error: rowsError } = await supabase
        .from('tbk_cultivation_snapshots')
        .select('*')
        .eq('data_year', latest.data_year)
        .eq('snapshot_date', latest.snapshot_date)
        .order('group_code')
        .order('item_breed');
      if (rowsError) throw rowsError;
      const normalized = normalizeRows(data);
      setMeta({
        dataYear: latest.data_year,
        snapshotDate: latest.snapshot_date,
        scrapedAt: normalized[0]?.scrapedAt,
      });
      setRows(normalized);
    } catch (loadError) {
      setError(loadError.message || 'อ่านข้อมูลไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'พื้นที่เพาะปลูกตาม ทบก. | ศูนย์ข้อมูลการเกษตรนครปฐม';
    load();
  }, [load]);

  const groups = useMemo(
    () =>
      [...new Map(rows.map((row) => [row.groupCode, row.groupName]))]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    [rows]
  );
  const locations = useMemo(
    () =>
      [...new Set(rows.map((row) => row.locationName))]
        .sort((a, b) => a.localeCompare(b, 'th'))
        .map((value) => ({ value, label: value })),
    [rows]
  );
  const filteredRows = useMemo(
    () => filterTbkCultivationRows(rows, { groupCode, locationName, search }),
    [rows, groupCode, locationName, search]
  );
  const summary = useMemo(
    () => summarizeTbkCultivationRows(filteredRows),
    [filteredRows]
  );
  const chartItems = useMemo(
    () => aggregateChartItems(filteredRows, 'itemBreed', chartMetric, 10),
    [filteredRows, chartMetric]
  );
  const groupChartItems = useMemo(
    () => aggregateChartItems(filteredRows, 'groupName'),
    [filteredRows]
  );

  async function syncNow() {
    setSyncing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล');
      const response = await fetch('/.netlify/functions/sync-tbk-cultivation', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'อัปเดตข้อมูลไม่สำเร็จ');
      message.success(
        body.queued ? 'เริ่มอัปเดตข้อมูลแล้ว' : 'อัปเดตข้อมูลแล้ว'
      );
      if (!body.queued) await load();
    } catch (syncError) {
      message.error(syncError.message || 'อัปเดตข้อมูลไม่สำเร็จ');
    } finally {
      setSyncing(false);
    }
  }

  function exportCsv() {
    setExporting(true);
    try {
      downloadCsv(
        `tbk-cultivation-${meta?.dataYear || 'report'}-${meta?.snapshotDate || 'snapshot'}.csv`,
        [
          ['พื้นที่เพาะปลูกตาม ทบก. จังหวัดนครปฐม'],
          [
            `ปีการผลิต ${meta?.dataYear || '-'} | รอบข้อมูล ${meta?.snapshotDate || '-'}`,
          ],
          [
            `กลุ่มข้อมูล ${groups.find((group) => group.value === groupCode)?.label || 'ทั้งหมด'} | ค้นหา ${search || '-'}`,
          ],
          [
            `จำนวน ${formatInteger(summary.rowCount)} รายการ | พื้นที่ ${formatDecimal(summary.areaRai)} ไร่`,
          ],
          [],
          [
            'รหัส',
            'จังหวัด/อำเภอ/ตำบล/หมู่',
            'กลุ่มข้อมูล',
            'พืช/พันธุ์พืช',
            'ครัวเรือน',
            'แปลง',
            'เนื้อที่ (ไร่)',
            'ครัวเรือนประสบภัย',
            'แปลงประสบภัย',
            'เนื้อที่ประสบภัย (ไร่)',
            'เนื้อที่คงเหลือ (ไร่)',
          ],
          ...filteredRows.map((row) => [
            row.locationCode,
            row.locationName,
            row.groupName,
            row.itemBreed,
            row.householdCount,
            row.plotCount,
            row.areaRai,
            row.disasterHouseholdCount,
            row.disasterPlotCount,
            row.disasterAreaRai,
            row.remainingAreaRai,
          ]),
        ]
      );
    } catch (exportError) {
      message.error(exportError.message || 'ส่งออก CSV ไม่สำเร็จ');
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
        title="พื้นที่เพาะปลูกตาม ทบก."
        subtitle="ผลการขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกรตามที่ตั้งแปลง จังหวัดนครปฐม"
        icon={DatabaseOutlined}
      />

      {error && (
        <Alert
          type="error"
          showIcon
          title="อ่านข้อมูลไม่สำเร็จ"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {!rows.length ? (
        <Card>
          <Empty description={EMPTY_TEXT} />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {[
              ['รายการ', formatInteger(summary.rowCount)],
              ['แปลงตามรายการ', formatInteger(summary.plotCount)],
              ['เนื้อที่ (ไร่)', formatDecimal(summary.areaRai)],
              ['พื้นที่ประสบภัย (ไร่)', formatDecimal(summary.disasterAreaRai)],
              ['พื้นที่คงเหลือ (ไร่)', formatDecimal(summary.remainingAreaRai)],
            ].map(([title, value]) => (
              <Col xs={24} sm={12} xl={4} key={title} flex="1 1 180px">
                <Card variant="borderless" style={{ height: '100%' }}>
                  <Statistic
                    title={title}
                    value={value}
                    formatter={() => value}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          <Card
            style={{
              marginBottom: 16,
              borderColor: '#bbf7d0',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 70%)',
            }}
          >
            <Row gutter={[16, 16]} align="bottom">
              <Col xs={24} md={8}>
                <label htmlFor="tbk-group">กลุ่มข้อมูล</label>
                <Select
                  id="tbk-group"
                  aria-label="กลุ่มข้อมูล"
                  value={groupCode || undefined}
                  allowClear
                  placeholder="ทุกกลุ่มข้อมูล"
                  options={groups}
                  onChange={(value) => setGroupCode(value || '')}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col xs={24} md={6}>
                <label htmlFor="tbk-district">อำเภอ</label>
                <Select
                  id="tbk-district"
                  aria-label="อำเภอ"
                  allowClear
                  placeholder="ทุกอำเภอ"
                  options={locations}
                  value={locationName || undefined}
                  onChange={(value) => setLocationName(value || '')}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col xs={24} md={10}>
                <label htmlFor="tbk-search">ค้นหาชนิดหรือพันธุ์</label>
                <Input
                  id="tbk-search"
                  aria-label="ค้นหาชนิดหรือพันธุ์"
                  allowClear
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="เช่น ข้าวเจ้า กข41 ไก่ไข่"
                  style={{ marginTop: 4 }}
                />
              </Col>
              <Col xs={24} md={24}>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    icon={<DownloadOutlined />}
                    loading={exporting}
                    onClick={exportCsv}
                  >
                    ส่งออก CSV
                  </Button>
                  {isAdmin() && (
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={syncing} />}
                      loading={syncing}
                      onClick={syncNow}
                    >
                      อัปเดตข้อมูล
                    </Button>
                  )}
                </div>
              </Col>
            </Row>
            <div style={{ marginTop: 12, color: '#57606a' }}>
              ปีการผลิต {meta?.dataYear} · รอบข้อมูล {meta?.snapshotDate} ·
              อัปเดต{' '}
              {meta?.scrapedAt
                ? new Date(meta.scrapedAt).toLocaleString('th-TH')
                : '-'}
            </div>
          </Card>

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
                10 ชนิด/พันธุ์ที่มี{CHART_METRICS[chartMetric].label}สูงสุด
              </span>
            }
            extra={
              <Tag color="green">หน่วย: {CHART_METRICS[chartMetric].unit}</Tag>
            }
            style={{ marginBottom: 16 }}
            styles={{
              header: {
                background: 'linear-gradient(90deg, #f0fdf4, #ffffff)',
                borderBottomColor: '#bbf7d0',
              },
            }}
          >
            {chartItems.length ? (
              <>
                <Select
                  aria-label="ตัวชี้วัดกราฟ"
                  value={chartMetric}
                  onChange={setChartMetric}
                  options={[
                    ...Object.entries(CHART_METRICS).map(([value, metric]) => ({
                      value,
                      label: `${metric.label} (${metric.unit})`,
                    })),
                  ]}
                  style={{ width: 180, marginBottom: 8 }}
                />
                <EChart
                  option={cultivationChartOption(chartItems, chartMetric)}
                  style={{ height: 250 }}
                />
              </>
            ) : (
              <Empty description="ไม่พบข้อมูลสำหรับสร้างกราฟ" />
            )}
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={8}>
              <Card title="สัดส่วนพื้นที่ตามกลุ่ม" size="small">
                <EChart
                  option={pieChartOption(groupChartItems)}
                  style={{ height: 240 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="จัดอันดับพื้นที่ตามกลุ่ม" size="small">
                <EChart
                  option={compactBarOption(groupChartItems)}
                  style={{ height: 240 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="ภาพรวมภัยเทียบพื้นที่คงเหลือ" size="small">
                <EChart
                  option={{
                    tooltip: { trigger: 'item' },
                    series: [
                      {
                        type: 'pie',
                        radius: ['46%', '72%'],
                        data: [
                          { name: 'คงเหลือ', value: summary.remainingAreaRai },
                          { name: 'ประสบภัย', value: summary.disasterAreaRai },
                        ],
                        label: { formatter: '{b}\n{d}%' },
                      },
                    ],
                  }}
                  style={{ height: 240 }}
                />
              </Card>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            title={`กำลังแสดง ${formatInteger(summary.rowCount)} จาก ${formatInteger(rows.length)} รายการ`}
            description={`ผลรวมครัวเรือนตามรายการ: ${formatInteger(summary.householdCount)} ครัวเรือน (ครัวเรือนเดียวอาจขึ้นทะเบียนหลายชนิดหรือหลายพันธุ์)`}
            style={{ marginBottom: 16 }}
          />

          <Card title="รายละเอียดตามชนิดและพันธุ์">
            <Table
              rowKey="key"
              columns={COLUMNS}
              dataSource={filteredRows}
              scroll={{ x: 1650 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100, 200],
                showTotal: (total) => `ทั้งหมด ${formatInteger(total)} รายการ`,
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
