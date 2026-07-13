import React from 'react';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  CommentOutlined,
  ClockCircleOutlined,
  FacebookOutlined,
} from '@ant-design/icons';

export default function ContactSection() {
  return (
    <section className="landing-section contact-section" aria-label="ติดต่อเรา">
      <div className="section-header-compact">
        <h2>📞 ติดต่อเรา</h2>
        <span className="section-subtitle">
          ช่องทางการติดต่อและที่ตั้งของสำนักงานเกษตรจังหวัดนครปฐม
        </span>
      </div>

      <div className="contact-grid-container">
        {/* Left side: Contact Info */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.01)',
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: '1fr',
            boxSizing: 'border-box',
          }}
          className="contact-info-card"
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '800',
              color: '#103b2a',
              margin: '0 0 8px 0',
            }}
          >
            สำนักงานเกษตรจังหวัดนครปฐม
          </h3>

          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            <span
              style={{ color: '#21694c', fontSize: '18px', marginTop: '2px' }}
            >
              <EnvironmentOutlined />
            </span>
            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                ที่อยู่
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: 1.4,
                }}
              >
                123/4 หมู่ 1 ต.พระปฐมเจดีย์ อ.เมืองนครปฐม จ.นครปฐม 73000
              </p>
            </div>
          </div>

          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            <span
              style={{ color: '#21694c', fontSize: '18px', marginTop: '2px' }}
            >
              <PhoneOutlined />
            </span>
            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                โทรศัพท์
              </strong>
              <a
                href="tel:034321234"
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#64748b',
                  textDecoration: 'none',
                }}
              >
                0-3432-1234
              </a>
            </div>
          </div>

          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            <span
              style={{ color: '#21694c', fontSize: '18px', marginTop: '2px' }}
            >
              <MailOutlined />
            </span>
            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                อีเมล
              </strong>
              <a
                href="mailto:npt@doae.go.th"
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#64748b',
                  textDecoration: 'none',
                }}
              >
                npt@doae.go.th
              </a>
            </div>
          </div>

          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            <span
              style={{ color: '#21694c', fontSize: '18px', marginTop: '2px' }}
            >
              <CommentOutlined />
            </span>
            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                Line Official
              </strong>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                @nptsmartagri
              </span>
            </div>
          </div>

          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            <span
              style={{ color: '#21694c', fontSize: '18px', marginTop: '2px' }}
            >
              <ClockCircleOutlined />
            </span>
            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                เวลาทำการ
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: 1.4,
                }}
              >
                จันทร์ - ศุกร์ 08:30 - 16:30 น. (ยกเว้นวันหยุดราชการ)
              </p>
            </div>
          </div>
        </div>

        {/* Right side: Office Image / Visual */}
        <div
          style={{
            background: 'linear-gradient(145deg, #1b5e20, #1b3d22)',
            borderRadius: '16px',
            color: '#ffffff',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            boxSizing: 'border-box',
            minHeight: '220px',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="contact-visual-card"
        >
          {/* Subtle leaf overlay */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              bottom: '-20px',
              fontSize: '120px',
              opacity: 0.1,
              transform: 'rotate(-20deg)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            🏢
          </div>

          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏢</div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '0 0 8px 0',
              color: '#ffffff',
            }}
          >
            สำนักงานเกษตรจังหวัดนครปฐม
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: '#a5d6a7',
              margin: '0 0 16px 0',
              maxWidth: '260px',
              lineHeight: 1.4,
            }}
          >
            พร้อมให้บริการ ให้คำปรึกษา และดูแลเกษตรกรชาวนครปฐมทุกท่านด้วยใจ
          </p>
          <a
            href="https://www.facebook.com/profile.php?id=61566480174328"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#ffffff',
              color: '#1b5e20',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = 'scale(1.05)')
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <FacebookOutlined /> ติดตามข่าวสารทาง Facebook
          </a>
        </div>
      </div>
    </section>
  );
}
