import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Spin, Alert, Card, Tag, Button } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { parseMarkdownBlocks } from '../../utils/markdownBlocks';
import './Farmer69.css';

function renderInline(text) {
  if (!text) return '';
  const regex = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('[') && part.endsWith(')')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, label, url] = match;
        if (url.startsWith('/')) {
          return (
            <Link
              key={index}
              to={url}
              style={{ color: '#16a34a', fontWeight: 600 }}
            >
              {label}
            </Link>
          );
        }
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#16a34a', fontWeight: 600 }}
          >
            {label}
          </a>
        );
      }
    }
    return part;
  });
}

function MarkdownBlock({ block }) {
  if (block.type === 'heading') {
    const Tag = `h${Math.min(block.level + 1, 4)}`;
    return <Tag>{renderInline(block.text)}</Tag>;
  }
  if (block.type === 'list') {
    return (
      <ul>
        {block.items.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  if (block.type === 'table') {
    const [head = [], ...body] = block.rows;
    return (
      <div className="manual-table-wrap">
        <table>
          <thead>
            <tr>
              {head.map((cell, idx) => (
                <th key={idx}>{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === 'code') {
    return (
      <pre>
        <code>{block.text}</code>
      </pre>
    );
  }
  return <p>{renderInline(block.text)}</p>;
}

const FLAG_DETAILS = {
  'RF-001': 'ตัวสะกด น.ค. 3 (มีตัวเลข 13 ติดมากับชื่อเอกสาร)',
  'RF-002': 'ความหมายคำว่าเครื่องสูบน้ำเชื่อมโยงกับบ่อบาดาล',
  'RF-003': 'ปฏิทินเคลื่อนย้ายรังผึ้งเป็นข้อมูลสรุปจากแผนภาพ',
  'RF-004':
    'รายชื่อมาตรฐานและหน่วยรับรองเป็นข้อมูลตามคู่มือ (ไม่ได้เช็คสถานะปัจจุบัน)',
  'RF-005': 'ตารางกำหนดการมีคำว่า "ปีถัดไป" หรือข้ามปี',
  'RF-006': 'การแบ่งกลุ่มพื้นที่อำเภอ (เช่น ฉะเชิงเทรา อยู่หลายกลุ่ม)',
  'RF-007': 'ชื่อระบบสะกดต่างกันในคู่มือ (เช่น Geoplot/Geoplots)',
  'RF-008': 'เงื่อนไขสิ้นสภาพการเป็นเกษตรกรไม่ตรงกัน (3 ปี vs เกิน 3 ปี)',
  'RF-009': 'การอ้างอิงและเรียงเลขมาตรากฎหมาย',
  'RF-010': 'ตารางเครื่องจักรเป็นภาพความละเอียดต่ำในต้นฉบับ',
  'RF-011': 'คำแนะนำพิกัด UTM และ Lat/Long',
  'RF-012': 'หน่วยผลผลิตบางกิจกรรมไม่ได้แจกแจงครบถ้วน',
  'RF-013': 'การกำหนดเปลี่ยนสมุดทะเบียนเกษตรกรชำรุด',
  'RF-014': 'รายงาน ทบก. มีข้อมูลส่วนบุคคลอ่อนไหว (PDPA)',
  'RF-015': 'กระบวนการทำงานมีขนาดเล็กและแปลงจากแผนภาพแนวขวาง',
  'RF-016': 'สำเนาข้อความกฎหมายควบคุมสิทธิ์',
  'RF-017': 'แบบฟอร์มเอกสารคำร้องเป็นภาพจำลอง',
  'RF-018': 'แบบฟอร์มเคลื่อนย้ายรังผึ้งมีความคมชัดต่ำ',
  'RF-019': 'การระบุอัตราอากรแสตมป์ในตัวอย่างหนังสือมอบอำนาจ',
  'RF-020': 'แบบคำร้องมีช่องข้อมูลส่วนบุคคล (PDPA)',
  'RF-021': 'ชื่อเอกสารสิทธิ์ที่ดินเป็นชื่อแบบเก่า/ย่อ',
  'RF-022': 'ตัวสะกดคำว่า "เกษตรกรรรม" (มี ร.เรือ 3 ตัว)',
  'RF-023': 'เงื่อนไขหนังสือรับรองกรณีไม่ทราบชื่อผู้ให้เช่า',
  'RF-024': 'แบบหนังสือยินยอมและหนังสือรับรองเป็นภาพจำลอง',
  'RF-025': 'หนังสือยินยอมมีช่องกรอกข้อมูลส่วนบุคคล (PDPA)',
  'RF-026': 'ลิงก์และพันธุ์พืชนำเสนอผ่าน QR Code เท่านั้น',
  'RF-027': 'หน่วยและรูปแบบขนาดบ่อ/โรงเรือนสะกดต่างกัน',
  'RF-028': 'เกณฑ์การรับขึ้นทะเบียนกัญชง กัญชา และกระท่อม',
  'RF-029': 'อัตราจำนวนต้นต่อไร่เป็นค่าโดยประมาณ',
  'RF-030': 'หน่วยผลผลิตและลักษณะสภาพผลผลิตที่แตกต่างกัน',
  'RF-031': 'คำสะกดสลับ (พรอพอลิส/พรอพอริส) และช่วงอายุตัวหนอนด้วงสาคู',
  'RF-032': 'ขนาดของตราสัญลักษณ์ 1 นิ้วบนเอกสาร',
  'RF-033': 'สเปกคุณลักษณะเครื่องพิมพ์จากปีคู่มือ',
  'RF-034': 'ชื่อบทที่ 5 ในสารบัญสะกดไม่ตรงกับหัวข้อในเนื้อหา',
};

export default function Farmer69Article() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    fetch(`/data/farmer69/articles/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Article not found');
        return res.json();
      })
      .then((data) => {
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading article:', err);
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="farmer69-loading-container">
        <Spin size="large" tip="กำลังโหลดเนื้อหาคู่มือขึ้นทะเบียน..." />
      </div>
    );
  }

  if (error || !article) {
    return <Navigate to="/public/farmer-manual" replace />;
  }

  const blocks = parseMarkdownBlocks(article.body_markdown || '');

  return (
    <div className="farmer69-article-container">
      <div className="farmer69-nav-wrapper">
        <Link className="farmer69-back-link" to="/public/farmer-manual">
          <ArrowLeftOutlined /> กลับไปยังคลังคู่มือ
        </Link>
        <Link className="farmer69-back-link text-muted" to="/">
          🏠 กลับหน้าหลักแดชบอร์ด
        </Link>
      </div>

      <div className="farmer69-article-layout">
        <article className="farmer69-article-main">
          <div className="farmer69-article-header">
            <span className="farmer69-article-category">
              {article.category}
            </span>
            <h1>{article.title}</h1>
            <div className="farmer69-article-citation">
              อ้างอิง: {article.citation_text}
            </div>
          </div>

          <div className="farmer69-markdown">
            {blocks.map((block, blockIndex) => (
              <MarkdownBlock block={block} key={blockIndex} />
            ))}
          </div>

          {article.assets && article.assets.length > 0 && (
            <div className="farmer69-gallery-section">
              <h3>🖼️ ภาพอ้างอิงจากต้นฉบับคู่มือ</h3>
              <div className="farmer69-gallery-grid">
                {article.assets.map((url, idx) => (
                  <div key={idx} className="farmer69-gallery-item">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`ภาพอ้างอิงหน้าคู่มือ ${idx + 1}`}
                        loading="lazy"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside className="farmer69-article-sidebar">
          <Card
            title="ข้อมูลแหล่งอ้างอิง"
            size="small"
            className="farmer69-sidebar-card"
          >
            <div className="farmer69-sidebar-info">
              <div className="info-item">
                <span className="info-label">หน้าเอกสารคู่มือ:</span>
                <span className="info-value">
                  หน้า {article.source_printed_pages.join(', ')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">หน้า PDF ต้นฉบับ:</span>
                <span className="info-value">
                  หน้า {article.source_pdf_pages.join(', ')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">คำสำคัญ (Topics):</span>
                <div className="info-tags">
                  {article.topics.map((topic, idx) => (
                    <Tag key={idx} color="geekblue" style={{ marginBottom: 4 }}>
                      {topic}
                    </Tag>
                  ))}
                </div>
              </div>

              {article.review_flags && article.review_flags.length > 0 && (
                <div
                  className="info-item"
                  style={{
                    marginTop: 12,
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 12,
                  }}
                >
                  <span
                    className="info-label"
                    style={{
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ หมายเหตุ / ข้อควรระวัง ({article.review_flags.length})
                  </span>
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {article.review_flags.map((flag) => {
                      const desc =
                        FLAG_DETAILS[flag] || 'ประเด็นที่ต้องตรวจสอบเพิ่มเติม';
                      return (
                        <div
                          key={flag}
                          style={{
                            fontSize: '0.82rem',
                            lineHeight: '1.4',
                            background: '#fffbeb',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #fef3c7',
                            color: '#b45309',
                          }}
                        >
                          <strong style={{ display: 'block', marginBottom: 2 }}>
                            {flag}:
                          </strong>
                          {desc}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="primary"
              danger
              icon={<FilePdfOutlined />}
              href={`${article.pdf_url}#page=${article.source_pdf_pages[0] || 1}`}
              target="_blank"
              rel="noopener noreferrer"
              block
              style={{ marginTop: 16 }}
            >
              เปิด PDF ต้นฉบับ (หน้าที่อ้างอิง)
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
