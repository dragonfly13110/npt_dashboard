import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EnvironmentOutlined,
  GlobalOutlined,
  CloudOutlined,
  FireOutlined,
  CompassOutlined,
} from '@ant-design/icons';

export default function MapPreviewSection() {
  const navigate = useNavigate();

  return (
    <section
      className="landing-section map-preview-section"
      aria-label="แผนที่การเกษตรจังหวัดนครปฐม"
    >
      <div className="section-header-compact">
        <h2>🗺️ แผนที่ข้อมูลการเกษตร</h2>
        <span className="section-subtitle">
          ระบบสารสนเทศภูมิศาสตร์ (GIS) แสดงพิกัดและพื้นที่เกษตรรายอำเภอ
        </span>
      </div>

      <div
        className="map-preview-container"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
          border: '1px solid #c8e6c9',
          borderRadius: '16px',
          padding: '24px',
          boxSizing: 'border-box',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}
        >
          {/* Main columns for larger screens */}
          <div
            style={{
              display: 'grid',
              gap: '32px',
              gridTemplateColumns: '1fr',
            }}
            className="map-preview-layout"
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: '#1b5e20',
                  margin: '0 0 12px 0',
                }}
              >
                แผนที่การเกษตรอัจฉริยะนครปฐม
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#374151',
                  margin: '0 0 20px 0',
                }}
              >
                ระบบแผนที่ GIS แบบโต้ตอบได้ รวบรวมพิกัดสำคัญเชิงเกษตรกรรม
                วิเคราะห์การกระจายตัวของประเด็นสำคัญในจังหวัดนครปฐมเพื่อประเมินสถานการณ์ได้อย่างแม่นยำ
              </p>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px 0',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#4b5563',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      color: '#2e7d32',
                      display: 'flex',
                      fontSize: '16px',
                    }}
                  >
                    <GlobalOutlined />
                  </span>
                  ข้อมูลพิกัดเกษตรกรและพื้นที่เพาะปลูก (GIS)
                </li>
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#4b5563',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      color: '#1565c0',
                      display: 'flex',
                      fontSize: '16px',
                    }}
                  >
                    <CloudOutlined />
                  </span>
                  ตำแหน่งแหล่งน้ำและระบบชลประทาน
                </li>
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#4b5563',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      color: '#c62828',
                      display: 'flex',
                      fontSize: '16px',
                    }}
                  >
                    <FireOutlined />
                  </span>
                  จุดเฝ้าระวังความร้อนสะสมสะท้อนปัญหาไฟป่าหรือควัน
                </li>
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#4b5563',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      color: '#ad1457',
                      display: 'flex',
                      fontSize: '16px',
                    }}
                  >
                    <CompassOutlined />
                  </span>
                  พิกัดกลุ่มท่องเที่ยววิถีเกษตรเชิงสร้างสรรค์
                </li>
              </ul>

              <button
                type="button"
                onClick={() => navigate('/smart-map')}
                style={{
                  alignSelf: 'flex-start',
                  background: '#2e7d32',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '30px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(46, 125, 50, 0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 6px 20px rgba(46, 125, 50, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 15px rgba(46, 125, 50, 0.25)';
                }}
              >
                <EnvironmentOutlined /> เปิดแผนที่ Smart Map
              </button>
            </div>

            {/* Visual stylised Map representation */}
            <div
              className="map-preview-visual"
              style={{
                background: '#ffffff',
                border: '1px solid #a5d6a7',
                borderRadius: '12px',
                height: '240px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow:
                  'inset 0 0 40px rgba(76, 175, 80, 0.05), 0 4px 12px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Grid backdrop */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.1,
                  backgroundImage:
                    'radial-gradient(#2e7d32 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Stylized contours / roads */}
              <svg
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  opacity: 0.15,
                }}
              >
                <path
                  d="M-20,120 Q80,180 180,90 T380,110 T580,60"
                  fill="none"
                  stroke="#2e7d32"
                  strokeWidth="6"
                />
                <path
                  d="M60,-20 Q110,80 150,180 T200,320"
                  fill="none"
                  stroke="#2e7d32"
                  strokeWidth="4"
                />
                <circle
                  cx="150"
                  cy="115"
                  r="90"
                  fill="none"
                  stroke="#2e7d32"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>

              {/* Styled Mock Pins */}
              <div
                style={{
                  position: 'absolute',
                  left: '25%',
                  top: '35%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  border: '1px solid #81c784',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#2e7d32',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ color: '#2e7d32', display: 'flex' }}>
                  <GlobalOutlined />
                </span>{' '}
                แปลงใหญ่ข้าว
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: '60%',
                  top: '25%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  border: '1px solid #90caf9',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#1565c0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ color: '#1565c0', display: 'flex' }}>
                  <CloudOutlined />
                </span>{' '}
                แหล่งน้ำหลัก
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: '45%',
                  top: '65%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  border: '1px solid #ef9a9a',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#c62828',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ color: '#c62828', display: 'flex' }}>
                  <FireOutlined />
                </span>{' '}
                จุดความร้อน
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: '70%',
                  top: '70%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  border: '1px solid #f48fb1',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#ad1457',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ color: '#ad1457', display: 'flex' }}>
                  <CompassOutlined />
                </span>{' '}
                ท่องเที่ยวเกษตร
              </div>

              {/* Outer compass rose decorative element */}
              <div
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid #a5d6a7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#2e7d32',
                  background: '#ffffff',
                }}
              >
                N
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
