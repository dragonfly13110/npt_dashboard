import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BookOutlined,
  DatabaseOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LinkOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { MarkdownBlock } from '../../components/MarkdownBlock';
import {
  KnowledgeSectionHeading,
  KnowledgeStats,
} from '../../components/PublicKnowledge';
import { parseArticleBlocks } from '../../utils/markdownBlocks';
import './StouResearchKnowledge.css';
import '../rice/RiceKnowledge.css';

const CATALOG_URL = '/data/stou-research/catalog.json';
const HEADER_IMAGE = '/images/knowledge/stou-research-header.png';

function useCatalog() {
  const [state, setState] = useState({
    catalog: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    fetch(CATALOG_URL)
      .then((response) => {
        if (!response.ok) throw new Error('STOU catalog not found');
        return response.json();
      })
      .then((catalog) => {
        if (active) setState({ catalog, loading: false, error: false });
      })
      .catch((error) => {
        console.error('Error loading STOU research catalog:', error);
        if (active) setState({ catalog: null, loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

function PageNav({ backTo = '/public/knowledge-hub' }) {
  return (
    <div className="rice-nav">
      <Link to={backTo}>
        <ArrowLeftOutlined /> กลับศูนย์องค์ความรู้
      </Link>
      <Link to="/">🏠 หน้าหลัก</Link>
    </div>
  );
}

function Header({ catalog, catalogPage = false }) {
  return (
    <section
      className={catalogPage ? 'rice-catalog-header' : 'rice-hero'}
      style={{ '--knowledge-header-image': `url("${HEADER_IMAGE}")` }}
    >
      <span className="rice-kicker">STOU RESEARCH LIBRARY</span>
      <h1>คลังงานวิจัย มสธ.</h1>
      <p>
        {catalogPage
          ? `ค้นและอ่านบทสรุปงานวิจัย ${catalog.stats.total} เรื่องจาก STOU Research Library พร้อมข้อมูลผู้วิจัย ปีเอกสาร และลิงก์ต้นฉบับ`
          : 'รวมบทสรุปงานวิจัยจากมหาวิทยาลัยสุโขทัยธรรมาธิราช เพื่อใช้เป็นฐานค้นคว้าสำหรับงานส่งเสริมการเกษตรและงานวิชาการ'}
      </p>
    </section>
  );
}

function CatalogStats({ catalog }) {
  return (
    <KnowledgeStats
      tone="research"
      items={[
        {
          value: catalog.stats.total,
          label: 'บทสรุปงานวิจัย',
          icon: <FileTextOutlined />,
        },
        {
          value: Object.keys(catalog.stats.years).length,
          label: 'ปีเอกสาร',
          icon: <HistoryOutlined />,
        },
        {
          value: Object.keys(catalog.stats.categories).length,
          label: 'หมวดวิจัย',
          icon: <BookOutlined />,
        },
        {
          value: 'มีที่มา',
          label: 'ลิงก์ STOU และ PDF ต้นฉบับ',
          icon: <SafetyCertificateOutlined />,
        },
      ]}
    />
  );
}

function LoadingState() {
  return (
    <div className="rice-loading">
      <Spin size="large" tip="กำลังโหลดคลังงานวิจัย..." />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rice-empty">
      ไม่สามารถโหลด catalog งานวิจัยได้ กรุณาลองใหม่อีกครั้ง
    </div>
  );
}

function StouResearchHub({ catalog }) {
  const categories = Object.entries(catalog.stats.categories);

  return (
    <main className="rice-page stou-page rice-hub">
      <PageNav />
      <Header catalog={catalog} />
      <CatalogStats catalog={catalog} />

      <section className="stou-intro" aria-label="ขอบเขตคลังงานวิจัย">
        <div>
          <span className="stou-eyebrow">อ่านอย่างมีหลักฐาน</span>
          <h2>จากบทสรุปงานวิจัย ไปสู่คำถามที่ค้นต่อได้</h2>
          <p>
            คลังนี้นำเข้าบทสรุปภาษาไทยจากโฟลเดอร์งานวิจัย STOU โดยผูกกับ Handle
            ID ปีเอกสาร ผู้วิจัย และลิงก์ต้นฉบับทุกเรื่อง
            เหมาะสำหรับค้นประเด็นก่อนกลับไปอ่าน PDF ฉบับเต็ม
          </p>
        </div>
        <Link className="stou-primary-link" to="/public/stou-research/catalog">
          เปิดรายการงานวิจัย <ArrowRightOutlined />
        </Link>
      </section>

      <KnowledgeSectionHeading
        kicker="แบ่งตามลักษณะเนื้อหา"
        title="เลือกหมวดที่ต้องการอ่าน"
        count={`${catalog.stats.total} เรื่อง`}
      />
      <section className="rice-hub-grid" aria-label="หมวดงานวิจัย STOU">
        {categories.map(([category, count]) => (
          <Link
            key={category}
            to={`/public/stou-research/catalog?category=${encodeURIComponent(category)}`}
            className="rice-hub-card stou-category-card"
          >
            <div className="rice-hub-card-icon">
              <BookOutlined aria-hidden="true" />
            </div>
            <div>
              <span className="rice-card-detail">{count} เรื่อง</span>
              <h2>{category}</h2>
              <p>ค้นบทสรุป เอกสารที่เกี่ยวข้อง และแหล่งอ้างอิงจากต้นฉบับ</p>
              <span className="rice-card-action">
                ดูหมวดนี้ <ArrowRightOutlined aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function StouResearchCatalog({ catalog }) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [year, setYear] = useState(searchParams.get('year') || 'all');
  const years = useMemo(
    () =>
      Object.keys(catalog.stats.years).sort((a, b) => Number(b) - Number(a)),
    [catalog]
  );
  const categories = Object.keys(catalog.stats.categories);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalog.articles.filter((article) => {
      const searchable = [
        article.title,
        article.author,
        article.category,
        article.abstract,
        article.handle_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (category === 'all' || article.category === category) &&
        (year === 'all' || String(article.source_year) === year)
      );
    });
  }, [catalog, category, query, year]);

  return (
    <main className="rice-page stou-page rice-catalog">
      <PageNav />
      <Header catalog={catalog} catalogPage />
      <CatalogStats catalog={catalog} />

      <KnowledgeSectionHeading
        kicker="ค้นหาและกรองได้"
        title="รายการบทสรุปงานวิจัย"
        count={`พบ ${filteredArticles.length} เรื่อง`}
      />
      <div className="rice-toolbar stou-toolbar">
        <label className="rice-search">
          <span className="sr-only">ค้นหางานวิจัย STOU</span>
          <SearchOutlined aria-hidden="true" />
          <input
            type="search"
            placeholder="ค้นชื่อเรื่อง ผู้วิจัย Handle ID หรือคำสำคัญ..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="stou-filter-row">
          <div className="rice-tabs" aria-label="หมวดงานวิจัย">
            <button
              type="button"
              className={category === 'all' ? 'is-active' : ''}
              onClick={() => setCategory('all')}
            >
              ทุกหมวด ({catalog.stats.total})
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? 'is-active' : ''}
                onClick={() => setCategory(item)}
              >
                {item} ({catalog.stats.categories[item]})
              </button>
            ))}
          </div>
          <label className="stou-year-filter">
            <span>ปีเอกสาร</span>
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option value="all">ทุกปี</option>
              {years.map((item) => (
                <option key={item} value={item}>
                  พ.ศ. {item} ({catalog.stats.years[item]})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredArticles.length > 0 ? (
        <section className="rice-grid" aria-label="รายการบทสรุปงานวิจัย">
          {filteredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/public/stou-research/${article.slug}`}
              className="rice-card stou-article-card"
            >
              <div className="rice-card-icon">
                <FileTextOutlined aria-hidden="true" />
              </div>
              <div>
                <span className="rice-card-detail">
                  พ.ศ. {article.source_year} · {article.category}
                </span>
                <h2>{article.title}</h2>
                <p>{article.author || 'ไม่ระบุผู้วิจัยใน metadata'}</p>
                <span className="stou-handle">
                  Handle ID: {article.handle_id}
                </span>
              </div>
              <span className="rice-card-action">
                อ่านบทสรุป <ArrowRightOutlined aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rice-empty">ไม่พบงานวิจัยที่ตรงกับตัวกรอง</div>
      )}
    </main>
  );
}

function StouResearchArticle({ catalog }) {
  const { slug } = useParams();
  const article = catalog.articles.find((item) => item.slug === slug);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(Boolean(article));
  const [error, setError] = useState(!article);

  useEffect(() => {
    if (!article) return undefined;
    setLoading(true);
    setError(false);
    fetch(`/data/stou-research/articles/${article.article_file}`)
      .then((response) => {
        if (!response.ok) throw new Error('STOU article not found');
        return response.text();
      })
      .then(setContent)
      .catch((loadError) => {
        console.error('Error loading STOU research article:', loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [article]);

  if (loading)
    return (
      <div className="rice-loading">
        <Spin size="large" tip="กำลังโหลดบทสรุปงานวิจัย..." />
      </div>
    );
  if (error || !article)
    return <Navigate to="/public/stou-research/catalog" replace />;

  return (
    <main className="rice-page stou-page rice-article">
      <PageNav backTo="/public/stou-research/catalog" />
      <div className="rice-article-layout">
        <article className="rice-article-main">
          <header className="rice-article-header">
            <span>
              พ.ศ. {article.source_year} · {article.category}
            </span>
            <h1>{article.title}</h1>
            <p>{article.author || 'ไม่ระบุผู้วิจัยใน metadata'}</p>
          </header>
          <div className="rice-markdown">
            {parseArticleBlocks(content).map((block, index) => (
              <MarkdownBlock
                key={index}
                block={block}
                tableClassName="rice-table-wrap"
                tocClassName="rice-toc"
              />
            ))}
          </div>
        </article>
        <aside className="rice-article-aside">
          <div className="rice-aside-card">
            <strong>ข้อมูลเอกสาร</strong>
            <dl>
              <div>
                <dt>หมวด</dt>
                <dd>{article.category}</dd>
              </div>
              <div>
                <dt>ปีเอกสาร</dt>
                <dd>พ.ศ. {article.source_year}</dd>
              </div>
              <div>
                <dt>Handle ID</dt>
                <dd>{article.handle_id}</dd>
              </div>
              <div>
                <dt>รูปแบบ</dt>
                <dd>{article.source_type}</dd>
              </div>
            </dl>
          </div>
          <div className="stou-source-links">
            <strong>แหล่งอ้างอิง</strong>
            <a href={article.source_url} target="_blank" rel="noreferrer">
              <LinkOutlined /> หน้ารายการใน STOU Research Library
            </a>
            <a href={article.pdf_url} target="_blank" rel="noreferrer">
              <FilePdfOutlined /> เปิด PDF ต้นฉบับ
            </a>
          </div>
          <div className="rice-aside-note">
            เนื้อหานี้เป็นบทสรุปจากเอกสารวิจัย ควรอ่าน PDF ต้นฉบับและพิจารณา
            บริบทของพื้นที่ กลุ่มตัวอย่าง และปีที่ศึกษา ก่อนนำไปใช้เป็นคำแนะนำ
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function StouResearchKnowledge() {
  const location = useLocation();
  const { catalog, loading, error } = useCatalog();

  if (loading) return <LoadingState />;
  if (error || !catalog) return <ErrorState />;
  if (location.pathname === '/public/stou-research') {
    return <StouResearchHub catalog={catalog} />;
  }
  if (location.pathname === '/public/stou-research/catalog') {
    return <StouResearchCatalog catalog={catalog} />;
  }
  return <StouResearchArticle catalog={catalog} />;
}
