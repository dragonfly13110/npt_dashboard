import { useState, useEffect, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  Divider,
  Card,
  Statistic,
  Progress,
  Button,
  Tag,
  message,
} from 'antd';
import { SyncOutlined, ArrowUpOutlined, AimOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';
import EChart from '../../components/widgets/EChart';
import { useAuth } from '../../contexts/AuthContext';

const columns = [
  {
    title: 'อำเภอ',
    dataIndex: 'district',
    key: 'district',
    width: 110,
    fixed: 'left',
  },
  {
    title: 'ปีข้อมูล',
    dataIndex: 'data_year',
    key: 'data_year',
    width: 80,
    align: 'center',
  },
  {
    title: 'เป้าหมาย (ครัวเรือน)',
    dataIndex: 'target',
    key: 'target',
    width: 110,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'ปรับปรุงรวม (ครัวเรือน)',
    dataIndex: 'total_updated_households',
    key: 'total_updated_households',
    width: 130,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'คงเหลือสะสม',
    key: 'remaining_target',
    width: 110,
    align: 'right',
    render: (_, record) => {
      const target = record.target;
      const updated = record.total_updated_households || 0;
      if (target === null || target === undefined || target === 0) return '-';
      const remaining = target - updated;
      const color = remaining < 0 ? '#cf222e' : '#57606a';
      return (
        <span style={{ color, fontWeight: remaining < 0 ? 600 : 400 }}>
          {remaining.toLocaleString()}
        </span>
      );
    },
  },
  {
    title: 'ยกเลิก (ครัวเรือน)',
    dataIndex: 'cancelled_households',
    key: 'cancelled_households',
    width: 110,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'รวมครัวเรือน',
    dataIndex: 'net_total_households',
    key: 'net_total_households',
    width: 120,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'พื้นที่ปรับปรุงรวม (ไร่)',
    dataIndex: 'total_updated_area_rai',
    key: 'total_updated_area_rai',
    width: 130,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  { title: 'พืชหลัก', dataIndex: 'main_crop', key: 'main_crop', width: 120 },
  {
    title: 'วันที่ตัดยอดข้อมูล',
    dataIndex: 'cutoff_date',
    key: 'cutoff_date',
    width: 120,
    align: 'center',
    render: (v) =>
      v
        ? new Date(v).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '-',
  },
  {
    title: 'วันที่อัปเดตระบบ',
    dataIndex: 'updated_at',
    key: 'updated_at',
    width: 150,
    align: 'center',
    render: (v) => (v ? new Date(v).toLocaleString('th-TH') : '-'),
  },
];

const formFields = (
  <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
    <Divider orientation="left" style={{ marginTop: 0 }}>
      ข้อมูลทั่วไป
    </Divider>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
          <Select
            placeholder="เลือกอำเภอ"
            options={[
              'จังหวัดนครปฐม',
              'เมืองนครปฐม',
              'นครชัยศรี',
              'สามพราน',
              'ดอนตูม',
              'บางเลน',
              'กำแพงแสน',
              'พุทธมณฑล',
            ].map((d) => ({ label: d, value: d }))}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="data_year"
          label="ปีข้อมูล"
          rules={[{ required: true }]}
        >
          <InputNumber style={{ width: '100%' }} placeholder="2569" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="main_crop" label="พืชหลัก">
          <Input placeholder="ข้าว, มะพร้าว" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="cutoff_date" label="วันที่ตัดยอดข้อมูล">
          <Input type="date" style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Divider orientation="left">เป้าหมาย & ครัวเรือนเดิม</Divider>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="target" label="เป้าหมาย (ครัวเรือน)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="household_count" label="ครัวเรือนเดิม">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Divider orientation="left">ปรับปรุงช่องทาง ทบก.</Divider>
    <Row gutter={12}>
      <Col span={8}>
        <Form.Item name="update_tbk_households" label="ครัวเรือน">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="update_tbk_plots" label="แปลง">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="update_tbk_area_rai" label="เนื้อที่ (ไร่)">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Divider orientation="left">ปรับปรุงช่องทาง Farmbook</Divider>
    <Row gutter={12}>
      <Col span={8}>
        <Form.Item name="update_farmbook_households" label="ครัวเรือน">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="update_farmbook_plots" label="แปลง">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="update_farmbook_area_rai" label="เนื้อที่ (ไร่)">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Divider orientation="left">ปรับปรุงช่องทาง e-Form</Divider>
    <Row gutter={12}>
      <Col span={8}>
        <Form.Item name="update_eform_households" label="ครัวเรือน">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="update_eform_plots" label="แปลง">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="update_eform_area_rai" label="เนื้อที่ (ไร่)">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Divider orientation="left">สรุปยอดสะสม & ยกเลิก</Divider>
    <Row gutter={12}>
      <Col span={8}>
        <Form.Item
          name="total_updated_households"
          label="ปรับปรุงสะสม (ครัวเรือน)"
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="total_updated_plots" label="ปรับปรุงสะสม (แปลง)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="total_updated_area_rai" label="ปรับปรุงสะสม (ไร่)">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="cancelled_households" label="ยกเลิก (ครัวเรือน)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="net_total_households" label="รวมครัวเรือน">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>
  </div>
);

const districts = [
  'จังหวัดนครปฐม',
  'เมืองนครปฐม',
  'นครชัยศรี',
  'สามพราน',
  'ดอนตูม',
  'บางเลน',
  'กำแพงแสน',
  'พุทธมณฑล',
];

const filterConfig = [{ key: 'district', label: 'อำเภอ', options: districts }];

function registrySparkOption(data) {
  return {
    grid: { top: 4, right: 2, bottom: 0, left: 2 },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.district),
      show: false,
    },
    yAxis: { type: 'value', show: false },
    tooltip: {
      show: true,
      trigger: 'axis',
      confine: false,
      position: 'top',
    },
    series: [
      {
        type: 'bar',
        data: data.map((item) => item.total_updated_households || 0),
        barWidth: 8,
        itemStyle: { color: '#10b981', borderRadius: [2, 2, 0, 0] },
      },
    ],
  };
}

