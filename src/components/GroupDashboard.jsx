import { useEffect, useState } from 'react';
import { Skeleton, Tag } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../supabaseClient';
import { FileTextOutlined, ProjectOutlined } from '@ant-design/icons';

const COLORS = ['#e91e63', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];

export default function GroupDashboard({ title, icon, color, tables }) {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [tables]);

    const loadStats = async () => {
        setLoading(true);
        const results = [];
        for (const tbl of tables) {
            try {
                const { count, data, error } = await supabase
                    .from(tbl.table)
                    .select('*', { count: 'exact' });
                results.push({ ...tbl, count: error ? 0 : (count ?? 0), rawData: data || [] });
            } catch {
                results.push({ ...tbl, count: 0, rawData: [] });
            }
        }
        setStats(results);
        setLoading(false);
    };

    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    // Data prep for "large_plots" stacked bar chart
    const largePlots = stats.find(s => s.table === 'large_plots')?.rawData || [];
    const dpMap = {};
    const cgSet = new Set();
    
    if (largePlots.length > 0) {
        largePlots.forEach(p => {
            const dist = p.district || 'ไม่ระบุ';
            const cg = p.commodity_group || 'ไม่ระบุ';
            if (!dpMap[dist]) dpMap[dist] = { name: dist };
            dpMap[dist][cg] = (dpMap[dist][cg] || 0) + 1;
            cgSet.add(cg);
        });
    }
    const distData = Object.values(dpMap);
    const cgList = Array.from(cgSet);

    // Data prep for "learning_centers"
    const learningCenters = stats.find(s => s.table === 'learning_centers')?.rawData || [];
    const lcMap = {};
    if (learningCenters.length > 0) {
        learningCenters.forEach(p => {
            const dist = p.district || 'ไม่ระบุ';
            if (!lcMap[dist]) lcMap[dist] = { name: dist, value: 0 };
            lcMap[dist].value += 1;
        });
    }
    const lcData = Object.values(lcMap).sort((a,b) => b.value - a.value);

    // Check which specific tables this dashboard displays
    const showLargePlots = tables.some(t => t.table === 'large_plots');
    const showLearningCenters = tables.some(t => t.table === 'learning_centers');

    return (
        <div style={{ padding: '24px 8px' }}>
            <div className="md-dashboard-header">
                <div>
                    <div className="md-title">
                        {icon} <span style={{ marginLeft: 8 }}>{title}</span>
                    </div>
                    <div className="md-subtitle">ภาพรวมและข้อมูลเชิงสถิติของกลุ่มงาน</div>
                </div>
                {!loading && (
                    <div className="md-header-actions">
                        <Tag color="geekblue" style={{ fontSize: 16, padding: '6px 16px', borderRadius: 20 }}>
                            <ProjectOutlined /> รวมทั้งหมด {totalRecords.toLocaleString()} รายการ
                        </Tag>
                    </div>
                )}
            </div>

            {/* --- GROUP BOX 1: OVERVIEW STATS --- */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#344767', marginBottom: 20 }}>📋 สรุปข้อมูลรายหมวดหมู่</h3>
                <div className="md-stat-container">
                    {loading ? (
                        tables.map((_, i) => (
                            <div key={i} className="md-stat-card"><Skeleton active paragraph={{ rows: 1 }} /></div>
                        ))
                    ) : (
                        stats.map((s, i) => {
                            const iconColors = ['blue', 'pink', 'green', 'dark'];
                            const icColor = iconColors[i % iconColors.length];
                            return (
                                <div key={i} className="md-stat-card" style={{ boxShadow: 'none', border: '1px solid #f0f2f5' }}>
                                    <div className="md-stat-header">
                                        <div className={`md-stat-icon-box ${icColor}`}>
                                            <FileTextOutlined style={{ fontSize: 24, color: '#fff' }} />
                                        </div>
                                        <div className="md-stat-info">
                                            <div className="md-stat-title">{s.label}</div>
                                            <div className="md-stat-value">{s.count.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="md-stat-footer">
                                        <span>จากฐานข้อมูลทั้งหมด</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Optional Generic Chart (Only if no specific charts are available, but we hide it if largePlots exist) */}
                {barData.length > 1 && !showLargePlots && !showLearningCenters && (
                    <div className="md-charts-row" style={{ marginTop: 24, gridTemplateColumns: 'minmax(0, 1fr)' }}>
                        <div className="md-chart-card" style={{ boxShadow: 'none', border: '1px solid #f0f2f5' }}>
                            <div className="md-chart-header blue" style={{ marginTop: 0 }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" tick={{ fill: '#fff', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fill: '#fff', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <RTooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ borderRadius: 8, border: 'none', color: '#333' }} />
                                        <Bar dataKey="value" fill="#fff" radius={[4, 4, 0, 0]} barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="md-chart-body">
                                <h4 className="md-chart-title">ปริมาณข้อมูลแยกตามหมวดหมู่</h4>
                                <p className="md-chart-desc">สรุปจำนวนรายการของแต่ละประเภทในกลุ่มงานนี้</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- GROUP BOX 2: DETAILED ANALYSIS (Split into Columns) --- */}
            {(showLargePlots || showLearningCenters) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    
                    {/* Column 1: Large Plots */}
                    {showLargePlots && (
                        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #4CAF50, #2E7D32)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginRight: 16, boxShadow: '0 4px 10px rgba(76, 175, 80, 0.4)' }}>🌾</div>
                                <div>
                                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#344767', margin: 0 }}>แปลงใหญ่ (รายอำเภอ)</h3>
                                    <p style={{ margin: 0, color: '#7b809a', fontSize: 13 }}>จำแนกตามกลุ่มสินค้า</p>
                                </div>
                            </div>
                            
                            <div style={{ border: '1px solid #f0f2f5', borderRadius: '12px', padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {largePlots.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={distData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                            <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: '#495057', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#8b949e" tick={{ fill: '#495057', fontSize: 13 }} axisLine={false} tickLine={false} />
                                            <RTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 8, border: 'none', color: '#333', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Legend wrapperStyle={{ color: '#495057', paddingTop: 20, fontSize: 12, fontWeight: 500 }} />
                                            {cgList.map((cg, idx) => (
                                                <Bar key={cg} dataKey={cg} stackId="a" fill={COLORS[idx % COLORS.length]} radius={idx === cgList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={45} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (!loading && (
                                    <div style={{ textAlign: 'center', color: '#999', padding: '60px 0' }}>
                                        <p style={{ fontSize: 48, margin: '0 0 16px' }}>📭</p>
                                        <p style={{ margin: 0, fontSize: 16 }}>ยังไม่มีข้อมูลแปลงใหญ่</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Column 2: Learning Centers (ศพก.) */}
                    {showLearningCenters && (
                        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #1976D2, #1565C0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginRight: 16, boxShadow: '0 4px 10px rgba(25, 118, 210, 0.4)' }}>🏫</div>
                                <div>
                                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#344767', margin: 0 }}>ศพก. (รายอำเภอ)</h3>
                                    <p style={{ margin: 0, color: '#7b809a', fontSize: 13 }}>ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร</p>
                                </div>
                            </div>
                            
                            <div style={{ border: '1px solid #f0f2f5', borderRadius: '12px', padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {learningCenters.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={lcData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                            <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: '#495057', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#8b949e" tick={{ fill: '#495057', fontSize: 13 }} axisLine={false} tickLine={false} />
                                            <RTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 8, border: 'none', color: '#333', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="value" name="จำนวนศูนย์" fill="#1976D2" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                                {lcData.map((d, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (!loading && (
                                    <div style={{ textAlign: 'center', color: '#999', padding: '60px 0' }}>
                                        <p style={{ fontSize: 48, margin: '0 0 16px' }}>📭</p>
                                        <p style={{ margin: 0, fontSize: 16 }}>ยังไม่มีข้อมูล ศพก.</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {barData.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: 80, background: '#fff', borderRadius: 12, marginTop: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: 64, marginBottom: 16 }}>📭</p>
                    <h3 style={{ color: '#344767', fontWeight: 600, fontSize: 24 }}>ยังไม่มีข้อมูลในกลุ่มนี้</h3>
                    <p style={{ color: '#7b809a', fontSize: 16 }}>ลองนำเข้า (Import CSV) เพื่อดูการแสดงผลเบื้องต้น</p>
                </div>
            )}
        </div>
    );
}
