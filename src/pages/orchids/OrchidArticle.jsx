import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Spin } from 'antd';
import { parseMarkdownBlocks } from '../../utils/markdownBlocks';
import '../pesticides/Pesticides.css';
import './OrchidKnowledge.css';

function renderInline(text) {
  if (!text) return '';
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*.+?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('[') && part.endsWith(')')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, label, url] = match;
        if (url.startsWith('/'))
          return (
            <Link key={index} to={url}>
              {label}
            </Link>
          );
        return (
          <a key={index} href={url} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        );
      }
    }
    return part;
  });
}

function MarkdownBlock({ block }) {
  if (block.type === 'paragraph' && block.text.trim() === '---') {
    return <hr />;
  }
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
              {head.map((cell, index) => (
                <th key={index}>{renderInline(cell)}</th>
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
  if (block.type === 'code')
    return (
      <pre>
        <code>{block.text}</code>
      </pre>
    );
  return <p>{renderInline(block.text)}</p>;
}

const ORCHID_ARTICLE_COLLECTIONS = {
  production: {
    dataPath: '/data/orchids/articles',
    catalogPath: '/public/orchids/production',
    sourceNote:
      'ข้อมูลจากเอกสารปี พ.ศ. 2560 ควรตรวจสอบกฎหมาย ทะเบียน และฉลากปัจจุบันก่อนใช้จริง',
  },
  research: {
    dataPath: '/data/orchids/research/articles',
    catalogPath: '/public/orchids/research',
    sourceNote:
      'บทความนี้เป็นบทสรุปงานวิจัย ควรตรวจสอบงานต้นฉบับและบริบทของชนิดกล้วยไม้ก่อนนำไปใช้จริง',
  },
};

export default function OrchidArticle({ collection = 'production' }) {
  const settings =
    ORCHID_ARTICLE_COLLECTIONS[collection] ||
    ORCHID_ARTICLE_COLLECTIONS.production;
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${settings.dataPath}/${slug}.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Article not found');
        return response.json();
      })
      .then((data) => setArticle(data))
      .catch((loadError) => {
        console.error('Error loading orchid article:', loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [settings.dataPath, slug]);

  if (loading) {
    return (
      <div className="orchid-catalog-loading">
        <Spin size="large" tip="กำลังโหลดบทความ..." />
      </div>
    );
  }
  if (error || !article) return <Navigate to={settings.catalogPath} replace />;

  const blocks = parseMarkdownBlocks(article.content || '');
  return (
    <div
      className={`pesticide-article-container orchid-article-container orchid-article-${collection}`}
    >
      <div
        className="pesticide-nav-wrapper"
        style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}
      >
        <Link
          className="article-back-link"
          to={settings.catalogPath}
          style={{ marginBottom: 0 }}
        >
          ← กลับรายการบทความ
        </Link>
        <Link
          className="article-back-link"
          to="/public/orchids"
          style={{ marginBottom: 0, color: '#64748b' }}
        >
          องค์ความรู้กล้วยไม้
        </Link>
        <Link
          className="article-back-link"
          to="/public/knowledge-hub"
          style={{ marginBottom: 0, color: '#64748b' }}
        >
          ศูนย์องค์ความรู้
        </Link>
        <Link
          className="article-back-link"
          to="/"
          style={{ marginBottom: 0, color: '#64748b' }}
        >
          🏠 หน้าหลัก
        </Link>
      </div>

      <div className="article-layout">
        <article className="article-main">
          <div className="article-header">
            <div className="card-category" style={{ fontSize: '0.85rem' }}>
              {article.category}
            </div>
            <h1>{article.title}</h1>
          </div>
          <div className="pesticide-markdown">
            {blocks.map((block, index) => (
              <MarkdownBlock block={block} key={index} />
            ))}
          </div>
        </article>

        <aside className="article-sidebar">
          <div className="sidebar-widget">
            <div className="widget-title">ข้อมูลอ้างอิง</div>
            <div className="meta-info-list">
              <div className="meta-info-item">
                <span className="meta-info-label">หมวด</span>
                <span className="meta-info-value">
                  {article.category || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">หัวข้อย่อย</span>
                <span className="meta-info-value">
                  {article.subcategory || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">ปีเอกสารต้นฉบับ</span>
                <span className="meta-info-value">
                  พ.ศ. {article.source_year || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">หน้าเอกสารอ้างอิง</span>
                <span className="meta-info-value">
                  {article.source_pages || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">สถานะการทบทวน</span>
                <span className="meta-info-value">{article.status || '-'}</span>
              </div>
            </div>
          </div>
          <div className="sidebar-widget orchid-source-note">
            {settings.sourceNote}
          </div>
        </aside>
      </div>
    </div>
  );
}
