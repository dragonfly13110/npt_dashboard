import React, { useState, useMemo, useEffect } from 'react';
import { Select, Spin, Row, Col, Card, Result, Button } from 'antd';
import EChart from '../components/widgets/EChart';
import LandingMap from '../components/widgets/LandingMap';
import { barOption, pieOption } from '../components/charts/echartOptions';
import {
  useInteractiveOverviewData,
  PIE_COLORS,
  DISTRICT_LIST,
} from '../hooks/useDashboardData';
import {
  ArrowLeftOutlined,
  FilterOutlined,
  DashboardOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import StrategyDashboard from './strategy/StrategyDashboard';
import ProductionDashboard from './production/ProductionDashboard';
import DevelopmentDashboard from './development/DevelopmentDashboard';
import ProtectionDashboard, {
  ProtectionNetworkSummary,
} from './protection/ProtectionDashboard';
import { ExtrasSection } from './interactiveDashboard/ExtrasSection';
import { ModuleSection } from './interactiveDashboard/ModuleSection';
import {
  useInteractiveFilters,
  useInteractiveYears,
} from './interactiveDashboard/useInteractiveFilters';
import { LATEST_YEAR } from './interactiveDashboard/filters';
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
const MODULES = [
  ['overview', 'ภาพรวม'],
  ['land', 'พื้นที่'],
  ['production', 'ผลผลิต'],
  ['groups', 'กลุ่ม'],
  ['networks', 'ศูนย์/เครือข่าย'],
  ['risk', 'ความเสี่ยง'],
  ['extras', 'ข้อมูลเพิ่มเติม'],
];

const scrollToModule = (id) => {
  const module = document.getElementById(id);
  if (!module) return;
  const details =
    module.tagName === 'DETAILS' ? module : module.querySelector('details');
  if (details) details.open = true;
  module.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
    block: 'start',
  });
};

