import { Row, Col, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { useProtectionData } from '../../hooks/useProtectionData';
import { PageHeader, CategoryBentoCard, CategoryChartCard } from '../../components/widgets/SharedDashboardUI';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4'];

const PLOT_TYPE_COLORS = {
    'พื้นที่เสี่ยง': '#cf222e',
    'ศจช.': '#0969da',
    'พื้นที่เฝ้าระวัง': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const PC_GRADE_COLORS = {
    'A': '#1a7f37',
    'B': '#0969da',
    'C': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const SF_GRADE_COLORS = {
    'A+': '#055160',
    'A': '#1a7f37',
    'B': '#0969da',
    'C': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const CustomTooltip = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        const total = payload[0].payload.total || 0;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value} {unit}
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total} {unit}
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

export default function ProtectionDashboard() {
    const {
        loading,
        poPie, poBar, poTypes, poStats,
        pcPie, pcBar, pcTypes, pcStats,
        sfPie, sfBar, sfTypes, sfStats,
        firePie
    } = useProtectionData();

    return (
        <div>
            <PageHeader 
                title="🛡️ อารักขาพืช" 
                subtitle="ภาพรวมข้อมูลแปลงพยากรณ์, ศจช., ศดปช. และจุดเฝ้าระวัง PM2.5" 
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
                        
                        {/* 1. Pest Outbreaks (Forecast Plots) */}
                        <CategoryBentoCard
                            title="แปลงพยากรณ์"
                            icon="🌿"
                            totalLabel="ทั้งหมด"
                            totalCount={`${poStats.total} แปลง`}
                            mainStatsTitle="ประเภทแปลง (แปลง)"
                            mainStats={[
                                { label: 'พื้นที่เสี่ยง', value: poStats.risk, colorType: 'red' },
                                { label: 'ศจช.', value: poStats.pc, colorType: 'blue' },
                                { label: 'พื้นที่เฝ้าระวัง', value: poStats.watch, colorType: 'red' }
                            ]}
                        />

                        {/* 2. Pest Centers (ศจช.) */}
                        <CategoryBentoCard
                            title="ศูนย์จัดการศัตรูพืชชุมชน (ศจช.)"
                            icon="🏥"
                            totalLabel="ทั้งหมด"
                            totalCount={`${pcStats.total} ศูนย์`}
                            mainStatsTitle="ระดับการประเมินศักยภาพ (ศูนย์)"
                            mainStats={[
                                { label: 'ระดับ A', value: pcStats.a, colorType: 'green' },
                                { label: 'ระดับ B', value: pcStats.b, colorType: 'blue' },
                                { label: 'ระดับ C', value: pcStats.c, colorType: 'red' }
                            ]}
                        />

                        {/* 3. Soil Fertilizer Centers (ศดปช.) */}
                        <CategoryBentoCard
                            title="ศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.)"
                            icon="🧪"
                            totalLabel="ทั้งหมด"
                            totalCount={`${sfStats.total} ศูนย์`}
                            mainStatsTitle="ระดับการประเมินศักยภาพ (ศูนย์)"
                            mainStats={[
                                { label: 'ระดับ A+', value: sfStats.aplus, colorType: 'blue' },
                                { label: 'ระดับ A', value: sfStats.a, colorType: 'green' },
                                { label: 'ระดับ B', value: sfStats.b, colorType: 'blue' },
                                { label: 'ระดับ C', value: sfStats.c, colorType: 'red' }
                            ]}
                        />

                    </section>

                    <Row gutter={[20, 20]}>

                        {/* --- Pest Outbreaks (Forecast Plots) --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌿 แปลงพยากรณ์ตามชนิดพืช">
                                {poPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={poPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {poPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val) => [val + ' แปลง', 'จำนวน']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="แปลงพยากรณ์" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌿 แปลงพยากรณ์รวมแยกอำเภอ (แยกประเภทแปลง)">
                                {poBar.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={poBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomTooltip unit="แปลง" />} />
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                            {poTypes.map((type) => (
                                                <Bar key={type} dataKey={type} name={type} stackId="a" fill={PLOT_TYPE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="แปลงพยากรณ์" />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Pest Centers --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏥 ศจช. ตามชนิดพืชหลัก">
                                {pcPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pcPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {pcPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val) => [val + ' ศูนย์', 'จำนวน']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="ศจช." />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏥 ศจช. แยกอำเภอ (ระดับชั้น)">
                                {pcBar.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={pcBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomTooltip unit="ศูนย์" />} />
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                            {pcTypes.map((type) => (
                                                <Bar key={type} dataKey={type} name={`ระดับ ${type}`} stackId="a" fill={PC_GRADE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="ศจช." />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Soil Fertilizer Centers --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🧪 ศดปช. ตามชนิดพืชหลัก">
                                {sfPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={sfPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {sfPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val) => [val + ' ศูนย์', 'จำนวน']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="ศดปช." />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🧪 ศดปช. แยกอำเภอ (ระดับชั้น)">
                                {sfBar.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={sfBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomTooltip unit="ศูนย์" />} />
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                            {sfTypes.map((type) => (
                                                <Bar key={type} dataKey={type} name={`ระดับ ${type}`} stackId="a" fill={SF_GRADE_COLORS[type] || '#8250df'} maxBarSize={50} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart label="ศดปช." />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Fire Hotspots Pie --- */}
                        {firePie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <CategoryChartCard title="🔥 จุดเฝ้าระวัง PM2.5 แยกตามพื้นที่">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={firePie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {firePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(val) => [val + ' จุด', 'จำนวน']} />
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
