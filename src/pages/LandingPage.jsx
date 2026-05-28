import { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { FloatButton, Modal } from 'antd';
import {
    AppstoreOutlined,
    ArrowUpOutlined,
    AuditOutlined,
    BankOutlined,
    BookOutlined,
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
    TeamOutlined,
    UpOutlined,
    UserSwitchOutlined
} from '@ant-design/icons';
import AgencyLinksPanel from '../components/widgets/AgencyLinksPanel';
import LandingFooter from '../components/widgets/LandingFooter';
import NewsAccordion from '../components/widgets/NewsAccordion';
import './LandingPage.css';
import './SaastyTheme.css';

// SEO: Page metadata
const SEO_TITLE = 'ศูนย์ข้อมูลการเกษตรนครปฐม | สำนักงานเกษตรจังหวัดนครปฐม';
const SEO_DESCRIPTION = 'ระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม — ข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ ท่องเที่ยวเกษตร สภาพอากาศ และราคาสินค้าเกษตร จังหวัดนครปฐม';

// Component Loading Fallback
const WidgetSkeleton = () => (
    <div className="widget-skeleton">
        <span style={{ fontSize: 24, textAlign: 'center' }}>กำลังโหลดข้อมูล...</span>
    </div>
);



// ========== WIDGET COMPONENT IMPORTS (Lazy Loading) ==========
const WeatherWidget = lazy(() => import('../components/widgets/WeatherWidget'));
const AirQualityWidget = lazy(() => import('../components/widgets/AirQualityWidget'));
const AgriPricesWidget = lazy(() => import('../components/widgets/AgriPricesWidget'));
const HotspotWidget = lazy(() => import('../components/widgets/HotspotWidget'));
const AgriGovNewsWidget = lazy(() => import('../components/widgets/AgriGovNewsWidget'));
const AgriMediaNewsWidget = lazy(() => import('../components/widgets/AgriMediaNewsWidget'));
const LandingMap = lazy(() => import('../components/widgets/LandingMap'));
const SoilMoistureWidget = lazy(() => import('../components/widgets/SoilMoistureWidget'));
const DamReservoirWidget = lazy(() => import('../components/widgets/DamReservoirWidget'));
const FarmerInstitutesV2Widget = lazy(() => import('../components/widgets/FarmerInstitutesV2Widget'));

// Bento Cards specific lazy imports
const AgriTourismCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.AgriTourismCard })));
const AgriAreasCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.AgriAreasCard })));

const quickNavItems = [
    { href: '#agri-overview', label: 'แผนที่และภาพรวม', Icon: EnvironmentOutlined },
    { href: '#soil-water', label: 'ดินและน้ำ', Icon: ExperimentOutlined },
    { href: '#agri-news', label: 'ข่าวและประกาศ', Icon: ReadOutlined },
];

