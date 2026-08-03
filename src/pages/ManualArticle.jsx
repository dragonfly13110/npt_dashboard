import { Link, Navigate, useParams } from 'react-router-dom';
import { manualContentByFile } from '../data/manualContent';
import { manualRegistry } from '../data/manualRegistry';
import { MarkdownBlock } from '../components/MarkdownBlock';
import { parseArticleBlocks } from '../utils/markdownBlocks';
import './Manual.css';

export default function ManualArticle() {
  const { slug } = useParams();
  if (slug === 'competition-guide') {
    return <Navigate to="/manual/system-overview" replace />;
  }
  const article = manualRegistry.find((item) => item.slug === slug);
  if (!article) return <Navigate to="/manual" replace />;

  const index = manualRegistry.indexOf(article);
  const previous = manualRegistry[index - 1];
  const next = manualRegistry[index + 1];
  const blocks = parseArticleBlocks(manualContentByFile[article.file] || '');

  return (
    <main className="manual-page manual-article-page">
      <div className="manual-article-layout">
        <aside className="manual-sidebar" aria-label="สารบัญคู่มือ">
          <Link className="manual-sidebar-home" to="/manual">
            ศูนย์คู่มือ
          </Link>
          <nav>
            {manualRegistry.map((item, itemIndex) => (
              <Link
                className={item.slug === slug ? 'active' : undefined}
                key={item.slug}
                to={`/manual/${item.slug}`}
              >
                <span>{String(itemIndex + 1).padStart(2, '0')}</span>
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="manual-article">
          <Link className="manual-back-link" to="/manual">
            กลับศูนย์คู่มือ
          </Link>
          <p className="manual-kicker">
            บทที่ {String(index + 1).padStart(2, '0')}
          </p>
          <h1>{article.title}</h1>
          <p className="manual-article-audience">{article.audience}</p>
          <div className="manual-markdown">
            {blocks.map((block, blockIndex) => (
              <MarkdownBlock
                block={block}
                key={blockIndex}
                tableClassName="manual-table-wrap"
              />
            ))}
          </div>
        </article>
      </div>

      <nav className="manual-article-nav" aria-label="บทคู่มือ">
        {previous ? (
          <Link to={`/manual/${previous.slug}`}>
            ก่อนหน้า: {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/manual/${next.slug}`}>ถัดไป: {next.title}</Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
