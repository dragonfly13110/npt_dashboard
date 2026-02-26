import { useEffect, useState } from 'react';
import { Skeleton, Empty, Tag } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../supabaseClient';

const COLORS = ['#1a7f37', '#0969da', '#bf8700', '#8250df', '#cf222e', '#2da44e', '#218bff'];

export default function GroupDashboard({ title, icon, color, tables }) {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
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
    };

    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const pieData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    return (
        <div>
            <div className="dashboard-header">
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                    {icon} {title}
                </h2>
                {!loading && (
                    <Tag color={color || 'green'} style={{ fontSize: 14, padding: '4px 12px' }}>
                        รวม {totalRecords.toLocaleString()} รายการ
                    </Tag>
                )}
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                {loading ? (
                    tables.map((_, i) => (
                        <div key={i} className="stat-card green">
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </div>
                    ))
                ) : (
                    stats.map((s, i) => (
                        <div key={i} className={`stat-card ${s.color || 'green'}`}>
                            <div className="stat-card-icon">{s.icon || '📊'}</div>
                            <div className="stat-card-value">{s.count.toLocaleString()}</div>
                            <div className="stat-card-label">{s.label}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Charts */}
            {barData.length > 0 && (
                <div className="chart-section">
                    <div className="chart-card">
                        <div className="chart-card-title">📊 สรุปจำนวนข้อมูล</div>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <RTooltip />
                                <Bar dataKey="value" fill={color || '#1a7f37'} radius={[6, 6, 0, 0]} />
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
                                <RTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {barData.length === 0 && !loading && (
                <div className="chart-card" style={{ textAlign: 'center', padding: 60 }}>
                    <p style={{ fontSize: 48, marginBottom: 12 }}>📭</p>
                    <h3 style={{ color: '#656d76', fontWeight: 500 }}>ยังไม่มีข้อมูลในกลุ่มนี้</h3>
                    <p style={{ color: '#8b949e', fontSize: 14 }}>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}