const infoNavItems = [
    { key: 'audience', label: 'ระบบนี้ช่วยใคร', Icon: TeamOutlined },
    { key: 'contacts', label: 'ติดต่อสำนักงานเกษตรอำเภอ', Icon: FacebookOutlined },
    { key: 'agencyLinks', label: 'ทางลัด', Icon: LinkOutlined },
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

const audienceItems = [
    {
        title: 'ผู้บริหารจังหวัดและผู้บริหารสำนักงาน',
        outcome: 'เห็นภาพรวมสถานการณ์เกษตรระดับจังหวัดจากหน้าเดียว ทั้งพื้นที่ ครัวเรือน กลุ่มเกษตรกร ภัยพิบัติ น้ำ และราคาตลาด',
        actions: ['ติดตามตัวชี้วัดสำคัญ', 'ใช้ประกอบการประชุม', 'มองเห็นพื้นที่ที่ควรเร่งประสานงาน'],
        Icon: BankOutlined,
    },
    {
        title: 'เจ้าหน้าที่กลุ่มงาน',
        outcome: 'ลดเวลารวบรวมข้อมูลจากหลายไฟล์ หลายตาราง และหลายแหล่ง ให้ค้นหา ตรวจสอบ และเปิดรายละเอียดตามภารกิจได้เร็วขึ้น',
        actions: ['ดูข้อมูลแยกกลุ่มงาน', 'เปิดหน้ารายละเอียดสาธารณะ', 'เตรียมรายงานหรือส่งต่อข้อมูล'],
        Icon: AuditOutlined,
    },
    {
        title: 'เกษตรกร ประชาชน และหน่วยงานภายนอก',
        outcome: 'เข้าถึงข้อมูลสาธารณะที่เข้าใจง่าย เช่น อากาศ PM2.5 ราคา จุดความร้อน ข่าว และภาพรวมเกษตรของนครปฐมโดยไม่ต้องเข้าสู่ระบบ',
        actions: ['เช็กข้อมูลประจำวัน', 'ดูแผนที่และข่าว', 'เข้าสู่กระดานถามตอบ'],
        Icon: TeamOutlined,
    },
    {
        title: 'ผู้ดูแลข้อมูลและผู้ดูแลระบบ',
        outcome: 'มีโครงสร้างกลางสำหรับดูแลข้อมูล ผู้ใช้ สิทธิ์ การนำเข้าข้อมูล และ audit trail เพื่อให้ระบบต่อยอดได้ต่อเนื่อง',
        actions: ['ควบคุมสิทธิ์ตามบทบาท', 'ตรวจสอบข้อมูลย้อนหลัง', 'ดูแลชุดข้อมูลกลาง'],
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
        isProvincial: true
    },
    {
        name: 'สำนักงานเกษตรอำเภอเมืองนครปฐม',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/muangpathom',
        tel: '0 3425 2753',
        address: 'อำเภอเมืองนครปฐม'
    },
    {
        name: 'สำนักงานเกษตรอำเภอกำแพงแสน',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/snng.kes.tr.xaphex.kaph.ngs.n.canghwad.nkhrpthm',
        tel: '0 3435 1312',
        address: 'อำเภอกำแพงแสน'
    },
    {
        name: 'สำนักงานเกษตรอำเภอนครชัยศรี',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/profile.php?id=61557741274035',
        tel: '0 3433 1862',
        address: 'อำเภอนครชัยศรี'
    },
    {
        name: 'สำนักงานเกษตรอำเภอดอนตูม',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/kasetamperdontoom/',
        tel: '0 3438 1124',
        address: 'อำเภอดอนตูม'
    },
    {
        name: 'สำนักงานเกษตรอำเภอบางเลน',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/profile.php?id=61585093269788',
        tel: '0 3439 1115',
        address: 'อำเภอบางเลน'
    },
    {
        name: 'สำนักงานเกษตรอำเภอพุทธมณฑล',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/phuttamonthon.doae/',
        tel: '0 2441 0837',
        address: 'อำเภอพุทธมณฑล'
    },
    {
        name: 'สำนักงานเกษตรอำเภอสามพราน',
        type: 'district',
        facebookUrl: 'https://www.facebook.com/kasetsamphran/',
        tel: '0 3432 1972',
        address: 'อำเภอสามพราน'
    }
];

export default function LandingPage() {
    const {
        loading, mapData, districtStats, smartFarmers, enterprises,
        ceDistrictStats, tourism, instituteStats, lpStats, agriStats, largePlotsList
    } = useDashboardData();

    const navigate = useNavigate();
    const [activeInfoModal, setActiveInfoModal] = useState(null);
    const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
    const [moreDrawerClosing, setMoreDrawerClosing] = useState(false);
    const hasTourismData = loading || (tourism.count > 0 || tourism.list.length > 0);

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

            <div className="landing-floating-system-tabs" aria-label="System shortcuts">
                {externalSystemLinks.map(({ href, title, subtitle, Icon, isInternal }) => (
                    isInternal ? (
                        <button
                            key={href}
                            className="landing-system-tab"
                            onClick={() => navigate(href)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Icon aria-hidden="true" />
                            <span>
                                <strong>{title}</strong>
                                <small>{subtitle}</small>
                            </span>
                        </button>
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
                ))}
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
                <button
                    className="landing-system-tab"
                    onClick={() => setActiveInfoModal('forumCta')}
                    style={{ cursor: 'pointer' }}
                >
                    <CommentOutlined aria-hidden="true" />
                    <span>
                        <strong>ชุมชนเกษตรกร</strong>
                        <small>Farmer Forum</small>
                    </span>
                </button>
            </div>

            <nav className="landing-quick-nav" aria-label="เมนูลัดข้อมูล">
                <div className="landing-quick-nav-inner">
                    <span className="quick-nav-label">ไปยังข้อมูลสำคัญ</span>
                    <div className="quick-nav-links">
                        {quickNavItems.map(({ href, label, Icon }) => (
                            <a key={href} href={href} className="quick-nav-link">
                                <Icon aria-hidden="true" />
                                <span>{label}</span>
                            </a>
                        ))}
                        {infoNavItems.map(({ key, label, Icon }) => (
                            <button
                                key={key}
                                type="button"
                                className="quick-nav-link quick-nav-button"
                                onClick={() => setActiveInfoModal(key)}
                            >
                                <Icon aria-hidden="true" />
                                <span>{label}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            className="quick-nav-link quick-nav-button login-btn-quick"
                            onClick={() => navigate('/login')}
                        >
                            <LoginOutlined aria-hidden="true" />
                            <span>เข้าสู่ระบบ</span>
                        </button>
                    </div>
                </div>
            </nav>

            <header className="bento-header" role="banner">
                <div className="bento-header-bg"></div>
                <div className="bento-header-content">
                    <h1 className="bento-title">
                        ศูนย์ข้อมูลการเกษตรอัจฉริยะ
                        <span className="bento-title-province">จังหวัดนครปฐม</span>
                    </h1>
                    <p className="bento-subtitle">
                        ฐานข้อมูลกลางและสถานการณ์การเกษตรจังหวัดนครปฐม เพื่อการบริหารจัดการที่แม่นยำและยั่งยืน
                    </p>

                    
                    <div className="hero-actions">
                        <a
                            href="https://nakhonpathom.doae.go.th/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-primary-link"
                            aria-label="เข้าสู่เว็บไซต์สำนักงานเกษตรจังหวัดนครปฐม"
                        >
                            🏛️ เข้าสู่เว็บไซต์สำนักงานเกษตรจังหวัดนครปฐม
                        </a>
                        <button
                            onClick={() => navigate('/interactive-dashboard')}
                            style={{
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '14px 28px',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                fontFamily: "'Kanit', 'Athiti', 'IBM Plex Sans Thai', -apple-system, sans-serif"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(22, 163, 74, 0.5)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(22, 163, 74, 0.4)'; }}
                        >
                            📊 ดูสรุปข้อมูลแบบ Interactive (ทดลองใช้)
                        </button>
                    </div>

                    <div className="bento-motto" aria-label="คำขวัญจังหวัดนครปฐม">
                        <span className="bento-motto-text">
                            "ส้มโอหวาน ข้าวสารขาว ลูกสาวงาม ข้าวหลามหวานมัน สนามจันทร์งามล้น พุทธมณฑลคู่ธานี พระปฐมเจดีย์เสียดฟ้า สวยงามตาแม่น้ำท่าจีน"
                        </span>
                    </div>
                </div>
            </header>

            <main>
                {/* ===== LIVE WIDGETS ===== */}
                <section id="live-data" aria-label="ข้อมูลสภาพอากาศและราคาสินค้าเกษตร">
                    <div className="top-widgets-container">
                        <div className="top-widgets-col">
                            <Suspense fallback={<WidgetSkeleton />}><WeatherWidget /></Suspense>
                            <Suspense fallback={<WidgetSkeleton />}><AirQualityWidget /></Suspense>
                        </div>
                        <Suspense fallback={<WidgetSkeleton />}><AgriPricesWidget /></Suspense>
                    </div>

                    <div className="widget-section-container">
                        <Suspense fallback={<WidgetSkeleton />}><HotspotWidget /></Suspense>
                    </div>
                </section>

                {/* ===== BENTO GRID LATEST LISTS ===== */}
                <div id="agri-overview" className="dept-stats-header">
                    <h2>📊 ข้อมูลการเกษตรจังหวัดนครปฐม</h2>
                    <p>สถิติและข้อมูลสารสนเทศการเกษตรในพื้นที่</p>
                </div>
                <section className={`bento-container ${hasTourismData ? '' : 'bento-container-no-tourism'}`}>

                    {/* 1. Map Card (Large) */}
                    <div className="bento-card bento-card-map">
                        <div className="bento-card-header">
                            <h3>🗺️ แผนที่ข้อมูลการเกษตร</h3>
                            <span>พิกัดพื้นที่เชิงเกษตร (GIS, ท่องเที่ยว)</span>
                        </div>
                        <div className="bento-card-body p-0">
                            <Suspense fallback={<WidgetSkeleton />}>
                                <LandingMap mapData={mapData} districtStats={districtStats} />
                            </Suspense>
                        </div>
                    </div>





                    {/* 4. Agri Tourism */}
                    {hasTourismData && (
                        <Suspense fallback={<WidgetSkeleton />}>
                            <AgriTourismCard data={tourism} loading={loading} />
                        </Suspense>
                    )}

                    {/* 5. Farmer Groups & Institutes */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <FarmerInstitutesV2Widget />
                    </Suspense>

                    {/* 6. Agri Areas */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <AgriAreasCard stats={agriStats} districtStats={districtStats} loading={loading} />
                    </Suspense>

                </section>


                {/* ===== SOIL & WATER WIDGETS ===== */}
                <section id="soil-water" aria-label="ข้อมูลดินและสถานการณ์น้ำ">
                    <div className="dept-stats-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            🌍 สถานการณ์ดินและน้ำ
                        </h2>
                    </div>
                    <div className="soil-water-grid">
                        <Suspense fallback={<WidgetSkeleton />}><SoilMoistureWidget defaultExpanded={false} /></Suspense>
                        <Suspense fallback={<WidgetSkeleton />}><DamReservoirWidget defaultExpanded={false} /></Suspense>
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
                                description: 'กรมส่งเสริมการเกษตร • เกษตรจังหวัด • หน่วยงานวิชาการ',
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
                            ระบบนี้เป็นทางเข้ากลางของข้อมูลเกษตรจังหวัดนครปฐม ทั้งฝั่งสาธารณะและฝั่งงานภายในสำนักงาน
                        </p>
                    </div>
                </div>
                <div className="audience-grid modal-grid">
                    {audienceItems.map(({ title, outcome, actions, Icon }) => (
                        <article className="audience-card" key={title}>
                            <div className="audience-card-icon"><Icon aria-hidden="true" /></div>
                            <h3>{title}</h3>
                            <p>{outcome}</p>
                            <ul>
                                {actions.map(action => <li key={action}>{action}</li>)}
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
                            ช่องทางการติดต่อสำนักงานเกษตรจังหวัดนครปฐม และสำนักงานเกษตรอำเภอผ่านทาง Facebook Page และหมายเลขโทรศัพท์ติดต่อ
                        </p>
                    </div>
                </div>
                
                <div className="contacts-modal-body">
                    {/* Provincial Office (Highlighted) */}
                    {contactItems.filter(item => item.isProvincial).map(prov => (
                        <div className="contacts-provincial-card" key={prov.name}>
                            <div className="contacts-card-left">
                                <div className="contacts-provincial-icon">
                                    <FacebookOutlined className="fb-icon-large" />
                                </div>
                                <div className="contacts-provincial-details">
                                    <span className="contacts-badge">หน่วยงานหลักระดับจังหวัด</span>
                                    <h3>{prov.name}</h3>
                                    <p className="contacts-address">📍 {prov.address}</p>
                                    <p className="contacts-phone">📞 เบอร์โทรศัพท์: <a href={`tel:${prov.tel.replace(/\s+/g, '')}`}>{prov.tel}</a></p>
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

                    <h4 className="contacts-grid-title">สำนักงานเกษตรอำเภอ (ทั้ง 7 อำเภอในจังหวัดนครปฐม)</h4>
                    
                    {/* District Grid */}
                    <div className="contacts-districts-grid">
                        {contactItems.filter(item => !item.isProvincial).map(dist => (
                            <div className="contacts-district-card" key={dist.name}>
                                <div className="contacts-district-header">
                                    <h3>{dist.name}</h3>
                                    <span className="contacts-district-badge">อ. {dist.name.replace('สำนักงานเกษตรอำเภอ', '')}</span>
                                </div>
                                <div className="contacts-district-body">
                                    <div className="contacts-phone-info">
                                        <span>📞 โทรศัพท์:</span>
                                        <a href={`tel:${dist.tel.replace(/\s+/g, '')}`}>{dist.tel}</a>
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
                    <Suspense fallback={<WidgetSkeleton />}><SoilMoistureWidget defaultExpanded={true} /></Suspense>
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
                    <Suspense fallback={<WidgetSkeleton />}><DamReservoirWidget defaultExpanded={true} /></Suspense>
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
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#0f172a' }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>💬</div>
                    <h2 style={{ color: '#166534', fontSize: '24px', marginBottom: '14px', fontWeight: '800' }}>มีข้อสงสัยเรื่องการเกษตร? สอบถามชุมชนของเรา!</h2>
                    <p style={{ color: '#475569', fontSize: '15px', maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.6, fontWeight: 500 }}>
                        เข้าร่วม <b>"กระดานข่าวอัจฉริยะ (Farmer Forum)"</b> พื้นที่แลกเปลี่ยนเรียนรู้ ถามตอบปัญหา แจ้งพิกัดโรคพืช และอัปเดตราคาตลาด สำหรับเกษตรกรนครปฐม
                    </p>
                    <button
                        onClick={() => {
                            setActiveInfoModal(null);
                            navigate('/dashboard/community/forum');
                        }}
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
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 15px rgba(22,163,74,0.3)',
                            fontFamily: 'inherit'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(22,163,74,0.4)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(22,163,74,0.3)'; }}
                    >
                        เข้าสู่กระดานข่าว / ตั้งกระทู้ถาม
                    </button>
                </div>
            </Modal>

            {/* ===== FOOTER ===== */}
            <LandingFooter onOpenPanel={setActiveInfoModal} />
            {/* ===== BACK TO TOP BUTTON ===== */}
            <FloatButton.BackTop icon={<ArrowUpOutlined />} tooltip="กลับขึ้นบนสุด" style={{ bottom: 40, right: 40, width: 50, height: 50 }} />

            {/* ===== MOBILE BOTTOM NAV BAR ===== */}
            <nav className="mobile-bottom-nav" aria-label="เมนูลัดมือถือ">
                <button
                    className="mobile-bottom-nav-item"
                    onClick={() => navigate('/smart-map')}
                >
                    <EnvironmentOutlined />
                    <span>แผนที่</span>
                </button>
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
                <button
                    className="mobile-bottom-nav-item"
                    onClick={() => setActiveInfoModal('forumCta')}
                >
                    <CommentOutlined />
                    <span>ชุมชน</span>
                </button>
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
                    onClick={(e) => { if (e.target === e.currentTarget) closeMoreDrawer(); }}
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
                                onClick={() => { closeMoreDrawer(); setActiveInfoModal('agencyLinks'); }}
                            >
                                <LinkOutlined />
                                <span>ทางลัดหน่วยงาน</span>
                            </button>
                            <button
                                className="mobile-more-item"
                                onClick={() => { closeMoreDrawer(); setActiveInfoModal('audience'); }}
                            >
                                <TeamOutlined />
                                <span>ระบบช่วยใคร</span>
                            </button>
                            <button
                                className="mobile-more-item"
                                onClick={() => { closeMoreDrawer(); setActiveInfoModal('contacts'); }}
                            >
                                <FacebookOutlined />
                                <span>ติดต่อเกษตร</span>
                            </button>
                            <button
                                className="mobile-more-item"
                                onClick={() => { closeMoreDrawer(); navigate('/login'); }}
                            >
                                <LoginOutlined />
                                <span>เข้าสู่ระบบ</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
