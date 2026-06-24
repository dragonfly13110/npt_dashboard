import React, { useState, useMemo, useEffect } from 'react';
import { Select, Spin, Row, Col, Card, Tag, Result, Button } from 'antd';
import EChart from '../components/widgets/EChart';
import {
  areaOption,
  barOption,
  pieOption,
  radarOption,
  treemapOption,
} from '../components/charts/echartOptions';
import {
  useDashboardData,
  PIE_COLORS,
  groupConfig,
  DISTRICT_LIST,
} from '../hooks/useDashboardData';
import {
  ArrowLeftOutlined,
  FilterOutlined,
  DashboardOutlined,
  PrinterOutlined,
  ReloadOutlined,
  BugOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './InteractiveDashboard.css';

// ── Shared Chart Constants ─────────────────────────────────────
const CARD = {
  borderRadius: 16,
  boxShadow: '0 4px 20px -8px rgba(0,0,0,0.06)',
  border: '1px solid #f1f5f9',
  overflow: 'hidden',
};
const HEAD = {
  borderBottom: '1px solid #f1f5f9',
  padding: '16px 20px',
  fontSize: 15,
  fontWeight: 700,
};
const CHART_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];
const TREEMAP_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#6366f1',
];

const MetricCard = React.memo(function MetricCard({
  title,
  value,
  unit,
  color,
  icon,
  link,
  isWarning,
}) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (link) navigate(link);
  };
  return (
    <div
      className={`metric-card ${link ? 'clickable-metric-card' : ''} ${isWarning ? 'warning-metric-card' : ''}`}
      style={{
        borderTop: `3px solid ${color}`,
        cursor: link ? 'pointer' : 'default',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div className="metric-title">{title}</div>
          <div className="metric-value-container">
            <span className="metric-value">
              {Number(value).toLocaleString()}
            </span>
            <span className="metric-unit">{unit}</span>
          </div>
        </div>
        <span className="metric-icon" role="img" aria-label={title}>
          {icon}
        </span>
      </div>
      <div className="metric-bg-circle" style={{ background: color }} />
    </div>
  );
});

const ChartCard = React.memo(function ChartCard({ title, children }) {
  return (
    <Card
      bordered={false}
      style={CARD}
      styles={{ header: HEAD, body: { padding: '12px 16px 16px' } }}
      title={title}
    >
      {children}
    </Card>
  );
});

const PieLegend = React.memo(function PieLegend({ data, colors }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 14px',
        justifyContent: 'center',
        padding: '4px 8px',
      }}
    >
      {data.map((entry, i) => (
        <div
          key={entry.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: '#475569',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: colors[i % colors.length],
              flexShrink: 0,
            }}
          />
          {entry.name}
        </div>
      ))}
    </div>
  );
});

