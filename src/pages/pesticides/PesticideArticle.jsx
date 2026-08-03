import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { MarkdownBlock } from '../../components/MarkdownBlock';
import { parseArticleBlocks } from '../../utils/markdownBlocks';
import './Pesticides.css';

export default function PesticideArticle({
  dataPath = '/data/pesticides/articles',
  basePath = '/public/pesticides',
  loadingTip = 'กำลังโหลดบทความยากำจัดศัตรูพืช...',
  typeLabel = 'ชนิดศัตรูพืช',
}) {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    fetch(`${dataPath}/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Article not found');
        return res.json();
      })
      .then((data) => {
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`Error loading article ${slug}:`, err);
        setError(true);
        setLoading(false);
      });
  }, [dataPath, slug]);

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
        <Spin size="large" tip={loadingTip} />
      </div>
    );
  }

  if (error || !article) {
    return <Navigate to={basePath} replace />;
  }

  const blocks = parseArticleBlocks(article.content || '');

  return (
    <div className="pesticide-article-container">
      <div
        className="pesticide-nav-wrapper"
        style={{ display: 'flex', gap: 16, marginBottom: 16 }}
      >
        <Link
          className="article-back-link"
          to={basePath}
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
              <MarkdownBlock
                block={block}
                key={blockIndex}
                tableClassName="manual-table-wrap"
              />
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
                <span className="meta-info-label">{typeLabel}</span>
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