const MetricCard = React.memo(function MetricCard({
  title,
  value,
  unit,
  color,
  icon,
  target,
  isWarning,
  onNavigate,
}) {
  return (
    <button
      type="button"
      className={`metric-card clickable-metric-card ${isWarning ? 'warning-metric-card' : ''}`}
      style={{
        borderTop: `3px solid ${color}`,
      }}
      onClick={() => {
        onNavigate?.(target);
        scrollToModule(target);
      }}
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
              {value == null
                ? 'ไม่พร้อมใช้งาน'
                : Number(value).toLocaleString()}
            </span>
            <span className="metric-unit">{unit}</span>
          </div>
        </div>
        <span className="metric-icon" role="img" aria-label={title}>
          {icon}
        </span>
      </div>
      <div className="metric-bg-circle" style={{ background: color }} />
    </button>
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
    lpStats,
    agriStats,
    enterprises,
    tourism,
    agriPie,
    mapData,
    sharedRows,
  } = useInteractiveOverviewData();
  const {
    district: selectedDistrict,
    districts,
    setDistrict: setSelectedDistrict,
    year,
    setYear,
  } = useInteractiveFilters();
  const { years } = useInteractiveYears();
  const [forecastState, setForecastState] = useState({
    status: 'loading',
    details: null,
  });
  const [activeModule, setActiveModule] = useState('overview');
  const filters = useMemo(
    () => ({ district: selectedDistrict, year }),
    [selectedDistrict, year]
  );
  const generatedAt = useMemo(() => new Date().toLocaleString('th-TH'), []);
  const visibleMapData = useMemo(
    () =>
      selectedDistrict === 'ทั้งหมด'
        ? mapData
        : mapData.filter((point) => point.district === selectedDistrict),
    [selectedDistrict, mapData]
  );
  const overviewUnavailable = loading || !!error || !stats?.length;

  useEffect(() => {
    document.title = 'Interactive Dashboard | ศูนย์ข้อมูลการเกษตรนครปฐม';
    let cancelled = false;

    const fetchLatestForecast = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_disease_forecasts')
          .select('forecast_date,details')
          .order('forecast_date', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (cancelled) return;
        if (data?.length && Array.isArray(data[0].details)) {
          setForecastState({
            status: 'success',
            details: data[0].details,
          });
        } else {
          setForecastState({ status: 'missing', details: null });
        }
      } catch (err) {
        if (!cancelled) {
          setForecastState({ status: 'error', details: null });
        }
        console.error(
          'Error fetching latest forecast for dashboard:',
          err.message
        );
      }
    };

    fetchLatestForecast();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sections = MODULES.map(([id]) => document.getElementById(id)).filter(
      Boolean
    );
    const intersectingModules = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersectingModules.add(entry.target);
          } else {
            intersectingModules.delete(entry.target);
          }
        });
        const nearest = [...intersectingModules].sort(
          (a, b) =>
            Math.abs(a.getBoundingClientRect().top) -
            Math.abs(b.getBoundingClientRect().top)
        )[0];
        if (nearest) setActiveModule(nearest.id);
      },
      { rootMargin: '-140px 0px -60% 0px', threshold: [0, 0.25] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      intersectingModules.clear();
      observer.disconnect();
    };
  }, []);

  // ── Metric cards data ──────────────────────────────────
  const metrics = useMemo(() => {
    const getGlobalStat = (table) =>
      stats?.find((s) => s.table === table)?.count || 0;
    const forecastDetails =
      forecastState.status === 'success' ? forecastState.details : null;
    const warningCount =
      forecastDetails?.filter((d) => d.risk_level === 'สูง').length || 0;

    const aiWarningCard = {
      title: 'เฝ้าระวังโรค/แมลง (AI)',
      value: forecastDetails?.length ?? null,
      unit: 'ชนิด',
      color: warningCount > 0 ? '#ef4444' : '#ea580c',
      icon: '🐛',
      target: 'risk',
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
          target: 'groups',
        },
        {
          title: 'พื้นที่เพาะปลูก',
          value: agriStats.crop_area || 0,
          unit: 'ไร่',
          color: '#2563eb',
          icon: '🌱',
          target: 'land',
        },
        {
          title: 'วิสาหกิจชุมชน',
          value: enterprises.count || 0,
          unit: 'แห่ง',
          color: '#9333ea',
          icon: '🤝',
          target: 'groups',
        },
        {
          title: 'แปลงใหญ่',
          value: lpStats.total || 0,
          unit: 'แปลง',
          color: '#ea580c',
          icon: '🌾',
          target: 'production',
        },
        {
          title: 'ศูนย์เรียนรู้ (ศพก.)',
          value: getGlobalStat('learning_centers'),
          unit: 'แห่ง',
          color: '#0891b2',
          icon: '📚',
          target: 'networks',
        },
        {
          title: 'จุดเฝ้าระวัง',
          value: getGlobalStat('soil_fertilizer_centers'),
          unit: 'แห่ง',
          color: '#d946ef',
          icon: '🛡️',
          target: 'risk',
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
        target: 'groups',
      },
      {
        title: 'พื้นที่เพาะปลูก',
        value: s.area || 0,
        unit: 'ไร่',
        color: '#2563eb',
        icon: '🌱',
        target: 'land',
      },
      {
        title: 'วิสาหกิจชุมชน',
        value: s.ce || 0,
        unit: 'แห่ง',
        color: '#9333ea',
        icon: '🤝',
        target: 'groups',
      },
      {
        title: 'แปลงใหญ่',
        value: s.lp || 0,
        unit: 'แปลง',
        color: '#ea580c',
        icon: '🌾',
        target: 'production',
      },
      {
        title: 'ศูนย์เรียนรู้ (ศพก.)',
        value: s.lc || 0,
        unit: 'แห่ง',
        color: '#0891b2',
        icon: '📚',
        target: 'networks',
      },
      {
        title: 'จุดเฝ้าระวัง',
        value: s.sfc || 0,
        unit: 'แห่ง',
        color: '#d946ef',
        icon: '🛡️',
        target: 'risk',
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
    forecastState,
  ]);

  const networkMetrics = useMemo(() => {
    const selected = districtStats[selectedDistrict] || {};
    const count = (table) =>
      overviewUnavailable
        ? null
        : stats.find((item) => item.table === table)?.count || 0;
    const allDistricts = selectedDistrict === 'ทั้งหมด';
    const districtValue = (key) =>
      overviewUnavailable ? null : selected[key] || 0;

    return [
      {
        title: 'ศูนย์เรียนรู้ (ศพก.)',
        value: allDistricts ? count('learning_centers') : districtValue('lc'),
        unit: 'แห่ง',
        color: '#0891b2',
        icon: '📚',
        target: 'land',
      },
      {
        title: 'ศูนย์จัดการศัตรูพืช (ศจช.)',
        value: allDistricts ? count('pest_centers') : districtValue('pc'),
        unit: 'แห่ง',
        color: '#8250df',
        icon: '🏥',
        target: 'risk',
      },
      {
        title: 'ศูนย์จัดการดินปุ๋ย (ศดปช.)',
        value: allDistricts
          ? count('soil_fertilizer_centers')
          : districtValue('sfc'),
        unit: 'แห่ง',
        color: '#1a7f37',
        icon: '🧪',
        target: 'risk',
      },
      {
        title: 'ท่องเที่ยวเกษตร',
        value: allDistricts
          ? overviewUnavailable
            ? null
            : tourism?.count || 0
          : overviewUnavailable
            ? null
            : tourism?.list?.filter(
                (item) => item.district === selectedDistrict
              ).length || 0,
        unit: 'แห่ง',
        color: '#0ea5e9',
        icon: '🗺️',
        target: 'groups',
      },
    ];
  }, [districtStats, overviewUnavailable, selectedDistrict, stats, tourism]);

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

  // ── Helpers ────────────────────────────────────────────
  const isTargetDistrict = (name) =>
    selectedDistrict === 'ทั้งหมด' ||
    name === selectedDistrict.replace('นครปฐม', 'นฐ.');

  // Add dynamic keys to force remount/re-animate on filter change
  const animationKey = `anim-${selectedDistrict}`;

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
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 160 }}
              options={[
                {
                  label:
                    '\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14',
                  value: LATEST_YEAR,
                },
                ...years.map((availableYear) => ({
                  label: String(availableYear),
                  value: String(availableYear),
                })),
              ]}
              size="middle"
              aria-label="เลือกปีข้อมูล"
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

      <nav className="dashboard-module-nav" aria-label="หมวดข้อมูล">
        <div className="dashboard-module-nav-inner">
          {MODULES.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeModule === id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActiveModule(id);
                scrollToModule(id);
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="dashboard-content">
        <p className="dashboard-print-meta">
          ตัวกรอง: อำเภอ {selectedDistrict} · ปี{' '}
          {year === LATEST_YEAR ? 'ข้อมูลล่าสุด' : year} · สร้างเมื่อ{' '}
          <time>{generatedAt}</time>
        </p>

        <ModuleSection
          id="overview"
          active={activeModule === 'overview'}
          title="ภาพรวมจังหวัด"
          summary="ตัวชี้วัดสำคัญ แผนภูมิ และแผนที่"
          status="ข้อมูลล่าสุด"
          defaultOpen
        >
          {loading ? (
            <div className="dashboard-state-container">
              <Spin size="large" />
              <span className="state-text">
                กำลังโหลดข้อมูล Interactive Dashboard...
              </span>
            </div>
          ) : overviewUnavailable ? (
            <Result
              status="warning"
              title="ไม่สามารถโหลดข้อมูลได้"
              subTitle="อาจเกิดปัญหาการเชื่อมต่อกับฐานข้อมูล กรุณาลองใหม่อีกครั้ง"
              extra={
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={refetch}
                >
                  โหลดข้อมูลใหม่
                </Button>
              }
            />
          ) : (
            <>
              {/* ═══ Row 1: Metric Cards ═══ */}
              <div className="metrics-row" style={{ marginBottom: 24 }}>
                {metrics.map((m) => (
                  <div
                    className="metric-col"
                    key={`${m.title}-${animationKey}`}
                  >
                    <MetricCard {...m} onNavigate={setActiveModule} />
                  </div>
                ))}
              </div>

              <ChartCard title="🗺️ แผนที่ข้อมูลการเกษตรสาธารณะ">
                <div className="dashboard-overview-map">
                  <LandingMap
                    mapData={visibleMapData}
                    districtStats={districtStats}
                  />
                </div>
              </ChartCard>

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
                                isTargetDistrict(item.name)
                                  ? '#10b981'
                                  : '#e2e8f0',
                            },
                            {
                              key: 'lp',
                              name: 'แปลงใหญ่',
                              color: (item) =>
                                isTargetDistrict(item.name)
                                  ? '#3b82f6'
                                  : '#e2e8f0',
                            },
                            {
                              key: 'lc',
                              name: 'ศพก.',
                              color: (item) =>
                                isTargetDistrict(item.name)
                                  ? '#f59e0b'
                                  : '#e2e8f0',
                            },
                            {
                              key: 'pc',
                              name: 'ศจช.',
                              color: (item) =>
                                isTargetDistrict(item.name)
                                  ? '#8b5cf6'
                                  : '#e2e8f0',
                            },
                            {
                              key: 'sfc',
                              name: 'ศดปช.',
                              color: (item) =>
                                isTargetDistrict(item.name)
                                  ? '#f43f5e'
                                  : '#e2e8f0',
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
            </>
          )}
        </ModuleSection>

        <ModuleSection
          id="land"
          active={activeModule === 'land'}
          title="พื้นที่และสารสนเทศการเกษตร"
          summary="ทะเบียนเกษตรกร พื้นที่เพาะปลูก ผังแปลง ศพก. และสภาพอากาศ"
          status={year === LATEST_YEAR ? 'ข้อมูลล่าสุด' : `ปี ${year}`}
        >
          <StrategyDashboard
            embedded
            filters={filters}
            sharedRows={sharedRows}
          />
        </ModuleSection>

        <ModuleSection
          id="production"
          active={activeModule === 'production'}
          title="การผลิต"
          summary="ข้าว พืช แปลงใหญ่ มาตรฐาน GAP และต้นทุน"
          status={year === LATEST_YEAR ? 'ข้อมูลล่าสุด' : `ปี ${year}`}
        >
          <ProductionDashboard
            embedded
            filters={filters}
            sharedRows={sharedRows}
          />
        </ModuleSection>

        <ModuleSection
          id="groups"
          active={activeModule === 'groups'}
          title="กลุ่มเกษตรกร"
          summary="วิสาหกิจชุมชน Smart Farmer และสถาบันเกษตรกร"
          status={year === LATEST_YEAR ? 'ข้อมูลล่าสุด' : `ปี ${year}`}
        >
          <DevelopmentDashboard
            embedded
            filters={filters}
            sharedRows={sharedRows}
          />
        </ModuleSection>

        <ModuleSection
          id="networks"
          active={activeModule === 'networks'}
          title="ศูนย์และเครือข่าย"
          summary="ศูนย์เรียนรู้ ศูนย์อารักขาพืช และเครือข่ายท่องเที่ยว"
          status="ข้อมูลล่าสุด"
        >
          <p className="module-intro">
            สรุปเครือข่ายจากข้อมูลภาพรวม
            เลือกการ์ดเพื่อไปยังรายละเอียดในหน้าเดียวกัน
          </p>
          <div className="metrics-row">
            {networkMetrics.map((metric) => (
              <div className="metric-col" key={metric.title}>
                <MetricCard {...metric} onNavigate={setActiveModule} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <ProtectionNetworkSummary
              filters={filters}
              enabled
              sharedRows={sharedRows}
            />
          </div>
        </ModuleSection>

        <ModuleSection
          id="risk"
          active={activeModule === 'risk'}
          title="ความเสี่ยงและการอารักขาพืช"
          summary="ภัยพิบัติ โรคและแมลง แปลงพยากรณ์ ศูนย์ และ PM2.5"
          status="ข้อมูลล่าสุด"
        >
          <ProtectionDashboard
            embedded
            filters={filters}
            sharedRows={sharedRows}
          />
        </ModuleSection>

        <ModuleSection
          id="extras"
          active={activeModule === 'extras'}
          title="ข้อมูลเพิ่มเติม"
          summary="ทบก. การเก็บเกี่ยว ต้นทุน โรคและแมลง AI และชุดดิน"
          status={year === LATEST_YEAR ? 'ข้อมูลล่าสุด' : `ปี ${year}`}
        >
          <ExtrasSection filters={filters} enabled />
        </ModuleSection>

        {/* Footer note */}
        <footer className="dashboard-footer">
          ข้อมูลจากระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม ·
          อัปเดตตามข้อมูลจริงในระบบ
        </footer>
      </div>
    </div>
  );
}