function registryOverviewOption(data) {
  return {
    color: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#64748b'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { color: '#475569', fontSize: 12 },
    },
    grid: { top: 18, right: 18, bottom: 48, left: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.district),
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        name: 'เป้าหมาย (ครัวเรือน)',
        data: data.map((item) => item.target || 0),
        itemStyle: { color: '#4f46e5', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 18,
      },
      {
        type: 'bar',
        name: 'ระบบ TBK',
        stack: 'actual',
        data: data.map((item) => item.update_tbk_households || 0),
        itemStyle: { color: '#0ea5e9' },
        barMaxWidth: 18,
      },
      {
        type: 'bar',
        name: 'App Farmbook',
        stack: 'actual',
        data: data.map((item) => item.update_farmbook_households || 0),
        itemStyle: { color: '#10b981' },
        barMaxWidth: 18,
      },
      {
        type: 'bar',
        name: 'e-Form',
        stack: 'actual',
        data: data.map((item) => item.update_eform_households || 0),
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 18,
      },
      {
        type: 'line',
        name: 'แนวโน้มปริมาณปรับปรุง',
        data: data.map((item) => item.total_updated_households || 0),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#64748b', width: 2, type: 'dashed' },
      },
    ],
  };
}

function registryTrendOption(trendData, targetVal) {
  const dates = trendData.map((d) => {
    return new Date(d.date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  });

  const updatedValues = trendData.map(
    (d) => d.provinceUpdated || d.updated || 0
  );
  const finalTarget = targetVal || 34000;
  const targetValues = trendData.map(() => finalTarget);

  return {
    color: ['#10b981', '#6366f1'],
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const dateStr = params[0].name;
        let res = `<div style="font-weight: 700; margin-bottom: 4px;">รอบข้อมูล: ${dateStr}</div>`;
        params.forEach((p) => {
          const marker = p.marker;
          const val = p.value.toLocaleString();
          res += `<div style="display: flex; justify-content: space-between; gap: 20px;">
            <span>${marker} ${p.seriesName}:</span>
            <span style="font-weight: 600;">${val} ครัวเรือน</span>
          </div>`;
        });
        const updated = params[0].value;
        const pct = Math.round((updated / finalTarget) * 100);
        res += `<div style="margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px; font-weight: 700; color: #10b981;">
          ความคืบหน้า: ${pct}%
        </div>`;
        return res;
      },
    },
    legend: {
      data: ['ปรับปรุงสะสม (ครัวเรือน)', 'เป้าหมาย (ครัวเรือน)'],
      bottom: 0,
      textStyle: { color: '#475569', fontSize: 12 },
    },
    grid: { top: 30, right: 24, bottom: 48, left: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: Math.ceil(finalTarget * 1.15),
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        name: 'ปรับปรุงสะสม (ครัวเรือน)',
        type: 'line',
        data: updatedValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' },
            ],
          },
        },
      },
      {
        name: 'เป้าหมาย (ครัวเรือน)',
        type: 'line',
        data: targetValues,
        step: false,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed', color: '#6366f1' },
      },
    ],
  };
}