// ── Main Component ──────────────────────────────────────────
export default function InteractiveDashboard() {
  const navigate = useNavigate();
  const {
    loading,
    error,
    refetch,
    stats,
    districtStats,
    instituteStats,
    lpStats,
    agriStats,
    smartFarmers,
    enterprises,
    tourism,
    ceDistrictStats,
    agriPie,
    lpPie,
  } = useDashboardData();
  const [selectedDistrict, setSelectedDistrict] = useState('ทั้งหมด');
  const [latestForecast, setLatestForecast] = useState(null);

  useEffect(() => {
    document.title = 'Interactive Dashboard | ศูนย์ข้อมูลการเกษตรนครปฐม';

    const fetchLatestForecast = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_disease_forecasts')
          .select('*')
          .order('forecast_date', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
          setLatestForecast(data[0]);
        }
      } catch (err) {
        console.error(
          'Error fetching latest forecast for dashboard:',
          err.message
        );
      }
    };

    fetchLatestForecast();
  }, []);

  const districts = ['ทั้งหมด', ...DISTRICT_LIST];

  // ── Metric cards data ──────────────────────────────────
  const metrics = useMemo(() => {
    const getGlobalStat = (table) =>
      stats?.find((s) => s.table === table)?.count || 0;
    const warningCount =
      latestForecast?.details?.filter((d) => d.risk_level === 'สูง').length ||
      0;
    const totalDiseases = latestForecast?.details?.length || 0;

    const aiWarningCard = {
      title: 'เฝ้าระวังโรค/แมลง (AI)',
      value: totalDiseases,
      unit: 'ชนิด',
      color: warningCount > 0 ? '#ef4444' : '#ea580c',
      icon: '🐛',
      link: '/public/disease-forecast',
      isWarning: warningCount > 0,
    };

    if (selectedDistrict === 'ทั้งหมด') {
      return [
        {
          title: 'ครัวเรือนเกษตรกร',
          value: agriStats.households || 0,
          unit: 'ครัวเรือน',
          color: '#1a7f37',
          icon: '👨‍🌾',
        },
        {
          title: 'พื้นที่เพาะปลูก',
          value: agriStats.crop_area || 0,
          unit: 'ไร่',
          color: '#2563eb',
          icon: '🌱',
        },
        {
          title: 'วิสาหกิจชุมชน',
          value: enterprises.count || 0,
          unit: 'แห่ง',
          color: '#9333ea',
          icon: '🤝',
        },
        {
          title: 'แปลงใหญ่',
          value: lpStats.total || 0,
          unit: 'แปลง',
          color: '#ea580c',
          icon: '🌾',
        },
        {
          title: 'ศูนย์เรียนรู้ (ศพก.)',
          value: getGlobalStat('learning_centers'),
          unit: 'แห่ง',
          color: '#0891b2',
          icon: '📚',
        },
        {
          title: 'จุดเฝ้าระวัง',
          value: getGlobalStat('soil_fertilizer_centers'),
          unit: 'แห่ง',
          color: '#d946ef',
          icon: '🛡️',
        },
        aiWarningCard,
      ];
    }
    const s = districtStats[selectedDistrict] || {};
    return [
      {
        title: 'ครัวเรือนเกษตรกร',
        value: s.house || 0,
        unit: 'ครัวเรือน',
        color: '#1a7f37',
        icon: '👨‍🌾',
      },
      {
        title: 'พื้นที่เพาะปลูก',
        value: s.area || 0,
        unit: 'ไร่',
        color: '#2563eb',
        icon: '🌱',
      },
      {
        title: 'วิสาหกิจชุมชน',
        value: s.ce || 0,
        unit: 'แห่ง',
        color: '#9333ea',
        icon: '🤝',
      },
      {
        title: 'แปลงใหญ่',
        value: s.lp || 0,
        unit: 'แปลง',
        color: '#ea580c',
        icon: '🌾',
      },
      {
        title: 'ศูนย์เรียนรู้ (ศพก.)',
        value: s.lc || 0,
        unit: 'แห่ง',
        color: '#0891b2',
        icon: '📚',
      },
      {
        title: 'จุดเฝ้าระวัง',
        value: s.sfc || 0,
        unit: 'แห่ง',
        color: '#d946ef',
        icon: '🛡️',
      },
      aiWarningCard,
    ];
  }, [
    selectedDistrict,
    districtStats,
    agriStats,
    enterprises,
    lpStats,
    stats,
    latestForecast,
  ]);

  // ── Update Agri Pie to respect filters ────────────────
  const displayAgriPie = useMemo(() => {
    if (selectedDistrict === 'ทั้งหมด') return agriPie;
    const s = districtStats[selectedDistrict] || {};
    return [
      { name: 'ข้าวนาปี', value: s.ricePi || 0 },
      { name: 'ข้าวนาปรัง', value: s.ricePrung || 0 },
      { name: 'พืชไร่', value: s.field || 0 },
      { name: 'ไม้ผล', value: s.fruit || 0 },
      { name: 'พืชผัก', value: s.veg || 0 },
      { name: 'ไม้ดอก', value: s.flow || 0 },
      { name: 'สมุนไพร', value: s.herb || 0 },
    ].filter((d) => d.value > 0);
  }, [selectedDistrict, agriPie, districtStats]);

  // ── District bar charts ────────────────────────────────
  const districtGroupBar = useMemo(
    () =>
      DISTRICT_LIST.map((d) => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        วิสาหกิจ: districtStats[d]?.ce || 0,
        แปลงใหญ่: districtStats[d]?.lp || 0,
        'ศพก.': districtStats[d]?.lc || 0,
        'ศจช.': districtStats[d]?.pc || 0,
        'ศดปช.': districtStats[d]?.sfc || 0,
      })),
    [districtStats]
  );

  const riceBar = useMemo(
    () =>
      DISTRICT_LIST.map((d) => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        ข้าวนาปี: districtStats[d]?.ricePi || 0,
        ข้าวนาปรัง: districtStats[d]?.ricePrung || 0,
      })),
    [districtStats]
  );

  const cropDistrictBar = useMemo(
    () =>
      DISTRICT_LIST.map((d) => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        พืชไร่: districtStats[d]?.field || 0,
        ไม้ผล: districtStats[d]?.fruit || 0,
        พืชผัก: districtStats[d]?.veg || 0,
        ไม้ดอก: districtStats[d]?.flow || 0,
        สมุนไพร: districtStats[d]?.herb || 0,
      })),
    [districtStats]
  );

  // ── Farmer institute breakdown ────────────────────────
  const instituteBar = useMemo(
    () =>
      [
        { name: 'กลุ่มแม่บ้าน', value: instituteStats.housewives || 0 },
        { name: 'เกษตรกรรุ่นใหม่', value: instituteStats.young_grp || 0 },
        { name: 'ส่งเสริมอาชีพ', value: instituteStats.career || 0 },
        { name: 'อสม.', value: instituteStats.village || 0 },
        { name: 'วิสาหกิจ', value: instituteStats.ce || 0 },
      ].filter((d) => d.value > 0),
    [instituteStats]
  );

  // ── Radar chart per district (normalized) ─────────────
  const radarData = useMemo(() => {
    if (selectedDistrict === 'ทั้งหมด') return [];
    const s = districtStats[selectedDistrict] || {};

    const maxVals = DISTRICT_LIST.reduce(
      (acc, d) => {
        const dist = districtStats[d] || {};
        return {
          house: Math.max(acc.house, dist.house || 0),
          ce: Math.max(acc.ce, dist.ce || 0),
          lp: Math.max(acc.lp, dist.lp || 0),
          lc: Math.max(acc.lc, dist.lc || 0),
          pc: Math.max(acc.pc, dist.pc || 0),
          area: Math.max(acc.area, dist.area || 0),
        };
      },
      { house: 1, ce: 1, lp: 1, lc: 1, pc: 1, area: 1 }
    );

    return [
      {
        subject: 'ครัวเรือน',
        pct: ((s.house || 0) / maxVals.house) * 100,
        actual: s.house || 0,
        unit: 'ครัวเรือน',
      },
      {
        subject: 'วิสาหกิจ',
        pct: ((s.ce || 0) / maxVals.ce) * 100,
        actual: s.ce || 0,
        unit: 'แห่ง',
      },
      {
        subject: 'แปลงใหญ่',
        pct: ((s.lp || 0) / maxVals.lp) * 100,
        actual: s.lp || 0,
        unit: 'แปลง',
      },
      {
        subject: 'ศพก.',
        pct: ((s.lc || 0) / maxVals.lc) * 100,
        actual: s.lc || 0,
        unit: 'แห่ง',
      },
      {
        subject: 'ศจช.',
        pct: ((s.pc || 0) / maxVals.pc) * 100,
        actual: s.pc || 0,
        unit: 'แห่ง',
      },
      {
        subject: 'พื้นที่เพาะปลูก',
        pct: ((s.area || 0) / maxVals.area) * 100,
        actual: s.area || 0,
        unit: 'ไร่',
      },
    ];
  }, [selectedDistrict, districtStats]);

  // ── District households area chart ──────────────────
  const householdsArea = useMemo(
    () =>
      DISTRICT_LIST.map((d) => ({
        name: d.replace('นครปฐม', 'นฐ.'),
        ครัวเรือน: districtStats[d]?.house || 0,
        พื้นที่: districtStats[d]?.area || 0,
      })),
    [districtStats]
  );

  // ── CE district distribution ────────────────────────
  const ceDistBar = useMemo(
    () =>
      Object.entries(ceDistrictStats || {})
        .map(([name, value]) => ({
          name: name.replace('นครปฐม', 'นฐ.'),
          จำนวน: value,
        }))
        .sort((a, b) => b.จำนวน - a.จำนวน),
    [ceDistrictStats]
  );

  // ── Treemap data ──────────────────────────────────
  const treemapData = useMemo(() => {
    if (!stats || !stats.length) return [];
    return groupConfig
      .map((g) => ({
        name: g.group,
        children: g.tables
          .map((t) => {
            const found = stats.find((s) => s.table === t.table);
            return { name: t.label, size: found?.count || 0 };
          })
          .filter((c) => c.size > 0),
      }))
      .filter((g) => g.children.length > 0);
  }, [stats]);

  const flatTreemap = useMemo(
    () =>
      treemapData.flatMap((g) =>
        g.children.map((c) => ({
          name: `${c.name}`,
          size: c.size,
          group: g.name,
        }))
      ),
    [treemapData]
  );

  // ── Helpers ────────────────────────────────────────────
  const isTargetDistrict = (name) =>
    selectedDistrict === 'ทั้งหมด' ||
    name === selectedDistrict.replace('นครปฐม', 'นฐ.');

  // Add dynamic keys to force remount/re-animate on filter change
  const animationKey = `anim-${selectedDistrict}`;

  if (loading) {
    return (
      <div className="dashboard-state-container">
        <Spin size="large" />
        <span className="state-text">
          กำลังโหลดข้อมูล Interactive Dashboard...
        </span>
      </div>
    );
  }

  if (error || !stats || stats.length === 0) {
    return (
      <div className="dashboard-state-container">
        <Result
          status="warning"
          title="ไม่สามารถโหลดข้อมูลได้"
          subTitle="อาจเกิดปัญหาการเชื่อมต่อกับฐานข้อมูล กรุณาลองใหม่อีกครั้ง"
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={refetch}>
              โหลดข้อมูลใหม่
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* ═══ Top Bar ═══ */}
      <div className="dashboard-topbar">
        <div className="topbar-left">
          <button
            onClick={() => navigate('/')}
            className="dashboard-back-btn"
            aria-label="กลับหน้าหลัก"
          >
            <ArrowLeftOutlined /> กลับหน้าหลัก
          </button>
          <div>
            <h1 className="dashboard-title">
              <DashboardOutlined /> Interactive Dashboard
            </h1>
            <p className="dashboard-subtitle">
              ภาพรวมข้อมูลการเกษตรจังหวัดนครปฐม — กรองตามอำเภอได้
            </p>
          </div>
        </div>
        <div className="topbar-right">
          <div className="filter-container">
            <FilterOutlined style={{ color: '#6ee7b7', fontSize: 16 }} />
            <span className="filter-label">อำเภอ:</span>
            <Select
              value={selectedDistrict}
              onChange={setSelectedDistrict}
              style={{ width: 200 }}
              options={districts.map((d) => ({ label: d, value: d }))}
              size="middle"
              aria-label="เลือกอำเภอ"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="dashboard-export-btn"
            aria-label="พิมพ์รายงาน"
          >
            <PrinterOutlined /> พิมพ์
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* ═══ Row 1: Metric Cards ═══ */}
        <div className="metrics-row" style={{ marginBottom: 24 }}>
          {metrics.map((m) => (
            <div className="metric-col" key={`${m.title}-${animationKey}`}>
              <MetricCard {...m} />
            </div>
          ))}
        </div>

        {/* ═══ Row 2: District Groups + Crop Pie ═══ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={15}>
            <ChartCard title="📊 เปรียบเทียบรายอำเภอ — กลุ่มเกษตรกร & โครงสร้างพื้นฐาน">
              <div style={{ height: 300 }} key={animationKey}>
                <EChart
                  option={barOption(
                    districtGroupBar.map((item) => {
                      const [, ce, lp, lc, pc, sfc] = Object.values(item);
                      return { name: item.name, ce, lp, lc, pc, sfc };
                    }),
                    [
                      {
                        key: 'ce',
                        name: 'วิสาหกิจ',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#10b981' : '#e2e8f0',
                      },
                      {
                        key: 'lp',
                        name: 'แปลงใหญ่',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#3b82f6' : '#e2e8f0',
                      },
                      {
                        key: 'lc',
                        name: 'ศพก.',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#f59e0b' : '#e2e8f0',
                      },
                      {
                        key: 'pc',
                        name: 'ศจช.',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#8b5cf6' : '#e2e8f0',
                      },
                      {
                        key: 'sfc',
                        name: 'ศดปช.',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#f43f5e' : '#e2e8f0',
                      },
                    ],
                    { colors: CHART_COLORS, unit: 'แห่ง', rotate: 25 }
                  )}
                />
              </div>
            </ChartCard>
          </Col>
          <Col xs={24} lg={9}>
            <ChartCard
              title={`🌾 สัดส่วนพื้นที่เพาะปลูก (${selectedDistrict === 'ทั้งหมด' ? 'ทั้งจังหวัด' : selectedDistrict})`}
            >
              <div style={{ height: 240 }} key={animationKey}>
                <EChart
                  option={pieOption(displayAgriPie, {
                    colors: PIE_COLORS,
                    unit: 'ไร่',
                  })}
                />
              </div>
              <PieLegend data={displayAgriPie} colors={PIE_COLORS} />
            </ChartCard>
          </Col>
        </Row>

        {/* ═══ Row 3: Rice + Crop breakdown ═══ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <ChartCard title="🍚 ผลผลิตข้าว — นาปี vs นาปรัง รายอำเภอ">
              <div style={{ height: 280 }} key={animationKey}>
                <EChart
                  option={barOption(
                    riceBar.map((item) => {
                      const [, inSeason, offSeason] = Object.values(item);
                      return { name: item.name, inSeason, offSeason };
                    }),
                    [
                      {
                        key: 'inSeason',
                        name: 'ข้าวนาปี',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#16a34a' : '#e2e8f0',
                      },
                      {
                        key: 'offSeason',
                        name: 'ข้าวนาปรัง',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#86efac' : '#f1f5f9',
                      },
                    ],
                    { stacked: true, unit: 'ไร่', rotate: 25 }
                  )}
                />
              </div>
            </ChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <ChartCard title="🌿 พืชอื่นๆ รายอำเภอ">
              <div style={{ height: 280 }} key={animationKey}>
                <EChart
                  option={barOption(
                    cropDistrictBar.map((item) => {
                      const [, field, fruit, veg, flower, herb] =
                        Object.values(item);
                      return {
                        name: item.name,
                        field,
                        fruit,
                        veg,
                        flower,
                        herb,
                      };
                    }),
                    [
                      {
                        key: 'field',
                        name: 'พืชไร่',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#f59e0b' : '#e2e8f0',
                      },
                      {
                        key: 'fruit',
                        name: 'ไม้ผล',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#ef4444' : '#e2e8f0',
                      },
                      {
                        key: 'veg',
                        name: 'พืชผัก',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#22c55e' : '#e2e8f0',
                      },
                      {
                        key: 'flower',
                        name: 'ไม้ดอก',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#ec4899' : '#e2e8f0',
                      },
                      {
                        key: 'herb',
                        name: 'สมุนไพร',
                        color: (item) =>
                          isTargetDistrict(item.name) ? '#14b8a6' : '#e2e8f0',
                      },
                    ],
                    { stacked: true, unit: 'ไร่', rotate: 25 }
                  )}
                />
              </div>
            </ChartCard>
          </Col>
        </Row>

        {/* ═══ Row 4: LP Pie + Institute Bar + CE Dist ═══ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <ChartCard title="🌾 แปลงใหญ่ — ประเภทสินค้า">
              <div style={{ height: 220 }} key={animationKey}>
                <EChart
                  option={pieOption(lpPie, {
                    colors: CHART_COLORS,
                    unit: 'แปลง',
                  })}
                />
              </div>
              <PieLegend data={lpPie} colors={CHART_COLORS} />
              <div className="chart-footer-note">
                สมาชิกรวม {(lpStats.members || 0).toLocaleString()} ราย ·
                พื้นที่ {(lpStats.area || 0).toLocaleString()} ไร่
              </div>
            </ChartCard>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <ChartCard title="👥 สถาบันเกษตรกร — ประเภทกลุ่ม">
              <div style={{ height: 260 }} key={animationKey}>
                <EChart
                  option={barOption(
                    instituteBar,
                    [
                      {
                        key: 'value',
                        name: 'จำนวน',
                        color: (item, index) =>
                          CHART_COLORS[index % CHART_COLORS.length],
                      },
                    ],
                    { layout: 'vertical', unit: 'กลุ่ม', grid: { left: 84 } }
                  )}
                />
              </div>
              <div className="chart-footer-note">
                รวม {(instituteStats.total || 0).toLocaleString()} กลุ่ม · SF{' '}
                {(instituteStats.sf || 0).toLocaleString()} คน · YSF{' '}
                {(instituteStats.ysf || 0).toLocaleString()} คน
              </div>
            </ChartCard>
          </Col>
          <Col xs={24} lg={8}>
            <ChartCard title="🤝 วิสาหกิจชุมชน — แยกตามอำเภอ">
              <div style={{ height: 280 }} key={animationKey}>
                <EChart
                  option={barOption(
                    ceDistBar.map((item) => {
                      const [, value] = Object.values(item);
                      return { name: item.name, value };
                    }),
                    [
                      {
                        key: 'value',
                        name: 'จำนวน',
                        color: (item, index) =>
                          isTargetDistrict(item.name)
                            ? PIE_COLORS[index % PIE_COLORS.length]
                            : '#e2e8f0',
                      },
                    ],
                    { layout: 'vertical', unit: 'แห่ง', grid: { left: 78 } }
                  )}
                />
              </div>
            </ChartCard>
          </Col>
        </Row>

        {/* ═══ Row 5: Area Chart + Radar (district) / Treemap ═══ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={selectedDistrict !== 'ทั้งหมด' ? 14 : 24}>
            <ChartCard title="📈 ครัวเรือนเกษตรกร & พื้นที่เพาะปลูก รายอำเภอ">
              <div style={{ height: 280 }} key={animationKey}>
                <EChart
                  option={areaOption(
                    householdsArea.map((item) => {
                      const [, households, area] = Object.values(item);
                      return { name: item.name, households, area };
                    }),
                    [
                      {
                        key: 'households',
                        name: 'ครัวเรือน',
                        color: '#10b981',
                      },
                      { key: 'area', name: 'พื้นที่', color: '#3b82f6' },
                    ],
                    { unit: '', rotate: 25 }
                  )}
                />
              </div>
            </ChartCard>
          </Col>
          {selectedDistrict !== 'ทั้งหมด' && (
            <Col xs={24} lg={10}>
              <ChartCard title={`🎯 Radar — ${selectedDistrict}`}>
                <div style={{ height: 280 }} key={animationKey}>
                  <EChart
                    option={radarOption(radarData, {
                      name: selectedDistrict,
                      labelKey: 'subject',
                      valueKey: 'pct',
                      max: 100,
                      color: '#10b981',
                    })}
                  />
                </div>
              </ChartCard>
            </Col>
          )}
        </Row>

        {/* ═══ Row 6: Data Treemap + Summary Table ═══ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={14}>
            <ChartCard title="🗂️ ภาพรวมข้อมูลในระบบ — Treemap ตามกลุ่มงาน">
              <div style={{ height: 280 }} key={animationKey}>
                <EChart
                  option={treemapOption(flatTreemap, {
                    colors: TREEMAP_COLORS,
                    valueKey: 'size',
                    unit: 'รายการ',
                  })}
                />
              </div>
            </ChartCard>
          </Col>
          <Col xs={24} lg={10}>
            <ChartCard title="📋 สรุปจำนวนข้อมูลทั้งหมดในระบบ">
              <div className="summary-table-container">
                {groupConfig.map((g) => (
                  <div key={g.group} style={{ marginBottom: 16 }}>
                    <div
                      className="summary-group-title"
                      style={{ color: g.color }}
                    >
                      <span>{g.icon}</span> {g.group}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {g.tables.map((t) => {
                        const found = stats?.find((s) => s.table === t.table);
                        return (
                          <Tag key={t.table} className="summary-tag">
                            {t.label}:{' '}
                            <strong>
                              {(found?.count || 0).toLocaleString()}
                            </strong>
                          </Tag>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </Col>
        </Row>

        {/* Footer note */}
        <div className="dashboard-footer">
          ข้อมูลจากระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม ·
          อัปเดตตามข้อมูลจริงในระบบ
        </div>
      </div>
    </div>
  );
}
