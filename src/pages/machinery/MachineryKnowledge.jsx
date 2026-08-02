import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  BookOutlined,
  ExperimentOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { parseMarkdownBlocks } from '../../utils/markdownBlocks';
import '../rice/RiceKnowledge.css';
import './MachineryKnowledge.css';

const MACHINERY_TOPICS = [
  [
    '01',
    'รถแทรกเตอร์อัตโนมัติและระบบนำทางอัตโนมัติ',
    'Autonomous Tractors & Guidance',
  ],
  ['02', 'เครื่องเก็บเกี่ยวอัจฉริยะ', 'Smart Harvesting Machinery'],
  ['03', 'โดรนการเกษตรและอากาศยานไร้คนขับ', 'Agricultural Drones & UAV'],
  ['04', 'ระบบพ่นสารและฉีดพ่นแม่นยำ', 'Smart Spraying & See-and-Spray'],
  ['05', 'เครื่องจักรพลังงานทางเลือก', 'Alternative Powertrains'],
  ['06', 'หุ่นยนต์ภาคสนามและฝูงหุ่นยนต์', 'Field Robots & Swarms'],
  ['07', 'เครื่องหยอดและเพาะปลูกแม่นยำ', 'Precision Planting & Seeding'],
  ['08', 'ระบบข้อมูลเครื่องจักรและเทเลเมติกส์', 'Machine Data & Telematics'],
  ['09', 'เครื่องจักรหลังการเก็บเกี่ยวและแปรรูป', 'Post-Harvest & Processing'],
  ['10', 'เครื่องจักรเฉพาะพืชเศรษฐกิจไทย', 'Thai Crop-Specific Machinery'],
  ['11', 'เครื่องจักรและหุ่นยนต์ปศุสัตว์', 'Livestock Machinery & Automation'],
  ['12', 'บริการเครื่องจักรและระบบการแบ่งปัน', 'Machinery Services & Sharing'],
].map(([number, title, english]) => ({ number, title, english }));

const MACHINERY_ARTICLES = [
  {
    slug: 'machinery-readme',
    file: 'machinery-readme.md',
    title: 'คลังความรู้: เครื่องจักรการเกษตรล้ำสมัย',
    category: 'เริ่มต้น',
    detail: 'สารบัญและวิธีใช้งานคลัง',
    collection: 'overview',
    topic: 'overview',
  },
  {
    slug: 'machinery-overview',
    file: 'machinery-overview.md',
    title: 'ภาพรวม: เครื่องจักรการเกษตรล้ำสมัย',
    category: 'เริ่มต้น',
    detail: 'ภาพรวม 12 ด้านและเทคโนโลยีแกน',
    collection: 'overview',
    topic: 'overview',
  },
  ...MACHINERY_TOPICS.flatMap((topic) => [
    {
      slug: `machinery-${topic.number}-overview`,
      file: `machinery-${topic.number}-readme.md`,
      title: topic.title,
      category: 'ภาพรวมรายด้าน',
      detail: topic.english,
      collection: 'topics',
      topic: topic.number,
    },
    {
      slug: `machinery-${topic.number}-deep`,
      file: `machinery-${topic.number}-deep.md`,
      title: `เจาะลึก: ${topic.title}`,
      category: 'บทวิเคราะห์เชิงลึก',
      detail: topic.english,
      collection: 'topics',
      topic: topic.number,
    },
  ]),
];

const MACHINERY_COLLECTIONS = [
  {
    key: 'overview',
    title: 'เริ่มต้นจากภาพรวม',
    detail: '2 เอกสารหลัก',
    description:
      'ทำความเข้าใจ Agriculture 4.0 ตลาด เทคโนโลยีแกน และโครงสร้างองค์ความรู้เครื่องจักรทั้ง 12 ด้าน',
    Icon: BookOutlined,
  },
  {
    key: 'topics',
    title: 'เจาะลึก 12 ด้านเครื่องจักร',
    detail: '24 เอกสารรายด้าน',
    description:
      'อ่านภาพรวมและบทวิเคราะห์ของรถแทรกเตอร์ โดรน หุ่นยนต์ ระบบพ่นสาร หลังการเก็บเกี่ยว ปศุสัตว์ และบริการแบ่งปัน',
    Icon: ExperimentOutlined,
  },
];

