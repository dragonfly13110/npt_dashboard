import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { EnvironmentOutlined, UsergroupAddOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';
import './LandingPage.css'; // New dedicated styles

// ========== MAP COMPONENT (Existing logic adapted) ==========
function LandingMap({ mapData }) {
    const [MapComponents, setMapComponents] = useState(null);

    useEffect(() => {
        // Dynamic import to avoid SSR issues
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
        ]).then(([L, RL]) => {
            // Fix default icon issue
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    if (!MapComponents) {
        return <div className="map-placeholder">กำลังโหลดแผนที่...</div>;
    }

    const { MapContainer, TileLayer, Popup, CircleMarker } = MapComponents;

    return (
        <div className="bento-map-wrapper">
            <MapContainer
                center={[13.82, 100.06]}
                zoom={10}
                style={{ height: '100%', width: '100%', borderRadius: 16 }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapData.map((item, idx) => (
                    <CircleMarker
                        key={idx}
                        center={[item.lat, item.lon]}
                        radius={8}
                        fillColor={item.type === 'gis' ? '#2563eb' : '#16a34a'}
                        fillOpacity={0.85}
                        color="#fff"
                        weight={2}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'inherit', minWidth: 160 }}>
                                <strong>{item.name}</strong>
                                {item.district && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>อ.{item.district}</div>}
                                <div className={`badge ${item.type}`}>
                                    {item.typeLabel}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}

export default function LandingPage() {
    const [loading, setLoading] = useState(true);
    const [mapData, setMapData] = useState([]);
    
    // Stats map
    const [allStats, setAllStats] = useState({});
    const [instituteStats, setInstituteStats] = useState({
        total: 0, ce: 0, housewives: 0, young_grp: 0, career: 0, village: 0, sf: 0, ysf: 0
    });

    // Lists
    const [smartFarmers, setSmartFarmers] = useState({ list: [], count: 0 });
    const [enterprises, setEnterprises] = useState({ list: [], count: 0 });
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
            const [ { data: gis }, { data: tourMap } ] = await Promise.all([
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
            const [sfData, ceData, atData, lpData, { data: instData }] = await Promise.all([
                fetchWithCount('smart_farmers', 'id, full_name, district, main_product'),
                fetchWithCount('community_enterprises', 'id, enterprise_name, district, product_type'),
                fetchWithCount('agri_tourism', 'id, spot_name, district, spot_type'),
                fetchWithCount('large_plots', 'id, plot_name, district, commodity'),
                supabase.from('farmer_institutes').select('*')
            ]);
            setSmartFarmers(sfData);
            setEnterprises(ceData);
            setTourism(atData);
            setPlots(lpData);

            // Compute Farmer Institutes Totals
            let iTotal = 0, iCE = 0, iHouse = 0, iYoungGrp = 0, iCareer = 0, iVillage = 0, iSF = 0, iYSF = 0;
            (instData || []).forEach(row => {
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

            // Fetch ALL stats concurrently
            const tablesToCount = [
                'personnel', 'assets', 'budgets',
                'gis_areas', 'learning_centers', 'disasters',
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
                        เข้าสู่ระบบเจ้าหน้าที่
                    </button>
                </div>
            </nav>

            {/* ===== HEADER ===== */}
            <header className="bento-header">
                <div className="bento-header-bg"></div>
                <div className="bento-header-content">
                    <div className="bento-badge">🏛️ สำนักงานเกษตรจังหวัดนครปฐม</div>
                    <h1 className="bento-title">ระบบฐานข้อมูลอัจฉริยะแบบบูรณาการ</h1>
                    <p className="bento-subtitle" style={{ color: '#e2e8f0' }}>
                        ครอบคลุมข้อมูลบุคลากร วิสาหกิจชุมชน พื้นที่ปลูก และการอารักขาพืช ในจังหวัดนครปฐม<br/>
                        เชื่อมโยงทุกมิติเพื่อการพัฒนาการเกษตรที่ยั่งยืน
                    </p>
                </div>
            </header>

            {/* ===== ALL 5 GROUPS OVERVIEW ===== */}
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
                            <li><span>พื้นที่การเกษตร (GIS)</span> <strong>{allStats.gis_areas || 0}</strong></li>
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
                        <LandingMap mapData={mapData} />
                    </div>
                </div>

                {/* (We removed the OVERALL STATS card from here because we now have the big 5 Dept-Stats section) */}

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

                {/* 3. Community Enterprises */}
                <div className="bento-card" style={{ gridArea: 'ce' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>🤝 วิสาหกิจชุมชน</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {enterprises.count} แห่ง
                        </div>
                    </div>
                    <div className="bento-card-body">
                        {renderList(enterprises.list, 'รอเพิ่มข้อมูล...', (item) => (
                            <div key={item.id} className="bento-list-item">
                                <div className="bento-item-icon bg-blue-100 text-blue-600"><UsergroupAddOutlined /></div>
                                <div className="bento-item-content">
                                    <h4>{item.enterprise_name}</h4>
                                    <p>อ.{item.district || '-'} &bull; {item.product_type || 'ไม่ระบุ'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Large Plots */}
                <div className="bento-card" style={{ gridArea: 'lp' }}>
                    <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>🌾 แปลงใหญ่</h3>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            ทั้งหมด {plots.count} แปลง
                        </div>
                    </div>
                    <div className="bento-card-body">
                        {renderList(plots.list, 'รอเพิ่มข้อมูล...', (item) => (
                            <div key={item.id} className="bento-list-item">
                                <div className="bento-item-icon bg-green-100 text-green-600"><GlobalOutlined /></div>
                                <div className="bento-item-content">
                                    <h4>{item.plot_name}</h4>
                                    <p>อ.{item.district || '-'} &bull; {item.commodity || 'ไม่ระบุ'}</p>
                                </div>
                            </div>
                        ))}
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

            </section>

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer" style={{ padding: '40px 0', borderTop: '1px solid #e2e8f0' }}>
                <div className="landing-footer-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ textAlign: 'center', opacity: 0.6 }}>
                        <strong>🌾 สำนักงานเกษตรจังหวัดนครปฐม</strong>
                        <p style={{ marginTop: 8, fontSize: 13, lineHeight: '1.6' }}>
                            131 ถนนทรงพล อำเภอเมือง จังหวัดนครปฐม 73000<br/>
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
