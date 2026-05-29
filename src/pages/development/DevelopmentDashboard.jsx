import { Row, Col, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { barOption, pieOption } from '../../components/charts/echartOptions';
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
                                    <EChart option={pieOption(fiPie, { colors: FI_GROUP_TYPES.map((type) => type.color), unit: 'กลุ่ม' })} />
                                ) : <EmptyChart label="สถาบันเกษตรกร" />}
                            </CategoryChartCard>
                        </Col>

                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🏛️ จำนวนกลุ่มแยกตามอำเภอ (แยกประเภทกลุ่ม)">
                                {fiBar.length > 0 ? (
                                    <EChart option={barOption(fiBar, FI_GROUP_TYPES.map((type) => ({ key: type.key, name: type.label, color: type.color })), { stacked: true, unit: 'กลุ่ม' })} />
                                ) : <EmptyChart label="สถาบันเกษตรกร" />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Community Enterprises Charts --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🤝 สัดส่วนวิสาหกิจชุมชนแยกตามอำเภอ">
                                {cePie.length > 0 ? (
                                    <EChart option={pieOption(cePie, { colors: CHART_COLORS, unit: 'แห่ง' })} />
                                ) : <EmptyChart label="วิสาหกิจชุมชน" />}
                            </CategoryChartCard>
                        </Col>
                        
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🤝 จำนวนวิสาหกิจชุมชนแยกตามอำเภอ (ตามประเภท)">
                                {ceBar.length > 0 ? (
                                    <EChart option={barOption(ceBar, ceGroups.map((type) => ({ key: type, name: type, color: CE_TYPE_COLORS[type] || '#8250df' })), { stacked: true, unit: 'แห่ง' })} />
                                ) : <EmptyChart label="วิสาหกิจชุมชน" />}
                            </CategoryChartCard>
                        </Col>

                        {/* --- Smart Farmers Bar --- */}
                        <Col xs={24} lg={12}>
                            <CategoryChartCard title="🧑‍🌾 เกษตรกรรุ่นใหม่แยกตามอำเภอ">
                                {sfBar.length > 0 ? (
                                    <EChart option={barOption(sfBar, [{ key: 'value', name: 'จำนวน', color: '#ff7043' }], { colors: ['#ff7043'] })} />
                                ) : <EmptyChart label="เกษตรกรรุ่นใหม่" />}
                            </CategoryChartCard>
                        </Col>

                    </Row>
                </>
            )}
        </div>
    );
}
