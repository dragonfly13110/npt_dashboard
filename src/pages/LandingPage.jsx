import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { message, FloatButton } from 'antd';
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
    const [loading, setLoading] = useState(true);
    const [mapData, setMapData] = useState([]);
    const [districtStats, setDistrictStats] = useState({});

    // Stats map
    const [instituteStats, setInstituteStats] = useState({
        total: 0, ce: 0, housewives: 0, young_grp: 0, career: 0, village: 0, sf: 0, ysf: 0
    });

    // Large Plots stats
    const [lpStats, setLpStats] = useState({
        total: 0, rice: 0, veg_herb: 0, fruit: 0, field_crop: 0, other: 0, members: 0, area: 0
    });

    // Agri stats
    const [agriStats, setAgriStats] = useState({
        households: 0, total_area: 0, crop_area: 0,
        rice_pi: 0, rice_prung: 0, field_crops: 0, hort: 0, fruit: 0, veg: 0, flow: 0, herb: 0
    });

    // Lists
    const [smartFarmers, setSmartFarmers] = useState({ list: [], count: 0 });
    const [enterprises, setEnterprises] = useState({ list: [], count: 0 });
    const [ceDistrictStats, setCeDistrictStats] = useState({});
    const [tourism, setTourism] = useState({ list: [], count: 0 });

    const navigate = useNavigate();

    // SEO: Set dynamic page title & meta description
    useEffect(() => {
        document.title = SEO_TITLE;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', SEO_DESCRIPTION);
    }, []);

    const fetchWithCount = async (table, selectStr = 'id') => {
        const { data, count } = await supabase.from(table)
            .select(selectStr, { count: 'exact' })
            .order('id', { ascending: false })
            .limit(3);
        return { list: data || [], count: count || 0 };
    };

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // Map Data
            const mapPts = [];
            const [{ data: gis }, { data: tourMap }] = await Promise.all([
                supabase.from('gis_areas').select('area_name, district, latitude, longitude').not('latitude', 'is', null).limit(20),
                supabase.from('agri_tourism').select('spot_name, district, latitude, longitude').not('latitude', 'is', null).limit(20)
            ]);

            (gis || []).forEach(r => {
                if (r.latitude && r.longitude) mapPts.push({ name: r.area_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'gis', typeLabel: 'พื้นที่ GIS' });
            });
            (tourMap || []).forEach(r => {
                if (r.latitude && r.longitude) mapPts.push({ name: r.spot_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'tourism', typeLabel: 'ท่องเที่ยวเกษตร' });
            });
            setMapData(mapPts);

            // Fetch Real Data Lists & Farmer Institutes data
            const [sfData, ceData, atData, { data: lpData }, { data: instData }, { data: agriAreaData }, { data: lcData }, { data: pcData }, { data: sfcData }] = await Promise.all([
                fetchWithCount('smart_farmers', 'id, full_name, district, main_product'),
                supabase.from('community_enterprises').select('id, district', { count: 'exact' }),
                fetchWithCount('agri_tourism', 'id, spot_name, district, spot_type'),
                supabase.from('large_plots').select('*'),
                supabase.from('farmer_institutes').select('*'),
                supabase.from('agricultural_areas').select('*').neq('district', 'รวม'),
                supabase.from('learning_centers').select('district'),
                supabase.from('pest_centers').select('district'),
                supabase.from('soil_fertilizer_centers').select('district')
            ]);
            // Prepare district stats aggregation
            const dists = ['เมืองนครปฐม', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม', 'บางเลน', 'สามพราน', 'พุทธมณฑล'];
            const dStats = {};
            dists.forEach(d => dStats[d] = {
                ce: 0, lp: 0, area: 0, house: 0,
                ricePi: 0, ricePrung: 0, field: 0, fruit: 0, veg: 0, flow: 0, herb: 0,
                lc: 0, pc: 0, sfc: 0,
                instHousewives: 0, instYoung: 0, instCareer: 0, instVillage: 0
            });

            setSmartFarmers(sfData);
            // Community Enterprises: count by district
            const ceList = ceData.data || [];
            const ceCount = ceData.count || ceList.length;
            setEnterprises({ list: [], count: ceCount });
            const distCounts = {};
            ceList.forEach(r => {
                let d = r.district || 'ไม่ระบุ';
                if (d === 'เมือง') d = 'เมืองนครปฐม';
                distCounts[d] = (distCounts[d] || 0) + 1;
                if (dStats[d]) dStats[d].ce += 1;
            });
            setCeDistrictStats(distCounts);
            setTourism(atData);

            // Compute Farmer Institutes Totals
            let iTotal = 0, iCE = 0, iHouse = 0, iYoungGrp = 0, iCareer = 0, iVillage = 0, iSF = 0, iYSF = 0;
            (instData || []).forEach(row => {
                let d = row.district;
                if (d === 'เมือง') d = 'เมืองนครปฐม';
                if (dStats[d]) {
                    dStats[d].instHousewives += Number(row.housewives_groups) || 0;
                    dStats[d].instYoung += Number(row.young_farmer_groups) || 0;
                    dStats[d].instCareer += Number(row.career_promotion_groups) || 0;
                    dStats[d].instVillage += Number(row.village_farmers_count) || 0;
                }

                iTotal += Number(row.total_groups) || 0;
                iCE += Number(row.community_enterprise_groups) || 0;
                iHouse += Number(row.housewives_groups) || 0;
                iYoungGrp += Number(row.young_farmer_groups) || 0;
                iCareer += Number(row.career_promotion_groups) || 0;
                iVillage += Number(row.village_farmers_count) || 0;
                iSF += Number(row.smart_farmer_count) || 0;
                iYSF += Number(row.young_smart_farmer_count) || 0;
            });
            setInstituteStats({
                total: iTotal, ce: iCE, housewives: iHouse, young_grp: iYoungGrp, career: iCareer,
                village: iVillage, sf: iSF, ysf: iYSF
            });

            // Compute Large Plots stats
            let lRice = 0, lVegH = 0, lFruit = 0, lField = 0, lOther = 0, lMems = 0, lArea = 0;
            (lpData || []).forEach(row => {
                lMems += Number(row.member_count) || 0;
                lArea += Number(row.area_rai) || 0;
                const g = row.commodity_group;
                if (g === 'ข้าว') lRice++;
                else if (g === 'ผัก/สมุนไพร') lVegH++;
                else if (g === 'ไม้ผล') lFruit++;
                else if (g === 'พืชไร่') lField++;
                else lOther++;

                let d = row.district;
                if (d === 'เมือง') d = 'เมืองนครปฐม';
                if (dStats[d]) dStats[d].lp += 1;
            });
            setLpStats({
                total: lpData ? lpData.length : 0,
                rice: lRice, veg_herb: lVegH, fruit: lFruit, field_crop: lField, other: lOther,
                members: lMems, area: lArea
            });

            // Distribute Centers to district stats
            (lcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].lc++; });
            (pcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].pc++; });
            (sfcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].sfc++; });

            // Fetch and Compute Agri Areas Totals
            let aHouse = 0, aTotal = 0, aCrop = 0, aRicePi = 0, aRicePrung = 0, aField = 0, aHort = 0, aFruit = 0, aVeg = 0, aFlow = 0, aHerb = 0;
            (agriAreaData || []).forEach(row => {
                aHouse += Number(row.farmer_households) || 0;
                aTotal += Number(row.total_area_rai) || 0;
                aCrop += Number(row.agri_crop_area_rai) || 0;
                aRicePi += Number(row.rice_in_season_rai) || 0;
                aRicePrung += Number(row.rice_off_season_rai) || 0;
                aField += Number(row.field_crops_rai) || 0;
                aHort += Number(row.horticulture_rai) || 0;
                aFruit += Number(row.fruit_trees_rai) || 0;
                aVeg += Number(row.vegetables_rai) || 0;
                aFlow += Number(row.flowers_rai) || 0;
                aHerb += Number(row.herbs_spices_rai) || 0;

                let d = row.district;
                if (d === 'เมือง') d = 'เมืองนครปฐม';
                if (dStats[d]) {
                    dStats[d].area += Number(row.agri_crop_area_rai) || 0;
                    dStats[d].house += Number(row.farmer_households) || 0;
                    dStats[d].ricePi += Number(row.rice_in_season_rai) || 0;
                    dStats[d].ricePrung += Number(row.rice_off_season_rai) || 0;
                    dStats[d].field += Number(row.field_crops_rai) || 0;
                    dStats[d].fruit += Number(row.fruit_trees_rai) || 0;
                    dStats[d].veg += Number(row.vegetables_rai) || 0;
                    dStats[d].flow += Number(row.flowers_rai) || 0;
                    dStats[d].herb += Number(row.herbs_spices_rai) || 0;
                }
            });
            setAgriStats({
                households: aHouse, total_area: aTotal, crop_area: aCrop,
                rice_pi: aRicePi, rice_prung: aRicePrung, field_crops: aField,
                hort: aHort, fruit: aFruit, veg: aVeg, flow: aFlow, herb: aHerb
            });

            // Fetch ALL stats concurrently
            const tablesToCount = [
                'personnel', 'assets', 'budgets',
                'agricultural_areas', 'learning_centers', 'disasters',
                'large_plots', 'certifications', 'crop_production',
                'community_enterprises', 'smart_farmers', 'agri_tourism',
                'forecast_plots', 'pest_centers', 'soil_fertilizer_centers', 'fire_hotspots'
            ];

            const countPromises = tablesToCount.map(table =>
                supabase.from(table).select('id', { count: 'exact', head: true })
            );

            await Promise.all(countPromises);
            setDistrictStats(dStats);

        } catch (e) {
            console.error(e);
            message.error({ content: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง', duration: 5, style: { marginTop: '20vh' } });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

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
