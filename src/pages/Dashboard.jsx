import { useEffect, useState, useRef } from 'react';
import { Skeleton, Button, Tooltip } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    ClockCircleOutlined, FilePdfOutlined, CheckCircleOutlined,
    TeamOutlined, RiseOutlined, EyeOutlined, DatabaseOutlined,
    ScheduleOutlined
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const AVATAR_COLORS = ['#43a047', '#1565c0', '#e65100', '#6a1b9a', '#c62828', '#00695c', '#ad1457'];

const statConfig = [
    { table: 'personnel', label: 'บุคลากร', icon: '👥', color: 'green' },
    { table: 'assets', label: 'พัสดุ/ครุภัณฑ์', icon: '💻', color: 'blue' },
    { table: 'budgets', label: 'โครงการงบประมาณ', icon: '💰', color: 'orange' },
    { table: 'farmer_registry', label: 'ทะเบียนเกษตรกร', icon: '📋', color: 'purple' },
    { table: 'large_plots', label: 'แปลงใหญ่', icon: '🌾', color: 'green' },
    { table: 'community_enterprises', label: 'วิสาหกิจชุมชน', icon: '🤝', color: 'blue' },
    { table: 'forecast_plots', label: 'แปลงพยากรณ์', icon: '🌿', color: 'green' },
    { table: 'smart_farmers', label: 'Smart Farmer', icon: '🧑‍🌾', color: 'orange' },
];

// Top 4 stat cards config
const topStatCards = [
    { key: 'personnel', label: 'บุคลากร', iconComponent: TeamOutlined, iconColor: 'green', footerText: 'ข้อมูลบุคลากรทั้งหมด' },
    { key: 'assets', label: 'พัสดุ/ครุภัณฑ์', iconComponent: DatabaseOutlined, iconColor: 'blue', footerText: 'รายการทรัพย์สินทั้งหมด' },
    { key: 'farmer_registry', label: 'ทะเบียนเกษตรกร', iconComponent: EyeOutlined, iconColor: 'orange', footerText: 'ข้อมูลเกษตรกรในระบบ' },
    { key: 'total', label: 'รายการทั้งหมด', iconComponent: RiseOutlined, iconColor: 'red', footerText: 'ข้อมูลรวมทุกหมวด' },
];

// สร้างข้อมูลแนวโน้มรายเดือนจาก created_at ของทุกตาราง
async function fetchMonthlyTrend() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            month: d.toLocaleDateString('th-TH', { month: 'short' }),
            start: d.toISOString(),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
            count: 0,
        });
    }

    for (const cfg of statConfig) {
        for (const m of months) {
            try {
                const { count, error } = await supabase
                    .from(cfg.table)
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', m.start)
                    .lte('created_at', m.end);
                if (!error) m.count += (count ?? 0);
            } catch {
                // skip
            }
        }
    }
    return months.map(m => ({ name: m.month, รายการ: m.count }));
}

// สร้างข้อมูลสะสม (cumulative) จาก trend
function makeCumulative(trendData) {
    let sum = 0;
    return trendData.map(d => {
        sum += d['รายการ'];
        return { name: d.name, สะสม: sum };
    });
}

