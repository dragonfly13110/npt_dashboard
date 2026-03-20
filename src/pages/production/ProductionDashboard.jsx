import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, BankOutlined, SafetyCertificateOutlined, BarChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer, ComposedChart, Line
} from 'recharts';
import { supabase } from '../../supabaseClient';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

const CERT_COLORS = ['#1a7f37', '#0969da', '#bf8700', '#cf222e', '#8250df', '#0550ae', '#bc8c00', '#2da44e'];
const LP_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63'];

const CustomCertBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        let total = 0;
        payload.forEach(entry => { total += (entry.value || 0); });
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value?.toLocaleString()} ราย
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total.toLocaleString()} ราย
                </div>
            </div>
        );
    }
    return null;
};

const CustomLPBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value} แปลง
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} แปลง
                </div>
            </div>
        );
    }
    return null;
};

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}

export default function ProductionDashboard() {
    const [largePlots, setLargePlots] = useState([]);
    const [certs, setCerts] = useState([]);
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [lp, ct, cr] = await Promise.all([
                supabase.from('large_plots').select('*'),
                supabase.from('certifications').select('*'),
                supabase.from('crop_production').select('*'),
            ]);
            setLargePlots(lp.data || []);
            setCerts(ct.data || []);
            setCrops(cr.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ============================================
    // Large Plots Charts
    // ============================================
    const lpPie = useMemo(() => {
        const counts = {};
        largePlots.forEach(item => {
            const group = item.commodity_group || 'ไม่ระบุ';
            counts[group] = (counts[group] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [largePlots]);

    const { lpBar, lpGroups } = useMemo(() => {
        const counts = {};
        const groupSet = new Set();
        largePlots.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const group = item.commodity_group || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][group] = (counts[dist][group] || 0) + 1;
            counts[dist].total += 1;
            groupSet.add(group);
        });
        const barDataArray = Object.values(counts).sort((a, b) => b.total - a.total);
        const barGroupsArray = Array.from(groupSet).sort();
        return { lpBar: barDataArray, lpGroups: barGroupsArray };
    }, [largePlots]);

    // ============================================
    // Certifications Charts
    // ============================================
    const top10Crops = useMemo(() => {
        const cropArea = {};
        certs.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            cropArea[crop] = (cropArea[crop] || 0) + (Number(item.area_rai) || 0);
        });
        return Object.entries(cropArea)
            .sort((a, b) => b[1] - a[1]) // Sort descending by Area Rai
            .slice(0, 10) // Take Top 10
            .map(entry => entry[0]);
    }, [certs]);

    const certPie = useMemo(() => {
        const cropFarmers = {};
        certs.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            if (!top10Crops.includes(crop)) return; 
            if (!cropFarmers[crop]) cropFarmers[crop] = new Set();
            if (item.farmer_name) cropFarmers[crop].add(item.farmer_name);
        });
        return top10Crops.map(name => ({
            name,
            value: cropFarmers[name] ? cropFarmers[name].size : 0
        })).filter(d => d.value > 0);
    }, [certs, top10Crops]);

    const { certBar, certGroups } = useMemo(() => {
        const districtCropFarmers = {};
        certs.forEach(item => {
            const dist = item.plot_district || 'ไม่ระบุอำเภอ';
            const crop = item.crop_name || 'ไม่ระบุพืช';
            const farmer = item.farmer_name;
            if (!top10Crops.includes(crop)) return;

            if (!districtCropFarmers[dist]) districtCropFarmers[dist] = { _totalSet: new Set() };
            if (!districtCropFarmers[dist][crop]) districtCropFarmers[dist][crop] = new Set();

            if (farmer) {
                districtCropFarmers[dist][crop].add(farmer);
                districtCropFarmers[dist]._totalSet.add(farmer);
            }
        });

        const barDataArray = Object.keys(districtCropFarmers).map(dist => {
            const obj = { name: dist, total: districtCropFarmers[dist]._totalSet.size };
            top10Crops.forEach(crop => {
                obj[crop] = districtCropFarmers[dist][crop] ? districtCropFarmers[dist][crop].size : 0;
            });
            return obj;
        }).sort((a, b) => b.total - a.total); 

        return { certBar: barDataArray, certGroups: top10Crops };
    }, [certs, top10Crops]);

    const certVolumeData = useMemo(() => {
        const cropVolume = {};
        certs.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            cropVolume[crop] = (cropVolume[crop] || 0) + (Number(item.production_volume_kg) || 0);
        });
        return Object.entries(cropVolume)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0);
    }, [certs]);

    const certExpireData = useMemo(() => {
        const yearCount = {};
        certs.forEach(item => {
            if (!item.exp_date) return;
            const parts = String(item.exp_date).split('/');
            const year = parts.length === 3 ? parts[2] : 'ไม่ระบุ';
            // Extract properly formatted year if possible
            if (year.length === 4 && !isNaN(year)) {
                 yearCount[year] = (yearCount[year] || 0) + 1;
            }
        });
        return Object.entries(yearCount)
            .sort((a, b) => a[0].localeCompare(b[0])) 
            .map(([year, count]) => ({ year, count }));
    }, [certs]);


    // ============================================
    // Crop Production Chart
    // ============================================
    const cropBar = useMemo(() => {
        const map = {};
        crops.forEach(c => {
            const key = c.district || c.crop_name || 'ไม่ระบุ';
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [crops]);

    // ============================================
    // Summary Stats for Bento Cards
    // ============================================
    const lpStats = useMemo(() => {
        let members = 0, area = 0, rice = 0, veg = 0, fruit = 0, field = 0, other = 0;
        largePlots.forEach(row => {
            members += Number(row.member_count) || 0;
            area += Number(row.area_rai) || 0;
            const g = row.commodity_group;
            if (g === 'ข้าว') rice++;
            else if (g === 'ผัก/สมุนไพร') veg++;
            else if (g === 'ไม้ผล') fruit++;
            else if (g === 'พืชไร่') field++;
            else other++;
        });
        return { total: largePlots.length, rice, veg, fruit, field, other, members, area };
    }, [largePlots]);

    const certStats = useMemo(() => {
        let area = 0;
        const cropMap = {};
        certs.forEach(row => {
            area += Number(row.area_rai) || 0;
            const c = row.crop_name || 'ไม่ระบุ';
            cropMap[c] = (cropMap[c] || 0) + 1;
        });
        const prods = Object.entries(cropMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: certs.length, area, topCrops: prods };
    }, [certs]);

    const cropStats = useMemo(() => {
        const cropMap = {};
        crops.forEach(row => {
            const c = row.crop_name || 'ไม่ระบุ';
            cropMap[c] = (cropMap[c] || 0) + 1;
        });
        const prods = Object.entries(cropMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: crops.length, topCrops: prods };
    }, [crops]);

    return (
        <div>
            <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <PieChartOutlined style={{ fontSize: 22, color: '#1a7f37' }} />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>🌱 ส่งเสริมและพัฒนาการผลิต</h2>
                </div>
                <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>ภาพรวมข้อมูลแปลงใหญ่, มาตรฐาน GAP และผลผลิตพืช</p>
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    {/* Bento Summary Cards */}
                    <section className="bento-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', display: 'grid', gap: '24px', marginBottom: '32px', gridTemplateAreas: 'none' }}>
                        
                        {/* 1. Large Plots */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🌾 แปลงใหญ่</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {lpStats.total} แปลง
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>

                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>กลุ่มสินค้าหลัก (แปลง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef9c3', borderRadius: '6px' }}>
                                            <span style={{ fontSize: 12, color: '#854d0e', fontWeight: 500 }}>ข้าว</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ca8a04' }}>{lpStats.rice}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#dcfce3', borderRadius: '6px' }}>
                                            <span style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>ผัก/สมุนไพร</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{lpStats.veg}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef3c7', borderRadius: '6px' }}>
                                            <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>ไม้ผล</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{lpStats.fruit}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f5f5f4', borderRadius: '6px' }}>
                                            <span style={{ fontSize: 12, color: '#57534e', fontWeight: 500 }}>พืชไร่</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#44403c' }}>{lpStats.field}</span>
                                        </div>
                                        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f3e8ff', borderRadius: '6px' }}>
                                            <span style={{ fontSize: 12, color: '#6b21a8', fontWeight: 500 }}>กลุ่มอื่นๆ (ปศุสัตว์/ประมง/...)</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#7e22ce' }}>{lpStats.other}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ปริมาณรวม (ราย/ไร่)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>จำนวนสมาชิกรวม</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{lpStats.members.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>พื้นที่รวม (ไร่)</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{lpStats.area.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* 2. Certifications */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>✅ การรับรองมาตรฐาน (GAP)</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {certStats.total} แปลง
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ภาพรวมพื้นที่ (ไร่)</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                        <span style={{ fontSize: 14, color: '#065f46', fontWeight: 600 }}>พื้นที่รับรองรวม</span>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: '#047857' }}>{certStats.area.toLocaleString()} <span style={{fontSize: 12, fontWeight: 500}}>ไร่</span></span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>พืชที่ได้รับรองมากที่สุด (แปลง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {certStats.topCrops.map(([c, count], idx) => (
                                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: idx % 2 === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: '8px', border: '1px solid', borderColor: idx % 2 === 0 ? '#dcfce3' : '#e2e8f0' }}>
                                                <span style={{ fontSize: 13, color: idx % 2 === 0 ? '#166534' : '#475569', fontWeight: 600 }}>{c}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: idx % 2 === 0 ? '#15803d' : '#0f172a' }}>{count}</span>
                                            </div>
                                        ))}
                                        {certStats.topCrops.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Crop Production */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>📊 แหล่งผลิตพืช</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {cropStats.total} แหล่ง
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>พืชที่ผลิตมากที่สุด (แหล่ง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {cropStats.topCrops.map(([c, count], idx) => (
                                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: idx % 2 === 0 ? '#f5f3ff' : '#f8fafc', borderRadius: '8px', border: '1px solid', borderColor: idx % 2 === 0 ? '#ede9fe' : '#e2e8f0' }}>
                                                <span style={{ fontSize: 13, color: idx % 2 === 0 ? '#5b21b6' : '#475569', fontWeight: 600 }}>{c}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: idx % 2 === 0 ? '#6d28d9' : '#0f172a' }}>{count}</span>
                                            </div>
                                        ))}
                                        {cropStats.topCrops.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                    <Row gutter={[20, 20]}>
                        
                        {/* --- Large Plots --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🌾 ภาพรวมสัดส่วนแต่ละกลุ่มสินค้าแปลงใหญ่" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {lpPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={lpPie}
                                                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {lpPie.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={LP_COLORS[index % LP_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value + ' แปลง', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="แปลงใหญ่" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🌾 จำนวนแปลงใหญ่แยกตามอำเภอ (ตามกลุ่มสินค้า)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {lpBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={lpBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomLPBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {lpGroups.map((group, index) => (
                                                    <Bar key={group} dataKey={group} stackId="a" fill={LP_COLORS[index % LP_COLORS.length]} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="แปลงใหญ่" />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Certifications --- */}
                        <Col xs={24} lg={12}>
                            <Card title="✅ จำนวนเกษตรกร (ราย) มาตรฐาน GAP แยกตามชนิดพืช (Top 10)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {certPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={certPie}
                                                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {certPie.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CERT_COLORS[index % CERT_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString() + ' ราย', 'เกษตรกร']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="มาตรฐาน GAP" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="✅ จำนวนเกษตรกรแยกตามอำเภอ (Top 10 พืชมาตรฐาน GAP)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {certBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={certBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomCertBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {certGroups.slice(0, 10).map((group, index) => (
                                                    <Bar key={group} dataKey={group} stackId="a" fill={CERT_COLORS[index % CERT_COLORS.length]} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="มาตรฐาน GAP" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="✅ ปริมาณผลผลิตรวม GAP (กิโลกรัม) - 10 อันดับแรก" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {certVolumeData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={certVolumeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                                <XAxis type="number" tick={{ fontSize: 12, fill: '#656d76' }} tickFormatter={(val) => val.toLocaleString()} />
                                                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#656d76' }} width={80} interval={0} />
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString() + ' กก.', 'ผลผลิต']} cursor={{fill: '#f6f8fa'}} />
                                                <Bar dataKey="value" fill="#d46b08" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                                    {certVolumeData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CERT_COLORS[(index + 4) % CERT_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="ผลผลิต GAP" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="✅ แนวโน้มใบรับรอง GAP หมดอายุ (แบ่งตามปี)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 320 }}>
                                    {certExpireData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={certExpireData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#656d76' }} />
                                                <YAxis tick={{ fontSize: 12, fill: '#656d76' }} allowDecimals={false} />
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString() + ' แปลง', 'ใบรับรองจะหมดอายุ']} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} activeDot={{ r: 8 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) :  <EmptyChart label="ข้อมูลหมดอายุ" />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Crop Production Data --- */}
                        {cropBar.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title="📊 ผลผลิตพืชรายอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                    <div style={{ height: 320 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cropBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#ab47bc" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </Col>
                        )}

                    </Row>
                </>
            )}
        </div>
    );
}

