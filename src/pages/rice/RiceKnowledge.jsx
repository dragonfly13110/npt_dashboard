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
import './RiceKnowledge.css';

const RICE_ARTICLES = [
  {
    slug: 'rice-research-overview',
    file: 'rice-research-overview.md',
    title: 'งานวิจัยข้าวใหม่ล่าสุดและโดดเด่นทั่วโลก',
    category: 'ภาพรวมงานวิจัย',
    detail: 'บทสรุปผู้บริหาร',
    collection: 'overview',
  },
  {
    slug: 'rice-molecular-research',
    file: 'rice-molecular-research.md',
    title: 'นวัตกรรมชีววิทยาสังเคราะห์และการปรับปรุงพันธุ์ข้าวระดับโมเลกุล',
    category: 'ภาพรวมงานวิจัย',
    detail: 'รายงานวิจัยเชิงลึก',
    collection: 'overview',
  },
  {
    slug: 'rice-research-00',
    file: 'rice-research-00.md',
    title: 'บทสรุปผู้บริหาร — งานวิจัยข้าวใหม่ล่าสุดทั่วโลก',
    category: 'งานวิจัยเชิงลึก',
    detail: 'บทสรุปผู้บริหาร',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-01',
    file: 'rice-research-01.md',
    title: 'บทที่ 1 — บทนำ: ภาพรวมทิศทางงานวิจัยข้าวโลก',
    category: 'งานวิจัยเชิงลึก',
    detail: 'พันธุศาสตร์และระบบการผลิต',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-02',
    file: 'rice-research-02.md',
    title: 'บทที่ 2 — จีโนมิกส์และ Pangenome ของข้าว',
    category: 'งานวิจัยเชิงลึก',
    detail: 'จีโนมิกส์',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-03',
    file: 'rice-research-03.md',
    title: 'บทที่ 3 — CRISPR และการปรับปรุงพันธุ์ข้าวระดับโมเลกุล',
    category: 'งานวิจัยเชิงลึก',
    detail: 'CRISPR และการปรับปรุงพันธุ์',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-04',
    file: 'rice-research-04.md',
    title: 'บทที่ 4 — ยีนผลผลิตและสรีรวิทยาของข้าว',
    category: 'งานวิจัยเชิงลึก',
    detail: 'ผลผลิตและสรีรวิทยา',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-05',
    file: 'rice-research-05.md',
    title: 'บทที่ 5 — ความทนทานของข้าวต่อสภาพอากาศเปลี่ยนแปลง',
    category: 'งานวิจัยเชิงลึก',
    detail: 'ร้อน แล้ง เค็ม และหนาว',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-06',
    file: 'rice-research-06.md',
    title: 'บทที่ 6 — ข้าวลดการปล่อยมีเทนและเกษตรคาร์บอนต่ำ',
    category: 'งานวิจัยเชิงลึก',
    detail: 'มีเทนและคาร์บอนต่ำ',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-07',
    file: 'rice-research-07.md',
    title: 'บทที่ 7 — การจัดการโรคและแมลงศัตรูข้าวด้วยเทคโนโลยีพันธุกรรม',
    category: 'งานวิจัยเชิงลึก',
    detail: 'โรคและแมลงศัตรู',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-08',
    file: 'rice-research-08.md',
    title: 'บทที่ 8 — โภชนาการและข้าวฟังก์ชัน',
    category: 'งานวิจัยเชิงลึก',
    detail: 'ข้าวเพื่อสุขภาพ',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-09',
    file: 'rice-research-09.md',
    title: 'บทที่ 9 — ข้าวหลายปีและนวัตกรรมระบบการผลิตข้าว',
    category: 'งานวิจัยเชิงลึก',
    detail: 'Perennial Rice',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-10',
    file: 'rice-research-10.md',
    title: 'บทที่ 10 — เทคโนโลยีการเพาะปลูกข้าว',
    category: 'งานวิจัยเชิงลึก',
    detail: 'จากการหยอดแห้งสู่เกษตรแม่นยำ',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-11',
    file: 'rice-research-11.md',
    title: 'บทที่ 11 — เกษตรแม่นยำและปัญญาประดิษฐ์ในนาข้าว',
    category: 'งานวิจัยเชิงลึก',
    detail: 'Precision Agriculture และ AI',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-12',
    file: 'rice-research-12.md',
    title: 'บทที่ 12 — การแปรรูปข้าวและเพิ่มมูลค่า',
    category: 'งานวิจัยเชิงลึก',
    detail: 'จากข้าวสู่ผลิตภัณฑ์เศรษฐกิจใหม่',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-13',
    file: 'rice-research-13.md',
    title: 'บทที่ 13 — การประยุกต์ใช้ในประเทศไทย',
    category: 'งานวิจัยเชิงลึก',
    detail: 'ข้าวไทยในเวทีวิจัยโลก',
    collection: 'deep-research',
  },
  {
    slug: 'rice-research-14',
    file: 'rice-research-14.md',
    title: 'บทที่ 14 — บทสรุปและแนวโน้มอนาคตของงานวิจัยข้าว',
    category: 'งานวิจัยเชิงลึก',
    detail: 'แนวโน้มอนาคต',
    collection: 'deep-research',
  },
  {
    slug: 'rice-pest-document-overview-2562',
    file: 'rice-pest-document-overview-2562.md',
    title: 'เอกสารต้นฉบับ: ศัตรูข้าว และการป้องกันกำจัด',
    category: 'ศัตรูข้าวและการป้องกันกำจัด',
    detail: 'ข้อมูลเอกสาร พ.ศ. 2562',
    collection: 'pests-control',
  },
  {
    slug: 'rice-pest-insects-rice-field-part-1-2562',
    file: 'rice-pest-insects-rice-field-part-1-2562.md',
    title: 'แมลงและไรศัตรูข้าวนาสวน: ส่วนที่ 1',
    category: 'แมลงและไรศัตรูข้าว',
    detail: 'หน้า 11–80',
    collection: 'pests-control',
  },
  {
    slug: 'rice-pest-insects-rice-field-part-2-2562',
    file: 'rice-pest-insects-rice-field-part-2-2562.md',
    title: 'แมลงและไรศัตรูข้าวนาสวน: ส่วนที่ 2',
    category: 'แมลงและไรศัตรูข้าว',
    detail: 'หน้า 81–106',
    collection: 'pests-control',
  },
  {
    slug: 'rice-pest-upland-rice-wheat-2562',
    file: 'rice-pest-upland-rice-wheat-2562.md',
    title: 'แมลงศัตรูข้าวไร่และข้าวสาลี',
    category: 'แมลงศัตรูข้าวไร่และข้าวสาลี',
    detail: 'การสำรวจและระดับเศรษฐกิจ',
    collection: 'pests-control',
  },
  {
    slug: 'rice-disease-diagnosis-2562',
    file: 'rice-disease-diagnosis-2562.md',
    title: 'โรคข้าวและการวินิจฉัย',
    category: 'โรคข้าว',
    detail: 'หลักการวินิจฉัย หน้า 137–146',
    collection: 'pests-control',
  },
  {
    slug: 'rice-disease-major-part-1-2562',
    file: 'rice-disease-major-part-1-2562.md',
    title: 'โรคข้าวที่สำคัญของประเทศไทย: ส่วนที่ 1',
    category: 'โรคข้าว',
    detail: 'โรคไหม้ถึงโรคเมล็ดด่าง',
    collection: 'pests-control',
  },
  {
    slug: 'rice-disease-major-part-2-2562',
    file: 'rice-disease-major-part-2-2562.md',
    title: 'โรคข้าวที่สำคัญของประเทศไทย: ส่วนที่ 2',
    category: 'โรคข้าว',
    detail: 'โรคกล้าเน่าถึงโรคเมาตอซัง',
    collection: 'pests-control',
  },
  {
    slug: 'rice-disease-index-bibliography-2562',
    file: 'rice-disease-index-bibliography-2562.md',
    title: 'ดัชนีสารป้องกันกำจัดโรคข้าวและบรรณานุกรม',
    category: 'ภาคผนวก',
    detail: 'ดัชนีสารและบรรณานุกรม',
    collection: 'pests-control',
  },
];

