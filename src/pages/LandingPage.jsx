import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { EnvironmentOutlined, UsergroupAddOutlined, TeamOutlined, GlobalOutlined, CloudOutlined } from '@ant-design/icons';
import './LandingPage.css';

// ========== WIDGET COMPONENT IMPORTS ==========
import WeatherWidget from '../components/widgets/WeatherWidget';
import AirQualityWidget from '../components/widgets/AirQualityWidget';
import AgriPricesWidget from '../components/widgets/AgriPricesWidget';
import HotspotWidget from '../components/widgets/HotspotWidget';
import DoaeNewsWidget from '../components/widgets/DoaeNewsWidget';
import DoaeHqNewsWidget from '../components/widgets/DoaeHqNewsWidget';
import EscNewsWidget from '../components/widgets/EscNewsWidget';
import LandingMap from '../components/widgets/LandingMap';

export default function LandingPage() {
    const [loading, setLoading] = useState(true);
    const [mapData, setMapData] = useState([]);
    const [districtStats, setDistrictStats] = useState({});

    // Stats map
    const [allStats, setAllStats] = useState({});
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
    const [plots, setPlots] = useState({ list: [], count: 0 });

    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const fetchWithCount = async (table, selectStr = 'id') => {
        const { data, count } = await supabase.from(table)
            .select(selectStr, { count: 'exact' })
            .order('id', { ascending: false })
            .limit(3);
        return { list: data || [], count: count || 0 };
    };

    const loadDashboardData = async () => {
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
            setPlots(lpData);

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

            const countResults = await Promise.all(countPromises);
            const statsMap = {};
            countResults.forEach((res, idx) => {
                statsMap[tablesToCount[idx]] = res.count || 0;
            });
            setAllStats(statsMap);
            setDistrictStats(dStats);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderList = (items, fallback, renderItem) => {
        if (loading) return <div className="bento-loading">กำลังโหลดข้อมูล...</div>;
        if (!items || items.length === 0) return <div className="bento-empty">{fallback}</div>;
        return (
            <div className="bento-list">
                {items.map(renderItem)}
            </div>
        );
    };

    return (
        <div className="landing-page bento-theme">
            {/* ===== NAVBAR ===== */}
            <nav className="landing-nav">
                <div className="landing-nav-inner padding-x">
                    <div className="landing-nav-brand">
                        <span style={{ fontSize: 24 }}>🌾</span>
                        <span>เกษตรจังหวัดนครปฐม</span>
                    </div>
                    <button className="landing-login-btn" onClick={() => navigate('/login')}>
                        เข้าสู่ระบบเจ้าหน้าที่ และ บุคคลทั่วไป
                    </button>
                </div>
            </nav>

            {/* ===== HEADER ===== */}
            <header className="bento-header">
                <div className="bento-header-bg"></div>
                <div className="bento-header-content">
                    <div className="bento-badge">🏛️ สำนักงานเกษตรจังหวัดนครปฐม</div>
                    <h1 className="bento-title">ศูนย์ข้อมูลการเกษตรอัจฉริยะแบบบูรณาการ</h1>
                    <p className="bento-subtitle" style={{ color: '#e2e8f0' }}>
                        รวบรวมและอัปเดตข้อมูลเกษตรกร พื้นที่เพาะปลูก ศูนย์วิทยบริการ และสถานการณ์ภัยพิบัติในจังหวัดนครปฐม
                        เพื่อสนับสนุนการบริหารจัดการที่แม่นยำและยกระดับการเกษตรอย่างยั่งยืน
                    </p>
                </div>
            </header>

            {/* ===== LIVE WIDGETS ===== */}
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
                <div className="bento-card" style={{ gridArea: 'sf' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>🧑‍🌾 Smart Farmer</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {smartFarmers.count} ราย
                        </div>
                    </div>
                    <div className="bento-card-body">
                        {renderList(smartFarmers.list, 'รอเพิ่มข้อมูล...', (item) => (
                            <div key={item.id} className="bento-list-item">
                                <div className="bento-item-icon bg-orange-100 text-orange-600"><TeamOutlined /></div>
                                <div className="bento-item-content">
                                    <h4>{item.full_name}</h4>
                                    <p>อ.{item.district || '-'} &bull; {item.main_product || 'ไม่ระบุสินค้า'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Community Enterprises — แยกตามอำเภอ */}
                <div className="bento-card" style={{ gridArea: 'ce' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>🤝 วิสาหกิจชุมชน</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {enterprises.count} แห่ง
                        </div>
                    </div>
                    <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>

                        {/* จำนวนแยกตามอำเภอ */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>จำนวนตามอำเภอ (แห่ง)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {Object.entries(ceDistrictStats)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([dist, count]) => (
                                        <div key={dist} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                            <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>{dist}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{count}</span>
                                        </div>
                                    ))
                                }
                                {Object.keys(ceDistrictStats).length === 0 && !loading && (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. Large Plots */}
                <div className="bento-card" style={{ gridArea: 'lp' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>🌾 แปลงใหญ่</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {lpStats.total} แปลง
                        </div>
                    </div>
                    <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>

                        {/* Box 1: ประเภท (กลุ่ม) */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>กลุ่มสินค้าหลัก (แปลง)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef9c3', borderRadius: '6px' }}>
                                    <span style={{ fontSize: 12, color: '#854d0e', fontWeight: 500 }}>ข้าว</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ca8a04' }}>{lpStats.rice}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#dcfce3', borderRadius: '6px' }}>
                                    <span style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>ผัก/สมุนไพร</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{lpStats.veg_herb}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef3c7', borderRadius: '6px' }}>
                                    <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>ไม้ผล</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{lpStats.fruit}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f5f5f4', borderRadius: '6px' }}>
                                    <span style={{ fontSize: 12, color: '#57534e', fontWeight: 500 }}>พืชไร่</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#44403c' }}>{lpStats.field_crop}</span>
                                </div>
                                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f3e8ff', borderRadius: '6px' }}>
                                    <span style={{ fontSize: 12, color: '#6b21a8', fontWeight: 500 }}>กลุ่มอื่นๆ (ปศุสัตว์/ประมง/...)</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7e22ce' }}>{lpStats.other}</span>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: สมาชิก/พื้นที่ */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ปริมาณรวม (ราย/ไร่)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>จำนวนสมาชิกรวม</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{lpStats.members.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>พื้นที่รวม (ไร่)</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{lpStats.area.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 5. Agri Tourism */}
                <div className="bento-card" style={{ gridArea: 'at' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>🌿 แหล่งท่องเที่ยว</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {tourism.count} แห่ง
                        </div>
                    </div>
                    <div className="bento-card-body">
                        {renderList(tourism.list, 'รอเพิ่มข้อมูล...', (item) => (
                            <div key={item.id} className="bento-list-item">
                                <div className="bento-item-icon bg-purple-100 text-purple-600"><EnvironmentOutlined /></div>
                                <div className="bento-item-content">
                                    <h4>{item.spot_name}</h4>
                                    <p>อ.{item.district || '-'} &bull; {item.spot_type || 'ไม่ระบุ'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 6. Farmer Institutes (New Added Card) */}
                <div className="bento-card" style={{ gridArea: 'fi' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>👥 สถาบันเกษตรกร</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {instituteStats.total} กลุ่ม
                        </div>
                    </div>
                    <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>

                        {/* Box 1: กลุ่ม */}
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ประเภท (กลุ่ม)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                    <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>วิสาหกิจฯ</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{instituteStats.ce}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#dcfce3', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>แม่บ้านฯ</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a7f37' }}>{instituteStats.housewives}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                    <span style={{ fontSize: 12, color: '#d97706', fontWeight: 500 }}>ยุวเกษตรฯ</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{instituteStats.young_grp}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f3e8ff', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                                    <span style={{ fontSize: 12, color: '#7e22ce', fontWeight: 500 }}>ส่งเสริมอาชีพ</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6b21a8' }}>{instituteStats.career}</span>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: บุคคล */}
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>สมาชิก/เกษตรกร (ราย)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>เกษตรกรทั่วไป (หมู่บ้าน)</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{instituteStats.village}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Smart Farmer</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{instituteStats.sf}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>YSF</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{instituteStats.ysf}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 7. Agri Areas (New Added Card like Farmer Institutes) */}
                <div className="bento-card" style={{ gridArea: 'ag' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc', background: 'linear-gradient(to right, #f0fdf4, #ffffff)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, background: '#dcfce3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🪴</div>
                            <h3 style={{ fontSize: 22, color: '#0f172a', margin: 0 }}>สรุปพื้นที่การเกษตร แยกตามชนิดพืช</h3>
                        </div>
                    </div>
                    <div className="bento-card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        {/* Overview Stats - Vertical Stack */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '8px' }}>
                                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>พื้นที่ทั้งหมด</span>
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#1e3a8a' }}>{agriStats.total_area.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 600 }}>ไร่</span></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #10b981', borderRadius: '8px' }}>
                                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>พื้นที่ด้านพืชรวม</span>
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#064e3b' }}>{agriStats.crop_area.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 600 }}>ไร่</span></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #f59e0b', borderRadius: '8px' }}>
                                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>ครัวเรือนเกษตรกร</span>
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#78350f' }}>{agriStats.households.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 600 }}>ครัว.</span></span>
                            </div>
                        </div>

                        {/* Crop Types - 2 Column Grid */}
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', borderBottom: '2px solid #dcfce3', paddingBottom: 5, marginBottom: 10 }}>พื้นที่เพาะปลูกพืชหลัก (ไร่)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fef9c3', borderRadius: '8px', border: '1px solid #fde047' }}>
                                <span style={{ fontSize: 12, color: '#854d0e', fontWeight: 600 }}>ข้าวนาปี</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#ca8a04' }}>{agriStats.rice_pi.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>ข้าวนาปรัง</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#d97706' }}>{agriStats.rice_prung.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f5f5f4', borderRadius: '8px', border: '1px solid #e7e5e4' }}>
                                <span style={{ fontSize: 12, color: '#57534e', fontWeight: 600 }}>พืชไร่</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#44403c' }}>{agriStats.field_crops.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#dcfce3', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>พืชสวน</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>{agriStats.hort.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>พืชผัก</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#047857' }}>{agriStats.veg.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f0fdfa', borderRadius: '8px', border: '1px solid #99f6e4' }}>
                                <span style={{ fontSize: 12, color: '#115e59', fontWeight: 600 }}>ไม้ผล/ยืนต้น</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f766e' }}>{agriStats.fruit.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fce7f3', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                                <span style={{ fontSize: 12, color: '#9d174d', fontWeight: 600 }}>ไม้ดอกฯ</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#be185d' }}>{agriStats.flow.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>สมุนไพร</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#4b5563' }}>{agriStats.herb.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </section>

            {/* ===== ALL 5 GROUPS OVERVIEW (moved to bottom) ===== */}
            <section className="dept-stats-container">
                <div className="dept-stats-header">
                    <h2>📊 ภาพรวมข้อมูล 5 ยุทธศาสตร์</h2>
                    <p>สถิติข้อมูลล่าสุดแยกตามกลุ่มงานภายในสำนักงาน</p>
                </div>

                <div className="dept-grid">
                    {/* Admin */}
                    <div className="dept-card" style={{ '--theme': '#0ea5e9' }}>
                        <div className="dept-icon">🏢</div>
                        <h3>ฝ่ายบริหารทั่วไป</h3>
                        <ul>
                            <li><span>บุคลากร</span> <strong>{allStats.personnel || 0}</strong></li>
                            <li><span>พัสดุ/ครุภัณฑ์</span> <strong>{allStats.assets || 0}</strong></li>
                            <li><span>โครงการงบประมาณ</span> <strong>{allStats.budgets || 0}</strong></li>
                        </ul>
                    </div>

                    {/* Strategy */}
                    <div className="dept-card" style={{ '--theme': '#8b5cf6' }}>
                        <div className="dept-icon">📋</div>
                        <h3>ยุทธศาสตร์และสารสนเทศ</h3>
                        <ul>
                            <li><span>พื้นที่การเกษตร (ข้อมูล)</span> <strong>{allStats.agricultural_areas || 0} แห่ง</strong></li>
                            <li><span>ศูนย์ ศพก.</span> <strong>{allStats.learning_centers || 0}</strong></li>
                            <li><span>รายงานภัยพิบัติ</span> <strong>{allStats.disasters || 0}</strong></li>
                        </ul>
                    </div>

                    {/* Production */}
                    <div className="dept-card" style={{ '--theme': '#f59e0b' }}>
                        <div className="dept-icon">🌾</div>
                        <h3>ส่งเสริมและพัฒนาการผลิต</h3>
                        <ul>
                            <li><span>แปลงใหญ่</span> <strong>{allStats.large_plots || 0}</strong></li>
                            <li><span>มาตรฐาน GAP</span> <strong>{allStats.certifications || 0}</strong></li>
                            <li><span>ผลผลิตพืช</span> <strong>{allStats.crop_production || 0}</strong></li>
                        </ul>
                    </div>

                    {/* Dev */}
                    <div className="dept-card" style={{ '--theme': '#10b981' }}>
                        <div className="dept-icon">🤝</div>
                        <h3>ส่งเสริมและพัฒนาเกษตรกร</h3>
                        <ul>
                            <li><span>วิสาหกิจชุมชน</span> <strong>{allStats.community_enterprises || 0}</strong></li>
                            <li><span>Smart Farmer</span> <strong>{allStats.smart_farmers || 0}</strong></li>
                            <li><span>กลุ่มสถาบันเกษตรกร</span> <strong>{instituteStats.total || 0}</strong></li>
                            <li><span>ท่องเที่ยวเกษตร</span> <strong>{allStats.agri_tourism || 0}</strong></li>
                        </ul>
                    </div>

                    {/* Protection */}
                    <div className="dept-card" style={{ '--theme': '#ef4444' }}>
                        <div className="dept-icon">🔬</div>
                        <h3>อารักขาพืชและจัดการดินปุ๋ย</h3>
                        <ul>
                            <li><span>ระบาดศัตรูพืช</span> <strong>{allStats.forecast_plots || 0}</strong></li>
                            <li><span>ศูนย์ ศจช.</span> <strong>{allStats.pest_centers || 0}</strong></li>
                            <li><span>ศูนย์ ศดปช.</span> <strong>{allStats.soil_fertilizer_centers || 0}</strong></li>
                            <li><span>จุดเฝ้าระวังไฟ/PM2.5</span> <strong>{allStats.fire_hotspots || 0}</strong></li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ===== DOAE HQ NEWS (doae.go.th ส่วนกลาง) ===== */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 40px', padding: '0 24px' }}>
                <DoaeHqNewsWidget />
            </div>

            {/* ===== DOAE NEWS (Pest Alerts + Agri News นครปฐม) ===== */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 40px', padding: '0 24px' }}>
                <DoaeNewsWidget />
            </div>

            {/* ===== ESC NEWS (esc.doae.go.th วิศวกรรมเกษตร) ===== */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 40px', padding: '0 24px' }}>
                <EscNewsWidget />
            </div>

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer" style={{ padding: '40px 0', borderTop: '1px solid #e2e8f0' }}>
                <div className="landing-footer-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ textAlign: 'center', opacity: 0.6 }}>
                        <strong>🌾 สำนักงานเกษตรจังหวัดนครปฐม</strong>
                        <p style={{ marginTop: 8, fontSize: 13, lineHeight: '1.6' }}>
                            131 ถนนทรงพล อำเภอเมือง จังหวัดนครปฐม 73000<br />
                            โทร. 0 3425 3992 | E-mail: nakhonpathom@doae.go.th
                        </p>
                        <p style={{ marginTop: 12, fontSize: 12 }}>
                            © {new Date().getFullYear()} ระบบฐานข้อมูลกลางเพื่อการเกษตร
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
