import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../supabaseClient';

const COLORS = ['#1a7f37', '#0969da', '#bf8700', '#8250df', '#cf222e', '#2da44e', '#218bff', '#d4a72c'];

const statConfig = [
    { table: 'personnel', label: 'บุคลากร', icon: '👥', color: 'green' },
    { table: 'assets', label: 'พัสดุ/ครุภัณฑ์', icon: '💻', color: 'blue' },
    { table: 'budgets', label: 'โครงการงบประมาณ', icon: '💰', color: 'orange' },
    { table: 'farmer_registry', label: 'ทะเบียนเกษตรกร', icon: '📋', color: 'purple' },
    { table: 'large_plots', label: 'แปลงใหญ่', icon: '🌾', color: 'green' },
    { table: 'community_enterprises', label: 'วิสาหกิจชุมชน', icon: '🤝', color: 'blue' },
    { table: 'pest_outbreaks', label: 'พื้นที่ระบาด', icon: '🐛', color: 'red' },
    { table: 'smart_farmers', label: 'Smart Farmer', icon: '🧑‍🌾', color: 'orange' },
];

// กลุ่มงาน 5 กลุ่ม พร้อม sub-tables
const groupDashConfig = [
    {
        icon: '🏢', title: 'ฝ่ายบริหารทั่วไป', color: '#1a7f37',
        tables: [
            { table: 'personnel', label: 'บุคลากร' },
            { table: 'assets', label: 'พัสดุ' },
            { table: 'budgets', label: 'งบประมาณ' },
        ],
    },
    {
        icon: '📊', title: 'ยุทธศาสตร์และสารสนเทศ', color: '#0969da',
        tables: [
            { table: 'farmer_registry', label: 'ทะเบียน' },
            { table: 'gis_areas', label: 'GIS' },
            { table: 'disasters', label: 'ภัยพิบัติ' },
            { table: 'kpi_plans', label: 'KPI' },
        ],
    },
    {
        icon: '🌾', title: 'ส่งเสริมการผลิต', color: '#bf8700',
        tables: [
            { table: 'large_plots', label: 'แปลงใหญ่' },
            { table: 'learning_centers', label: 'ศพก.' },
            { table: 'certifications', label: 'GAP' },
            { table: 'crop_production', label: 'ผลผลิต' },
        ],
    },
    {
        icon: '🤝', title: 'ส่งเสริมเกษตรกร', color: '#8250df',
        tables: [
            { table: 'community_enterprises', label: 'วิสาหกิจ' },
            { table: 'smart_farmers', label: 'Smart Farmer' },
            { table: 'farmer_groups', label: 'กลุ่มฯ' },
            { table: 'agri_tourism', label: 'ท่องเที่ยว' },
        ],
    },
    {
        icon: '🔬', title: 'อารักขาพืช', color: '#cf222e',
        tables: [
            { table: 'pest_outbreaks', label: 'ระบาด' },
            { table: 'pest_centers', label: 'ศจช.' },
            { table: 'biocontrol_stock', label: 'ชีวภัณฑ์' },
            { table: 'fire_hotspots', label: 'PM2.5' },
        ],
    },
];

