import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Skeleton,
  Button,
  Row,
  Col,
  Card,
  message as antMessage,
} from 'antd';
import {
  FilePdfOutlined,
  AimOutlined,
  BankOutlined,
  TeamOutlined,
  AlertOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { pieOption, getCropColor } from '../components/charts/echartOptions';

// ===== LANDING PAGE WIDGETS =====
import WeatherWidget from '../components/widgets/WeatherWidget';
import AirQualityWidget from '../components/widgets/AirQualityWidget';
import AgriPricesWidget from '../components/widgets/AgriPricesWidget';

import {
  AgriTourismCard,
  AgriAreasCard,
} from '../components/widgets/LandingBentoCards';
import FarmerInstitutesV2Widget from '../components/widgets/FarmerInstitutesV2Widget';
import EChart from '../components/widgets/EChart';

import '../pages/LandingPage.css';
import '../pages/PaperThemeOverride.css';

import {
  useDashboardData,
  groupConfig,
  PIE_COLORS,
} from '../hooks/useDashboardData';
import { supabase } from '../supabaseClient';
import { TABLE_ROUTES } from '../domain/datasetCatalog';
import { buildDashboardPdfReportHtml } from './dashboardPdfReport';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    stats,
    loading,
    error,
    failedTables,
    refetch,
    districtStats,
    tourism,
    instituteStats,
    lpStats,
    agriStats,
    agriPie,
    lpPie,
  } = useDashboardData();

  const [pdfExporting, setPdfExporting] = useState(false);
  const [visits, setVisits] = useState(0);
  const hasTourismData =
    loading || tourism.count > 0 || tourism.list.length > 0;

  useEffect(() => {
    const trackVisit = async () => {
      if (!sessionStorage.getItem('visited_home')) {
        try {
          const response = await fetch('/api/track-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: window.location.pathname,
              referrer: document.referrer,
            }),
          });
          const payload = await response.json();
          if (response.ok && payload.visits !== null) {
            setVisits(payload.visits);
          }
        } catch (err) {
          console.warn('Visit tracking failed:', err);
        }
        sessionStorage.setItem('visited_home', 'true');
      } else {
        const { data, error } = await supabase
          .from('site_statistics')
          .select('value')
          .eq('key', 'total_visits')
          .single();
        if (data) {
          setVisits(data.value);
        }
      }
    };
    trackVisit();
  }, []);

  const totalRecords = stats.reduce((sum, s) => sum + (s.count ?? 0), 0);
  const hasDashboardError = Boolean(error) || failedTables.length > 0;

  const handleExportPdf = async () => {
    if (loading) {
      antMessage.warning(
        'กำลังโหลดข้อมูล กรุณารอสักครู่แล้วลองพิมพ์ PDF อีกครั้ง'
      );
      return;
    }

    setPdfExporting(true);
    let printFrame = null;
    try {
      const html = buildDashboardPdfReportHtml({
        stats,
        groupConfig,
        districtStats,
        tourism,
        instituteStats,
        lpStats,
        agriStats,
        agriPie,
        lpPie,
        visits,
        generatedAt: new Date(),
      });

      printFrame = document.createElement('iframe');
      printFrame.title = 'dashboard-pdf-report';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.opacity = '0';
      document.body.appendChild(printFrame);

      const frameWindow = printFrame.contentWindow;
      const frameDocument = frameWindow?.document;
      if (!frameWindow || !frameDocument) {
        throw new Error('ไม่สามารถเตรียมหน้ารายงานสำหรับพิมพ์ PDF ได้');
      }

      frameDocument.open();
      frameDocument.write(html);
      frameDocument.close();

      await new Promise((resolve) => {
        printFrame.onload = resolve;
        window.setTimeout(resolve, 350);
      });

      if (frameDocument.fonts?.ready) {
        await frameDocument.fonts.ready;
      }

      frameWindow.focus();
      frameWindow.print();
      antMessage.success(
        'เปิดหน้าต่างพิมพ์ PDF แล้ว เลือก “Save as PDF” ได้เลย'
      );

      const cleanup = () => {
        if (printFrame?.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
      };
      frameWindow.addEventListener('afterprint', cleanup, { once: true });
      window.setTimeout(cleanup, 60000);
    } catch (err) {
      console.error(err);
      if (printFrame?.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      antMessage.error('พิมพ์ PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div className="dashboard-unified">
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div className="md-page-header" style={{ marginBottom: 0 }}>
          <h2>📊 แดชบอร์ดรวม</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
            ภาพรวมข้อมูลทั้งหมด — สภาพอากาศ ราคาสินค้า และข้อมูลเกษตรกร
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              padding: '8px 16px',
              borderRadius: 8,
              color: '#4338ca',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>👁️</span>{' '}
            จำนวนผู้เข้าชมเว็บไซต์: {visits.toLocaleString()} ครั้ง
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
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1: LIVE WIDGETS — Weather / AQI / Prices       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="dash-section-label">
        <span className="dash-section-icon">🌤️</span>
        <span>สภาพอากาศ คุณภาพอากาศ และราคาเรียลไทม์</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <WeatherWidget mini={true} />
        <AirQualityWidget mini={true} />
        <AgriPricesWidget mini={true} />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2: GROUP SUMMARY CARDS                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="dash-section-label">
        <span className="dash-section-icon">📈</span>
        <span>สรุปข้อมูลตามกลุ่มงาน</span>
      </div>
      <div className="md-stat-row" style={{ marginBottom: 28 }}>
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="md-stat-card">
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            ))
          : groupConfig.map((g) => {
              const IconMap = {
                กลุ่มยุทธศาสตร์และสารสนเทศ: AimOutlined,
                กลุ่มส่งเสริมและพัฒนาการผลิต: BankOutlined,
                กลุ่มส่งเสริมและพัฒนาเกษตรกร: TeamOutlined,
                กลุ่มอารักขาพืช: AlertOutlined,
              };
              const IconComp = IconMap[g.group] || AimOutlined;
              const colorMap = {
                '#1565c0': 'blue',
                '#43a047': 'green',
                '#6a1b9a': 'purple',
                '#e65100': 'orange',
              };
              return (
                <div key={g.group} className="md-stat-card">
                  <div className="md-stat-card-inner">
                    <div className="md-stat-card-top">
                      <div
                        className={`md-stat-icon ${colorMap[g.color] || 'blue'}`}
                      >
                        <IconComp style={{ fontSize: 24 }} />
                      </div>
                      <div className="md-stat-info">
                        <div className="md-stat-label">
                          {g.icon} {g.group}
                        </div>
                        <div className="md-stat-value">
                          {g.tables.length} หมวด
                        </div>
                      </div>
                    </div>
                    <div className="md-stat-footer">
                      <ScheduleOutlined />
                      <span>คลิกดูตารางข้อมูลที่ด้านล่าง</span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 3: SYSTEM DATABASE OVERVIEW (No Maps)          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="dash-section-label">
        <span className="dash-section-icon">📁</span>
        <span>ฐานข้อมูลและจำนวนรายการรายระบบงานหลัก</span>
      </div>

      {hasDashboardError && !loading && (
        <Alert
          type="warning"
          showIcon
          message="ข้อมูลบางส่วนโหลดไม่สำเร็จ"
          description="ตัวเลข 0 ในตารางที่มีปัญหาอาจไม่ใช่ข้อมูลจริง กรุณาลองโหลดใหม่"
          action={
            <Button size="small" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        className="system-overview-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginBottom: 28,
        }}
      >
        {groupConfig.map((g) => (
          <div
            key={g.group}
            style={{
              background: '#ffffff',
              border: '1px solid #eaeaea',
              borderRadius: 4,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid #f0f0f0',
                paddingBottom: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>
                {g.group === 'กลุ่มยุทธศาสตร์และสารสนเทศ'
                  ? '🎯'
                  : g.group === 'กลุ่มส่งเสริมและพัฒนาการผลิต'
                    ? '🌾'
                    : g.group === 'กลุ่มส่งเสริมและพัฒนาเกษตรกร'
                      ? '👥'
                      : '🛡️'}
              </span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#111111' }}>
                {g.group}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats
                .filter((s) => s.group === g.group)
                .map((s) => {
                  const route = TABLE_ROUTES[s.table] || '/dashboard';
                  return (
                    <div
                      key={s.table}
                      onClick={() => navigate(route)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#fafafa',
                        borderRadius: 4,
                        border: '1px solid #eaeaea',
                        cursor: 'pointer',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#f0fdf4';
                        e.currentTarget.style.borderColor = '#16a34a';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#fafafa';
                        e.currentTarget.style.borderColor = '#eaeaea';
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#333333',
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            background: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#111111',
                          }}
                        >
                          {s.error ? '—' : s.count.toLocaleString()}
                        </span>
                        <span style={{ fontSize: 12, color: '#888888' }}>
                          →
                        </span>
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 4: DETAILED STATISTICAL CARDS                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="dash-section-label">
        <span className="dash-section-icon">📈</span>
        <span>ข้อมูลและสถิติเชิงลึกรายโครงการ</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          marginBottom: 28,
        }}
      >
        {hasTourismData && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AgriTourismCard data={tourism} loading={loading} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <FarmerInstitutesV2Widget />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AgriAreasCard
            stats={agriStats}
            districtStats={districtStats}
            loading={loading}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 5: CHARTS                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="dash-section-label">
        <span className="dash-section-icon">📊</span>
        <span>แผนภูมิวิเคราะห์ข้อมูล</span>
      </div>
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="🌾 สัดส่วนพื้นที่เกษตรตามชนิดพืช"
            size="small"
            variant="outlined"
            style={{ borderRadius: 16 }}
          >
            <div style={{ height: 300 }}>
              {agriPie.length > 0 ? (
                <EChart
                  option={pieOption(
                    agriPie.map((item) => ({
                      ...item,
                      color: getCropColor(item.name),
                    })),
                    { colors: PIE_COLORS, unit: 'ไร่' }
                  )}
                />
              ) : (
                <EmptyChart label="พื้นที่การเกษตร" />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="🌿 แปลงใหญ่ตามกลุ่มสินค้า"
            size="small"
            variant="outlined"
            style={{ borderRadius: 16 }}
          >
            <div style={{ height: 300 }}>
              {lpPie.length > 0 ? (
                <EChart
                  option={pieOption(
                    lpPie.map((item) => ({
                      ...item,
                      color: getCropColor(item.name),
                    })),
                    { colors: PIE_COLORS, unit: 'แปลง' }
                  )}
                />
              ) : (
                <EmptyChart label="แปลงใหญ่" />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Empty state */}
      {totalRecords === 0 && !loading && !hasDashboardError && (
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
    <div
      style={{
        display: 'flex',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#656d76',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 32 }}>📭</span>
      <span>ยังไม่มีข้อมูล{label}</span>
    </div>
  );
}
