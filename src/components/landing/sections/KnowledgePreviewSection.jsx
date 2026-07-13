import React from 'react';
import { BookOutlined, ArrowRightOutlined } from '@ant-design/icons';

const ARTICLES = [
  {
    id: '1',
    title: 'การปรับปรุงดินให้เหมาะสมกับการปลูกพืช',
    category: 'ดินและปุ๋ย',
    desc: 'เรียนรู้วิธีปรับปรุงโครงสร้างดินและความอุดมสมบูรณ์เพื่อเพิ่มผลผลิตอย่างยั่งยืน',
    tagColor: '#efebe9',
    textColor: '#5d4037',
    href: 'https://kasetinfo.netlify.app/',
  },
  {
    id: '2',
    title: 'เทคนิคการให้น้ำพืชอย่างมีประสิทธิภาพ',
    category: 'การจัดการน้ำ',
    desc: 'ระบบน้ำอัจฉริยะและการให้น้ำพืชรายกลุ่มดินเพื่อการประหยัดน้ำและได้ผลผลิตเต็มที่',
    tagColor: '#e0f2fe',
    textColor: '#0369a1',
    href: 'https://kasetinfo.netlify.app/',
  },
  {
    id: '3',
    title: 'การจัดการโรคและแมลงในข้าวอย่างยั่งยืน',
    category: 'โรคและแมลง',
    desc: 'การป้องกันกำจัดศัตรูพืชแบบผสมผสาน (IPM) และการใช้สารชีวภัณฑ์ในการทำนาข้าว',
    tagColor: '#fef2f2',
    textColor: '#991b1b',
    href: 'https://kasetinfo.netlify.app/',
  },
  {
    id: '4',
    title: 'การใช้ปุ๋ยตามค่าวิเคราะห์ดิน',
    category: 'ปุ๋ยและการจัดการดิน',
    desc: 'ประหยัดต้นทุนปุ๋ยเคมีด้วยการวิเคราะห์ดินและผสมปุ๋ยสั่งตัดตรงตามความต้องการของพืช',
    tagColor: '#f0fdf4',
    textColor: '#166534',
    href: 'https://kasetinfo.netlify.app/',
  },
];

export default function KnowledgePreviewSection() {
  return (
    <section
      className="landing-section knowledge-section"
      aria-label="บทความและองค์ความรู้"
    >
      <div
        className="section-header-compact"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2>📚 บทความและองค์ความรู้</h2>
          <span className="section-subtitle">
            คลังความรู้การเกษตร เทคโนโลยี และคำแนะนำจากผู้เชี่ยวชาญ
          </span>
        </div>
        <a
          href="https://kasetinfo.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: 'var(--agri-green, #21694c)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
          }}
        >
          คลังความรู้ทั้งหมด <ArrowRightOutlined />
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          boxSizing: 'border-box',
        }}
      >
        {ARTICLES.map((art) => (
          <article
            key={art.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.01)',
              transition: 'all 0.25s ease',
              boxSizing: 'border-box',
              minHeight: '180px',
            }}
            className="knowledge-card"
          >
            <div>
              <span
                style={{
                  background: art.tagColor,
                  color: art.textColor,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '10px',
                }}
              >
                {art.category}
              </span>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0 0 8px 0',
                  lineHeight: 1.4,
                }}
              >
                {art.title}
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  margin: '0 0 16px 0',
                  lineHeight: 1.5,
                }}
              >
                {art.desc}
              </p>
            </div>
            <a
              href={art.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'var(--agri-green, #21694c)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                alignSelf: 'flex-start',
              }}
            >
              อ่านต่อ <ArrowRightOutlined style={{ fontSize: '10px' }} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
