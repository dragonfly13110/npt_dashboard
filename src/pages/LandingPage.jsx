import { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FloatButton, Modal, Spin, Button } from 'antd';
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

// ========== KPI HUB COMPONENT IMPORTS ==========
import useLandingWidgetController from '../hooks/landing/useLandingWidgetController';
import SituationKpiSection from '../components/landing/sections/SituationKpiSection';
import ProvinceOverviewSection from '../components/landing/sections/ProvinceOverviewSection';
import ResourceMarketSection from '../components/landing/sections/ResourceMarketSection';
import LandingToolsSection from '../components/landing/sections/LandingToolsSection';
import MapPreviewSection from '../components/landing/sections/MapPreviewSection';
import NewsPreviewSection from '../components/landing/sections/NewsPreviewSection';
import KnowledgePreviewSection from '../components/landing/sections/KnowledgePreviewSection';
import ContactSection from '../components/landing/sections/ContactSection';
import WidgetDetailHost from '../components/landing/details/WidgetDetailHost';

import '../components/landing/LandingSections.css';
import '../components/landing/kpi/LandingKpiCard.css';

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
  const widgetController = useLandingWidgetController();
  const navigate = useNavigate();
  const location = useLocation();
  const [landingQuery, setLandingQuery] = useState('');
  const [activeInfoModal, setActiveInfoModal] = useState(null);
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

  const handleLandingSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!landingQuery.trim() || landingQuery.trim().length < 2) return;
      navigate(
        `/dashboard/search?q=${encodeURIComponent(landingQuery.trim())}`
      );
    },
    [landingQuery, navigate]
  );

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
          onClick={() => widgetController.openWidget('soilMoisture')}
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
          onClick={() => widgetController.openWidget('reservoir')}
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
          <a href="#agri-overview">ภาพรวม</a>
          <a href="/smart-map">แผนที่</a>
          <a href="#dataset-explorer">ชุดข้อมูล</a>
          <a href="#agri-news">ข่าว</a>
          <a href="/manual">คู่มือ</a>
          <button
            onClick={() => setActiveInfoModal('audience')}
            className="premium-nav-button"
          >
            ระบบนี้ช่วยใคร
          </button>
          <a href="/login" className="premium-login">
            เข้าสู่ระบบ
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
            <h1>
              ศูนย์ข้อมูลการเกษตรอัจฉริยะ{' '}
              <span style={{ display: 'inline-block' }}>จังหวัดนครปฐม</span>
            </h1>
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

      <main style={{ padding: '0 24px', boxSizing: 'border-box' }}>
        <SituationKpiSection onOpenWidget={widgetController.openWidget} />
        <ProvinceOverviewSection onOpenWidget={widgetController.openWidget} />
        <ResourceMarketSection onOpenWidget={widgetController.openWidget} />
        <LandingToolsSection onOpenModal={setActiveInfoModal} />
        <MapPreviewSection />
        <NewsPreviewSection />
        <KnowledgePreviewSection />
        <ContactSection />
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
          onClick={() => widgetController.openWidget('soilMoisture')}
        >
          <ExperimentOutlined />
          <span>ความชื้นดิน</span>
        </button>
        <button
          className="mobile-bottom-nav-item"
          onClick={() => widgetController.openWidget('reservoir')}
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
                href="/login"
                className="mobile-more-item"
                onClick={closeMoreDrawer}
              >
                <LoginOutlined />
                <span>เข้าสู่ระบบ</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <WidgetDetailHost
        activeWidgetKey={widgetController.activeWidgetKey}
        open={Boolean(widgetController.activeWidgetKey)}
        onClose={widgetController.closeWidget}
      />
    </div>
  );
}
