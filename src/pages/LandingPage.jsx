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

const groupInfo = [
    { icon: '🏢', title: 'ฝ่ายบริหารทั่วไป', desc: 'บุคลากร, พัสดุ, งบประมาณ' },
    { icon: '📊', title: 'ยุทธศาสตร์และสารสนเทศ', desc: 'ทะเบียนเกษตรกร, GIS, ภัยพิบัติ, KPI' },
    { icon: '🌾', title: 'ส่งเสริมและพัฒนาการผลิต', desc: 'แปลงใหญ่, ศพก., GAP, ผลผลิตพืช' },
    { icon: '🤝', title: 'ส่งเสริมและพัฒนาเกษตรกร', desc: 'วิสาหกิจชุมชน, Smart Farmer, ท่องเที่ยวเกษตร' },
    { icon: '🔬', title: 'อารักขาพืช', desc: 'ศัตรูพืช, ศจช., ชีวภัณฑ์, PM2.5' },
];

export default function LandingPage() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadStats();
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

            {/* ===== WORK GROUPS ===== */}
            <section className="landing-section">
                <h2 className="landing-section-title">🏢 กลุ่มงานที่ดูแลข้อมูล</h2>
                <div className="landing-groups">
                    {groupInfo.map((g, i) => (
                        <div key={i} className="landing-group-card">
                            <div className="landing-group-icon">{g.icon}</div>
                            <div className="landing-group-title">{g.title}</div>
                            <div className="landing-group-desc">{g.desc}</div>
                        </div>
                    ))}
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
