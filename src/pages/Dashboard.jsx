import { useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
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

export default function Dashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>📊 ภาพรวมข้อมูล</h2>

            {/* Stat Cards */}
            <div className="stat-cards">
                {stats.map((s, i) => (
                    <div key={i} className={`stat-card ${s.color}`}>
                        <div className="stat-card-icon">{s.icon}</div>
                        <div className="stat-card-value">{loading ? '...' : s.count.toLocaleString()}</div>
                        <div className="stat-card-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
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
