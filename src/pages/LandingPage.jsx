import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { FloatButton } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import './LandingPage.css';

// SEO: Page metadata
const SEO_TITLE = 'ศูนย์ข้อมูลการเกษตรนครปฐม | สำนักงานเกษตรจังหวัดนครปฐม';
const SEO_DESCRIPTION = 'ระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม — ข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ ท่องเที่ยวเกษตร สภาพอากาศ และราคาสินค้าเกษตร จังหวัดนครปฐม';

// ========== WIDGET COMPONENT IMPORTS ==========
import WeatherWidget from '../components/widgets/WeatherWidget';
import AirQualityWidget from '../components/widgets/AirQualityWidget';
import AgriPricesWidget from '../components/widgets/AgriPricesWidget';
import HotspotWidget from '../components/widgets/HotspotWidget';
import AgriGovNewsWidget from '../components/widgets/AgriGovNewsWidget';
import AgriMediaNewsWidget from '../components/widgets/AgriMediaNewsWidget';
import LandingMap from '../components/widgets/LandingMap';
import { SmartFarmersCard, CommunityEnterprisesCard, LargePlotsCard, AgriTourismCard, FarmerInstitutesCard, AgriAreasCard } from '../components/widgets/LandingBentoCards';

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
                        <span style={{ fontSize: 24 }} role="img" aria-label="รวงข้าว">🌾</span>
                        <span>เกษตรจังหวัดนครปฐม</span>
                    </a>
                    <button className="landing-login-btn" onClick={() => navigate('/login')} aria-label="เข้าสู่ระบบสำหรับเจ้าหน้าที่และบุคคลทั่วไป">
                        เข้าสู่ระบบเจ้าหน้าที่ และ บุคคลทั่วไป
                    </button>
                </div>
            </nav>

            {/* ===== HEADER ===== */}
            <header className="bento-header" role="banner">
                <div className="bento-header-bg"></div>
                <div className="bento-header-content">
                    <div className="bento-badge" role="img" aria-label="สำนักงานเกษตรจังหวัดนครปฐม">🏛️ สำนักงานเกษตรจังหวัดนครปฐม</div>
                    <h1 className="bento-title">ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม</h1>
                    <p className="bento-subtitle" style={{ color: '#e2e8f0' }}>
                        รวบรวมและอัปเดตข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ สภาพอากาศ ราคาสินค้าเกษตร และสถานการณ์ภัยพิบัติในจังหวัดนครปฐม
                        เพื่อสนับสนุนการบริหารจัดการที่แม่นยำและยกระดับการเกษตรอย่างยั่งยืน
                    </p>
                </div>
            </header>

            <main>

                {/* ===== LIVE WIDGETS ===== */}
                <section aria-label="ข้อมูลสภาพอากาศและราคาสินค้าเกษตร">
                    <div className="top-widgets-container">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <WeatherWidget />
                            <AirQualityWidget />
                        </div>
                        <AgriPricesWidget />
                    </div>

                    <div style={{ maxWidth: '1200px', margin: '0 auto 40px', padding: '0 24px' }}>
                        <HotspotWidget />
                    </div>
                </section>

                {/* ===== BENTO GRID LATEST LISTS ===== */}
                <div className="dept-stats-header" style={{ marginTop: 20 }}>
                    <h2>📅 ข้อมูลและกิจกรรมล่าสุด</h2>
                    <p>ตัวอย่างรายชื่อข้อมูลที่ถูกเพิ่มหรืออัปเดตเข้าระบบ</p>
                </div>
                <section className="bento-container" style={{ marginTop: 20 }}>

                    {/* 1. Map Card (Large) */}
                    <div className="bento-card bento-card-map" style={{ gridArea: 'map' }}>
                        <div className="bento-card-header">
                            <h3>🗺️ แผนที่ข้อมูลการเกษตร</h3>
                            <span>พิกัดพื้นที่เชิงเกษตร (GIS, ท่องเที่ยว)</span>
                        </div>
                        <div className="bento-card-body p-0">
                            <LandingMap mapData={mapData} districtStats={districtStats} />
                        </div>
                    </div>

                    {/* 2. Smart Farmers */}
                    <SmartFarmersCard data={smartFarmers} loading={loading} />

                    {/* 3. Community Enterprises */}
                    <CommunityEnterprisesCard count={enterprises.count} districtStats={ceDistrictStats} loading={loading} />

                    {/* 4. Large Plots */}
                    <LargePlotsCard stats={lpStats} loading={loading} />

                    {/* 5. Agri Tourism */}
                    <AgriTourismCard data={tourism} loading={loading} />

                    {/* 6. Farmer Institutes */}
                    <FarmerInstitutesCard stats={instituteStats} loading={loading} />

                    {/* 7. Agri Areas */}
                    <AgriAreasCard stats={agriStats} loading={loading} />

                </section>



                {/* ===== AGRI GOV NEWS (ข่าวจากหน่วยงานภาครัฐ) ===== */}
                <div style={{ maxWidth: '1200px', margin: '0 auto 40px', padding: '0 24px' }}>
                    <AgriGovNewsWidget />
                </div>

                {/* ===== AGRI MEDIA NEWS (ข่าวเกษตรจากสื่อมวลชน) ===== */}
                <div style={{ maxWidth: '1200px', margin: '0 auto 40px', padding: '0 24px' }}>
                    <AgriMediaNewsWidget />
                </div>


            </main>

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer" style={{ padding: '40px 0', borderTop: '1px solid #e2e8f0' }} role="contentinfo" itemScope itemType="https://schema.org/GovernmentOrganization">
                <div className="landing-footer-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ textAlign: 'center', opacity: 0.6 }}>
                        <strong itemProp="name">🌾 สำนักงานเกษตรจังหวัดนครปฐม</strong>
                        <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                            <p style={{ marginTop: 8, fontSize: 13, lineHeight: '1.6' }}>
                                <span itemProp="streetAddress">131 ถนนทรงพล</span>{' '}
                                <span itemProp="addressLocality">อำเภอเมือง</span>{' '}
                                <span itemProp="addressRegion">จังหวัดนครปฐม</span>{' '}
                                <span itemProp="postalCode">73000</span><br />
                                โทร. <a href="tel:034253992" itemProp="telephone" style={{ color: 'inherit' }}>0 3425 3992</a> | E-mail: <a href="mailto:nakhonpathom@doae.go.th" itemProp="email" style={{ color: 'inherit' }}>nakhonpathom@doae.go.th</a>
                            </p>
                        </div>
                        <p style={{ marginTop: 12, fontSize: 12 }}>
                            © {new Date().getFullYear()} ระบบฐานข้อมูลกลางเพื่อการเกษตร | <a href="https://nakhonpathom.doae.go.th" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>nakhonpathom.doae.go.th</a>
                        </p>
                    </div>
                </div>
            </footer>
            {/* ===== BACK TO TOP BUTTON ===== */}
            <FloatButton.BackTop icon={<ArrowUpOutlined />} tooltip="กลับขึ้นบนสุด" style={{ bottom: 40, right: 40, width: 50, height: 50 }} />
        </div>
    );
}