function PageNav({
  backTo = '/public/knowledge-hub',
  backLabel = '← กลับศูนย์องค์ความรู้',
}) {
  return (
    <div className="rice-nav">
      <Link to={backTo}>{backLabel}</Link>
      <Link to="/">🏠 หน้าหลัก</Link>
    </div>
  );
}

function MachineryHub() {
  return (
    <main className="rice-page machinery-page rice-hub">
      <PageNav />
      <section className="rice-hero">
        <span className="rice-kicker">SMART AGRICULTURAL MACHINERY</span>
        <h1>องค์ความรู้เครื่องจักรการเกษตรล้ำสมัย</h1>
        <p>
          จากเครื่องทุ่นแรงสู่แพลตฟอร์มข้อมูลที่เชื่อมต่อ อัตโนมัติ และใช้ AI
          ครอบคลุมเทคโนโลยีเครื่องจักร 12 ด้าน พร้อมบริบทการใช้งานในประเทศไทย
        </p>
      </section>

      <section
        className="rice-hub-grid"
        aria-label="คลังองค์ความรู้เครื่องจักร"
      >
        {MACHINERY_COLLECTIONS.map(
          ({ key, title, detail, description, Icon }) => (
            <Link
              key={key}
              to={`/public/machinery/catalog?collection=${key}`}
              className={`rice-hub-card machinery-${key}`}
            >
              <div className="rice-hub-card-icon">
                <Icon aria-hidden="true" />
              </div>
              <div>
                <span className="rice-card-detail">{detail}</span>
                <h2>{title}</h2>
                <p>{description}</p>
                <span className="rice-card-action">
                  เปิดคลังนี้ <ArrowRightOutlined aria-hidden="true" />
                </span>
              </div>
            </Link>
          )
        )}
      </section>
    </main>
  );
}

