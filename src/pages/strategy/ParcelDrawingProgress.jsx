import { useMemo, useState } from 'react';
import { Button, Card, Col, message, Row, Spin, Table, Tag } from 'antd';
import {
  AimOutlined,
  EnvironmentOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import {
  PageHeader,
  CategoryChartCard,
} from '../../components/widgets/SharedDashboardUI';
import EChart from '../../components/widgets/EChart';
import { barOption } from '../../components/charts/echartOptions';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';

const formatNumber = (value, digits = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('th-TH', { maximumFractionDigits: digits });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function progressColor(percent) {
  if (percent >= 90) return 'green';
  if (percent >= 80) return 'lime';
  if (percent >= 65) return 'gold';
  if (percent >= 50) return 'orange';
  return 'red';
}

export default function ParcelDrawingProgress() {
  const { isAdmin } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const fetchRows = async () => {
    const { data, error } = await supabase
      .from('geoplots_parcel_progress')
      .select('*')
      .order('district_code');
    if (error) throw error;
    return data || [];
  };

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useApiCache('geoplots-parcel-progress', fetchRows);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนอัปเดทข้อมูล');

      const response = await fetch(
        '/.netlify/functions/sync-geoplots-progress',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'อัปเดทข้อมูลไม่สำเร็จ');

      message.success(`อัปเดทข้อมูล GEOPLOTS แล้ว ${body.rows || 0} อำเภอ`);
      await refetch();
    } catch (err) {
      message.error(err.message || 'อัปเดทข้อมูลไม่สำเร็จ');
    } finally {
      setSyncing(false);
    }
  };

  const summary = useMemo(() => {
    const chartRows = rows.map((row) => ({
      key: row.district_code,
      name: row.district,
      target: Number(row.target_plots) || 0,
      drawn: Number(row.drawn_plots) || 0,
      remainingTarget: Number(row.remaining_target_plots) || 0,
      remaining68: Number(row.remaining_list_68) || 0,
      remaining67: Number(row.remaining_list_67) || 0,
      progress: Number(row.progress_percent) || 0,
      snapshotDate: row.snapshot_date,
      scrapedAt: row.scraped_at,
      updatedAt: row.updated_at,
    }));
    const target = chartRows.reduce((sum, row) => sum + row.target, 0);
    const drawn = chartRows.reduce((sum, row) => sum + row.drawn, 0);
    const remainingTarget = chartRows.reduce(
      (sum, row) => sum + row.remainingTarget,
      0
    );
    const weakest = [...chartRows].sort((a, b) => a.progress - b.progress)[0];
    const latestScrapedAt = chartRows
      .map((row) => row.scrapedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const latestUpdatedAt = chartRows
      .map((row) => row.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const latestSnapshotDate = chartRows
      .map((row) => row.snapshotDate)
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      rows: chartRows,
      target,
      drawn,
      remainingTarget,
      percent: target > 0 ? (drawn / target) * 100 : 0,
      weakest,
      latestScrapedAt,
      latestUpdatedAt,
      latestSnapshotDate,
    };
  }, [rows]);

  const columns = [
    {
      title: 'อำเภอ',
      dataIndex: 'name',
      fixed: 'left',
      width: 140,
    },
    {
      title: 'ความคืบหน้า',
      dataIndex: 'progress',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.progress - b.progress,
      render: (value) => (
        <Tag color={progressColor(value)} style={{ margin: 0 }}>
          {formatNumber(value, 1)}%
        </Tag>
      ),
    },
    {
      title: 'เป้าหมาย',
      dataIndex: 'target',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: 'วาดแล้ว',
      dataIndex: 'drawn',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: 'คงเหลือเป้า',
      dataIndex: 'remainingTarget',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: 'รายชื่อคงเหลือ 68',
      dataIndex: 'remaining68',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: 'รายชื่อคงเหลือ 67',
      dataIndex: 'remaining67',
      align: 'right',
      render: (value) => formatNumber(value),
    },
  ];

  return (
    <div>
      <PageHeader
        title="ติดตามการวาดแปลง"
        subtitle="ความก้าวหน้า GEOPLOTS รอบตัวชี้วัด 2/69 แยกรายอำเภอ จังหวัดนครปฐม"
        icon={EnvironmentOutlined}
      />
      {isAdmin() && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 16,
          }}
        >
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleManualSync}
          >
            อัปเดทจาก GEOPLOTS
          </Button>
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            height: 360,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" tip="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {[
              {
                label: 'ความคืบหน้ารวม',
                value: `${formatNumber(summary.percent, 1)}%`,
                note: `${formatNumber(summary.drawn)} / ${formatNumber(summary.target)} แปลง`,
              },
              {
                label: 'เป้าหมาย',
                value: formatNumber(summary.target),
                note: 'แปลง รอบ 2/69',
              },
              {
                label: 'วาดแล้ว',
                value: formatNumber(summary.drawn),
                note: 'แปลงจาก GEOPLOTS',
              },
              {
                label: 'คงเหลือเป้า',
                value: formatNumber(summary.remainingTarget),
                note: 'แปลงที่ยังต้องเร่ง',
              },
              {
                label: 'อำเภอต่ำสุด',
                value: summary.weakest?.name || '-',
                note: summary.weakest
                  ? `${formatNumber(summary.weakest.progress, 1)}%`
                  : '-',
              },
              {
                label: 'วันที่ข้อมูล',
                value: formatDate(summary.latestSnapshotDate),
                note: `เก็บข้อมูล ${formatDateTime(summary.latestScrapedAt)}`,
                compact: true,
              },
              {
                label: 'อัปเดตระบบล่าสุด',
                value: formatDateTime(summary.latestUpdatedAt),
                note: 'sync ทุก 3 วัน หรือกดอัปเดทเอง',
                compact: true,
              },
            ].map((item) => (
              <Col xs={24} sm={12} lg={8} xl={3} key={item.label}>
                <Card
                  size="small"
                  style={{ borderRadius: 8, height: '100%' }}
                  bodyStyle={{ padding: 14 }}
                >
                  <div
                    style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: '#0f172a',
                      fontSize: item.compact ? 17 : 22,
                      fontWeight: 800,
                      marginTop: 4,
                      lineHeight: 1.25,
                    }}
                  >
                    {item.value}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    {item.note}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={14}>
              <CategoryChartCard title="เป้าหมายเทียบวาดแล้วรายอำเภอ">
                <EChart
                  option={barOption(
                    summary.rows,
                    [
                      { key: 'target', name: 'เป้าหมาย' },
                      { key: 'drawn', name: 'วาดแล้ว' },
                      { key: 'remainingTarget', name: 'คงเหลือเป้า' },
                    ],
                    { unit: 'แปลง', compact: true }
                  )}
                />
              </CategoryChartCard>
            </Col>
            <Col xs={24} lg={10}>
              <CategoryChartCard title="ร้อยละความคืบหน้า">
                <EChart
                  option={barOption(
                    [...summary.rows].sort((a, b) => b.progress - a.progress),
                    [
                      {
                        key: 'progress',
                        name: 'วาดแล้ว',
                        color: (row) =>
                          row.progress >= 90
                            ? '#16a34a'
                            : row.progress >= 65
                              ? '#f59e0b'
                              : '#ef4444',
                      },
                    ],
                    { unit: '%', digits: 1, compact: true, layout: 'vertical' }
                  )}
                />
              </CategoryChartCard>
            </Col>
            <Col xs={24}>
              <Card
                title={
                  <span>
                    <AimOutlined /> รายละเอียดรายอำเภอ
                  </span>
                }
                style={{ borderRadius: 8 }}
              >
                <Table
                  rowKey="key"
                  columns={columns}
                  dataSource={summary.rows}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 900 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
