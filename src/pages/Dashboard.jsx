import { useState, useRef } from 'react';
import { Skeleton, Button, Row, Col, Card } from 'antd';
import {
    PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer
} from 'recharts';
import {
    FilePdfOutlined,
    AimOutlined, BankOutlined, TeamOutlined, AlertOutlined,
    ScheduleOutlined
} from '@ant-design/icons';

// ===== LANDING PAGE WIDGETS =====
import WeatherWidget from '../components/widgets/WeatherWidget';
import AirQualityWidget from '../components/widgets/AirQualityWidget';
import AgriPricesWidget from '../components/widgets/AgriPricesWidget';
import HotspotWidget from '../components/widgets/HotspotWidget';

import LandingMap from '../components/widgets/LandingMap';
import {
    SmartFarmersCard, CommunityEnterprisesCard, LargePlotsCard,
    AgriTourismCard, FarmerInstitutesCard, AgriAreasCard
} from '../components/widgets/LandingBentoCards';

import '../pages/LandingPage.css';

import { useDashboardData, groupConfig, PIE_COLORS } from '../hooks/useDashboardData';

export default function Dashboard() {
    const {
        stats, loading, mapData, districtStats, smartFarmers, enterprises,
        ceDistrictStats, tourism, instituteStats, lpStats, agriStats,
        agriPie, lpPie
    } = useDashboardData();

    const [pdfExporting, setPdfExporting] = useState(false);
    const dashRef = useRef(null);

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    const handleExportPdf = async () => {
        if (!dashRef.current) return;
        setPdfExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(dashRef.current, {
                scale: 2, useCORS: true, logging: false, backgroundColor: '#f6f8fa',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
            const w = canvas.width * ratio;
            const h = canvas.height * ratio;
            pdf.addImage(imgData, 'PNG', (pdfW - w) / 2, 4, w, h);
            pdf.save(`dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) { console.error(err); }
        finally { setPdfExporting(false); }
    };

    return (
        <div ref={dashRef} className="dashboard-unified">
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div className="md-page-header" style={{ marginBottom: 0 }}>
                    <h2>📊 แดชบอร์ดรวม</h2>
                    <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>ภาพรวมข้อมูลทั้งหมด — สภาพอากาศ ราคาสินค้า และข้อมูลเกษตรกร</p>
                </div>
                <Button
                    icon={<FilePdfOutlined />}
                    onClick={handleExportPdf}
                    loading={pdfExporting}
                    className="export-btn pdf-export-btn"
                >
                    พิมพ์ PDF
                </Button>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 1: LIVE WIDGETS — Weather / AQI / Prices       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">🌤️</span>
                <span>สภาพอากาศ คุณภาพอากาศ และราคาสินค้าเกษตร</span>
            </div>
            <div className="dash-live-widgets">
                <div className="dash-live-left">
                    <WeatherWidget />
                    <AirQualityWidget />
                </div>
                <div className="dash-live-right">
                    <AgriPricesWidget />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 2: HOTSPOT / FIRE MAP                          */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">🔥</span>
                <span>สถานการณ์ไฟ / จุดความร้อน</span>
            </div>
            <div style={{ marginBottom: 28 }}>
                <HotspotWidget />
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 3: GROUP SUMMARY CARDS                         */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">📈</span>
                <span>สรุปข้อมูลตามกลุ่มงาน</span>
            </div>
            <div className="md-stat-row">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="md-stat-card"><Skeleton active paragraph={{ rows: 1 }} /></div>
                    ))
                ) : (
                    groupConfig.map((g) => {
                        const groupTotal = stats.filter(s => s.group === g.group).reduce((sum, s) => sum + s.count, 0);
                        const IconMap = { 'ยุทธศาสตร์ฯ': AimOutlined, 'ส่งเสริมการผลิต': BankOutlined, 'พัฒนาเกษตรกร': TeamOutlined, 'อารักขาพืช': AlertOutlined };
                        const IconComp = IconMap[g.group] || AimOutlined;
                        const colorMap = { '#1565c0': 'blue', '#43a047': 'green', '#6a1b9a': 'purple', '#e65100': 'orange' };
                        return (
                            <div key={g.group} className="md-stat-card">
                                <div className="md-stat-card-inner">
                                    <div className="md-stat-card-top">
                                        <div className={`md-stat-icon ${colorMap[g.color] || 'blue'}`}>
                                            <IconComp style={{ fontSize: 24 }} />
                                        </div>
                                        <div className="md-stat-info">
                                            <div className="md-stat-label">{g.icon} {g.group}</div>
                                            <div className="md-stat-value">{groupTotal.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="md-stat-footer">
                                        <ScheduleOutlined />
                                        <span>รายการข้อมูลรวม {g.tables.length} หมวด</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 4: BENTO CARDS + MAP (from Landing Page)       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">📅</span>
                <span>ข้อมูลเกษตรกร แปลงใหญ่ วิสาหกิจชุมชน แหล่งท่องเที่ยว และแผนที่</span>
            </div>
            <section className="bento-container dash-bento-override" style={{ marginTop: 0 }}>
                {/* Map Card */}
                <div className="bento-card bento-card-map" style={{ gridArea: 'map' }}>
                    <div className="bento-card-header">
                        <h3>🗺️ แผนที่ข้อมูลการเกษตร</h3>
                        <span>พิกัดพื้นที่เชิงเกษตร (GIS, ท่องเที่ยว)</span>
                    </div>
                    <div className="bento-card-body p-0">
                        <LandingMap mapData={mapData} districtStats={districtStats} />
                    </div>
                </div>

                <SmartFarmersCard data={smartFarmers} loading={loading} />
                <CommunityEnterprisesCard count={enterprises.count} districtStats={ceDistrictStats} loading={loading} />
                <LargePlotsCard stats={lpStats} loading={loading} />
                <AgriTourismCard data={tourism} loading={loading} />
                <FarmerInstitutesCard stats={instituteStats} loading={loading} />
                <AgriAreasCard stats={agriStats} loading={loading} />
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 5: CHARTS                                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="dash-section-label">
                <span className="dash-section-icon">📊</span>
                <span>แผนภูมิวิเคราะห์ข้อมูล</span>
            </div>
            <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="🌾 สัดส่วนพื้นที่เกษตรตามชนิดพืช" size="small" variant="outlined" style={{ borderRadius: 16 }}>
                        <div style={{ height: 300 }}>
                            {agriPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={agriPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {agriPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip formatter={(val) => [val.toLocaleString() + ' ไร่', 'พื้นที่']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart label="พื้นที่การเกษตร" />}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="🌿 แปลงใหญ่ตามกลุ่มสินค้า" size="small" variant="outlined" style={{ borderRadius: 16 }}>
                        <div style={{ height: 300 }}>
                            {lpPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={lpPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {lpPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip formatter={(val) => [val + ' แปลง', 'จำนวน']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart label="แปลงใหญ่" />}
                        </div>
                    </Card>
                </Col>
            </Row>



            {/* Empty state */}
            {totalRecords === 0 && !loading && (
                <div className="md-empty-state">
                    <div className="md-empty-icon">📭</div>
                    <h3>ยังไม่มีข้อมูลในระบบ</h3>
                    <p>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
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
