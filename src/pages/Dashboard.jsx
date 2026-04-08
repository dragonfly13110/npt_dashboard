import { useEffect, useState, useRef, useMemo } from 'react';
import { Skeleton, Button, Row, Col, Card } from 'antd';
import {
    PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer
} from 'recharts';
import {
    FilePdfOutlined,
    AimOutlined, BankOutlined, TeamOutlined, AlertOutlined,
    ScheduleOutlined
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';

// ===== LANDING PAGE WIDGETS =====
import WeatherWidget from '../components/widgets/WeatherWidget';
import AirQualityWidget from '../components/widgets/AirQualityWidget';
import AgriPricesWidget from '../components/widgets/AgriPricesWidget';
import HotspotWidget from '../components/widgets/HotspotWidget';

import LandingMap from '../components/widgets/LandingMap';
import {
    SmartFarmersCard, CommunityEnterprisesCard, LargePlotsCard,
    AgriTourismCard, FarmerInstitutesCard, AgriAreasCard
} from '../components/widgets/LandingBentoCards';

import '../pages/LandingPage.css';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

// All tables grouped by section
const groupConfig = [
    { group: 'ยุทธศาสตร์ฯ', icon: '🎯', color: '#1565c0', tables: [
        { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
        { table: 'learning_centers', label: 'ศพก.' },
        { table: 'disasters', label: 'ภัยพิบัติ' },
    ]},
    { group: 'ส่งเสริมการผลิต', icon: '🌱', color: '#43a047', tables: [
        { table: 'large_plots', label: 'แปลงใหญ่' },
        { table: 'certifications', label: 'มาตรฐาน GAP' },
        { table: 'crop_production', label: 'ผลผลิตพืช' },
    ]},
    { group: 'พัฒนาเกษตรกร', icon: '🤝', color: '#6a1b9a', tables: [
        { table: 'community_enterprises', label: 'วิสาหกิจ' },
        { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่' },
        { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน' },
        { table: 'farmer_institutes', label: 'สถาบันเกษตรกร' },
        { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
    ]},
    { group: 'อารักขาพืช', icon: '🛡️', color: '#e65100', tables: [
        { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
        { table: 'pest_centers', label: 'ศจช.' },
        { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
        { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
    ]},
];

const allTables = groupConfig.flatMap(g => g.tables.map(t => ({ ...t, group: g.group, groupIcon: g.icon, groupColor: g.color })));



export default function Dashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agriData, setAgriData] = useState([]);
    const [largePlots, setLargePlots] = useState([]);
    const [fiData, setFiData] = useState([]);
    const [pdfExporting, setPdfExporting] = useState(false);
    const dashRef = useRef(null);

    // ===== LANDING PAGE DATA STATE =====
    const [mapData, setMapData] = useState([]);
    const [districtStats, setDistrictStats] = useState({});
    const [smartFarmers, setSmartFarmers] = useState({ list: [], count: 0 });
    const [enterprises, setEnterprises] = useState({ list: [], count: 0 });
    const [ceDistrictStats, setCeDistrictStats] = useState({});
    const [tourism, setTourism] = useState({ list: [], count: 0 });
    const [instituteStats, setInstituteStats] = useState({
        total: 0, ce: 0, housewives: 0, young_grp: 0, career: 0, village: 0, sf: 0, ysf: 0
    });
    const [lpStats, setLpStats] = useState({
        total: 0, rice: 0, veg_herb: 0, fruit: 0, field_crop: 0, other: 0, members: 0, area: 0
    });
    const [agriStats, setAgriStats] = useState({
        households: 0, total_area: 0, crop_area: 0,
        rice_pi: 0, rice_prung: 0, field_crops: 0, hort: 0, fruit: 0, veg: 0, flow: 0, herb: 0
    });

    useEffect(() => {
        loadStats();
        loadChartData();
        loadLandingData();
    }, []);

    // ===== ORIGINAL DASHBOARD DATA =====
    async function loadStats() {
        setLoading(true);
        const results = [];
        for (const tbl of allTables) {
            try {
                const { count, error } = await supabase
                    .from(tbl.table)
                    .select('*', { count: 'exact', head: true });
                results.push({ ...tbl, count: error ? 0 : (count ?? 0) });
            } catch {
                results.push({ ...tbl, count: 0 });
            }
        }
        setStats(results);
        setLoading(false);
    };

    async function loadChartData() {
        try {
            const [agri, lp, fi] = await Promise.all([
                supabase.from('agricultural_areas').select('rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai'),
                supabase.from('large_plots').select('commodity_group'),
                supabase.from('farmer_institutes').select('community_enterprise_groups'), // unused in charts, but kept fi array format minimally
            ]);
            setAgriData(agri.data || []);
            setLargePlots(lp.data || []);
            setFiData(fi.data || []);
        } catch { /* skip */ }
    };

    // ===== LANDING PAGE DATA LOADER =====
    async function fetchWithCount(table, selectStr = 'id') {
        const { data, count } = await supabase.from(table)
            .select(selectStr, { count: 'exact' })
            .order('id', { ascending: false })
            .limit(3);
        return { list: data || [], count: count || 0 };
    };

    async function loadLandingData() {
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

            // Fetch Real Data
            const dists = ['เมืองนครปฐม', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม', 'บางเลน', 'สามพราน', 'พุทธมณฑล'];
            const dStats = {};
            dists.forEach(d => dStats[d] = {
                ce: 0, lp: 0, area: 0, house: 0,
                ricePi: 0, ricePrung: 0, field: 0, fruit: 0, veg: 0, flow: 0, herb: 0,
                lc: 0, pc: 0, sfc: 0,
                instHousewives: 0, instYoung: 0, instCareer: 0, instVillage: 0
            });

            const [sfData, ceData, atData, { data: lpData }, { data: instData }, { data: agriAreaData }, { data: lcData }, { data: pcData }, { data: sfcData }] = await Promise.all([
                fetchWithCount('smart_farmers', 'id, full_name, district, main_product'),
                supabase.from('community_enterprises').select('id, district', { count: 'exact' }),
                fetchWithCount('agri_tourism', 'id, spot_name, district, spot_type'),
                supabase.from('large_plots').select('district, member_count, area_rai, commodity_group'),
                supabase.from('farmer_institutes').select('district, housewives_groups, young_farmer_groups, career_promotion_groups, village_farmers_count, total_groups, community_enterprise_groups, smart_farmer_count, young_smart_farmer_count'),
                supabase.from('agricultural_areas').select('district, farmer_households, total_area_rai, agri_crop_area_rai, rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai').neq('district', 'รวม'),
                supabase.from('learning_centers').select('district'),
                supabase.from('pest_centers').select('district'),
                supabase.from('soil_fertilizer_centers').select('district')
            ]);

            setSmartFarmers(sfData);

            // Community Enterprises
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

            // Compute Farmer Institutes
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

            // Large Plots stats
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

            // Centers distribution
            (lcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].lc++; });
            (pcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].pc++; });
            (sfcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].sfc++; });

            // Agri Areas
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

            setDistrictStats(dStats);
        } catch (e) {
            console.error('Landing data error:', e);
        }
    };

    // --- Charts ---
    const agriPie = useMemo(() => {
        const fields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร' },
        ];
        return fields.map(f => ({
            name: f.label,
            value: agriData.reduce((sum, row) => sum + (Number(row[f.key]) || 0), 0)
        })).filter(d => d.value > 0);
    }, [agriData]);

    const lpPie = useMemo(() => {
        const map = {};
        largePlots.forEach(p => {
            const cg = p.commodity_group || 'ไม่ระบุ';
            map[cg] = (map[cg] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [largePlots]);

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    const handleExportPdf = async () => {
        if (!dashRef.current) return;
        setPdfExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(dashRef.current, {
                scale: 2, useCORS: true, logging: false, backgroundColor: '#f6f8fa',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
            const w = canvas.width * ratio;
            const h = canvas.height * ratio;
            pdf.addImage(imgData, 'PNG', (pdfW - w) / 2, 4, w, h);
            pdf.save(`dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) { console.error(err); }
        finally { setPdfExporting(false); }
    };

    return (
        <div ref={dashRef} className="dashboard-unified">
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div className="md-page-header" style={{ marginBottom: 0 }}>
                    <h2>📊 แดชบอร์ดรวม</h2>
                    <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>ภาพรวมข้อมูลทั้งหมด — สภาพอากาศ ราคาสินค้า และข้อมูลเกษตรกร</p>
                </div>
                <Button
                    icon={<FilePdfOutlined />}
                    onClick={handleExportPdf}
                    loading={pdfExporting}
                    className="export-btn pdf-export-btn"
                >
                    พิมพ์ PDF
                </Button>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 1: LIVE WIDGETS — Weather / AQI / Prices       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">🌤️</span>
                <span>สภาพอากาศ คุณภาพอากาศ และราคาสินค้าเกษตร</span>
            </div>
            <div className="dash-live-widgets">
                <div className="dash-live-left">
                    <WeatherWidget />
                    <AirQualityWidget />
                </div>
                <div className="dash-live-right">
                    <AgriPricesWidget />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 2: HOTSPOT / FIRE MAP                          */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">🔥</span>
                <span>สถานการณ์ไฟ / จุดความร้อน</span>
            </div>
            <div style={{ marginBottom: 28 }}>
                <HotspotWidget />
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 3: GROUP SUMMARY CARDS                         */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">📈</span>
                <span>สรุปข้อมูลตามกลุ่มงาน</span>
            </div>
            <div className="md-stat-row">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="md-stat-card"><Skeleton active paragraph={{ rows: 1 }} /></div>
                    ))
                ) : (
                    groupConfig.map((g) => {
                        const groupTotal = stats.filter(s => s.group === g.group).reduce((sum, s) => sum + s.count, 0);
                        const IconMap = { 'ยุทธศาสตร์ฯ': AimOutlined, 'ส่งเสริมการผลิต': BankOutlined, 'พัฒนาเกษตรกร': TeamOutlined, 'อารักขาพืช': AlertOutlined };
                        const IconComp = IconMap[g.group] || AimOutlined;
                        const colorMap = { '#1565c0': 'blue', '#43a047': 'green', '#6a1b9a': 'purple', '#e65100': 'orange' };
                        return (
                            <div key={g.group} className="md-stat-card">
                                <div className="md-stat-card-inner">
                                    <div className="md-stat-card-top">
                                        <div className={`md-stat-icon ${colorMap[g.color] || 'blue'}`}>
                                            <IconComp style={{ fontSize: 24 }} />
                                        </div>
                                        <div className="md-stat-info">
                                            <div className="md-stat-label">{g.icon} {g.group}</div>
                                            <div className="md-stat-value">{groupTotal.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="md-stat-footer">
                                        <ScheduleOutlined />
                                        <span>รายการข้อมูลรวม {g.tables.length} หมวด</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 4: BENTO CARDS + MAP (from Landing Page)       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">📅</span>
                <span>ข้อมูลเกษตรกร แปลงใหญ่ วิสาหกิจชุมชน แหล่งท่องเที่ยว และแผนที่</span>
            </div>
            <section className="bento-container dash-bento-override" style={{ marginTop: 0 }}>
                {/* Map Card */}
                <div className="bento-card bento-card-map" style={{ gridArea: 'map' }}>
                    <div className="bento-card-header">
                        <h3>🗺️ แผนที่ข้อมูลการเกษตร</h3>
                        <span>พิกัดพื้นที่เชิงเกษตร (GIS, ท่องเที่ยว)</span>
                    </div>
                    <div className="bento-card-body p-0">
                        <LandingMap mapData={mapData} districtStats={districtStats} />
                    </div>
                </div>

                <SmartFarmersCard data={smartFarmers} loading={loading} />
                <CommunityEnterprisesCard count={enterprises.count} districtStats={ceDistrictStats} loading={loading} />
                <LargePlotsCard stats={lpStats} loading={loading} />
                <AgriTourismCard data={tourism} loading={loading} />
                <FarmerInstitutesCard stats={instituteStats} loading={loading} />
                <AgriAreasCard stats={agriStats} loading={loading} />
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 5: CHARTS                                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">📊</span>
                <span>แผนภูมิวิเคราะห์ข้อมูล</span>
            </div>
            <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="🌾 สัดส่วนพื้นที่เกษตรตามชนิดพืช" size="small" bordered style={{ borderRadius: 16 }}>
                        <div style={{ height: 300 }}>
                            {agriPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={agriPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {agriPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip formatter={(val) => [val.toLocaleString() + ' ไร่', 'พื้นที่']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart label="พื้นที่การเกษตร" />}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="🌿 แปลงใหญ่ตามกลุ่มสินค้า" size="small" bordered style={{ borderRadius: 16 }}>
                        <div style={{ height: 300 }}>
                            {lpPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={lpPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {lpPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip formatter={(val) => [val + ' แปลง', 'จำนวน']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart label="แปลงใหญ่" />}
                        </div>
                    </Card>
                </Col>
            </Row>



            {/* Empty state */}
            {totalRecords === 0 && !loading && (
                <div className="md-empty-state">
                    <div className="md-empty-icon">📭</div>
                    <h3>ยังไม่มีข้อมูลในระบบ</h3>
                    <p>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}
