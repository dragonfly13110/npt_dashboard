import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  GlobalOutlined,
  ReloadOutlined,
  UserOutlined,
  AimOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from '../../components/widgets/EChart';
import { barOption, pieOption } from '../../components/charts/echartOptions';

const { RangePicker } = DatePicker;

const PERIOD_OPTIONS = [
  { label: '7 วันล่าสุด', value: '7' },
  { label: '30 วันล่าสุด', value: '30' },
  { label: '90 วันล่าสุด', value: '90' },
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'กำหนดเอง', value: 'custom' },
];

const COLORS = [
  '#1677ff',
  '#13c2c2',
  '#52c41a',
  '#faad14',
  '#fa8c16',
  '#9254de',
  '#ff7875',
  '#64748b',
];

const formatDateTime = (value) =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : '-';

const safeText = (value, fallback = '-') => value || fallback;

const countBy = (rows, getKey) => {
  const counts = new Map();
  rows.forEach((row) => {
    const key = getKey(row) || 'ไม่ระบุ';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const parseDevice = (userAgent = '') => {
  if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
  if (/mobile|android|iphone/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
};

const parseBrowser = (userAgent = '') => {
  if (/Line/i.test(userAgent)) return 'LINE';
  if (/FBAN|FBAV|Facebook/i.test(userAgent)) return 'Facebook';
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Chrome|CriOS/i.test(userAgent)) return 'Chrome';
  if (/Safari/i.test(userAgent)) return 'Safari';
  if (/Firefox|FxiOS/i.test(userAgent)) return 'Firefox';
  return 'อื่นๆ';
};

const buildDailyData = (rows) => {
  const counts = new Map();
  rows.forEach((row) => {
    const key = row.occurred_at
      ? dayjs(row.occurred_at).format('YYYY-MM-DD')
      : 'ไม่ระบุ';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name: dayjs(name).format('DD/MM'), value }));
};

export default function VisitorAnalytics() {
  const [period, setPeriod] = useState('30');
  const [customRange, setCustomRange] = useState(null);
  const [pathFilter, setPathFilter] = useState(null);

  const dateWindow = useMemo(() => {
    if (period === 'all') return {};
    if (period === 'custom' && customRange?.[0] && customRange?.[1]) {
      return {
        from: customRange[0].startOf('day').toISOString(),
        to: customRange[1].endOf('day').toISOString(),
      };
    }
    const days = Number(period);
    if (!Number.isFinite(days)) return {};
    return {
      from: dayjs()
        .subtract(days - 1, 'day')
        .startOf('day')
        .toISOString(),
      to: dayjs().endOf('day').toISOString(),
    };
  }, [customRange, period]);

  const fetchVisitorEvents = async () => {
    let query = supabase
      .from('visitor_events')
      .select('*', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .limit(2000);

    if (dateWindow.from) query = query.gte('occurred_at', dateWindow.from);
    if (dateWindow.to) query = query.lte('occurred_at', dateWindow.to);
    if (pathFilter) query = query.eq('path', pathFilter);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], total: count || 0 };
  };

  const queryKey = [
    'admin-visitor-events',
    period,
    dateWindow.from,
    dateWindow.to,
    pathFilter,
  ];
  const {
    data: result = { rows: [], total: 0 },
    isLoading,
    isError,
    error,
    refetch,
  } = useApiCache(queryKey, fetchVisitorEvents, { staleMinutes: 2 });

  const rows = result.rows;
  const pathOptions = useMemo(
    () =>
      countBy(rows, (row) => row.path)
        .map((item) => ({ label: item.name, value: item.name }))
        .filter((item) => item.value !== 'ไม่ระบุ'),
    [rows]
  );

  const summary = useMemo(() => {
    const uniqueVisitors = new Set(
      rows.map((row) => row.ip_hash || row.ip_prefix).filter(Boolean)
    ).size;
    const uniqueIpPrefixes = new Set(
      rows.map((row) => row.ip_prefix).filter(Boolean)
    ).size;
    const latest = rows[0]?.occurred_at;
    const thaiVisits = rows.filter((row) => row.country_code === 'TH').length;
    return {
      total: result.total,
      uniqueVisitors,
      uniqueIpPrefixes,
      latest,
      thaiVisits,
    };
  }, [result.total, rows]);

  const dailyData = useMemo(() => buildDailyData(rows), [rows]);
  const pathData = useMemo(
    () => countBy(rows, (row) => row.path).slice(0, 8),
    [rows]
  );
  const locationData = useMemo(
    () =>
      countBy(rows, (row) =>
        [row.city, row.region, row.country_name].filter(Boolean).join(', ')
      ).slice(0, 8),
    [rows]
  );
  const deviceData = useMemo(
    () => countBy(rows, (row) => parseDevice(row.user_agent)),
    [rows]
  );
  const browserData = useMemo(
    () => countBy(rows, (row) => parseBrowser(row.user_agent)).slice(0, 8),
    [rows]
  );

  const columns = [
    {
      title: 'เวลาเข้าเว็บ',
      dataIndex: 'occurred_at',
      width: 170,
      render: formatDateTime,
    },
    {
      title: 'หน้า',
      dataIndex: 'path',
      width: 220,
      render: (value) => <Tag color="blue">{safeText(value)}</Tag>,
    },
    {
      title: 'พื้นที่',
      key: 'location',
      width: 220,
      render: (_, row) =>
        safeText(
          [row.city, row.region, row.country_name].filter(Boolean).join(', ')
        ),
    },
    {
      title: 'IP prefix',
      dataIndex: 'ip_prefix',
      width: 180,
      render: (value) => <code>{safeText(value)}</code>,
    },
    {
      title: 'ที่มา',
      dataIndex: 'referrer',
      width: 260,
      ellipsis: true,
      render: safeText,
    },
    {
      title: 'อุปกรณ์',
      key: 'device',
      width: 110,
      render: (_, row) => parseDevice(row.user_agent),
    },
    {
      title: 'Browser',
      key: 'browser',
      width: 120,
      render: (_, row) => parseBrowser(row.user_agent),
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          marginBottom: 16,
        }}
      >
        <Space wrap size={12}>
          <Select
            value={period}
            onChange={(value) => {
              setPeriod(value);
              if (value !== 'custom') setCustomRange(null);
            }}
            options={PERIOD_OPTIONS}
            style={{ width: 150 }}
          />
          {period === 'custom' && (
            <RangePicker
              value={customRange}
              onChange={setCustomRange}
              format="DD/MM/YYYY"
            />
          )}
          <Select
            allowClear
            showSearch
            placeholder="กรองหน้า"
            value={pathFilter}
            onChange={setPathFilter}
            options={pathOptions}
            style={{ width: 220 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            รีเฟรช
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="จำนวนเข้าชม"
              value={summary.total}
              prefix={<GlobalOutlined style={{ color: '#1677ff' }} />}
              suffix="ครั้ง"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="ผู้เข้าชมไม่ซ้ำ"
              value={summary.uniqueVisitors}
              prefix={<UserOutlined style={{ color: '#13c2c2' }} />}
              suffix="คน/IP"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="IP prefix ไม่ซ้ำ"
              value={summary.uniqueIpPrefixes}
              prefix={<AimOutlined style={{ color: '#52c41a' }} />}
              suffix="ชุด"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="ล่าสุด"
              value={
                summary.latest
                  ? dayjs(summary.latest).format('DD/MM HH:mm')
                  : '-'
              }
              prefix={<LinkOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      {isError ? (
        <Card>
          <Empty
            description={
              error?.message || 'อ่านข้อมูล visitor_events ไม่สำเร็จ'
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card
                title="จำนวนเข้าชมรายวัน"
                bordered={false}
                style={{ borderRadius: 12 }}
              >
                <div style={{ height: 320 }}>
                  <EChart
                    option={barOption(
                      dailyData,
                      [{ key: 'value', name: 'เข้าชม', color: '#1677ff' }],
                      { unit: 'ครั้ง', compact: true }
                    )}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title="หน้าที่มีคนเข้าเยอะ"
                bordered={false}
                style={{ borderRadius: 12 }}
              >
                <div style={{ height: 320 }}>
                  <EChart
                    option={barOption(
                      pathData,
                      [{ key: 'value', name: 'เข้าชม', color: '#13c2c2' }],
                      {
                        layout: 'vertical',
                        unit: 'ครั้ง',
                        grid: { left: 150 },
                        compact: true,
                      }
                    )}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title="พื้นที่ผู้เข้าชม"
                bordered={false}
                style={{ borderRadius: 12 }}
              >
                <div style={{ height: 320 }}>
                  <EChart
                    option={barOption(
                      locationData,
                      [{ key: 'value', name: 'เข้าชม', color: '#52c41a' }],
                      {
                        layout: 'vertical',
                        unit: 'ครั้ง',
                        grid: { left: 160 },
                        compact: true,
                      }
                    )}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title="อุปกรณ์ / Browser"
                bordered={false}
                style={{ borderRadius: 12 }}
              >
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <div style={{ height: 300 }}>
                      <EChart
                        option={pieOption(deviceData, {
                          colors: COLORS,
                          unit: 'ครั้ง',
                          legend: true,
                        })}
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ height: 300 }}>
                      <EChart
                        option={pieOption(browserData, {
                          colors: COLORS.slice(2),
                          unit: 'ครั้ง',
                          legend: true,
                        })}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Space>
                <Typography.Text strong>รายการเข้าชมล่าสุด</Typography.Text>
                <Tag>{rows.length.toLocaleString()} รายการที่โหลด</Tag>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <Table
              rowKey="id"
              loading={isLoading}
              dataSource={rows}
              columns={columns}
              size="small"
              scroll={{ x: 1280 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
            />
            <Typography.Text type="secondary">
              แสดง IP แบบ prefix และนับผู้เข้าชมจาก hash เพื่อไม่เปิด raw IP.
            </Typography.Text>
          </Card>
        </>
      )}
    </div>
  );
}
