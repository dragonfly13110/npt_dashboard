import { useMemo } from 'react';
import { Row, Col, Card, Spin, Tag } from 'antd';
import { PieChartOutlined, EnvironmentOutlined, BankOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { supabase } from '../../supabaseClient';
import { PageHeader, CategoryBentoCard, CategoryChartCard } from '../../components/widgets/SharedDashboardUI';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

const AGRI_COLORS = ['#ffb300', '#f57c00', '#7cb342', '#43a047', '#00897b', '#039be5', '#3949ab', '#8e24aa'];
const LEARN_COLORS = ['#0288d1', '#0097a7', '#388e3c', '#afb42b', '#fbc02d', '#f57c00', '#e64a19', '#d32f2f'];

const CustomAgriBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.totalArea || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })} ไร่
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ไร่
                </div>
            </div>
        );
    }
    return null;
};

const CustomLearnBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value?.toLocaleString()} ศูนย์
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total.toLocaleString()} ศูนย์
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

import { useApiCache } from '../../hooks/useApiCache';

export default function StrategyDashboard() {
    const fetchStrategyData = async () => {
        const [agri, learn, disaster] = await Promise.all([
            // In a larger app, you might want to specify exactly what columns to load to reduce payload
            supabase.from('agricultural_areas').select('*'),
            supabase.from('learning_centers').select('*'),
            supabase.from('disasters').select('*'),
        ]);
        return {
            agriData: agri.data || [],
            learningData: learn.data || [],
            disasterData: disaster.data || []
        };
    };

    const { data, isLoading: loading } = useApiCache('strategy-dashboard-data', fetchStrategyData);

    const agriData = useMemo(() => data?.agriData || [], [data?.agriData]);
    const learningData = useMemo(() => data?.learningData || [], [data?.learningData]);
    const disasterData = useMemo(() => data?.disasterData || [], [data?.disasterData]);

    // ============================================
    // Agricultural Areas Charts
    // ============================================
    const agriPie = useMemo(() => {
        const cropFields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
        ];
        return cropFields.map((f, i) => ({
            name: f.label,
            value: agriData.reduce((sum, row) => sum + (Number(row[f.key]) || 0), 0),
            color: AGRI_COLORS[i % AGRI_COLORS.length]
        })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
    }, [agriData]);

    const { agriBar, agriCrops } = useMemo(() => {
        const distMap = {};
        const cropFields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
        ];
        agriData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!distMap[dist]) {
                distMap[dist] = { name: dist, totalArea: 0 };
            }
            cropFields.forEach(f => {
                const area = Number(item[f.key]) || 0;
                distMap[dist][f.label] = (distMap[dist][f.label] || 0) + area;
                distMap[dist].totalArea += area;
            });
        });
        const barData = Object.values(distMap).sort((a, b) => b.totalArea - a.totalArea);
        return { agriBar: barData, agriCrops: cropFields.map(f => f.label) };
    }, [agriData]);

    // ============================================
    // Learning Centers Charts 
    // ============================================
    const learnPie = useMemo(() => {
        const counts = {};
        learningData.forEach(item => {
            const crop = item.featured_product || 'ไม่ระบุ';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [learningData]);

    const { learnBar, learnTypes } = useMemo(() => {
        const distMap = {};
        const typeSet = new Set();
        learningData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const crop = item.featured_product || 'ไม่ระบุ';
            if (!distMap[dist]) distMap[dist] = { name: dist, total: 0 };
            distMap[dist][crop] = (distMap[dist][crop] || 0) + 1;
            distMap[dist].total += 1;
            typeSet.add(crop);
        });
        const barData = Object.values(distMap).sort((a, b) => b.total - a.total);
        return { learnBar: barData, learnTypes: Array.from(typeSet).sort() };
    }, [learningData]);

    // ============================================
    // Disasters Charts
    // ============================================
    const disasterPie = useMemo(() => {
        const typeMap = {};
        disasterData.forEach(item => {
            const t = item.disaster_type || item.type || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        return Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [disasterData]);

    // ============================================
    // Summary Stats for Bento Cards
    // ============================================
    const agriStats = useMemo(() => {
        let totalArea = 0;
        const cropMap = {};
        const cropFields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
        ];
        agriData.forEach(row => {
            totalArea += Number(row.total_area_rai) || 0;
            cropFields.forEach(f => {
                const area = Number(row[f.key]) || 0;
                if (area > 0) cropMap[f.label] = (cropMap[f.label] || 0) + area;
            });
        });
        const topTypes = Object.entries(cropMap).sort((a,b) => b[1] - a[1]);
        const totalPlanted = topTypes.reduce((sum, [, val]) => sum + val, 0);
        return { totalArea, topTypes, totalPlanted };
    }, [agriData]);

    const learnStats = useMemo(() => {
        const typeMap = {};
        learningData.forEach(row => {
            const t = row.featured_product || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const topTypes = Object.entries(typeMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: learningData.length, topTypes };
    }, [learningData]);

    const disasterStats = useMemo(() => {
        const typeMap = {};
        disasterData.forEach(item => {
            const t = item.disaster_type || item.type || 'ไม่ระบุ';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const prods = Object.entries(typeMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: disasterData.length, topTypes: prods };
    }, [disasterData]);

    return (
        <div>
            <PageHeader 
                title="ยุทธศาสตร์และสารสนเทศ" 
                subtitle="ภาพรวมข้อมูลพื้นที่การเกษตร, ศพก. และภัยพิบัติ"
                icon={PieChartOutlined}
            />

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    {/* Bento Summary Cards */}
                    <section className="bento-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', display: 'grid', gap: '24px', marginBottom: '32px' }}>
                        
                        <CategoryBentoCard
                            title="พื้นที่การเกษตร"
                            icon="📍"
                            mainStatsTitle="พื้นที่เพาะปลูกรายพืช (ไร่)"
                            mainStats={[
                                ...agriStats.topTypes.map(([label, value]) => ({ 
                                    label, value: value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                                })),
                                ...(agriStats.topTypes.length > 0 ? [{ 
                                    label: 'รวมพื้นที่เพาะปลูกทั้งหมด', 
                                    value: agriStats.totalPlanted.toLocaleString(undefined, { maximumFractionDigits: 2 }), 
                                    isTotal: true 
                                }] : [])
                            ]}
                        />

                        <CategoryBentoCard
                            title="ศูนย์ ศพก."
                            icon="🏫"
                            totalLabel="ทั้งหมด"
                            totalCount={`${learnStats.total} ศูนย์`}
                            mainStatsTitle="เป้าหมาย/สินค้าหลัก (แห่ง)"
                            mainStats={learnStats.topTypes.map(([label, value]) => ({ label, value, colorType: 'blue' }))}
                        />

                        <CategoryBentoCard
                            title="ภัยพิบัติ"
                            icon="⚡"
                            totalLabel="ทั้งหมด"
                            totalCount={`${disasterStats.total} รายการ`}
                            mainStatsTitle="ประเภทภัยพิบัติ (ครั้ง)"
                            mainStats={disasterStats.topTypes.map(([label, value]) => ({ label, value, colorType: 'red' }))}
                        />

                    </section>

                    <Row gutter={[20, 20]}>
                        
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌾 สัดส่วนพื้นที่การเกษตรตามชนิดพืช">
                                {agriPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={agriPie} cx="40%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                                {agriPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val, name) => [val.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ไร่', name]} />
                                            <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 13, paddingLeft: 10 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="พื้นที่การเกษตร" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌾 พื้นที่การเกษตรรายอำเภอ (แยกชนิดพืช)">
                                {agriBar.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={agriBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomAgriBarTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                            {agriCrops.map((crop, index) => (
                                                <Bar key={crop} dataKey={crop} stackId="a" fill={AGRI_COLORS[index % AGRI_COLORS.length]} maxBarSize={50} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="พื้นที่การเกษตร" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏫 สัดส่วน ศพก. แบ่งตามพืชหลัก">
                                {learnPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={learnPie} cx="40%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                                {learnPie.map((_, i) => <Cell key={i} fill={LEARN_COLORS[i % LEARN_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val, name) => [val.toLocaleString() + ' ศูนย์', name]} />
                                            <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 13, paddingLeft: 10 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="ศพก." />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏫 จำนวนที่ตั้ง ศพก. แยกตามอำเภอ (แบ่งตามพืชหลัก)">
                                {learnBar.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={learnBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomLearnBarTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                            {learnTypes.map((type, index) => (
                                                <Bar key={type} dataKey={type} stackId="a" fill={LEARN_COLORS[index % LEARN_COLORS.length]} maxBarSize={50} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="ศพก." />}
                            </CategoryChartCard>
                        </Col>

                        {disasterPie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <CategoryChartCard title="⚡ สัดส่วนภัยพิบัติตามประเภท">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={disasterPie} cx="40%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                                {disasterPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val, name) => [val + ' รายการ', name]} />
                                            <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 13, paddingLeft: 10 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CategoryChartCard>
                            </Col>
                        )}
                    </Row>
                </>
            )}
        </div>
    );
}