function MachineryCatalog() {
  const [searchParams] = useSearchParams();
  const requestedCollection = searchParams.get('collection');
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState(
    requestedCollection === 'topics' ? 'topics' : 'all'
  );
  const [topic, setTopic] = useState('all');

  useEffect(() => {
    setCollection(
      requestedCollection === 'overview' || requestedCollection === 'topics'
        ? requestedCollection
        : 'all'
    );
  }, [requestedCollection]);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return MACHINERY_ARTICLES.filter((article) => {
      const searchable =
        `${article.title} ${article.category} ${article.detail}`.toLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (collection === 'all' || article.collection === collection) &&
        (topic === 'all' || article.topic === topic)
      );
    });
  }, [collection, query, topic]);

  return (
    <main className="rice-page machinery-page rice-catalog">
      <PageNav
        backTo="/public/machinery"
        backLabel="← กลับองค์ความรู้เครื่องจักร"
      />
      <section className="rice-catalog-header">
        <span className="rice-kicker">MACHINERY KNOWLEDGE LIBRARY</span>
        <h1>คลังองค์ความรู้เครื่องจักรการเกษตร</h1>
        <p>
          รวม {MACHINERY_ARTICLES.length} เอกสารจากคลังต้นฉบับ
          พร้อมค้นหาและกรองตามด้าน
        </p>
      </section>

      <div className="rice-toolbar">
        <label className="rice-search">
          <span className="sr-only">ค้นหาองค์ความรู้เครื่องจักร</span>
          <input
            type="search"
            placeholder="ค้นหา เช่น รถแทรกเตอร์, โดรน, หุ่นยนต์, เทเลเมติกส์..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="machinery-filters">
          <div className="rice-tabs" aria-label="ประเภทเอกสาร">
            <button
              type="button"
              className={collection === 'all' ? 'is-active' : ''}
              onClick={() => setCollection('all')}
            >
              ทั้งหมด ({MACHINERY_ARTICLES.length})
            </button>
            {MACHINERY_COLLECTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={collection === item.key ? 'is-active' : ''}
                onClick={() => setCollection(item.key)}
              >
                {item.title} (
                {
                  MACHINERY_ARTICLES.filter(
                    (article) => article.collection === item.key
                  ).length
                }
                )
              </button>
            ))}
          </div>
          <label className="machinery-topic-filter">
            <span>เลือกด้าน</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              <option value="all">ทุกด้าน</option>
              {MACHINERY_TOPICS.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number} · {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredArticles.length > 0 ? (
        <section
          className="rice-grid"
          aria-label="รายการองค์ความรู้เครื่องจักร"
        >
          {filteredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/public/machinery/${article.slug}`}
              className="rice-card"
            >
              <div className="rice-card-icon">
                <FileTextOutlined aria-hidden="true" />
              </div>
              <div>
                <span className="rice-card-detail">{article.detail}</span>
                <h2>{article.title}</h2>
                <p>{article.category}</p>
              </div>
              <span className="rice-card-action">
                อ่านบทความ <ArrowRightOutlined aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rice-empty">ไม่พบองค์ความรู้ที่ตรงกับคำค้น</div>
      )}
    </main>
  );
}

function renderInline(text) {
  if (!text) return '';
  const parts = text.split(
    /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*.+?\*\*|\*[^*]+\*)/g
  );
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('[') && part.endsWith(')')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, label, url] = match;
        return url.startsWith('/') ? (
          <Link key={index} to={url}>
            {label}
          </Link>
        ) : (
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
  if (block.type === 'paragraph' && block.text.trim() === '---') return <hr />;
  if (block.type === 'paragraph' && block.text.startsWith('> ')) {
    return <blockquote>{renderInline(block.text.slice(2))}</blockquote>;
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
      <div className="rice-table-wrap">
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

function MachineryArticle() {
  const { slug } = useParams();
  const article = MACHINERY_ARTICLES.find((item) => item.slug === slug);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(Boolean(article));
  const [error, setError] = useState(!article);

  useEffect(() => {
    if (!article) return;
    setLoading(true);
    setError(false);
    fetch(`/data/machinery/articles/${article.file}`)
      .then((response) => {
        if (!response.ok) throw new Error('Machinery article not found');
        return response.text();
      })
      .then(setContent)
      .catch((loadError) => {
        console.error('Error loading machinery article:', loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [article]);

  if (loading)
    return (
      <div className="rice-loading">
        <Spin size="large" tip="กำลังโหลดองค์ความรู้เครื่องจักร..." />
      </div>
    );
  if (error || !article)
    return <Navigate to="/public/machinery/catalog" replace />;

  return (
    <main className="rice-page machinery-page rice-article">
      <PageNav
        backTo="/public/machinery/catalog"
        backLabel="← กลับรายการองค์ความรู้"
      />
      <div className="rice-article-layout">
        <article className="rice-article-main">
          <header className="rice-article-header">
            <span>{article.detail}</span>
            <h1>{article.title}</h1>
            <p>{article.category} · เครื่องจักรการเกษตรล้ำสมัย</p>
          </header>
          <div className="rice-markdown">
            {parseMarkdownBlocks(content).map((block, index) => (
              <MarkdownBlock key={index} block={block} />
            ))}
          </div>
        </article>
        <aside className="rice-article-aside">
          <div className="rice-aside-card">
            <strong>ข้อมูลบทความ</strong>
            <dl>
              <div>
                <dt>หมวด</dt>
                <dd>{article.category}</dd>
              </div>
              <div>
                <dt>หัวข้อ</dt>
                <dd>{article.detail}</dd>
              </div>
              <div>
                <dt>รูปแบบ</dt>
                <dd>บทความ Markdown</dd>
              </div>
            </dl>
          </div>
          <div className="rice-aside-note">
            ตัวเลขตลาดและความสามารถของเครื่องจักรควรตรวจสอบกับผู้ผลิต มาตรฐาน
            และเงื่อนไขหน้างานก่อนตัดสินใจลงทุนหรือใช้งานจริง
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function MachineryKnowledge() {
  const location = useLocation();
  if (location.pathname === '/public/machinery') return <MachineryHub />;
  if (location.pathname === '/public/machinery/catalog')
    return <MachineryCatalog />;
  return <MachineryArticle />;
}
