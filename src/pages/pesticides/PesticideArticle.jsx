import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { parseMarkdownBlocks } from '../../utils/markdownBlocks';
import './Pesticides.css';

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

export default function PesticideArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    fetch(`/data/pesticides/articles/${slug}.json`)
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <Spin size="large" tip="กำลังโหลดบทความยากำจัดศัตรูพืช..." />
      </div>
    );
  }

  if (error || !article) {
    return <Navigate to="/public/pesticides" replace />;
  }

  const blocks = parseMarkdownBlocks(article.content || '');

  return (
    <div className="pesticide-article-container">
      <div
        className="pesticide-nav-wrapper"
        style={{ display: 'flex', gap: 16, marginBottom: 16 }}
      >
        <Link
          className="article-back-link"
          to="/public/pesticides"
          style={{ marginBottom: 0 }}
        >
          ← กลับไปยังคลังความรู้
        </Link>
        <Link
          className="article-back-link"
          to="/"
          style={{ color: '#64748b', marginBottom: 0 }}
        >
          🏠 กลับหน้าหลักแดชบอร์ด
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
            {blocks.map((block, blockIndex) => (
              <MarkdownBlock block={block} key={blockIndex} />
            ))}
          </div>
        </article>

        <aside className="article-sidebar">
          {/* Metadata Widget */}
          <div className="sidebar-widget">
            <div className="widget-title">ข้อมูลอ้างอิงและขอบเขต</div>
            <div className="meta-info-list">
              <div className="meta-info-item">
                <span className="meta-info-label">พืชเป้าหมาย</span>
                <span className="meta-info-value">{article.plant || '-'}</span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">ชนิดศัตรูพืช</span>
                <span className="meta-info-value">
                  {article.pest_type || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">ปีของเอกสารต้นฉบับ</span>
                <span className="meta-info-value">
                  พ.ศ. {article.source_year || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">หน้าเอกสารอ้างอิง</span>
                <span className="meta-info-value">
                  หน้า {article.source_pages || '-'}
                </span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-label">
                  วันที่ปรับปรุงข้อมูลล่าสุด
                </span>
                <span className="meta-info-value">
                  {article.last_reviewed || '-'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
