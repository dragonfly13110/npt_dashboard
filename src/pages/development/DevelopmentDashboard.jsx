import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';

// --- Constants for Community Enterprises ---
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const DISTRICT_COLORS = {
    'เมืองนครปฐม': '#0969da',
    'นครชัยศรี': '#1a7f37',
    'สามพราน': '#bf8700',
    'ดอนตูม': '#8250df',
    'บางเลน': '#cf222e',
    'กำแพงแสน': '#0550ae',
    'พุทธมณฑล': '#953800',
};
const CE_TYPE_COLORS = {
    'วิสาหกิจชุมชน': '#0969da',
    'เครือข่ายวิสาหกิจชุมชน': '#1a7f37',
    'ไม่ระบุ': '#656d76',
};

// --- Constants for Farmer Institutes ---
const FI_GROUP_TYPES = [
    { key: 'community_enterprise_groups', label: 'วิสาหกิจชุมชน', color: '#0969da' },
    { key: 'housewives_groups', label: 'กลุ่มแม่บ้านเกษตรกร', color: '#1a7f37' },
    { key: 'young_farmer_groups', label: 'กลุ่มยุวเกษตรกร', color: '#bf8700' },
    { key: 'career_promotion_groups', label: 'กลุ่มส่งเสริมอาชีพ', color: '#8250df' }
];

// --- Tooltips ---
const CustomBarTooltipCE = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value || 0} แห่ง
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} แห่ง
                </div>
            </div>
        );
    }
    return null;
};

const CustomBarTooltipFI = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        let total = 0;
        payload.forEach(entry => { total += (entry.value || 0); });
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value || 0} กลุ่ม
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} กลุ่ม
                </div>
            </div>
        );
    }
    return null;
};