// ========== MAP COMPONENT ==========
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
        return <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>กำลังโหลดแผนที่...</div>;
    }

    const { MapContainer, TileLayer, Marker, Popup, CircleMarker } = MapComponents;

    const markerTypes = [
        { key: 'gis', label: 'พื้นที่ GIS', color: '#0969da', emoji: '📍' },
        { key: 'tourism', label: 'ท่องเที่ยวเกษตร', color: '#1a7f37', emoji: '🌿' },
        { key: 'fire', label: 'จุดเฝ้าระวัง PM2.5', color: '#cf222e', emoji: '🔥' },
    ];

    return (
        <div className="landing-map-wrapper">
            <MapContainer
                center={[13.82, 100.06]}
                zoom={10}
                style={{ height: 420, borderRadius: 12 }}
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
                        fillColor={item.type === 'gis' ? '#0969da' : item.type === 'tourism' ? '#1a7f37' : '#cf222e'}
                        fillOpacity={0.8}
                        color="#fff"
                        weight={2}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'inherit', minWidth: 160 }}>
                                <strong>{item.name}</strong>
                                {item.district && <div style={{ fontSize: 12, color: '#656d76', marginTop: 4 }}>อ.{item.district}</div>}
                                <div style={{
                                    fontSize: 11, marginTop: 4, padding: '2px 8px', borderRadius: 8, display: 'inline-block',
                                    background: item.type === 'gis' ? '#ddf4ff' : item.type === 'tourism' ? '#dafbe1' : '#ffebe9',
                                    color: item.type === 'gis' ? '#0969da' : item.type === 'tourism' ? '#1a7f37' : '#cf222e'
                                }}>
                                    {item.typeLabel}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
            <div className="map-legend">
                {markerTypes.map(t => (
                    <div key={t.key} className="map-legend-item">
                        <span className="map-legend-dot" style={{ background: t.color }}></span>
                        <span>{t.emoji} {t.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LandingPage() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupStats, setGroupStats] = useState({});
    const [groupLoading, setGroupLoading] = useState(true);
    const [mapData, setMapData] = useState([]);
    const [mapLoading, setMapLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadStats();
        loadGroupStats();
        loadMapData();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        const results = [];
        for (const cfg of statConfig) {
            try {
                const { count, error } = await supabase
                    .from(cfg.table)
                    .select('*', { count: 'exact', head: true });
                results.push({ ...cfg, count: error ? 0 : (count ?? 0) });
            } catch {
                results.push({ ...cfg, count: 0 });
            }
        }
        setStats(results);
        setLoading(false);
    };

    const loadGroupStats = async () => {
        setGroupLoading(true);
        const result = {};
        for (const group of groupDashConfig) {
            const counts = {};
            for (const t of group.tables) {
                try {
                    const { count, error } = await supabase
                        .from(t.table)
                        .select('*', { count: 'exact', head: true });
                    counts[t.table] = error ? 0 : (count ?? 0);
                } catch {
                    counts[t.table] = 0;
                }
            }
            result[group.title] = counts;
        }
        setGroupStats(result);
        setGroupLoading(false);
    };

    const loadMapData = async () => {
        setMapLoading(true);
        const points = [];
        try {
            // GIS Areas
            const { data: gis } = await supabase.from('gis_areas').select('area_name, district, latitude, longitude');
            (gis || []).forEach(r => {
                if (r.latitude && r.longitude) {
                    points.push({ name: r.area_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'gis', typeLabel: 'พื้นที่ GIS' });
                }
            });
            // Agri Tourism
            const { data: tourism } = await supabase.from('agri_tourism').select('spot_name, district, latitude, longitude');
            (tourism || []).forEach(r => {
                if (r.latitude && r.longitude) {
                    points.push({ name: r.spot_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'tourism', typeLabel: 'ท่องเที่ยวเกษตร' });
                }
            });
            // Fire Hotspots
            const { data: fire } = await supabase.from('fire_hotspots').select('spot_name, district, latitude, longitude');
            (fire || []).forEach(r => {
                if (r.latitude && r.longitude) {
                    points.push({ name: r.spot_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'fire', typeLabel: 'จุดเฝ้าระวัง PM2.5' });
                }
            });
        } catch {
            // skip
        }
        setMapData(points);
        setMapLoading(false);
    };

    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const pieData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    return (
        <div className="landing-page">
            {/* ===== NAVBAR ===== */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-nav-brand">
                        <span style={{ fontSize: 28 }}>🌾</span>
                        <span>เกษตรจังหวัดนครปฐม</span>
                    </div>
                    <button className="landing-login-btn" onClick={() => navigate('/login')}>
                        เข้าสู่ระบบเจ้าหน้าที่
                    </button>
                </div>
            </nav>

            {/* ===== HERO ===== */}
            <section className="landing-hero">
                <div className="landing-hero-bg"></div>
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">🏛️ สำนักงานเกษตรจังหวัดนครปฐม</div>
                    <h1 className="landing-hero-title">
                        ข้อมูลด้านการเกษตร<br />
                        <span className="landing-hero-highlight">จังหวัดนครปฐม</span>
                    </h1>
                    <p className="landing-hero-subtitle">
                        ระบบฐานข้อมูลกลางสำหรับการบริหารจัดการข้อมูลด้านการเกษตร<br />
                        ครอบคลุมทุกกลุ่มงาน 5 กลุ่ม 7 อำเภอ
                    </p>
                    <div className="landing-hero-stats">
                        <div className="landing-hero-stat">
                            <div className="landing-hero-stat-value">{loading ? '...' : totalRecords.toLocaleString()}</div>
                            <div className="landing-hero-stat-label">รายการข้อมูล</div>
                        </div>
                        <div className="landing-hero-stat-divider" />
                        <div className="landing-hero-stat">
                            <div className="landing-hero-stat-value">5</div>
                            <div className="landing-hero-stat-label">กลุ่มงาน</div>
                        </div>
                        <div className="landing-hero-stat-divider" />
                        <div className="landing-hero-stat">
                            <div className="landing-hero-stat-value">7</div>
                            <div className="landing-hero-stat-label">อำเภอ</div>
                        </div>
                        <div className="landing-hero-stat-divider" />
                        <div className="landing-hero-stat">
                            <div className="landing-hero-stat-value">20</div>
                            <div className="landing-hero-stat-label">ฐานข้อมูล</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== STAT CARDS ===== */}
            <section className="landing-section">
                <h2 className="landing-section-title">📊 ภาพรวมข้อมูล</h2>
                <div className="stat-cards">
                    {stats.map((s, i) => (
                        <div key={i} className={`stat-card ${s.color}`}>
                            <div className="stat-card-icon">{s.icon}</div>
                            <div className="stat-card-value">{loading ? '...' : s.count.toLocaleString()}</div>
                            <div className="stat-card-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== MINI GROUP DASHBOARDS ===== */}
            <section className="landing-section">
                <h2 className="landing-section-title">🏢 สถิติรายกลุ่มงาน</h2>
                <div className="group-dash-grid">
                    {groupDashConfig.map((group, gi) => {
                        const counts = groupStats[group.title] || {};
                        const groupTotal = Object.values(counts).reduce((s, v) => s + v, 0);
                        return (
                            <div key={gi} className="group-dash-card" style={{ '--group-color': group.color }}>
                                <div className="group-dash-header">
                                    <span className="group-dash-icon">{group.icon}</span>
                                    <div>
                                        <div className="group-dash-title">{group.title}</div>
                                        <div className="group-dash-total">
                                            {groupLoading ? '...' : `${groupTotal.toLocaleString()} รายการ`}
                                        </div>
                                    </div>
                                </div>
                                <div className="group-dash-stats">
                                    {group.tables.map((t, ti) => (
                                        <div key={ti} className="group-dash-stat-item">
                                            <span className="group-dash-stat-label">{t.label}</span>
                                            <span className="group-dash-stat-value">
                                                {groupLoading ? '-' : (counts[t.table] ?? 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ===== CHARTS ===== */}
            {barData.length > 0 && (
                <section className="landing-section">
                    <div className="chart-section">
                        <div className="chart-card">
                            <div className="chart-card-title">📊 สรุปจำนวนข้อมูลแต่ละหมวด</div>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#1a7f37" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-card">
                            <div className="chart-card-title">🥧 สัดส่วนข้อมูล</div>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={110} fill="#8884d8" dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>
            )}

            {/* ===== INTERACTIVE MAP ===== */}
            <section className="landing-section">
                <h2 className="landing-section-title">🗺️ แผนที่ข้อมูลการเกษตร</h2>
                <div className="chart-card">
                    {mapLoading ? (
                        <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
                            กำลังโหลดข้อมูลแผนที่...
                        </div>
                    ) : mapData.length > 0 ? (
                        <LandingMap mapData={mapData} />
                    ) : (
                        <div style={{ height: 420 }}>
                            <LandingMap mapData={[]} />
                            <p style={{ textAlign: 'center', color: '#8b949e', fontSize: 13, marginTop: -200, position: 'relative', zIndex: 1000 }}>
                                ยังไม่มีข้อมูลพิกัดในระบบ — เพิ่มข้อมูล GIS, ท่องเที่ยวเกษตร หรือ จุด PM2.5 เพื่อแสดงบนแผนที่
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div>
                        <strong>🌾 สำนักงานเกษตรจังหวัดนครปฐม</strong>
                        <p style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                            131 ถนนทรงพล อำเภอเมือง จังหวัดนครปฐม 73000
                        </p>
                        <p style={{ marginTop: 4, opacity: 0.7, fontSize: 13 }}>
                            โทร. 0 3425 3992, 09 3314 4469 | E-mail: nakhonpathom@doae.go.th
                        </p>
                    </div>
                    <div style={{ opacity: 0.5, fontSize: 13 }}>
                        © {new Date().getFullYear()} ระบบฐานข้อมูลกลาง
                    </div>
                </div>
            </footer>
        </div>
    );
}
