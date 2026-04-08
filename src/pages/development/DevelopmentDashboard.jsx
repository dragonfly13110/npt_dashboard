import { Row, Col, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { useDevelopmentData } from '../../hooks/useDevelopmentData';
import { PageHeader, CategoryBentoCard, CategoryChartCard } from '../../components/widgets/SharedDashboardUI';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const CE_TYPE_COLORS = {
    'วิสาหกิจชุมชน': '#0969da',
    'เครือข่ายวิสาหกิจชุมชน': '#1a7f37',
    'ไม่ระบุ': '#656d76',
};

const FI_GROUP_TYPES = [
    { key: 'community_enterprise_groups', label: 'วิสาหกิจชุมชน', color: '#0969da' },
    { key: 'housewives_groups', label: 'กลุ่มแม่บ้านเกษตรกร', color: '#1a7f37' },
    { key: 'young_farmer_groups', label: 'กลุ่มยุวเกษตรกร', color: '#bf8700' },
    { key: 'career_promotion_groups', label: 'กลุ่มส่งเสริมอาชีพ', color: '#8250df' }
];

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

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}

export default function DevelopmentDashboard() {
    const {
        loading,
        cePie, ceBar, ceGroups, ceStats,
        sfBar, sfStats,
        fiPie, fiBar, fiStats
    } = useDevelopmentData();

    return (
        <div>
            <PageHeader 
                title="🤝 ส่งเสริมและพัฒนาเกษตรกร" 
                subtitle="ภาพรวมข้อมูลวิสาหกิจชุมชน, เกษตรกรรุ่นใหม่, กลุ่มแม่บ้าน, สถาบันเกษตรกร และท่องเที่ยวเกษตร" 
                icon={PieChartOutlined} 
            />

            {loading ? (
                <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="กำลังโหลดข้อมูล..." />
                </div>
            ) : (
                <>
                    {/* Bento Summary Cards */}
                    <section className="bento-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', display: 'grid', gap: '24px', marginBottom: '32px', gridTemplateAreas: 'none' }}>
                        
                        {/* 1. Community Enterprises */}
                        <CategoryBentoCard
                            title="วิสาหกิจชุมชน"
                            icon="🤝"
                            totalLabel="ทั้งหมด"
                            totalCount={`${ceStats.total} แห่ง`}
                            mainStatsTitle="จำนวนตามอำเภอ (แห่ง)"
                            mainStats={ceStats.districts.map(([dist, count]) => ({
                                label: dist, value: count, colorType: 'blue'
                            }))}
                        />

                        {/* 2. Farmer Institutes */}
                        <CategoryBentoCard
                            title="สถาบันเกษตรกร"
                            icon="👥"
                            totalLabel="ทั้งหมด"
                            totalCount={`${fiStats.total} กลุ่ม`}
                            mainStatsTitle="ข้อมูลสมาชิก และประเภทกลุ่ม"
                            mainStats={[
                                { label: 'วิสาหกิจฯ (กลุ่ม)', value: fiStats.ce, colorType: 'blue' },
                                { label: 'แม่บ้านฯ (กลุ่ม)', value: fiStats.housewives, colorType: 'green' },
                                { label: 'ยุวเกษตรฯ (กลุ่ม)', value: fiStats.young_grp, colorType: 'red' },
                                { label: 'ส่งเสริมอาชีพ (กลุ่ม)', value: fiStats.career, colorType: 'blue' },
                                { label: 'เกษตรกรทั่วไป (ราย)', value: fiStats.village.toLocaleString(), isTotal: true },
                                { label: 'Smart Farmer (ราย)', value: fiStats.sf.toLocaleString(), isTotal: true },
                                { label: 'YSF (ราย)', value: fiStats.ysf.toLocaleString(), isTotal: true }
                            ]}
                        />

                        {/* 3. Smart Farmers */}
                        <CategoryBentoCard
                            title="เกษตรกรรุ่นใหม่"
                            icon="🧑‍🌾"
                            totalLabel="ทั้งหมด"
                            totalCount={`${sfStats.total} ราย`}
                            mainStatsTitle="สินค้าหลักที่เพาะปลูก"
                            mainStats={sfStats.topProducts.map(([prod, count], idx) => ({
                                label: prod, value: count, colorType: idx % 2 === 0 ? 'red' : 'blue'
                            }))}
                        />

                    </section>

                    <Row gutter={[20, 20]}>
                        {/* --- Farmer Institutes Charts --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏛️ สรุปสัดส่วนประเภทกลุ่มสถาบันเกษตรกร">
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
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏛️ จำนวนกลุ่มแยกตามอำเภอ (แยกประเภทกลุ่ม)">
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
                            </CategoryChartCard>
                        </Col>

                        {/* --- Community Enterprises Charts --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🤝 สัดส่วนวิสาหกิจชุมชนแยกตามอำเภอ">
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
                            </CategoryChartCard>
                        </Col>
                        
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🤝 จำนวนวิสาหกิจชุมชนแยกตามอำเภอ (ตามประเภท)">
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
                            </CategoryChartCard>
                        </Col>

                        {/* --- Smart Farmers Bar --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🧑‍🌾 เกษตรกรรุ่นใหม่แยกตามอำเภอ">
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
                            </CategoryChartCard>
                        </Col>

                    </Row>
                </>
            )}
        </div>
    );
}