// ดึงกิจกรรมล่าสุด
async function fetchRecentActivity() {
    const activities = [];
    for (const cfg of statConfig) {
        try {
            const { data, error } = await supabase
                .from(cfg.table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2);
            if (!error && data) {
                data.forEach(row => {
                    activities.push({
                        table: cfg.label,
                        icon: cfg.icon,
                        color: cfg.color,
                        name: row.full_name || row.name || row.project_name || row.title || cfg.label,
                        created_at: row.created_at,
                    });
                });
            }
        } catch {
            // skip
        }
    }
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return activities.slice(0, 8);
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trendData, setTrendData] = useState([]);
    const [trendLoading, setTrendLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [pdfExporting, setPdfExporting] = useState(false);
    const dashRef = useRef(null);

    useEffect(() => {
        loadStats();
        loadTrend();
        loadActivities();
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

    const loadTrend = async () => {
        setTrendLoading(true);
        const data = await fetchMonthlyTrend();
        setTrendData(data);
        setTrendLoading(false);
    };

    const loadActivities = async () => {
        setActivityLoading(true);
        const data = await fetchRecentActivity();
        setActivities(data);
        setActivityLoading(false);
    };

    const handleExportPdf = async () => {
        if (!dashRef.current) return;
        setPdfExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(dashRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f6f8fa',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const imgW = canvas.width;
            const imgH = canvas.height;
            const ratio = Math.min(pdfW / imgW, pdfH / imgH);
            const w = imgW * ratio;
            const h = imgH * ratio;
            const x = (pdfW - w) / 2;
            pdf.addImage(imgData, 'PNG', x, 4, w, h);
            pdf.save(`dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
        } finally {
            setPdfExporting(false);
        }
    };

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const cumulativeData = makeCumulative(trendData);

    // get individual stat count by table name
    const getStatCount = (tableName) => {
        const s = stats.find(st => st.table === tableName);
        return s ? s.count : 0;
    };

    return (
        <div ref={dashRef}>
            {/* Page Header + PDF Export */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div className="md-page-header" style={{ marginBottom: 0 }}>
                    <h2>📊 Dashboard</h2>
                    <p>ตรวจสอบข้อมูลและสถิติ ภาพรวมทั้งหมดของระบบ</p>
                </div>
                <Button
                    icon={<FilePdfOutlined />}
                    onClick={handleExportPdf}
                    loading={pdfExporting}
                    className="export-btn pdf-export-btn"
                >
                    พิมพ์รายงาน PDF
                </Button>
            </div>

            {/* ===== Top Stat Cards ===== */}
            <div className="md-stat-row">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="md-stat-card">
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </div>
                    ))
                ) : (
                    topStatCards.map((card) => {
                        const count = card.key === 'total' ? totalRecords : getStatCount(card.key);
                        const IconComp = card.iconComponent;
                        return (
                            <div key={card.key} className="md-stat-card">
                                <div className="md-stat-card-inner">
                                    <div className="md-stat-card-top">
                                        <div className={`md-stat-icon ${card.iconColor}`}>
                                            <IconComp style={{ fontSize: 24 }} />
                                        </div>
                                        <div className="md-stat-info">
                                            <div className="md-stat-label">{card.label}</div>
                                            <div className="md-stat-value">{count.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="md-stat-footer">
                                        <ScheduleOutlined />
                                        <span>{card.footerText}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ===== Chart Cards Row ===== */}
            <div className="md-chart-row">
                {/* Chart 1: Bar — สรุปข้อมูลแต่ละหมวด */}
                <div className="md-chart-card">
                    <div className="md-chart-header green">
                        {barData.length > 0 && (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} angle={-20} textAnchor="end" height={40} />
                                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} />
                                    <RTooltip />
                                    <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="md-chart-body">
                        <div className="md-chart-title">สรุปข้อมูลแต่ละหมวด</div>
                        <div className="md-chart-subtitle">จำนวนรายการข้อมูลทั้งหมดในแต่ละหมวดหมู่</div>
                        <div className="md-chart-footer">
                            <ClockCircleOutlined /> อัปเดตล่าสุด
                        </div>
                    </div>
                </div>

                {/* Chart 2: Line — แนวโน้มรายเดือน */}
                <div className="md-chart-card">
                    <div className="md-chart-header dark">
                        {trendLoading ? (
                            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                <Skeleton active paragraph={{ rows: 3 }} style={{ width: '100%' }} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} />
                                    <RTooltip />
                                    <Line type="monotone" dataKey="รายการ" stroke="#fff" strokeWidth={2} dot={{ r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="md-chart-body">
                        <div className="md-chart-title">แนวโน้มรายเดือน</div>
                        <div className="md-chart-subtitle">
                            ข้อมูลที่เพิ่มขึ้นในแต่ละเดือน (6 เดือนย้อนหลัง)
                        </div>
                        <div className="md-chart-footer">
                            <ScheduleOutlined /> อัปเดตอัตโนมัติ
                        </div>
                    </div>
                </div>

                {/* Chart 3: Area — ข้อมูลสะสม */}
                <div className="md-chart-card">
                    <div className="md-chart-header blue">
                        {trendLoading ? (
                            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Skeleton active paragraph={{ rows: 3 }} style={{ width: '100%' }} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                    <defs>
                                        <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} />
                                    <RTooltip />
                                    <Area type="monotone" dataKey="สะสม" stroke="#fff" strokeWidth={2} fill="url(#cumGrad)" dot={{ r: 4, fill: '#fff' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="md-chart-body">
                        <div className="md-chart-title">ข้อมูลสะสม</div>
                        <div className="md-chart-subtitle">จำนวนข้อมูลสะสมทั้งหมดใน 6 เดือน</div>
                        <div className="md-chart-footer">
                            <RiseOutlined /> ดูแนวโน้มการเติบโต
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Bottom Row: Projects Table + Activity Timeline ===== */}
            <div className="md-bottom-row">
                {/* Projects / Modules Table */}
                <div className="md-projects-card">
                    <div className="md-projects-header">
                        <h3>📋 โมดูลในระบบ</h3>
                        <p>
                            <CheckCircleOutlined className="check-icon" />
                            <span>{loading ? '...' : `${stats.filter(s => s.count > 0).length} จาก ${stats.length} หมวดมีข้อมูล`}</span>
                        </p>
                    </div>
                    {loading ? (
                        <div style={{ padding: '16px 24px' }}>
                            <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                    ) : (
                        <table className="md-projects-table">
                            <thead>
                                <tr>
                                    <th>หมวดข้อมูล</th>
                                    <th>สถานะ</th>
                                    <th>จำนวน</th>
                                    <th>สัดส่วน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((s, i) => {
                                    const pct = totalRecords > 0 ? Math.round((s.count / totalRecords) * 100) : 0;
                                    return (
                                        <tr key={i}>
                                            <td data-label="หมวดข้อมูล">
                                                <div className="md-project-name">
                                                    <div className="md-project-icon">{s.icon}</div>
                                                    {s.label}
                                                </div>
                                            </td>
                                            <td data-label="สถานะ">
                                                <div className="md-project-members">
                                                    {[...Array(Math.min(Math.max(1, Math.ceil(s.count / 10)), 5))].map((_, j) => (
                                                        <div
                                                            key={j}
                                                            className="md-member-avatar"
                                                            style={{ background: AVATAR_COLORS[(i + j) % AVATAR_COLORS.length] }}
                                                        >
                                                            {s.label.charAt(0)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td data-label="จำนวน">
                                                <span className="md-project-budget">{s.count.toLocaleString()} รายการ</span>
                                            </td>
                                            <td data-label="สัดส่วน">
                                                <div className="md-progress-wrap">
                                                    <div className="md-progress-bar">
                                                        <div
                                                            className={`md-progress-fill ${s.color}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="md-progress-label">{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Activity Timeline */}
                <div className="md-activity-card">
                    <div className="md-activity-header">
                        <h3>🕐 กิจกรรมล่าสุด</h3>
                        <p>อัปเดตข้อมูลล่าสุดในระบบ</p>
                    </div>
                    {activityLoading ? (
                        <div style={{ padding: '0 24px 20px' }}>
                            <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                    ) : activities.length > 0 ? (
                        <ul className="md-timeline">
                            {activities.map((act, i) => {
                                const dotColors = ['green', 'red', 'blue', 'orange', 'purple', 'pink'];
                                return (
                                    <li key={i} className="md-timeline-item">
                                        <div className={`md-timeline-dot ${dotColors[i % dotColors.length]}`}>
                                            {act.icon}
                                        </div>
                                        <div className="md-timeline-content">
                                            <div className="md-timeline-title">
                                                <strong>{act.table}</strong> — {act.name}
                                            </div>
                                            <div className="md-timeline-time">
                                                <ClockCircleOutlined /> {formatDate(act.created_at)} · {formatTimeAgo(act.created_at)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div style={{ padding: '20px 24px', textAlign: 'center', color: '#8b949e' }}>
                            ยังไม่มีกิจกรรม
                        </div>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {barData.length === 0 && !loading && (
                <div className="md-empty-state">
                    <div className="md-empty-icon">📭</div>
                    <h3>ยังไม่มีข้อมูลในระบบ</h3>
                    <p>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}