const RICE_COLLECTIONS = [
  {
    key: 'overview',
    title: 'ภาพรวมงานวิจัยข้าว',
    detail: '2 รายงานสรุป',
    description:
      'เริ่มต้นจากภาพรวมทิศทางงานวิจัยและประเด็นเด่นด้านชีววิทยาสังเคราะห์ การปรับปรุงพันธุ์ และความมั่นคงทางอาหาร',
    Icon: BookOutlined,
    tone: 'overview',
  },
  {
    key: 'deep-research',
    title: 'งานวิจัยข้าวเชิงลึก',
    detail: '15 บทความวิจัย',
    description:
      'อ่านต่อเป็นรายบท ตั้งแต่จีโนมิกส์ CRISPR ความทนทานต่อสภาพอากาศ ข้าวคาร์บอนต่ำ ไปจนถึง AI และการประยุกต์ใช้ในประเทศไทย',
    Icon: ExperimentOutlined,
    tone: 'research',
  },
  {
    key: 'pests-control',
    title: 'ศัตรูข้าวและการป้องกันกำจัด',
    detail: '8 เอกสารจากคู่มือ พ.ศ. 2562',
    description:
      'ค้นหาแมลง ไร โรคข้าว การสำรวจ ระดับเศรษฐกิจ ตารางสารป้องกันกำจัด และดัชนีสารจากเอกสารต้นฉบับ',
    Icon: FileTextOutlined,
    tone: 'research',
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

function RiceHub() {
  return (
    <main className="rice-page rice-hub">
      <PageNav />
      <section className="rice-hero">
        <span className="rice-kicker">RICE KNOWLEDGE</span>
        <h1>องค์ความรู้ข้าว</h1>
        <p>
          คลังเอกสารและงานวิจัยข้าวที่จัดโครงสร้างให้อ่านและค้นหาได้ง่าย
          รวมทั้งชุดศัตรูข้าวและการป้องกันกำจัดจากเอกสารต้นฉบับ
        </p>
      </section>

      <section className="rice-hub-grid" aria-label="คลังองค์ความรู้ข้าว">
        {RICE_COLLECTIONS.map(
          ({ key, title, detail, description, Icon, tone }) => (
            <Link
              key={key}
              to={`/public/rice/catalog?collection=${key}`}
              className={`rice-hub-card ${tone}`}
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

function RiceCatalog() {
  const [searchParams] = useSearchParams();
  const requestedCollection = searchParams.get('collection');
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState(
    requestedCollection === 'deep-research' ||
      requestedCollection === 'pests-control'
      ? requestedCollection
      : 'all'
  );

  useEffect(() => {
    setCollection(
      requestedCollection === 'deep-research' ||
        requestedCollection === 'overview' ||
        requestedCollection === 'pests-control'
        ? requestedCollection
        : 'all'
    );
  }, [requestedCollection]);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return RICE_ARTICLES.filter((article) => {
      const searchable =
        `${article.title} ${article.category} ${article.detail}`.toLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (collection === 'all' || article.collection === collection)
      );
    });
  }, [collection, query]);

  return (
    <main className="rice-page rice-catalog">
      <PageNav backTo="/public/rice" backLabel="← กลับองค์ความรู้ข้าว" />
      <section className="rice-catalog-header">
        <span className="rice-kicker">RICE KNOWLEDGE LIBRARY</span>
        <h1>คลังเอกสารองค์ความรู้ข้าว</h1>
        <p>
          รวม {RICE_ARTICLES.length} เอกสารจากชุดความรู้ข้าว พร้อมค้นหาตามหัวข้อ
        </p>
      </section>

      <div className="rice-toolbar">
        <label className="rice-search">
          <span className="sr-only">ค้นหาบทความข้าว</span>
          <input
            type="search"
            placeholder="ค้นหา เช่น CRISPR, เพลี้ย, โรคไหม้, มีเทน, AI..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="rice-tabs" aria-label="ประเภทเอกสาร">
          <button
            type="button"
            className={collection === 'all' ? 'is-active' : ''}
            onClick={() => setCollection('all')}
          >
            ทั้งหมด ({RICE_ARTICLES.length})
          </button>
          {RICE_COLLECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={collection === item.key ? 'is-active' : ''}
              onClick={() => setCollection(item.key)}
            >
              {item.title.replace('งานวิจัยข้าว', 'งานวิจัย')} (
              {
                RICE_ARTICLES.filter(
                  (article) => article.collection === item.key
                ).length
              }
              )
            </button>
          ))}
        </div>
      </div>

      {filteredArticles.length > 0 ? (
        <section className="rice-grid" aria-label="รายการบทความข้าว">
          {filteredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/public/rice/${article.slug}`}
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
        <div className="rice-empty">ไม่พบบทความที่ตรงกับคำค้น</div>
      )}
    </main>
  );
}

function renderInline(text) {
  if (!text) return '';
  const parts = text.split(
    /(<br\s*\/?\s*>|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*.+?\*\*|\*[^*]+\*)/gi
  );
  return parts.map((part, index) => {
    if (/^<br\s*\/?\s*>$/i.test(part)) {
      return <br key={index} />;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
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
  if (block.type === 'code') {
    return (
      <pre>
        <code>{block.text}</code>
      </pre>
    );
  }
  return <p>{renderInline(block.text)}</p>;
}

function RiceArticle() {
  const { slug } = useParams();
  const article = RICE_ARTICLES.find((item) => item.slug === slug);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(Boolean(article));
  const [error, setError] = useState(!article);

  useEffect(() => {
    if (!article) return;
    setLoading(true);
    setError(false);
    fetch(`/data/rice/articles/${article.file}`)
      .then((response) => {
        if (!response.ok) throw new Error('Rice article not found');
        return response.text();
      })
      .then(setContent)
      .catch((loadError) => {
        console.error('Error loading rice article:', loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [article]);

  if (loading) {
    return (
      <div className="rice-loading">
        <Spin size="large" tip="กำลังโหลดบทความข้าว..." />
      </div>
    );
  }
  if (error || !article) return <Navigate to="/public/rice/catalog" replace />;

  return (
    <main className="rice-page rice-article">
      <PageNav backTo="/public/rice/catalog" backLabel="← กลับรายการบทความ" />
      <div className="rice-article-layout">
        <article className="rice-article-main">
          <header className="rice-article-header">
            <span>{article.detail}</span>
            <h1>{article.title}</h1>
            <p>{article.category} · แหล่งข้อมูลจากชุดความรู้ข้าว</p>
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
                <dt>หัวข้อย่อย</dt>
                <dd>{article.detail}</dd>
              </div>
              <div>
                <dt>รูปแบบ</dt>
                <dd>บทความ Markdown</dd>
              </div>
            </dl>
          </div>
          <div className="rice-aside-note">
            เนื้อหาถอดจากเอกสารต้นฉบับและจัดรูปแบบเพื่อการค้นคว้า
            ควรตรวจสอบต้นฉบับและฉลากสารก่อนนำไปใช้จริง
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function RiceKnowledge() {
  const location = useLocation();
  if (location.pathname === '/public/rice') return <RiceHub />;
  if (location.pathname === '/public/rice/catalog') return <RiceCatalog />;
  return <RiceArticle />;
}
