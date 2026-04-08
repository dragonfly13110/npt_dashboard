import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    ClockCircleOutlined, TeamOutlined, CarOutlined, DollarOutlined,
    CheckCircleOutlined, ScheduleOutlined, RiseOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';

const COLORS = ['#43a047', '#1565c0', '#e65100', '#6a1b9a', '#c62828', '#00695c'];

const tables = [
    { table: 'personnel', label: 'บุคลากร', icon: '👥', color: 'green', iconComponent: TeamOutlined },
    { table: 'assets', label: 'พัสดุ/ครุภัณฑ์', icon: '💻', color: 'blue', iconComponent: CarOutlined },
    { table: 'budgets', label: 'งบประมาณ', icon: '💰', color: 'orange', iconComponent: DollarOutlined },
];

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

async function fetchTrend(tableCfg) {
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
    for (const cfg of tableCfg) {
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

async function fetchRecentActivity(tableCfg) {
    const activities = [];
    for (const cfg of tableCfg) {
        try {
            const { data, error } = await supabase
                .from(cfg.table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);
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

export default function AdminDashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trendData, setTrendData] = useState([]);
    const [trendLoading, setTrendLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);

    const loadStats = useCallback(async () => {
        setLoading(true);
        const results = [];
        for (const tbl of tables) {
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
    }, []);

    const loadTrend = useCallback(async () => {
        setTrendLoading(true);
        const data = await fetchTrend(tables);
        setTrendData(data);
        setTrendLoading(false);
    }, []);

    const loadActivities = useCallback(async () => {
        setActivityLoading(true);
        const data = await fetchRecentActivity(tables);
        setActivities(data);
        setActivityLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadStats();
        loadTrend();
        loadActivities();
    }, [loadStats, loadTrend, loadActivities]);

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const pieData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));

    return (
        <div>
            {/* Page Header */}
            <div className="md-page-header">
                <h2>🏢 ฝ่ายบริหารทั่วไป</h2>
                <p>ภาพรวมข้อมูลบุคลากร พัสดุ/ครุภัณฑ์ และงบประมาณ</p>
            </div>

            {/* ===== Stat Cards ===== */}
            <div className="md-stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="md-stat-card">
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </div>
                    ))
                ) : (
                    stats.map((s) => {
                        const IconComp = s.iconComponent;
                        return (
                            <div key={s.table} className="md-stat-card">
                                <div className="md-stat-card-inner">
                                    <div className="md-stat-card-top">
                                        <div className={`md-stat-icon ${s.color}`}>
                                            <IconComp style={{ fontSize: 24 }} />
                                        </div>
                                        <div className="md-stat-info">
                                            <div className="md-stat-label">{s.label}</div>
                                            <div className="md-stat-value">{s.count.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="md-stat-footer">
                                        <ScheduleOutlined />
                                        <span>จำนวน{s.label}ทั้งหมด</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ===== Chart Cards Row ===== */}
            <div className="md-chart-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {/* Bar Chart */}
                <div className="md-chart-card">
                    <div className="md-chart-header green">
                        {barData.length > 0 && (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} />
                                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} />
                                    <RTooltip />
                                    <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="md-chart-body">
                        <div className="md-chart-title">📊 สรุปจำนวนข้อมูล</div>
                        <div className="md-chart-subtitle">เปรียบเทียบจำนวนข้อมูลในแต่ละหมวดของฝ่ายบริหาร</div>
                        <div className="md-chart-footer">
                            <ClockCircleOutlined /> อัปเดตตามข้อมูลจริง
                        </div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="md-chart-card">
                    <div className="md-chart-header purple">
                        {pieData.length > 0 && (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={70}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? 'rgba(255,255,255,0.9)' : i === 1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)'} />
                                        ))}
                                    </Pie>
                                    <RTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="md-chart-body">
                        <div className="md-chart-title">🥧 สัดส่วนข้อมูล</div>
                        <div className="md-chart-subtitle">สัดส่วนข้อมูลแต่ละหมวดเทียบกับทั้งหมด ({totalRecords.toLocaleString()} รายการ)</div>
                        <div className="md-chart-footer">
                            <RiseOutlined /> ดูสัดส่วน
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Trend + Activity ===== */}
            <div className="md-bottom-row">
                {/* Trend Chart */}
                <div className="md-chart-card">
                    <div className="md-chart-header dark">
                        {trendLoading ? (
                            <div style={{ width: '100%', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Skeleton active paragraph={{ rows: 3 }} style={{ width: '100%' }} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} />
                                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} />
                                    <RTooltip />
                                    <Line type="monotone" dataKey="รายการ" stroke="#fff" strokeWidth={2} dot={{ r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="md-chart-body">
                        <div className="md-chart-title">📈 แนวโน้มรายเดือน</div>
                        <div className="md-chart-subtitle">ข้อมูลฝ่ายบริหารที่เพิ่มขึ้นในแต่ละเดือน (6 เดือนย้อนหลัง)</div>
                        <div className="md-chart-footer">
                            <ScheduleOutlined /> อัปเดตอัตโนมัติ
                        </div>
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="md-activity-card">
                    <div className="md-activity-header">
                        <h3>🕐 กิจกรรมล่าสุด</h3>
                        <p>อัปเดตข้อมูลฝ่ายบริหารล่าสุด</p>
                    </div>
                    {activityLoading ? (
                        <div style={{ padding: '0 24px 20px' }}>
                            <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                    ) : activities.length > 0 ? (
                        <ul className="md-timeline">
                            {activities.map((act, i) => {
                                const dotColors = ['green', 'blue', 'orange', 'red', 'purple', 'pink'];
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
                            ยังไม่มีกิจกรรมในฝ่ายบริหาร
                        </div>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {barData.length === 0 && !loading && (
                <div className="md-empty-state">
                    <div className="md-empty-icon">📭</div>
                    <h3>ยังไม่มีข้อมูลในกลุ่มนี้</h3>
                    <p>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}
