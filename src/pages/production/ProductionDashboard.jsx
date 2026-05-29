import { Row, Col, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { barOption, comboOption, pieOption } from '../../components/charts/echartOptions';
import { useProductionData } from '../../hooks/useProductionData';
import { PageHeader, CategoryBentoCard, CategoryChartCard } from '../../components/widgets/SharedDashboardUI';

const CERT_COLORS = ['#1a7f37', '#0969da', '#bf8700', '#cf222e', '#8250df', '#0550ae', '#bc8c00', '#2da44e'];
const LP_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4caf50', '#e91e63'];

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
                                    <EChart option={pieOption(lpPie, { colors: LP_COLORS, unit: 'แปลง' })} />
                                ) : <EmptyChart label="แปลงใหญ่" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🌾 จำนวนแปลงใหญ่แยกตามอำเภอ (ตามกลุ่มสินค้า)">
                                {lpBar.length > 0 ? (
                                    <EChart option={barOption(lpBar, lpGroups.map((group, index) => ({ key: group, color: LP_COLORS[index % LP_COLORS.length] })), { stacked: true, colors: LP_COLORS, unit: 'แปลง', totalKey: 'total' })} />
                                ) : <EmptyChart label="แปลงใหญ่" />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Certifications --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ จำนวนเกษตรกร (ราย) มาตรฐาน GAP แยกตามชนิดพืช (Top 10)">
                                {certPie.length > 0 ? (
                                    <EChart option={pieOption(certPie, { colors: CERT_COLORS, unit: 'ราย' })} />
                                ) : <EmptyChart label="มาตรฐาน GAP" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ จำนวนเกษตรกรแยกตามอำเภอ (Top 10 พืชมาตรฐาน GAP)">
                                {certBar.length > 0 ? (
                                    <EChart option={barOption(certBar, certGroups.slice(0, 10).map((group, index) => ({ key: group, color: CERT_COLORS[index % CERT_COLORS.length] })), { stacked: true, colors: CERT_COLORS, unit: 'ราย' })} />
                                ) : <EmptyChart label="มาตรฐาน GAP" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ ปริมาณผลผลิตรวม GAP (กิโลกรัม) - 10 อันดับแรก">
                                {certVolumeData.length > 0 ? (
                                    <EChart option={barOption(certVolumeData, [{ key: 'value', name: 'ผลผลิต' }], { layout: 'vertical', colors: CERT_COLORS.slice(4).concat(CERT_COLORS), unit: 'กก.', grid: { left: 76 } })} />
                                ) : <EmptyChart label="ผลผลิต GAP" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="✅ แนวโน้มใบรับรอง GAP หมดอายุ (แบ่งตามปี)">
                                {certExpireData.length > 0 ? (
                                    <EChart option={comboOption(certExpireData, [
                                            { key: 'count', name: 'ใบรับรองจะหมดอายุ', color: '#3b82f6' },
                                            { key: 'count', name: 'แนวโน้ม', color: '#f59e0b', type: 'line' },
                                        ], { categoryKey: 'year', colors: ['#3b82f6', '#f59e0b'], unit: 'แปลง' })} />
                                ) :  <EmptyChart label="ข้อมูลหมดอายุ" />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Crop Production Data --- */}
                        {cropBar.length > 0 && (
                            <Col xs={24} lg={12}>
                                <CategoryChartCard title="📊 ผลผลิตพืชรายอำเภอ">
                                    <EChart option={barOption(cropBar, [{ key: 'value', name: 'จำนวน', color: '#ab47bc' }], { colors: ['#ab47bc'] })} />
                                </CategoryChartCard>
                            </Col>
                        )}
                    </Row>
                </>
            )}
        </div>
    );
}