export default function DevelopmentDashboard() {
    const [communityData, setCommunityData] = useState([]);
    const [smartData, setSmartData] = useState([]);
    const [farmerGroupData, setFarmerGroupData] = useState([]);
    const [farmerInstData, setFarmerInstData] = useState([]);
    const [tourismData, setTourismData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [ce, sf, fg, fi, at] = await Promise.all([
                supabase.from('community_enterprises').select('*'),
                supabase.from('smart_farmers').select('*'),
                supabase.from('farmer_groups').select('*'),
                supabase.from('farmer_institutes').select('*'),
                supabase.from('agri_tourism').select('*'),
            ]);
            setCommunityData(ce.data || []);
            setSmartData(sf.data || []);
            setFarmerGroupData(fg.data || []);
            setFarmerInstData(fi.data || []);
            setTourismData(at.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ============================================
    // Community Enterprises Charts
    // ============================================
    const cePie = useMemo(() => {
        const counts = {};
        communityData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            counts[dist] = (counts[dist] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, color: DISTRICT_COLORS[name] || '#656d76' }))
            .sort((a, b) => b.value - a.value);
    }, [communityData]);

    const { ceBar, ceGroups } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();
        communityData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const type = item.enterprise_type || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][type] = (counts[dist][type] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(type);
        });
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypeGroups = Array.from(typeSet).sort();
        return { ceBar: sortedBarData, ceGroups: sortedTypeGroups };
    }, [communityData]);


    // ============================================
    // Smart Farmers Chart
    // ============================================
    const sfBar = useMemo(() => {
        const map = {};
        smartData.forEach(s => {
            const d = s.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [smartData]);


    // ============================================
    // Farmer Institutes Charts
    // ============================================
    const fiPie = useMemo(() => {
        let sums = {
            community_enterprise_groups: 0,
            housewives_groups: 0,
            young_farmer_groups: 0,
            career_promotion_groups: 0
        };

        farmerInstData.forEach(item => {
            sums.community_enterprise_groups += Number(item.community_enterprise_groups) || 0;
            sums.housewives_groups += Number(item.housewives_groups) || 0;
            sums.young_farmer_groups += Number(item.young_farmer_groups) || 0;
            sums.career_promotion_groups += Number(item.career_promotion_groups) || 0;
        });

        return FI_GROUP_TYPES.map(type => ({
            name: type.label,
            value: sums[type.key],
            color: type.color
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [farmerInstData]);

    const fiBar = useMemo(() => {
        const districtMap = {};
        farmerInstData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!districtMap[dist]) {
                districtMap[dist] = {
                    name: dist,
                    community_enterprise_groups: 0,
                    housewives_groups: 0,
                    young_farmer_groups: 0,
                    career_promotion_groups: 0
                };
            }
            districtMap[dist].community_enterprise_groups += Number(item.community_enterprise_groups) || 0;
            districtMap[dist].housewives_groups += Number(item.housewives_groups) || 0;
            districtMap[dist].young_farmer_groups += Number(item.young_farmer_groups) || 0;
            districtMap[dist].career_promotion_groups += Number(item.career_promotion_groups) || 0;
        });

        return Object.values(districtMap).sort((a, b) => {
            const totalA = a.community_enterprise_groups + a.housewives_groups + a.young_farmer_groups + a.career_promotion_groups;
            const totalB = b.community_enterprise_groups + b.housewives_groups + b.young_farmer_groups + b.career_promotion_groups;
            return totalB - totalA;
        });
    }, [farmerInstData]);

    // ============================================
    // Summary Stats for Bento Cards
    // ============================================
    const sfStats = useMemo(() => {
        const topProducts = {};
        smartData.forEach(item => {
            const prod = item.main_product || 'ไม่ระบุ';
            topProducts[prod] = (topProducts[prod] || 0) + 1;
        });
        const prods = Object.entries(topProducts).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: smartData.length, topProducts: prods };
    }, [smartData]);

    const fiStats = useMemo(() => {
        let iTotal = 0, iCE = 0, iHouse = 0, iYoungGrp = 0, iCareer = 0, iVillage = 0, iSF = 0, iYSF = 0;
        farmerInstData.forEach(row => {
            iTotal += Number(row.total_groups) || 0;
            iCE += Number(row.community_enterprise_groups) || 0;
            iHouse += Number(row.housewives_groups) || 0;
            iYoungGrp += Number(row.young_farmer_groups) || 0;
            iCareer += Number(row.career_promotion_groups) || 0;
            iVillage += Number(row.village_farmers_count) || 0;
            iSF += Number(row.smart_farmer_count) || 0;
            iYSF += Number(row.young_smart_farmer_count) || 0;
        });
        return { total: iTotal, ce: iCE, housewives: iHouse, young_grp: iYoungGrp, career: iCareer, village: iVillage, sf: iSF, ysf: iYSF };
    }, [farmerInstData]);

    const ceStats = useMemo(() => {
        const counts = {};
        communityData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            counts[dist] = (counts[dist] || 0) + 1;
        });
        return {
           total: communityData.length,
           districts: Object.entries(counts).sort((a,b) => b[1] - a[1])
        };
    }, [communityData]);


    return (
        <div>
            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <PieChartOutlined style={{ fontSize: 22, color: '#1a7f37' }} />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>🤝 ส่งเสริมและพัฒนาเกษตรกร</h2>
                </div>
                <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>ภาพรวมข้อมูลวิสาหกิจชุมชน, เกษตรกรรุ่นใหม่, กลุ่มแม่บ้าน, สถาบันเกษตรกร และท่องเที่ยวเกษตร</p>
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    {/* Bento Summary Cards */}
                    <section className="bento-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', display: 'grid', gap: '24px', marginBottom: '32px', gridTemplateAreas: 'none' }}>
                        
                        {/* 1. Community Enterprises */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🤝 วิสาหกิจชุมชน</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {ceStats.total} แห่ง
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>จำนวนตามอำเภอ (แห่ง)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {ceStats.districts.map(([dist, count]) => (
                                            <div key={dist} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                                <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>{dist}</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{count}</span>
                                            </div>
                                        ))}
                                        {ceStats.districts.length === 0 && (
                                            <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Farmer Institutes */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>👥 สถาบันเกษตรกร</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {fiStats.total} กลุ่ม
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>ประเภท (กลุ่ม)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                            <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>วิสาหกิจฯ</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{fiStats.ce}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#dcfce3', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>แม่บ้านฯ</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a7f37' }}>{fiStats.housewives}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                            <span style={{ fontSize: 12, color: '#d97706', fontWeight: 500 }}>ยุวเกษตรฯ</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{fiStats.young_grp}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f3e8ff', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                                            <span style={{ fontSize: 12, color: '#7e22ce', fontWeight: 500 }}>ส่งเสริมอาชีพ</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b21a8' }}>{fiStats.career}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>สมาชิก/เกษตรกร (ราย)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>เกษตรกรทั่วไป (หมู่บ้าน)</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fiStats.village.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Smart Farmer</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fiStats.sf.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>YSF</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fiStats.ysf.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Smart Farmers */}
                        <div className="bento-card" style={{ marginBottom: 0 }}>
                            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>🧑‍🌾 เกษตรกรรุ่นใหม่</h3>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                    ทั้งหมด {sfStats.total} ราย
                                </div>
                            </div>
                            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>สินค้าหลักที่เพาะปลูก</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {sfStats.topProducts.map(([prod, count], idx) => (
                                            <div key={prod} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: idx % 2 === 0 ? '#fff7ed' : '#f8fafc', borderRadius: '8px', border: '1px solid', borderColor: idx % 2 === 0 ? '#ffedd5' : '#e2e8f0' }}>
                                                <span style={{ fontSize: 13, color: idx % 2 === 0 ? '#c2410c' : '#475569', fontWeight: 600 }}>{prod}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: idx % 2 === 0 ? '#ea580c' : '#0f172a' }}>{count}</span>
                                            </div>
                                        ))}
                                        {sfStats.topProducts.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 8 }}>รอเพิ่มข้อมูล...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                    <Row gutter={[20, 20]}>
                        {/* --- Farmer Institutes Charts --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🏛️ สรุปสัดส่วนประเภทกลุ่มสถาบันเกษตรกร" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {fiPie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={fiPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {fiPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value + ' กลุ่ม', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="สถาบันเกษตรกร" />}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="🏛️ จำนวนกลุ่มแยกตามอำเภอ (แยกประเภทกลุ่ม)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {fiBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={fiBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltipFI />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {FI_GROUP_TYPES.map((type) => (
                                                    <Bar 
                                                        key={type.key} 
                                                        dataKey={type.key} 
                                                        name={type.label}
                                                        stackId="a" 
                                                        fill={type.color} 
                                                        maxBarSize={50} 
                                                    />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="สถาบันเกษตรกร" />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Community Enterprises Charts --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🤝 สัดส่วนวิสาหกิจชุมชนแยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {cePie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={cePie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {cePie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value + ' แห่ง', 'จำนวน']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="วิสาหกิจชุมชน" />}
                                </div>
                            </Card>
                        </Col>
                        
                        <Col xs={24} lg={12}>
                            <Card title="🤝 จำนวนวิสาหกิจชุมชนแยกตามอำเภอ (ตามประเภท)" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {ceBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={ceBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltipCE />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {ceGroups.map((type) => (
                                                    <Bar key={type} dataKey={type} name={type} stackId="a" fill={CE_TYPE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="วิสาหกิจชุมชน" />}
                                </div>
                            </Card>
                        </Col>

                        {/* --- Smart Farmers Bar --- */}
                        <Col xs={24} lg={12}>
                            <Card title="🧑‍🌾 เกษตรกรรุ่นใหม่แยกตามอำเภอ" size="small" bordered style={{ borderRadius: 12 }}>
                                <div style={{ height: 300 }}>
                                    {sfBar.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sfBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" name="จำนวน" fill="#ff7043" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart label="เกษตรกรรุ่นใหม่" />}
                                </div>
                            </Card>
                        </Col>

                    </Row>
                </>
            )}
        </div>
    );
}

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}

