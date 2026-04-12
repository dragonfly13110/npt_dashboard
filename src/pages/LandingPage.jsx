import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { FloatButton } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import './LandingPage.css';

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

// Bento Cards specific lazy imports
const SmartFarmersCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.SmartFarmersCard })));
const CommunityEnterprisesCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.CommunityEnterprisesCard })));
const LargePlotsCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.LargePlotsCard })));
const AgriTourismCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.AgriTourismCard })));
const FarmerInstitutesCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.FarmerInstitutesCard })));
const AgriAreasCard = lazy(() => import('../components/widgets/LandingBentoCards').then(module => ({ default: module.AgriAreasCard })));

export default function LandingPage() {
    const {
        loading, mapData, districtStats, smartFarmers, enterprises,
        ceDistrictStats, tourism, instituteStats, lpStats, agriStats
    } = useDashboardData();

    const navigate = useNavigate();

    // SEO: Set dynamic page title & meta description
    useEffect(() => {
        document.title = SEO_TITLE;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', SEO_DESCRIPTION);
    }, []);

    return (
        <div className="landing-page bento-theme">
            {/* ===== NAVBAR ===== */}
            <nav className="landing-nav" aria-label="เมนูหลัก">
                <div className="landing-nav-inner padding-x">
                    <a href="/" className="landing-nav-brand" aria-label="หน้าหลัก สำนักงานเกษตรจังหวัดนครปฐม">
                        <span className="brand-emoji" role="img" aria-label="รวงข้าว">🌾</span>
                        <span>เกษตรจังหวัดนครปฐม</span>
                    </a>
                    <button className="landing-login-btn" onClick={() => navigate('/login')} aria-label="เข้าสู่ระบบสำหรับเจ้าหน้าที่และบุคคลทั่วไป">
                        เข้าสู่ระบบ
                    </button>
                </div>
            </nav>

            {/* ===== HEADER ===== */}
            <header className="bento-header" role="banner">
                <div className="bento-header-bg"></div>
                <div className="bento-header-content">
                    <div className="bento-badge" role="img" aria-label="สำนักงานเกษตรจังหวัดนครปฐม">🏛️ สำนักงานเกษตรจังหวัดนครปฐม</div>
                    <h1 className="bento-title">ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม</h1>
                    <p className="bento-subtitle">
                        รวบรวมและอัปเดตข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ สภาพอากาศ ราคาสินค้าเกษตร และสถานการณ์ภัยพิบัติในจังหวัดนครปฐม
                        เพื่อสนับสนุนการบริหารจัดการที่แม่นยำและยกระดับการเกษตรอย่างยั่งยืน
                    </p>

                    <div className="hero-actions" style={{ marginTop: '36px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <button 
                            onClick={() => navigate('/interactive-dashboard')} 
                            style={{ 
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
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
                                boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(16, 185, 129, 0.5)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4)'; }}
                        >
                            📊 ดูสรุปข้อมูลแบบ Interactive (ทดลองใช้)
                        </button>
                    </div>
                </div>
            </header>

            <main>

                {/* ===== LIVE WIDGETS ===== */}
                <section aria-label="ข้อมูลสภาพอากาศและราคาสินค้าเกษตร">
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

                {/* ===== SOIL & WATER WIDGETS ===== */}
                <section aria-label="ข้อมูลดินและสถานการณ์น้ำ">
                    <div className="dept-stats-header">
                        <h2>🌍 สถานการณ์ดินและน้ำ</h2>
                        <p>ข้อมูลสดจากเซ็นเซอร์ดินและกรมชลประทาน เพื่อการเกษตรที่แม่นยำ</p>
                    </div>
                    <div className="soil-water-grid">
                        <Suspense fallback={<WidgetSkeleton />}><SoilMoistureWidget /></Suspense>
                        <Suspense fallback={<WidgetSkeleton />}><DamReservoirWidget /></Suspense>
                    </div>
                </section>

                {/* ===== BENTO GRID LATEST LISTS ===== */}
                <div className="dept-stats-header">
                    <h2>📊 ภาพรวมข้อมูลการเกษตรจังหวัด</h2>
                    <p>สถิติและข้อมูลสารสนเทศการเกษตรในพื้นที่</p>
                </div>
                <section className="bento-container">

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

                    {/* 2. Smart Farmers */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <SmartFarmersCard data={smartFarmers} loading={loading} />
                    </Suspense>

                    {/* 3. Community Enterprises */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <CommunityEnterprisesCard count={enterprises.count} districtStats={ceDistrictStats} loading={loading} />
                    </Suspense>

                    {/* 4. Large Plots */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <LargePlotsCard stats={lpStats} loading={loading} />
                    </Suspense>

                    {/* 5. Agri Tourism */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <AgriTourismCard data={tourism} loading={loading} />
                    </Suspense>

                    {/* 6. Farmer Institutes */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <FarmerInstitutesCard stats={instituteStats} loading={loading} />
                    </Suspense>

                    {/* 7. Agri Areas */}
                    <Suspense fallback={<WidgetSkeleton />}>
                        <AgriAreasCard stats={agriStats} loading={loading} />
                    </Suspense>

                </section>



                {/* ===== AGRI GOV NEWS (ข่าวจากหน่วยงานภาครัฐ) ===== */}
                <div className="widget-section-container">
                    <Suspense fallback={<WidgetSkeleton />}><AgriGovNewsWidget /></Suspense>
                </div>

                {/* ===== AGRI MEDIA NEWS (ข่าวเกษตรจากสื่อมวลชน) ===== */}
                <div className="widget-section-container">
                    <Suspense fallback={<WidgetSkeleton />}><AgriMediaNewsWidget /></Suspense>
                </div>


            </main>

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer" role="contentinfo" itemScope itemType="https://schema.org/GovernmentOrganization">
                <div className="landing-footer-content">
                    <div className="footer-info">
                        <strong itemProp="name">🌾 สำนักงานเกษตรจังหวัดนครปฐม</strong>
                        <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                            <p className="footer-address">
                                <span itemProp="streetAddress">131 ถนนทรงพล</span>{' '}
                                <span itemProp="addressLocality">อำเภอเมือง</span>{' '}
                                <span itemProp="addressRegion">จังหวัดนครปฐม</span>{' '}
                                <span itemProp="postalCode">73000</span><br />
                                โทร. <a href="tel:034253992" itemProp="telephone" className="footer-link">0 3425 3992</a> | E-mail: <a href="mailto:nakhonpathom@doae.go.th" itemProp="email" className="footer-link">nakhonpathom@doae.go.th</a>
                            </p>
                        </div>
                        <p className="footer-copyright">
                            © {new Date().getFullYear()} ระบบฐานข้อมูลกลางเพื่อการเกษตร | <a href="https://nakhonpathom.doae.go.th" target="_blank" rel="noopener noreferrer" className="footer-link footer-link-underline">nakhonpathom.doae.go.th</a>
                        </p>
                    </div>
                </div>
            </footer>
            {/* ===== BACK TO TOP BUTTON ===== */}
            <FloatButton.BackTop icon={<ArrowUpOutlined />} tooltip="กลับขึ้นบนสุด" style={{ bottom: 40, right: 40, width: 50, height: 50 }} />
        </div>
    );
}
