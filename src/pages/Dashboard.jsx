import { useEffect, useState } from 'react';
import { Skeleton, Empty, Tag } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
    ClockCircleOutlined, PlusCircleOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const COLORS = ['#1a7f37', '#0969da', '#bf8700', '#8250df', '#cf222e', '#2da44e', '#218bff'];

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

// สร้างข้อมูลแนวโน้มรายเดือนจาก created_at ของทุกตาราง
async function fetchMonthlyTrend() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            month: d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
            start: d.toISOString(),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
            count: 0,
        });
    }

    // นับรวมทุกตาราง
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
                        name: row.full_name || row.name || row.project_name || row.title || cfg.label,
                        created_at: row.created_at,
                    });
                });
            }
        } catch {
            // skip
        }
    }
    // เรียงตามวันที่ล่าสุด
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

export default function Dashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trendData, setTrendData] = useState([]);
    const [trendLoading, setTrendLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);

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

    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const pieData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    return (
        <div>
            <div className="dashboard-header">
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📊 ภาพรวมข้อมูล</h2>
                {!loading && (
                    <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                        รวม {totalRecords.toLocaleString()} รายการ
                    </Tag>
                )}
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                {loading ? (
                    [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="stat-card green">
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </div>
                    ))
                ) : (
                    stats.map((s, i) => (
                        <div key={i} className={`stat-card ${s.color}`}>
                            <div className="stat-card-icon">{s.icon}</div>
                            <div className="stat-card-value">{s.count.toLocaleString()}</div>
                            <div className="stat-card-label">{s.label}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Charts Row 1: Bar + Pie */}
            {barData.length > 0 && (
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
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={110}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Charts Row 2: Area Trend + Recent Activity */}
            <div className="chart-section">
                <div className="chart-card">
                    <div className="chart-card-title">📈 แนวโน้มข้อมูลรายเดือน (6 เดือนย้อนหลัง)</div>
                    {trendLoading ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1a7f37" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#1a7f37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="รายการ"
                                    stroke="#1a7f37"
                                    strokeWidth={2}
                                    fill="url(#colorTrend)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <div className="chart-card-title">🕐 กิจกรรมล่าสุด</div>
                    {activityLoading ? (
                        <Skeleton active paragraph={{ rows: 5 }} />
                    ) : activities.length > 0 ? (
                        <div className="activity-list">
                            {activities.map((act, i) => (
                                <div key={i} className="activity-item">
                                    <div className="activity-icon">{act.icon}</div>
                                    <div className="activity-info">
                                        <div className="activity-name">{act.name}</div>
                                        <div className="activity-meta">
                                            <Tag color="default" style={{ fontSize: 11 }}>{act.table}</Tag>
                                            <span className="activity-time">
                                                <ClockCircleOutlined /> {formatTimeAgo(act.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty description="ยังไม่มีกิจกรรม" />
                    )}
                </div>
            </div>

            {barData.length === 0 && !loading && (
                <div className="chart-card" style={{ textAlign: 'center', padding: 60 }}>
                    <p style={{ fontSize: 48, marginBottom: 12 }}>📭</p>
                    <h3 style={{ color: '#656d76', fontWeight: 500 }}>ยังไม่มีข้อมูลในระบบ</h3>
                    <p style={{ color: '#8b949e', fontSize: 14 }}>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}
