import { Row, Col, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer, ComposedChart, Line
} from 'recharts';
import { useProductionData } from '../../hooks/useProductionData';
import { PageHeader, CategoryBentoCard, CategoryChartCard } from '../../components/widgets/SharedDashboardUI';

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
    const {
        loading,
        lpPie, lpBar, lpGroups, lpStats,
        certPie, certBar, certGroups, certVolumeData, certExpireData, certStats,
        cropBar, cropStats
    } = useProductionData();

    return (
        <div>
            <PageHeader 
                title="🌱 ส่งเสริมและพัฒนาการผลิต" 
                subtitle="ภาพรวมข้อมูลแปลงใหญ่, มาตรฐาน GAP และผลผลิตพืช" 
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
                        
                        {/* 1. Large Plots */}
                        <CategoryBentoCard
                            title="แปลงใหญ่"
                            icon="🌾"
                            totalLabel="ทั้งหมด"
                            totalCount={`${lpStats.total} แปลง`}
                            mainStatsTitle="กลุ่มสินค้าหลัก (แปลง)"
                            mainStats={[
                                { label: 'ข้าว', value: lpStats.rice, key: 'rice' },
                                { label: 'ผัก/สมุนไพร', value: lpStats.veg, key: 'veg' },
                                { label: 'ไม้ผล', value: lpStats.fruit, key: 'fruit' },
                                { label: 'พืชไร่', value: lpStats.field, key: 'field' },
                                { label: 'สมาชิก (ราย)', value: lpStats.members.toLocaleString(), isTotal: true },
                                { label: 'พื้นที่ (ไร่)', value: lpStats.area.toLocaleString(), isTotal: true }
                            ]}
                        />

                        {/* 2. Certifications */}
                        <CategoryBentoCard
                            title="การรับรองมาตรฐาน (GAP)"
                            icon="✅"
                            totalLabel="ทั้งหมด"
                            totalCount={`${certStats.total} แปลง`}
                            mainStatsTitle="พืชที่ได้รับรองมากที่สุด (แปลง)"
                            mainStats={[
                                ...certStats.topCrops.map(([c, count]) => ({ label: c, value: count })),
                                { label: 'พื้นที่รับรองรวม (ไร่)', value: certStats.area.toLocaleString(), isTotal: true }
                            ]}
                        />

                        {/* 3. Crop Production */}
                        <CategoryBentoCard
                            title="แหล่งผลิตพืช"
                            icon="📊"
                            totalLabel="ทั้งหมด"
                            totalCount={`${cropStats.total} แหล่ง`}
                            mainStatsTitle="พืชที่ผลิตมากที่สุด (แหล่ง)"
                            mainStats={cropStats.topCrops.map(([c, count]) => ({
                                label: c, value: count, colorType: 'blue'
                            }))}
                        />

                    </section>

                    <Row gutter={[20, 20]}>
                        {/* --- Large Plots --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌾 ภาพรวมสัดส่วนแต่ละกลุ่มสินค้าแปลงใหญ่">
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
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌾 จำนวนแปลงใหญ่แยกตามอำเภอ (ตามกลุ่มสินค้า)">
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
                            </CategoryChartCard>
                        </Col>

                        {/* --- Certifications --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ จำนวนเกษตรกร (ราย) มาตรฐาน GAP แยกตามชนิดพืช (Top 10)">
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
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ จำนวนเกษตรกรแยกตามอำเภอ (Top 10 พืชมาตรฐาน GAP)">
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
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ ปริมาณผลผลิตรวม GAP (กิโลกรัม) - 10 อันดับแรก">
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
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ แนวโน้มใบรับรอง GAP หมดอายุ (แบ่งตามปี)">
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
                            </CategoryChartCard>
                        </Col>

                        {/* --- Crop Production Data --- */}
                        {cropBar.length > 0 && (
                            <Col xs={24} lg={12}>
                                <CategoryChartCard title="📊 ผลผลิตพืชรายอำเภอ">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cropBar} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip />
                                            <Bar dataKey="value" name="จำนวน" fill="#ab47bc" radius={[4, 4, 0, 0]} />
                                        </BarChart>
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
