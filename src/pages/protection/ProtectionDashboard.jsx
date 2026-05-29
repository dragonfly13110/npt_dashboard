import { Row, Col, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { barOption, pieOption } from '../../components/charts/echartOptions';
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
                                    <EChart option={pieOption(poPie, { colors: CHART_COLORS, unit: 'แปลง' })} />
                                ) : <EmptyChart label="แปลงพยากรณ์" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌿 แปลงพยากรณ์รวมแยกอำเภอ (แยกประเภทแปลง)">
                                {poBar.length > 0 ? (
                                    <EChart option={barOption(poBar, poTypes.map((type) => ({ key: type, name: type, color: PLOT_TYPE_COLORS[type] || '#8250df' })), { stacked: true, unit: 'แปลง', totalKey: 'total' })} />
                                ) : <EmptyChart label="แปลงพยากรณ์" />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Pest Centers --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏥 ศจช. ตามชนิดพืชหลัก">
                                {pcPie.length > 0 ? (
                                    <EChart option={pieOption(pcPie, { colors: CHART_COLORS, unit: 'ศูนย์' })} />
                                ) : <EmptyChart label="ศจช." />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏥 ศจช. แยกอำเภอ (ระดับชั้น)">
                                {pcBar.length > 0 ? (
                                    <EChart option={barOption(pcBar, pcTypes.map((type) => ({ key: type, name: `ระดับ ${type}`, color: PC_GRADE_COLORS[type] || '#8250df' })), { stacked: true, unit: 'ศูนย์', totalKey: 'total' })} />
                                ) : <EmptyChart label="ศจช." />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Soil Fertilizer Centers --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🧪 ศดปช. ตามชนิดพืชหลัก">
                                {sfPie.length > 0 ? (
                                    <EChart option={pieOption(sfPie, { colors: CHART_COLORS, unit: 'ศูนย์' })} />
                                ) : <EmptyChart label="ศดปช." />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🧪 ศดปช. แยกอำเภอ (ระดับชั้น)">
                                {sfBar.length > 0 ? (
                                    <EChart option={barOption(sfBar, sfTypes.map((type) => ({ key: type, name: `ระดับ ${type}`, color: SF_GRADE_COLORS[type] || '#8250df' })), { stacked: true, unit: 'ศูนย์', totalKey: 'total' })} />
                                ) : <EmptyChart label="ศดปช." />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Fire Hotspots Pie --- */}
                        {firePie.length > 0 && (
                            <Col xs={24} lg={12}>
                                <CategoryChartCard title="🔥 จุดเฝ้าระวัง PM2.5 แยกตามพื้นที่">
                                    <EChart option={pieOption(firePie, { colors: PIE_COLORS, unit: 'จุด' })} />
                                </CategoryChartCard>
                            </Col>
                        )}
                    </Row>
                </>
            )}
        </div>
    );
}
