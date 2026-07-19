import { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { FloatButton, Modal, Spin, Button, message } from 'antd';
import {
  AppstoreOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  BankOutlined,
  BookOutlined,
  BugOutlined,
  CalculatorOutlined,
  CloudOutlined,
  CommentOutlined,
  DownOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FacebookOutlined,
  LinkOutlined,
  LoginOutlined,
  ReadOutlined,
  SearchOutlined,
  TeamOutlined,
  UpOutlined,
  UserSwitchOutlined,
  LikeOutlined,
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AgencyLinksPanel from '../components/widgets/AgencyLinksPanel';
import LandingFooter from '../components/widgets/LandingFooter';
import NewsAccordion from '../components/widgets/NewsAccordion';
import WebsiteEvaluationForm from '../components/widgets/WebsiteEvaluationForm';
import './LandingPage.css';
import './SaastyTheme.css';
import './LandingPage.premium.css';

// SEO: Page metadata
const SEO_TITLE = 'ศูนย์ข้อมูลการเกษตรนครปฐม | สำนักงานเกษตรจังหวัดนครปฐม';
const SEO_DESCRIPTION =
  'ระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม — ข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ ท่องเที่ยวเกษตร สภาพอากาศ และราคาสินค้าเกษตรและพลังงาน จังหวัดนครปฐม';

// Component Loading Fallback
const WidgetSkeleton = () => (
  <div className="widget-skeleton">
    <span style={{ fontSize: 24, textAlign: 'center' }}>
      กำลังโหลดข้อมูล...
    </span>
  </div>
);

// ========== WIDGET COMPONENT IMPORTS (Lazy Loading) ==========
const WeatherWidget = lazy(() => import('../components/widgets/WeatherWidget'));
const AirQualityWidget = lazy(
  () => import('../components/widgets/AirQualityWidget')
);
const AgriPricesWidget = lazy(
  () => import('../components/widgets/AgriPricesWidget')
);
const HotspotWidget = lazy(() => import('../components/widgets/HotspotWidget'));
const AgriGovNewsWidget = lazy(
  () => import('../components/widgets/AgriGovNewsWidget')
);
const AgriMediaNewsWidget = lazy(
  () => import('../components/widgets/AgriMediaNewsWidget')
);
const LandingMap = lazy(() => import('../components/widgets/LandingMap'));
const SoilMoistureWidget = lazy(
  () => import('../components/widgets/SoilMoistureWidget')
);
const DamReservoirWidget = lazy(
  () => import('../components/widgets/DamReservoirWidget')
);
const FarmerInstitutesV2Widget = lazy(
  () => import('../components/widgets/FarmerInstitutesV2Widget')
);
const NearbyServiceCentersWidget = lazy(
  () => import('../components/widgets/NearbyServiceCentersWidget')
);
const AgriTourismWidget = lazy(
  () => import('../components/widgets/AgriTourismWidget')
);

// Bento Cards specific lazy imports
const AgriAreasCard = lazy(() =>
  import('../components/widgets/LandingBentoCards').then((module) => ({
    default: module.AgriAreasCard,
  }))
);

const audienceItems = [
  {
    title: 'ผู้บริหารจังหวัดและผู้บริหารสำนักงาน',
    outcome:
      'เห็นภาพรวมสถานการณ์เกษตรระดับจังหวัดจากหน้าเดียว ทั้งพื้นที่ ครัวเรือน กลุ่มเกษตรกร ภัยพิบัติ น้ำ และราคาตลาด',
    actions: [
      'ติดตามตัวชี้วัดสำคัญ',
      'ใช้ประกอบการประชุม',
      'มองเห็นพื้นที่ที่ควรเร่งประสานงาน',
    ],
    Icon: BankOutlined,
  },
  {
    title: 'เจ้าหน้าที่กลุ่มงาน',
    outcome:
      'ลดเวลารวบรวมข้อมูลจากหลายไฟล์ หลายตาราง และหลายแหล่ง ให้ค้นหา ตรวจสอบ และเปิดรายละเอียดตามภารกิจได้เร็วขึ้น',
    actions: [
      'ดูข้อมูลแยกกลุ่มงาน',
      'เปิดหน้ารายละเอียดสาธารณะ',
      'เตรียมรายงานหรือส่งต่อข้อมูล',
    ],
    Icon: AuditOutlined,
  },
  {
    title: 'เกษตรกร ประชาชน และหน่วยงานภายนอก',
    outcome:
      'เข้าถึงข้อมูลสาธารณะที่เข้าใจง่าย เช่น อากาศ PM2.5 ราคา จุดความร้อน ข่าว และภาพรวมเกษตรของนครปฐมโดยไม่ต้องเข้าสู่ระบบ',
    actions: ['เช็กข้อมูลประจำวัน', 'ดูแผนที่และข่าว', 'เข้าสู่กระดานถามตอบ'],
    Icon: TeamOutlined,
  },
  {
    title: 'ผู้ดูแลข้อมูลและผู้ดูแลระบบ',
    outcome:
      'มีโครงสร้างกลางสำหรับดูแลข้อมูล ผู้ใช้ สิทธิ์ การนำเข้าข้อมูล และ audit trail เพื่อให้ระบบต่อยอดได้ต่อเนื่อง',
    actions: [
      'ควบคุมสิทธิ์ตามบทบาท',
      'ตรวจสอบข้อมูลย้อนหลัง',
      'ดูแลชุดข้อมูลกลาง',
    ],
    Icon: UserSwitchOutlined,
  },
];

const contactItems = [
  {
    name: 'สำนักงานเกษตรจังหวัดนครปฐม (เกษตรจังหวัด)',
    type: 'provincial',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61566480174328',
    tel: '0 3425 3992',
    address: '131 ถนนทรงพล อำเภอเมือง จังหวัดนครปฐม 73000',
    isProvincial: true,
  },
  {
    name: 'สำนักงานเกษตรอำเภอเมืองนครปฐม',
    type: 'district',
    facebookUrl: 'https://www.facebook.com/muangpathom',
    tel: '0 3425 2753',
    address: 'อำเภอเมืองนครปฐม',
  },
  {
    name: 'สำนักงานเกษตรอำเภอกำแพงแสน',
    type: 'district',
    facebookUrl:
      'https://www.facebook.com/snng.kes.tr.xaphex.kaph.ngs.n.canghwad.nkhrpthm',
    tel: '0 3435 1312',
    address: 'อำเภอกำแพงแสน',
  },
  {
    name: 'สำนักงานเกษตรอำเภอนครชัยศรี',
    type: 'district',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61557741274035',
    tel: '0 3433 1862',
    address: 'อำเภอนครชัยศรี',
  },
  {
    name: 'สำนักงานเกษตรอำเภอดอนตูม',
    type: 'district',
    facebookUrl: 'https://www.facebook.com/kasetamperdontoom/',
    tel: '0 3438 1124',
    address: 'อำเภอดอนตูม',
  },
  {
    name: 'สำนักงานเกษตรอำเภอบางเลน',
    type: 'district',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61585093269788',
    tel: '0 3439 1115',
    address: 'อำเภอบางเลน',
  },
  {
    name: 'สำนักงานเกษตรอำเภอพุทธมณฑล',
    type: 'district',
    facebookUrl: 'https://www.facebook.com/phuttamonthon.doae/',
    tel: '0 2441 0837',
    address: 'อำเภอพุทธมณฑล',
  },
  {
    name: 'สำนักงานเกษตรอำเภอสามพราน',
    type: 'district',
    facebookUrl: 'https://www.facebook.com/kasetsamphran/',
    tel: '0 3432 1972',
    address: 'อำเภอสามพราน',
  },
];

const externalSystemLinks = [
  {
    href: '/smart-map',
    title: 'แผนที่อัจฉริยะ',
    subtitle: 'Smart Agri Map',
    Icon: EnvironmentOutlined,
    isInternal: true,
  },
  {
    href: 'https://kasetinfo.netlify.app/',
    title: 'คลังความรู้เกษตร',
    subtitle: 'Infographic',
    Icon: BookOutlined,
  },
  {
    href: 'https://agrilabcost-ai.vercel.app/',
    title: 'Crop Cost Lab',
    subtitle: 'วิเคราะห์ต้นทุนการผลิต',
    Icon: CalculatorOutlined,
  },
];

export default function LandingPage() {
  const {
    stats,
    loading,
    mapData,
    districtStats,
    smartFarmers,
    tourism,
    instituteStats,
    lpStats,
    agriStats,
  } = useDashboardData();

  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginAsGuest } = useAuth();
  const [guestAccessLoading, setGuestAccessLoading] = useState(false);
  const [landingQuery, setLandingQuery] = useState('');
  const [activeInfoModal, setActiveInfoModal] = useState(null);
  const [selectedFarmerType, setSelectedFarmerType] = useState('large_plots');
  const [isHeroDocked, setIsHeroDocked] = useState(true);

  useEffect(() => {
    if (location.state?.openPanel) {
      setActiveInfoModal(location.state.openPanel);
      // Clear state on history so refresh does not pop up modal again
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const updateFloatingNav = () => setIsHeroDocked(window.scrollY < 180);
    updateFloatingNav();
    window.addEventListener('scroll', updateFloatingNav, { passive: true });
    return () => window.removeEventListener('scroll', updateFloatingNav);
  }, []);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [moreDrawerClosing, setMoreDrawerClosing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [forecastReportDays, setForecastReportDays] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const enterDashboard = async (path) => {
    if (guestAccessLoading) return;
    setGuestAccessLoading(true);
    try {
      if (!user) await loginAsGuest();
      navigate(path);
    } catch {
      message.error('ไม่สามารถเข้าดูข้อมูลได้ กรุณาลองใหม่');
      setGuestAccessLoading(false);
    }
  };

  const handleLandingSearchSubmit = async (event) => {
    event.preventDefault();
    const query = landingQuery.trim();
    if (query.length < 2) return;
    await enterDashboard(
      `/dashboard/search?q=${encodeURIComponent(query)}`
    );
  };

  const handleGuestAccess = (event) => {
    event.preventDefault();
    return enterDashboard('/dashboard');
  };

  useEffect(() => {
    const fetchForecast = async () => {
      setForecastLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_disease_forecasts')
          .select('*')
          .order('forecast_date', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) {
          setForecastData(data[0]);
          setForecastReportDays(
            new Set(data.map((item) => item.forecast_date).filter(Boolean)).size
          );
        }
      } catch (err) {
        console.error('Error fetching AI forecast:', err.message);
      } finally {
        setForecastLoading(false);
      }
    };

    fetchForecast();
  }, []);

  const districtValues = Object.values(districtStats);
  const sumDistrictMetric = (key) =>
    districtValues.reduce(
      (sum, district) => sum + (Number(district[key]) || 0),
      0
    );
  const tableCount = (table) =>
    stats.find((item) => item.table === table)?.count;
  const formatKpi = (value, unit) =>
    Number.isFinite(value)
      ? `${value.toLocaleString('th-TH')} ${unit}`
      : 'รอข้อมูล';
  const cropAreas = [
    ['ข้าวนาปี', agriStats.rice_pi],
    ['ข้าวนาปรัง', agriStats.rice_prung],
    ['พืชไร่', agriStats.field_crops],
    ['พืชสวน', agriStats.hort],
    ['ไม้ผล', agriStats.fruit],
  ].sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
  const leadingCrop = cropAreas[0];
  const highRiskCount = Array.isArray(forecastData?.details)
    ? forecastData.details.filter((item) => item.risk_level === 'สูง').length
    : null;
  const publicKpis = [
    {
      icon: '🛡️',
      title: 'พื้นที่รับรอง GAP',
      value: tableCount('certifications')
        ? formatKpi(tableCount('certifications'), 'แปลง')
        : 'รอข้อมูล',
      note: 'มาตรฐานการผลิตที่ปลอดภัย',
      tone: '#2563eb',
      href: '/public/certifications',
    },
    {
      icon: '🐛',
      title: 'สถานการณ์ศัตรูพืช',
      value:
        forecastReportDays === null
          ? 'รอข้อมูล'
          : formatKpi(forecastReportDays, 'วัน'),
      note: 'รายงานสถานการณ์ศัตรูพืชรายวัน',
      tone: '#dc2626',
      href: '/public/disease-forecast',
    },
    {
      icon: '🤖',
      title: 'ความเสี่ยง 7 วัน',
      value:
        highRiskCount === null
          ? 'รอข้อมูล'
          : formatKpi(highRiskCount, 'จุดเสี่ยงสูง'),
      note: 'AI พยากรณ์โรคและแมลง',
      tone: '#7c3aed',
      modal: 'aiForecast',
    },
    {
      icon: '🌊',
      title: 'ภัยพิบัติการเกษตร',
      value: tableCount('disasters')
        ? formatKpi(sumDistrictMetric('disasterArea'), 'ไร่')
        : 'รอข้อมูล',
      note: `${sumDistrictMetric('disasterFarmers').toLocaleString('th-TH')} เกษตรกรได้รับผลกระทบ`,
      tone: '#ea580c',
      href: '/public/disasters',
    },
    {
      icon: '🏫',
      title: 'ศูนย์บริการใกล้บ้าน',
      value: formatKpi(
        sumDistrictMetric('lc') +
          sumDistrictMetric('pc') +
          sumDistrictMetric('sfc'),
        'แห่ง'
      ),
      note: 'ศพก. · ศจช. · ศดปช.',
      tone: '#0f766e',
      modal: 'nearbyCenters',
    },
    {
      icon: '🌾',
      title: 'พืชเด่นตามพื้นที่',
      value: leadingCrop?.[1]
        ? formatKpi(Number(leadingCrop[1]), 'ไร่')
        : 'รอข้อมูล',
      note: leadingCrop?.[1] ? leadingCrop[0] : 'รอข้อมูลพื้นที่เพาะปลูก',
      tone: '#65a30d',
      href: '/public/agricultural-areas',
    },
  ];

  const closeMoreDrawer = useCallback(() => {
    setMoreDrawerClosing(true);
    setTimeout(() => {
      setMoreDrawerOpen(false);
      setMoreDrawerClosing(false);
    }, 180);
  }, []);

  // SEO: Set dynamic page title & meta description
  useEffect(() => {
    document.title = SEO_TITLE;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', SEO_DESCRIPTION);
  }, []);

  return (
    <div className="landing-page bento-theme">
      <div
        className={`landing-floating-system-tabs${isHeroDocked ? ' is-hero-docked' : ''}`}
        aria-label="System shortcuts"
      >
        <a
          href="/public/disease-forecast"
          className="landing-system-tab forecast-warning-tab"
        >
          <BugOutlined className="forecast-pulse-icon" aria-hidden="true" />
          <span>
            <strong>เตือนภัยโรคและแมลง</strong>
            <small>พยากรณ์ล่วงหน้า 7 วัน</small>
          </span>
        </a>
        {externalSystemLinks.map(
          ({ href, title, subtitle, Icon, isInternal }) =>
            isInternal ? (
              <a key={href} href={href} className="landing-system-tab">
                <Icon aria-hidden="true" />
                <span>
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </span>
              </a>
            ) : (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-system-tab"
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </span>
              </a>
            )
        )}
        <button
          className="landing-system-tab"
          onClick={() => setActiveInfoModal('soilMoistureDetail')}
          style={{ cursor: 'pointer' }}
        >
          <ExperimentOutlined aria-hidden="true" />
          <span>
            <strong>ความชื้นดิน</strong>
            <small>ข้อมูลเซ็นเซอร์ดิน</small>
          </span>
        </button>
        <button
          className="landing-system-tab"
          onClick={() => setActiveInfoModal('waterDetail')}
          style={{ cursor: 'pointer' }}
        >
          <CloudOutlined aria-hidden="true" />
          <span>
            <strong>สถานการณ์น้ำ</strong>
            <small>ข้อมูลอ่างเก็บน้ำ</small>
          </span>
        </button>
        <a href="/dashboard/community/forum" className="landing-system-tab">
          <CommentOutlined aria-hidden="true" />
          <span>
            <strong>ชุมชนเกษตรกร</strong>
            <small>Farmer Forum</small>
          </span>
        </a>
        <button
          className="landing-system-tab evaluation-warning-tab"
          onClick={() => setActiveInfoModal('websiteEvaluation')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #16a34a' }}
        >
          <LikeOutlined aria-hidden="true" />
          <span>
            <strong>ประเมินเว็บไซต์</strong>
            <small>แบบสำรวจความพึงพอใจ</small>
          </span>
        </button>
        <a href="/public/data-dictionary" className="landing-system-tab">
          <ReadOutlined aria-hidden="true" />
          <span>
            <strong>คำอธิบายข้อมูล</strong>
            <small>Data Dictionary</small>
          </span>
        </a>
        <a href="/manual" className="landing-system-tab">
          <BookOutlined aria-hidden="true" />
          <span>
            <strong>คู่มือระบบ</strong>
            <small>Manual Portal</small>
          </span>
        </a>
      </div>

      <nav
        className="premium-nav"
        data-testid="landing-nav"
        aria-label="เมนูหลัก"
      >
        <a
          className="premium-brand"
          href="/"
          aria-label="หน้าแรก ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม"
        >
          <span className="premium-brand-mark">
            <EnvironmentOutlined />
          </span>
          <span>
            ศูนย์ข้อมูลการเกษตรอัจฉริยะ<small>จังหวัดนครปฐม</small>
          </span>
        </a>
        <div className={`premium-nav-links ${mobileMenuOpen ? 'is-open' : ''}`}>
          <a href="#live-data">สถานการณ์วันนี้</a>
          <a href="#agri-overview">ข้อมูลการเกษตร</a>
          <a href="/public/data-dictionary">คำอธิบายข้อมูล</a>
          <a href="#agri-news">ข่าวและประกาศ</a>
          <a
            href="/dashboard"
            onClick={handleGuestAccess}
            aria-busy={guestAccessLoading}
          >
            เข้าดูข้อมูล
          </a>
          <a href="/login" className="premium-login">
            สำหรับเจ้าหน้าที่
          </a>
        </div>
        <button
          className="premium-menu-button"
          aria-label="เปิดเมนู"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <AppstoreOutlined />
        </button>
      </nav>

      <header className="premium-landing-header">
        <div className="premium-hero">
          <div className="premium-hero-copy">
            <p className="premium-eyebrow">Nakhon Pathom Agri Intelligence</p>
            <h1>ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม</h1>
            <p>
              รวมข้อมูลพื้นที่ เกษตรกร ผลผลิต ดิน น้ำ ภัย และมาตรฐาน
              เพื่อการตัดสินใจจากข้อมูลเดียวกัน
            </p>
            <form
              data-testid="landing-search"
              onSubmit={handleLandingSearchSubmit}
              className="premium-search"
            >
              <SearchOutlined aria-hidden="true" />
              <input
                aria-label="ค้นหาฐานข้อมูลการเกษตร"
                value={landingQuery}
                onChange={(e) => setLandingQuery(e.target.value)}
                placeholder="ค้นหาแปลง เกษตรกร พืช ดิน น้ำ หรือมาตรฐาน…"
              />
              <button type="submit">ค้นหา</button>
            </form>
            <p className="premium-hero-motto">
              ส้มโอหวาน ข้าวสารขาว ลูกสาวงาม ข้าวหลามหวานมัน สนามจันทร์งามล้น
              พุทธมณฑลคู่ธานี พระปฐมเจดีย์เสียดฟ้า สวยงามตาแม่น้ำท่าจีน
            </p>
          </div>
          <div className="premium-hero-visual" aria-hidden="true" />
        </div>
      </header>

      <main>
        {/* ===== LIVE WIDGETS ===== */}
        <section
          id="live-data"
          data-testid="situation-strip"
          aria-label="ข้อมูลสภาพอากาศและราคาสินค้าเกษตรและพลังงาน"
        >
          <div className="live-kpi-section">
            <header className="live-kpi-heading">
              <div>
                <span className="live-kpi-status">
                  <i aria-hidden="true" /> อัปเดตแบบเรียลไทม์
                </span>
                <h2>ข้อมูลสดจากพื้นที่</h2>
              </div>
              <p className="live-kpi-hint">คลิกการ์ดเพื่อดูข้อมูลแบบเต็ม</p>
            </header>

            <div className="live-kpi-grid landing-live-kpis">
              <Suspense fallback={<WidgetSkeleton />}>
                <WeatherWidget
                  summary
                  onOpen={() => setActiveInfoModal('liveWeather')}
                />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton />}>
                <AirQualityWidget
                  summary
                  onOpen={() => setActiveInfoModal('liveAir')}
                />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton />}>
                <AgriPricesWidget
                  summary
                  onOpen={() => setActiveInfoModal('livePrices')}
                />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton />}>
                <SoilMoistureWidget
                  summary
                  onOpen={() => setActiveInfoModal('soilMoistureDetail')}
                />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton />}>
                <DamReservoirWidget
                  summary
                  onOpen={() => setActiveInfoModal('waterDetail')}
                />
              </Suspense>
            </div>
            <Suspense fallback={<WidgetSkeleton />}>
              <HotspotWidget
                summary
                onOpen={() => setActiveInfoModal('liveHotspot')}
              />
            </Suspense>
          </div>

          <Modal
            className="live-widget-modal"
            open={['liveWeather', 'liveAir', 'livePrices'].includes(
              activeInfoModal
            )}
            onCancel={() => setActiveInfoModal(null)}
            footer={null}
            width={activeInfoModal === 'livePrices' ? 1120 : 800}
            destroyOnHidden
            centered
            title={
              activeInfoModal === 'liveWeather'
                ? 'สภาพอากาศนครปฐม'
                : activeInfoModal === 'liveAir'
                  ? 'คุณภาพอากาศและ PM 2.5'
                  : 'ราคาผลผลิตและราคาน้ำมัน'
            }
          >
            <div className="live-widget-modal-body">
              <Suspense fallback={<WidgetSkeleton />}>
                {activeInfoModal === 'liveWeather' && <WeatherWidget />}
                {activeInfoModal === 'liveAir' && <AirQualityWidget />}
                {activeInfoModal === 'livePrices' && <AgriPricesWidget />}
              </Suspense>
            </div>
          </Modal>

          <Modal
            className="live-widget-modal live-hotspot-modal"
            open={activeInfoModal === 'liveHotspot'}
            onCancel={() => setActiveInfoModal(null)}
            footer={null}
            width={1180}
            destroyOnHidden
            centered
            title="จุดความร้อนจังหวัดนครปฐม"
          >
            <div className="live-widget-modal-body">
              <Suspense fallback={<WidgetSkeleton />}>
                <HotspotWidget showDetailsButton={false} />
              </Suspense>
            </div>
          </Modal>

          <Modal
            className="live-widget-modal live-farmer-modal"
            open={activeInfoModal === 'liveFarmerDevelopment'}
            onCancel={() => setActiveInfoModal(null)}
            footer={null}
            width={1180}
            destroyOnHidden
            centered
            title="การพัฒนาเกษตรกรและกลุ่ม/สถาบันเกษตรกร"
          >
            <div className="live-widget-modal-body">
              <Suspense fallback={<WidgetSkeleton />}>
                <FarmerInstitutesV2Widget initialType={selectedFarmerType} />
              </Suspense>
            </div>
          </Modal>
          <Modal
            className="live-widget-modal live-tourism-modal"
            open={activeInfoModal === 'liveAgriTourism'}
            onCancel={() => setActiveInfoModal(null)}
            footer={null}
            width={1180}
            destroyOnHidden
            centered
            title="แหล่งท่องเที่ยวเชิงเกษตร"
          >
            <div className="live-widget-modal-body">
              <Suspense fallback={<WidgetSkeleton />}>
                <AgriTourismWidget data={tourism} loading={loading} />
              </Suspense>
            </div>
          </Modal>
        </section>

        {/* ===== BENTO GRID LATEST LISTS ===== */}
        <div id="agri-overview" className="dept-stats-header">
          <h2>📊 ข้อมูลการเกษตรจังหวัดนครปฐม</h2>
          <p>สถิติและข้อมูลสารสนเทศการเกษตรในพื้นที่</p>
        </div>
        <div className="agri-kpi-strip">
          <Suspense fallback={<WidgetSkeleton />}>
            <FarmerInstitutesV2Widget
              summary
              onOpen={(typeKey) => {
                setSelectedFarmerType(typeKey);
                setActiveInfoModal('liveFarmerDevelopment');
              }}
            />
            <AgriTourismWidget
              data={tourism}
              loading={loading}
              summary
              onOpen={() => setActiveInfoModal('liveAgriTourism')}
            />
          </Suspense>
        </div>
        <section className="bento-container bento-container-no-tourism">
          {/* 1. Map Card (Large) */}
          <div className="bento-card bento-card-map">
            <div className="bento-card-header">
              <h3>🗺️ แผนที่ข้อมูลการเกษตร</h3>
              <span>พิกัดพื้นที่เชิงเกษตร (GIS)</span>
            </div>
            <div className="bento-card-body p-0" data-testid="landing-map">
              <Suspense fallback={<WidgetSkeleton />}>
                <LandingMap mapData={mapData} districtStats={districtStats} />
              </Suspense>
            </div>
          </div>

          {/* 6. Agri Areas */}
          <Suspense fallback={<WidgetSkeleton />}>
            <AgriAreasCard
              stats={agriStats}
              districtStats={districtStats}
              loading={loading}
            />
          </Suspense>
        </section>

        <section
          className="public-kpi-section"
          aria-labelledby="public-kpi-title"
        >
          <div className="public-kpi-heading">
            <div>
              <span>ข้อมูลที่ประชาชนใช้ได้ทันที</span>
              <h2 id="public-kpi-title">ข้อมูลสำคัญสำหรับเกษตรกร</h2>
            </div>
            <small>แตะการ์ดเพื่อดูรายละเอียด</small>
          </div>
          <div className="public-kpi-grid">
            {publicKpis.map((card) => (
              <button
                key={card.title}
                type="button"
                className="public-kpi-card"
                style={{ '--tone': card.tone }}
                onClick={() =>
                  card.modal
                    ? setActiveInfoModal(card.modal)
                    : navigate(card.href)
                }
              >
                <span className="public-kpi-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <span className="public-kpi-copy">
                  <small>{card.title}</small>
                  <strong>{loading ? '—' : card.value}</strong>
                  <span>{card.note}</span>
                </span>
                <span className="public-kpi-arrow">ดูข้อมูล →</span>
              </button>
            ))}
          </div>
        </section>

        {/* ===== AGRI NEWS ACCORDION ===== */}
        <div id="agri-news" className="widget-section-container">
          <NewsAccordion
            ariaLabel="ข่าวและประกาศด้านการเกษตร"
            sections={[
              {
                key: 'gov',
                title: 'ข่าวจากหน่วยงานภาครัฐ',
                description:
                  'กรมส่งเสริมการเกษตร • เกษตรจังหวัด • หน่วยงานวิชาการ',
                tone: 'gov',
                defaultOpen: true,
                renderContent: () => (
                  <Suspense fallback={<WidgetSkeleton />}>
                    <AgriGovNewsWidget />
                  </Suspense>
                ),
              },
              {
                key: 'media',
                title: 'ข่าวเกษตรจากสื่อมวลชน',
                description: 'สำนักข่าวและสื่อเกษตรหลายแหล่ง',
                tone: 'media',
                renderContent: () => (
                  <Suspense fallback={<WidgetSkeleton />}>
                    <AgriMediaNewsWidget />
                  </Suspense>
                ),
              },
            ]}
          />
        </div>
      </main>

      <Modal
        title="ทางลัด"
        open={activeInfoModal === 'agencyLinks'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={1080}
        className="landing-info-modal landing-agency-links-modal"
      >
        <AgencyLinksPanel />
      </Modal>

      <Modal
        title={null}
        open={activeInfoModal === 'nearbyCenters'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={1180}
        className="landing-info-modal landing-nearby-centers-modal"
        destroyOnHidden
      >
        <Suspense fallback={<WidgetSkeleton />}>
          <NearbyServiceCentersWidget />
        </Suspense>
      </Modal>

      <Modal
        title="ระบบนี้ช่วยใคร"
        open={activeInfoModal === 'audience'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={1040}
        className="landing-info-modal"
      >
        <div className="modal-section-heading">
          <div>
            <h2>ออกแบบให้เห็นข้อมูลเดียวกัน แต่ใช้ต่างบทบาทได้จริง</h2>
            <p>
              ระบบนี้เป็นทางเข้ากลางของข้อมูลเกษตรจังหวัดนครปฐม
              ทั้งฝั่งสาธารณะและฝั่งงานภายในสำนักงาน
            </p>
          </div>
        </div>
        <div className="audience-grid modal-grid">
          {audienceItems.map(({ title, outcome, actions, Icon }) => (
            <article className="audience-card" key={title}>
              <div className="audience-card-icon">
                <Icon aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{outcome}</p>
              <ul>
                {actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Modal>

      <Modal
        title="ช่องทางการติดต่อสำนักงานเกษตร"
        open={activeInfoModal === 'contacts'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={880}
        className="landing-info-modal landing-contacts-modal"
      >
        <div className="modal-section-heading">
          <div>
            <h2>ติดต่อสอบถามและติดตามข้อมูลข่าวสาร</h2>
            <p>
              ช่องทางการติดต่อสำนักงานเกษตรจังหวัดนครปฐม
              และสำนักงานเกษตรอำเภอผ่านทาง Facebook Page
              และหมายเลขโทรศัพท์ติดต่อ
            </p>
          </div>
        </div>

        <div className="contacts-modal-body">
          {/* Provincial Office (Highlighted) */}
          {contactItems
            .filter((item) => item.isProvincial)
            .map((prov) => (
              <div className="contacts-provincial-card" key={prov.name}>
                <div className="contacts-card-left">
                  <div className="contacts-provincial-icon">
                    <FacebookOutlined className="fb-icon-large" />
                  </div>
                  <div className="contacts-provincial-details">
                    <span className="contacts-badge">
                      หน่วยงานหลักระดับจังหวัด
                    </span>
                    <h3>{prov.name}</h3>
                    <p className="contacts-address">📍 {prov.address}</p>
                    <p className="contacts-phone">
                      📞 เบอร์โทรศัพท์:{' '}
                      <a href={`tel:${prov.tel.replace(/\s+/g, '')}`}>
                        {prov.tel}
                      </a>
                    </p>
                  </div>
                </div>
                <a
                  href={prov.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contacts-visit-btn"
                >
                  <FacebookOutlined /> ไปยังเพจ Facebook
                </a>
              </div>
            ))}

          <h4 className="contacts-grid-title">
            สำนักงานเกษตรอำเภอ (ทั้ง 7 อำเภอในจังหวัดนครปฐม)
          </h4>

          {/* District Grid */}
          <div className="contacts-districts-grid">
            {contactItems
              .filter((item) => !item.isProvincial)
              .map((dist) => (
                <div className="contacts-district-card" key={dist.name}>
                  <div className="contacts-district-header">
                    <h3>{dist.name}</h3>
                    <span className="contacts-district-badge">
                      อ. {dist.name.replace('สำนักงานเกษตรอำเภอ', '')}
                    </span>
                  </div>
                  <div className="contacts-district-body">
                    <div className="contacts-phone-info">
                      <span>📞 โทรศัพท์:</span>
                      <a href={`tel:${dist.tel.replace(/\s+/g, '')}`}>
                        {dist.tel}
                      </a>
                    </div>
                    <a
                      href={dist.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contacts-district-link"
                    >
                      <FacebookOutlined /> ติดต่อผ่าน Facebook
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Modal>

      <Modal
        title="📈 สถานการณ์ความชื้นดินเฉลี่ยทั้งอำเภอ (แบบละเอียด)"
        open={activeInfoModal === 'soilMoistureDetail'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={1120}
        className="landing-info-modal landing-soil-moisture-modal"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Suspense fallback={<WidgetSkeleton />}>
            <SoilMoistureWidget defaultExpanded={true} />
          </Suspense>
        </div>
      </Modal>

      <Modal
        title="💧 สถานการณ์น้ำและผลกระทบต่อ จ.นครปฐม (แบบละเอียด)"
        open={activeInfoModal === 'waterDetail'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={1120}
        className="landing-info-modal landing-water-modal"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Suspense fallback={<WidgetSkeleton />}>
            <DamReservoirWidget defaultExpanded={true} />
          </Suspense>
        </div>
      </Modal>

      <Modal
        title="💬 กระดานข่าวอัจฉริยะ (Farmer Forum)"
        open={activeInfoModal === 'forumCta'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={720}
        className="landing-info-modal landing-forum-modal"
        destroyOnClose
      >
        <div
          style={{
            textAlign: 'center',
            padding: '30px 10px',
            color: '#0f172a',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>💬</div>
          <h2
            style={{
              color: '#166534',
              fontSize: '24px',
              marginBottom: '14px',
              fontWeight: '800',
            }}
          >
            มีข้อสงสัยเรื่องการเกษตร? สอบถามชุมชนของเรา!
          </h2>
          <p
            style={{
              color: '#475569',
              fontSize: '15px',
              maxWidth: '600px',
              margin: '0 auto 28px',
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            เข้าร่วม <b>"กระดานข่าวอัจฉริยะ (Farmer Forum)"</b>{' '}
            พื้นที่แลกเปลี่ยนเรียนรู้ ถามตอบปัญหา แจ้งพิกัดโรคพืช
            และอัปเดตราคาตลาด สำหรับเกษตรกรนครปฐม
          </p>
          <a
            href="/dashboard/community/forum"
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 15px rgba(22,163,74,0.3)',
              fontFamily: 'inherit',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow =
                '0 8px 25px rgba(22,163,74,0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 4px 15px rgba(22,163,74,0.3)';
            }}
          >
            เข้าสู่กระดานข่าว / ตั้งกระทู้ถาม
          </a>
        </div>
      </Modal>

      <Modal
        title="📝 แบบประเมินความพึงพอใจการใช้งานเว็บไซต์"
        open={activeInfoModal === 'websiteEvaluation'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={650}
        className="landing-info-modal landing-evaluation-modal"
        destroyOnClose
      >
        <WebsiteEvaluationForm onSuccess={() => setActiveInfoModal(null)} />
      </Modal>

      <Modal
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingRight: '36px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span
              style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}
            >
              🤖 พยากรณ์เตือนภัยโรคและแมลงศัตรูพืชอัจฉริยะ (ล่วงหน้า 7 วัน)
            </span>
            <Button
              type="primary"
              icon={<BugOutlined />}
              size="middle"
              href="/public/disease-forecast"
              style={{
                background: '#166534',
                borderColor: '#166534',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                boxShadow: '0 2px 8px rgba(22,101,52,0.15)',
              }}
            >
              ดูรายละเอียดและพยากรณ์ย้อนหลัง
            </Button>
          </div>
        }
        open={activeInfoModal === 'aiForecast'}
        onCancel={() => setActiveInfoModal(null)}
        footer={null}
        width={920}
        className="landing-info-modal landing-forecast-modal"
        destroyOnClose
      >
        {forecastLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Spin size="large" tip="กำลังโหลดคำทำนายจากฐานข้อมูล..." />
          </div>
        ) : forecastData ? (
          <div className="forecast-modal-content">
            <div className="forecast-meta-info">
              <span className="forecast-date-badge">
                📅 คาดการณ์ล่วงหน้า 7 วัน ตั้งแต่วันที่:{' '}
                {new Date(forecastData.forecast_date).toLocaleDateString(
                  'th-TH',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </span>
              <span className="forecast-source-badge">
                ⚡ วิเคราะห์ด้วย AI + Google Grounding + สภาพอากาศนครปฐม
              </span>
            </div>

            <div className="forecast-summary-card">
              <h4>📋 สรุปภาพรวมความเสี่ยงล่วงหน้า 7 วัน</h4>
              <p>{forecastData.summary}</p>
            </div>

            <h4 className="forecast-grid-title">
              🚨 รายการโรคและแมลงศัตรูพืชที่มีความเสี่ยง
            </h4>
            <div className="forecast-cards-grid">
              {forecastData.details &&
                forecastData.details.map((item, idx) => {
                  const isHigh = item.risk_level === 'สูง';
                  const isMedium = item.risk_level === 'ปานกลาง';
                  const riskClass = isHigh
                    ? 'risk-high'
                    : isMedium
                      ? 'risk-medium'
                      : 'risk-low';
                  const typeClass =
                    item.type === 'โรคพืช' ? 'type-disease' : 'type-pest';

                  return (
                    <div className={`forecast-card ${riskClass}`} key={idx}>
                      <div className="forecast-card-header">
                        <div className="forecast-card-title-area">
                          <h5>{item.name}</h5>
                          <span
                            className={`forecast-badge type-badge ${typeClass}`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <span
                          className={`forecast-badge risk-badge ${riskClass}`}
                        >
                          ความเสี่ยง: {item.risk_level}
                        </span>
                      </div>
                      <div className="forecast-card-body">
                        <div className="forecast-crop-info">
                          <span>🌱 พืชที่กระทบ:</span>{' '}
                          <strong>{item.target_crop}</strong>
                        </div>
                        <p className="forecast-desc">{item.description}</p>
                        <div className="forecast-prevention">
                          <h6>🛡️ คำแนะนำในการป้องกันเฝ้าระวัง:</h6>
                          <p>{item.prevention}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '30px 10px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <p>
              ไม่พบข้อมูลการพยากรณ์สำหรับวันนี้ กรุณาลองใหม่อีกครั้งในภายหลัง
            </p>
          </div>
        )}
      </Modal>

      {/* ===== FOOTER ===== */}
      <LandingFooter onOpenPanel={setActiveInfoModal} />

      {/* ===== BACK TO TOP BUTTON ===== */}
      <FloatButton.BackTop
        icon={<ArrowUpOutlined />}
        tooltip="กลับขึ้นบนสุด"
        style={{ bottom: 40, right: 40, width: 50, height: 50 }}
      />

      {/* ===== MOBILE BOTTOM NAV BAR ===== */}
      <nav className="mobile-bottom-nav" aria-label="เมนูลัดมือถือ">
        <a href="/smart-map" className="mobile-bottom-nav-item">
          <EnvironmentOutlined />
          <span>แผนที่</span>
        </a>
        <button
          className="mobile-bottom-nav-item"
          onClick={() => setActiveInfoModal('soilMoistureDetail')}
        >
          <ExperimentOutlined />
          <span>ความชื้นดิน</span>
        </button>
        <button
          className="mobile-bottom-nav-item"
          onClick={() => setActiveInfoModal('waterDetail')}
        >
          <CloudOutlined />
          <span>สถานการณ์น้ำ</span>
        </button>
        <a href="/dashboard/community/forum" className="mobile-bottom-nav-item">
          <CommentOutlined />
          <span>ชุมชน</span>
        </a>
        <button
          className="mobile-bottom-nav-item"
          onClick={() => setMoreDrawerOpen(true)}
        >
          <AppstoreOutlined />
          <span>เพิ่มเติม</span>
        </button>
      </nav>

      {/* ===== MOBILE MORE DRAWER ===== */}
      {moreDrawerOpen && (
        <div
          className="mobile-more-overlay"
          data-closing={moreDrawerClosing || undefined}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMoreDrawer();
          }}
        >
          <div className="mobile-more-drawer">
            <div className="mobile-more-drawer-handle" />
            <div className="mobile-more-drawer-title">ทางลัดเพิ่มเติม</div>
            <div className="mobile-more-grid">
              <a
                href="https://kasetinfo.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-more-item"
                onClick={closeMoreDrawer}
              >
                <BookOutlined />
                <span>คลังความรู้เกษตร</span>
              </a>
              <a
                href="https://agrilabcost-ai.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-more-item"
                onClick={closeMoreDrawer}
              >
                <CalculatorOutlined />
                <span>Crop Cost Lab</span>
              </a>
              <button
                className="mobile-more-item"
                onClick={() => {
                  closeMoreDrawer();
                  setActiveInfoModal('agencyLinks');
                }}
              >
                <LinkOutlined />
                <span>ทางลัดหน่วยงาน</span>
              </button>
              <button
                className="mobile-more-item"
                onClick={() => {
                  closeMoreDrawer();
                  setActiveInfoModal('audience');
                }}
              >
                <TeamOutlined />
                <span>ระบบช่วยใคร</span>
              </button>
              <button
                className="mobile-more-item"
                onClick={() => {
                  closeMoreDrawer();
                  setActiveInfoModal('contacts');
                }}
              >
                <FacebookOutlined />
                <span>ติดต่อเกษตร</span>
              </button>
              <a
                href="/public/disease-forecast"
                className="mobile-more-item"
                onClick={closeMoreDrawer}
              >
                <BugOutlined style={{ color: '#ef4444' }} />
                <span>เตือนภัยโรค & แมลง</span>
              </a>
              <a
                href="/dashboard"
                className="mobile-more-item"
                onClick={(event) => {
                  closeMoreDrawer();
                  handleGuestAccess(event);
                }}
                aria-busy={guestAccessLoading}
              >
                <SearchOutlined />
                <span>เข้าดูข้อมูล</span>
              </a>
              <a
                href="/login"
                className="mobile-more-item"
                onClick={closeMoreDrawer}
              >
                <LoginOutlined />
                <span>สำหรับเจ้าหน้าที่</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