export default function FarmerRegistry() {
  const { isAdmin } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [stats, setStats] = useState({
    target: null,
    updated: 0,
    remaining: null,
    percent: 0,
  });
  const [latestDates, setLatestDates] = useState({
    cutoff: null,
    updated: null,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadStats = useCallback(async () => {
    const { data: yearData } = await supabase
      .from('farmer_registry')
      .select('data_year')
      .order('data_year', { ascending: false })
      .limit(1);

    const activeYear = yearData?.[0]?.data_year || 2568;

    const { data } = await supabase
      .from('farmer_registry')
      .select('*')
      .eq('data_year', activeYear)
      .order('district');

    if (data) {
      const provinceRow = data.find(
        (d) => d.district === 'จังหวัดนครปฐม' || d.district === 'นครปฐม'
      ) || { target: null, total_updated_households: 0 };
      const districtsData = data.filter(
        (d) => d.district !== 'จังหวัดนครปฐม' && d.district !== 'นครปฐม'
      );
      const districtTargets = districtsData
        .map((d) => d.target)
        .filter((v) => typeof v === 'number' && v > 0);

      const provinceTarget =
        typeof provinceRow.target === 'number' && provinceRow.target > 0
          ? provinceRow.target
          : null;
      const target =
        provinceTarget ??
        (districtTargets.length
          ? districtTargets.reduce((sum, value) => sum + value, 0)
          : null);
      const updated = provinceRow.total_updated_households || 0;
      const remaining = target === null ? null : target - updated;
      const percent = target > 0 ? Math.round((updated / target) * 100) : 0;

      setStats({ target, updated, remaining, percent });

      // Find latest cutoff_date and updated_at
      let latestCutoff = null;
      let latestUpdated = null;
      data.forEach((r) => {
        if (r.cutoff_date && (!latestCutoff || r.cutoff_date > latestCutoff)) {
          latestCutoff = r.cutoff_date;
        }
        if (r.updated_at && (!latestUpdated || r.updated_at > latestUpdated)) {
          latestUpdated = r.updated_at;
        }
      });
      setLatestDates({ cutoff: latestCutoff, updated: latestUpdated });

      setChartData(districtsData);

      // Fetch snapshots for trend data
      const { data: snapshotRows } = await supabase
        .from('farmer_registry_snapshots')
        .select(
          'snapshot_date, cutoff_date, district, total_updated_households, target, data_year'
        )
        .eq('data_year', activeYear)
        .order('snapshot_date', { ascending: true });

      if (snapshotRows) {
        const snapshotMap = {};
        snapshotRows.forEach((r) => {
          const date = r.snapshot_date;
          if (!snapshotMap[date]) {
            snapshotMap[date] = {
              date: date,
              cutoff: r.cutoff_date,
              updated: 0,
              target: 0,
            };
          }
          if (r.district !== 'จังหวัดนครปฐม' && r.district !== 'นครปฐม') {
            snapshotMap[date].updated += r.total_updated_households || 0;
            snapshotMap[date].target += r.target || 0;
          } else {
            if (r.target) {
              snapshotMap[date].provinceTarget = r.target;
            }
            if (r.total_updated_households) {
              snapshotMap[date].provinceUpdated = r.total_updated_households;
            }
          }
        });
        const aggregatedSnaps = Object.values(snapshotMap).sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        setTrendData(aggregatedSnaps);
      }
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('กรุณาเข้าสู่ระบบก่อนอัปเดทข้อมูล');
      }

      const response = await fetch('/.netlify/functions/sync-farmer-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'อัปเดทข้อมูลไม่สำเร็จ');
      }

      message.success(
        body.skipped ? 'ข้อมูลล่าสุดอยู่แล้ว' : 'อัปเดทข้อมูลทะเบียนเกษตรกรแล้ว'
      );
      handleRefresh();
    } catch (err) {
      message.error(err.message || 'อัปเดทข้อมูลไม่สำเร็จ');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        backgroundColor: '#f8fafc',
        backgroundImage: `
                radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.04) 0%, transparent 40%),
                radial-gradient(circle at 85% 20%, rgba(13, 148, 136, 0.04) 0%, transparent 40%),
                radial-gradient(circle at 50% 80%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)
            `,
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 30px rgba(0,0,0,0.01)',
      }}
    >
      {/* Header Area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #0f172a 0%, #166534 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            รายงานทะเบียนเกษตรกรจังหวัดนครปฐม
          </h2>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              marginTop: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}
            >
              วิเคราะห์เปรียบเทียบเป้าหมายการปรับปรุงและปริมาณงานสะสม
            </span>
            {latestDates.cutoff && (
              <Tag
                style={{
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  margin: 0,
                  background: 'rgba(240, 253, 244, 0.94)',
                  color: '#15803d',
                  padding: '4px 12px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                📅 ข้อมูล ณ วันที่:{' '}
                {new Date(latestDates.cutoff).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Tag>
            )}
            {latestDates.updated && (
              <Tag
                style={{
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  margin: 0,
                  background: 'rgba(240, 249, 255, 0.94)',
                  color: '#0369a1',
                  padding: '4px 12px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                🔄 อัปเดตระบบเมื่อ:{' '}
                {new Date(latestDates.updated).toLocaleString('th-TH')}
              </Tag>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAdmin() && (
            <Button
              type="primary"
              icon={<SyncOutlined spin={syncing} />}
              loading={syncing}
              onClick={handleManualSync}
              style={{
                borderRadius: '10px',
                fontWeight: 700,
                background: '#15803d',
              }}
            >
              อัปเดทจาก DOAE
            </Button>
          )}
          <Button
            type="text"
            icon={<SyncOutlined />}
            onClick={handleRefresh}
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            รีเฟรชบอร์ด
          </Button>
        </div>
      </div>

      {/* Top Stats Cards Section */}
      <Row gutter={[20, 20]}>
        {/* Card 1: Target */}
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              background:
                'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              padding: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                >
                  เป้าหมายการปรับปรุง (ครัวเรือน)
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#4f46e5',
                    margin: '4px 0',
                  }}
                >
                  {stats.target === null ? '-' : stats.target.toLocaleString()}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                  จำนวนครัวเรือนเป้าหมายของจังหวัด
                </div>
              </div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#e0f2fe',
                  borderRadius: '14px',
                  border: '1px solid #bae6fd',
                }}
              >
                <AimOutlined style={{ fontSize: '24px', color: '#0ea5e9' }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 2: Actual Updated */}
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              background:
                'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              padding: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                >
                  ปรับปรุงข้อมูลสำเร็จแล้ว{' '}
                  <Tag
                    color="green"
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      marginLeft: '4px',
                    }}
                  >
                    <ArrowUpOutlined /> {stats.percent}%
                  </Tag>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#10b981',
                    margin: '4px 0',
                  }}
                >
                  {stats.updated.toLocaleString()}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                  ปรับปรุงสะสมผ่าน 3 ช่องทางหลัก
                </div>
              </div>
              <div style={{ width: '110px', height: '55px' }}>
                <EChart
                  option={registrySparkOption(chartData)}
                  style={{ minHeight: 0, overflow: 'visible' }}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 3: Remaining / Outstanding */}
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              background:
                'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              padding: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                >
                  คงเหลือครัวเรือนค้างปรับปรุง
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color:
                      stats.remaining !== null && stats.remaining < 0
                        ? '#ef4444'
                        : '#475569',
                    margin: '4px 0',
                  }}
                >
                  {stats.remaining === null
                    ? '-'
                    : stats.remaining.toLocaleString()}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                  {stats.remaining === null
                    ? 'ยังไม่มีข้อมูลเป้าหมายจากต้นทาง'
                    : stats.remaining < 0
                      ? 'ดำเนินการปรับปรุงได้เกินเป้าหมาย'
                      : 'คงค้างที่ยังไม่ได้รับการปรับปรุงข้อมูล'}
                </div>
              </div>
              <div
                style={{
                  width: '110px',
                  height: '55px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Progress
                  type="circle"
                  percent={stats.percent}
                  size={50}
                  strokeColor={
                    stats.remaining !== null && stats.remaining < 0
                      ? '#ef4444'
                      : '#8b5cf6'
                  }
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[20, 20]}>
        {/* District Overview Chart (12 columns) */}
        <Col xs={24} lg={12}>
          {chartData.length > 0 ? (
            <Card
              title={
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    background:
                      'linear-gradient(135deg, #1e3a8a 0%, #6366f1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Overview — เป้าหมายและจำนวนครัวเรือนเกษตรกรแยกตามอำเภอ
                </div>
              }
              style={{
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                background:
                  'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div style={{ width: '100%', height: '280px' }}>
                <EChart option={registryOverviewOption(chartData)} />
              </div>
            </Card>
          ) : (
            <Card
              style={{
                borderRadius: '24px',
                border: 'none',
                boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '340px',
              }}
            >
              <span style={{ color: '#94a3b8' }}>
                ยังไม่มีข้อมูลเปรียบเทียบ
              </span>
            </Card>
          )}
        </Col>

        {/* Right: Trend & Progress Chart (12 columns) */}
        <Col xs={24} lg={12}>
          {trendData.length > 0 ? (
            <Card
              title={
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    background:
                      'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Trend & Progress — แนวโน้มความคืบหน้าการปรับปรุงข้อมูลสะสม
                </div>
              }
              style={{
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                background:
                  'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
                boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div style={{ width: '100%', height: '280px' }}>
                <EChart option={registryTrendOption(trendData, stats.target)} />
              </div>
            </Card>
          ) : (
            <Card
              style={{
                borderRadius: '24px',
                border: 'none',
                boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '340px',
              }}
            >
              <span style={{ color: '#94a3b8' }}>
                ยังไม่มีข้อมูลประวัติความคืบหน้า
              </span>
            </Card>
          )}
        </Col>
      </Row>

      {/* Main CRUD Table */}
      <Card
        style={{
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          background:
            'linear-gradient(155deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 247, 255, 0.95) 48%, rgba(255, 255, 255, 0.9) 100%)',
          boxShadow: '0 15px 35px -15px rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <CrudTable
          tableName="farmer_registry"
          title="ตารางรายละเอียดรายอำเภอ"
          columns={columns}
          formFields={formFields}
          searchField="district"
          filterConfig={filterConfig}
          scrollX={1300}
          requiredColumns={[
            'district',
            'data_year',
            'target',
            'total_updated_households',
            'remaining_target',
          ]}
          defaultColumns={[
            'cancelled_households',
            'net_total_households',
            'total_updated_area_rai',
            'cutoff_date',
            'updated_at',
          ]}
          extraActions={
            <div style={{ display: 'flex', gap: '8px' }}>
              {isAdmin() && (
                <Button
                  icon={<SyncOutlined spin={syncing} />}
                  loading={syncing}
                  onClick={handleManualSync}
                  className="export-btn"
                >
                  อัปเดทจาก DOAE
                </Button>
              )}
              <Button
                icon={<SyncOutlined />}
                onClick={handleRefresh}
                className="export-btn"
              >
                รีเฟรชตาราง
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
