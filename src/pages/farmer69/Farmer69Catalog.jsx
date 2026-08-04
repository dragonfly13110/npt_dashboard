import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Spin, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { MarkdownBlock } from '../../components/MarkdownBlock';
import { parseArticleBlocks } from '../../utils/markdownBlocks';
import './Farmer69.css';

const DEFAULT_METADATA = {
  articles_count: 0,
  faq_count: 0,
  source_pdf_pages: '1-90',
  source_pages: '1-88',
};

function openFarmerChatbot() {
  window.dispatchEvent(new CustomEvent('npt-open-chatbot'));
}

function renderAnswer(markdown) {
  return parseArticleBlocks(markdown || '').map((block, index) => (
    <MarkdownBlock
      block={block}
      key={index}
      tableClassName="manual-table-wrap"
    />
  ));
}

export default function Farmer69Catalog() {
  const [catalog, setCatalog] = useState([]);
  const [faq, setFaq] = useState([]);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [faqLimit, setFaqLimit] = useState(12);

  useEffect(() => {
    Promise.all([
      fetch('/data/farmer69/catalog.json').then((res) => {
        if (!res.ok) throw new Error('catalog');
        return res.json();
      }),
      fetch('/data/farmer69/faq.json').then((res) => {
        if (!res.ok) throw new Error('faq');
        return res.json();
      }),
      fetch('/data/farmer69/metadata.json').then((res) => {
        if (!res.ok) throw new Error('metadata');
        return res.json();
      }),
    ])
      .then(([catalogData, faqData, metadataData]) => {
        setCatalog(catalogData);
        setFaq(faqData);
        setMetadata({ ...DEFAULT_METADATA, ...metadataData });
      })
      .catch((loadError) => {
        console.error('Error loading farmer knowledge base:', loadError);
        setError('โหลดคลังความรู้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [
      'ทั้งหมด',
      ...new Set(catalog.map((item) => item.category).filter(Boolean)),
    ],
    [catalog]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery = (item) => {
    if (!normalizedQuery) return true;
    const searchable = [
      item.title,
      item.question,
      item.category,
      item.related_article_title,
      ...(item.topics || []),
      ...(item.aliases || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(normalizedQuery);
  };

  const filteredFaq = faq.filter(
    (item) =>
      matchesQuery(item) &&
      (selectedCategory === 'ทั้งหมด' || item.category === selectedCategory)
  );
  const filteredCatalog = catalog.filter(
    (item) =>
      matchesQuery(item) &&
      (selectedCategory === 'ทั้งหมด' || item.category === selectedCategory)
  );

  if (loading) {
    return (
      <div className="farmer69-loading-container">
        <Spin size="large" tip="กำลังเปิดคลังความรู้ทะเบียนเกษตรกร..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="farmer69-loading-container farmer69-error-state">
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          โหลดอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <main className="farmer69-container">
      <nav className="farmer69-nav" aria-label="เส้นทางนำทาง">
        <Link className="farmer69-back-link" to="/public/knowledge-hub">
          <ArrowLeftOutlined /> กลับศูนย์องค์ความรู้
        </Link>
        <Link className="farmer69-home-link" to="/">
          <HomeOutlined /> แดชบอร์ด
        </Link>
      </nav>

      <section className="farmer69-hero" aria-labelledby="farmer69-title">
        <div className="farmer69-hero-copy">
          <span className="farmer69-eyebrow">
            ทะเบียนเกษตรกร · KNOWLEDGE BASE
          </span>
          <h1 id="farmer69-title">
            หลักเกณฑ์การขึ้นทะเบียนเกษตรกร
            <br />
            ตามคู่มือทะเบียนเกษตรกร ปี 2569
          </h1>
          <p className="farmer69-hero-lead">
            คู่มืออ้างอิงหลักเกณฑ์ ขั้นตอน และการปรับปรุงทะเบียนเกษตรกร ปี 2569
          </p>
          <p className="farmer69-hero-note">
            ค้นจากคู่มือฉบับเต็ม พร้อมคำตอบคำถามที่พบบ่อยและเลขหน้า PDF
            สำหรับตรวจสอบต้นฉบับ
          </p>
          <button
            className="farmer69-chat-cta"
            type="button"
            onClick={openFarmerChatbot}
          >
            <RobotOutlined /> ถามน้องข้าวหลาม ทบก.
          </button>
        </div>
        <div className="farmer69-hero-stamp" aria-label="ข้อมูลคลังความรู้">
          <span>ปีเอกสาร</span>
          <strong>2569</strong>
          <small>PDF {metadata.source_pdf_pages} หน้า</small>
        </div>
      </section>

      <section className="farmer69-trust-strip" aria-label="ขอบเขตคลังความรู้">
        <div>
          <FileTextOutlined />
          <strong>{metadata.articles_count}</strong>
          <span>บทความตามโครงสร้างคู่มือ</span>
        </div>
        <div>
          <QuestionCircleOutlined />
          <strong>{metadata.faq_count}</strong>
          <span>คำถามและคำตอบสำหรับค้นเร็ว</span>
        </div>
        <div>
          <DatabaseOutlined />
          <strong>{metadata.source_pdf_pages}</strong>
          <span>หน้า PDF ที่ครอบคลุม</span>
        </div>
        <div>
          <SafetyCertificateOutlined />
          <strong>ตรวจสอบได้</strong>
          <span>มี source marker ทุกช่วงเนื้อหา</span>
        </div>
      </section>

      <section className="farmer69-workspace" aria-label="ค้นหาคลังความรู้">
        <div className="farmer69-section-heading">
          <div>
            <span className="farmer69-section-kicker">ค้นหาแบบถามจริงได้</span>
            <h2>คำถามที่พบบ่อยและคำตอบจากคู่มือ</h2>
          </div>
          <span className="farmer69-result-count">
            พบ {filteredFaq.length} คำถาม
          </span>
        </div>

        <div className="farmer69-search-panel">
          <Input
            size="large"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setFaqLimit(12);
            }}
            allowClear
            placeholder="ลองค้นหา: ที่ดินไม่มีเอกสารสิทธิ์ · สมุดทะเบียนหาย · ข้าวนาปี"
            aria-label="ค้นหาคำถามและบทความ"
          />
          <div className="farmer69-category-list" aria-label="กรองตามหมวด">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={selectedCategory === category ? 'active' : ''}
                onClick={() => {
                  setSelectedCategory(category);
                  setFaqLimit(12);
                }}
              >
                {category}
                <span>
                  {category === 'ทั้งหมด'
                    ? catalog.length
                    : catalog.filter((item) => item.category === category)
                        .length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="farmer69-faq-list">
          {filteredFaq.slice(0, faqLimit).map((item) => (
            <details className="farmer69-faq-item" key={item.faq_id}>
              <summary>
                <span className="farmer69-faq-question">{item.question}</span>
                <span className="farmer69-faq-meta">
                  {item.category || 'คู่มือ'} <ArrowRightOutlined />
                </span>
              </summary>
              <div className="farmer69-faq-answer">
                <div className="farmer69-faq-answer-label">
                  คำตอบจากคลังความรู้
                </div>
                {renderAnswer(item.answer_markdown)}
                {item.related_article_slug && (
                  <Link
                    className="farmer69-related-link"
                    to={`/public/farmer-manual/${item.related_article_slug}`}
                  >
                    อ่านบทความต้นฉบับฉบับเต็ม <ArrowRightOutlined />
                  </Link>
                )}
              </div>
            </details>
          ))}
          {filteredFaq.length > faqLimit && (
            <button
              className="farmer69-more-button"
              type="button"
              onClick={() => setFaqLimit((limit) => limit + 12)}
            >
              แสดงคำถามเพิ่มอีก {filteredFaq.length - faqLimit} ข้อ
            </button>
          )}
          {!filteredFaq.length && (
            <div className="farmer69-empty">
              ไม่พบคำถามที่ตรงกับคำค้น ลองใช้คำที่กว้างขึ้น
            </div>
          )}
        </div>
      </section>

      <section
        className="farmer69-article-index"
        aria-labelledby="article-index-title"
      >
        <div className="farmer69-section-heading">
          <div>
            <span className="farmer69-section-kicker">
              อ่านตามโครงสร้างเอกสาร
            </span>
            <h2 id="article-index-title">สารบัญหัวข้อความรู้ทั้งหมด</h2>
          </div>
          <span className="farmer69-result-count">
            พบ {filteredCatalog.length} บทความ
          </span>
        </div>
        <div className="farmer69-article-grid">
          {filteredCatalog.map((item, index) => (
            <Link
              key={item.slug}
              className="farmer69-article-row"
              to={`/public/farmer-manual/${item.slug}`}
            >
              <span className="farmer69-article-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="farmer69-article-row-copy">
                <span className="farmer69-article-category">
                  {item.category}
                </span>
                <strong>{item.title}</strong>
                <small>{item.citation_text}</small>
              </span>
              <ArrowRightOutlined />
            </Link>
          ))}
        </div>
      </section>

      <footer className="farmer69-source-footer">
        <Tag color="green">{metadata.status}</Tag>
        <span>
          แหล่งข้อมูล: {metadata.source_document} ·{' '}
          {metadata.source_organization}
        </span>
        <span>ทบทวนล่าสุด {metadata.last_reviewed}</span>
      </footer>
    </main>
  );
}
