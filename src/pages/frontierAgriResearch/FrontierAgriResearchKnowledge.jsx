import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BookOutlined,
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
import { CLOUDINARY_ASSETS } from '../../config/cloudinaryAssets';
import { MarkdownBlock } from '../../components/MarkdownBlock';
import {
  KnowledgeSectionHeading,
  KnowledgeStats,
} from '../../components/PublicKnowledge';
import { getFrontierArticleBlockGroups } from '../../utils/frontierArticle';
import '../rice/RiceKnowledge.css';
import '../stouResearch/StouResearchKnowledge.css';
import './FrontierAgriResearchKnowledge.css';

const BASE_PATH = '/public/frontier-agri-research';
const CATALOG_URL = '/data/frontier-agri-research/catalog.json';

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
        if (!response.ok)
          throw new Error('Frontier agriculture catalog not found');
        return response.json();
      })
      .then((catalog) => {
        if (active) setState({ catalog, loading: false, error: false });
      })
      .catch((error) => {
        console.error('Error loading frontier agriculture catalog:', error);
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
      style={{
        '--knowledge-header-image': `url("${CLOUDINARY_ASSETS.agriHero}")`,
      }}
    >
      <span className="rice-kicker">FRONTIER AGRICULTURAL RESEARCH</span>
      <h1>คลังบทความด้านการเกษตรทั่วโลก</h1>
      <p>
        {catalogPage
          ? `ค้นหาและอ่านบทความวิจัยการเกษตรล้ำยุค ${catalog.stats.total} เรื่อง พร้อมรายการอ้างอิงและลิงก์เว็บต้นทาง`
          : 'รวมบทความวิจัยการเกษตรจากทั่วโลก ตั้งแต่ชีวภาพ ดิน น้ำ AI หุ่นยนต์ ไปจนถึงระบบอาหารและการยอมรับเทคโนโลยี'}
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
          label: 'บทความวิจัย',
          icon: <FileTextOutlined />,
        },
        {
          value: Object.keys(catalog.stats.categories).length,
          label: 'หมวดการเกษตร',
          icon: <BookOutlined />,
        },
        {
          value: catalog.stats.references,
          label: 'รายการอ้างอิง',
          icon: <HistoryOutlined />,
        },
        {
          value: catalog.stats.linked_articles,
          label: 'บทความมีลิงก์เว็บ',
          icon: <SafetyCertificateOutlined />,
        },
      ]}
    />
  );
}

function LoadingState() {
  return (
    <div className="rice-loading">
      <Spin size="large" tip="กำลังโหลดคลังบทความการเกษตร..." />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rice-empty">
      ไม่สามารถโหลด catalog บทความการเกษตรได้ กรุณาลองใหม่อีกครั้ง
    </div>
  );
}

function FrontierArticleMarkdown({ content }) {
  return getFrontierArticleBlockGroups(content).map((group, groupIndex) => (
    <div
      className={group.isReferences ? 'frontier-reference-section' : undefined}
      key={groupIndex}
    >
      {group.blocks.map((block, index) => (
        <MarkdownBlock
          key={index}
          block={block}
          tableClassName="rice-table-wrap"
          tocClassName="rice-toc"
          citationTarget="#frontier-reference"
          referenceList={
            group.isReferences &&
            (block.type === 'list' || block.type === 'ordered-list')
          }
        />
      ))}
    </div>
  ));
}

function FrontierAgriResearchHub({ catalog }) {
  const categories = Object.entries(catalog.stats.categories);

  return (
    <main className="rice-page stou-page rice-hub frontier-agri-page">
      <PageNav />
      <Header catalog={catalog} />
      <CatalogStats catalog={catalog} />

      <section
        className="stou-intro"
        aria-label="ขอบเขตคลังบทความด้านการเกษตรทั่วโลก"
      >
        <div>
          <span className="stou-eyebrow">อ่านงานวิจัยให้เห็นหลักฐาน</span>
          <h2>จากงานวิจัยทั่วโลก สู่คำถามที่ใช้ต่อในงานเกษตร</h2>
          <p>
            คลังนี้รวบรวมบทความภาษาไทยจากงานวิจัยและข้อมูลเกษตรนานาชาติ
            แยกหมวดให้ค้นง่าย พร้อมวันที่อัปเดต เงื่อนไขของผลการศึกษา
            และอ้างอิงท้ายบทความเพื่อเปิดดูเว็บต้นทางได้เมื่อมี URL
          </p>
        </div>
        <Link className="stou-primary-link" to={`${BASE_PATH}/catalog`}>
          เปิดรายการบทความ <ArrowRightOutlined />
        </Link>
      </section>

      <KnowledgeSectionHeading
        kicker="แบ่งตามด้านการเกษตร"
        title="เลือกหัวข้อที่ต้องการอ่าน"
        count={`${catalog.stats.total} เรื่อง`}
      />
      <section className="rice-hub-grid" aria-label="หมวดบทความการเกษตรทั่วโลก">
        {categories.map(([category, count]) => (
          <Link
            key={category}
            to={`${BASE_PATH}/catalog?category=${encodeURIComponent(category)}`}
            className="rice-hub-card stou-category-card"
          >
            <div className="rice-hub-card-icon">
              <BookOutlined aria-hidden="true" />
            </div>
            <div>
              <span className="rice-card-detail">{count} เรื่อง</span>
              <h2>{category}</h2>
              <p>อ่านบทความพร้อมเงื่อนไข ผลการศึกษา และแหล่งอ้างอิง</p>
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

function FrontierAgriResearchCatalog({ catalog }) {
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
        article.topic_id,
        ...(article.references || []).map((reference) => reference.label),
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
    <main className="rice-page stou-page rice-catalog frontier-agri-page">
      <PageNav />
      <Header catalog={catalog} catalogPage />
      <CatalogStats catalog={catalog} />

      <KnowledgeSectionHeading
        kicker="ค้นหาและกรองได้"
        title="รายการบทความด้านการเกษตรทั่วโลก"
        count={`พบ ${filteredArticles.length} เรื่อง`}
      />
      <div className="rice-toolbar stou-toolbar">
        <label className="rice-search">
          <span className="sr-only">ค้นหาบทความด้านการเกษตรทั่วโลก</span>
          <SearchOutlined aria-hidden="true" />
          <input
            type="search"
            placeholder="ค้นชื่อเรื่อง หมวด หัวข้อย่อย หรือคำสำคัญ..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="stou-filter-row">
          <div className="rice-tabs" aria-label="หมวดบทความการเกษตร">
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
            <span>ปีอัปเดต</span>
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
        <section className="rice-grid" aria-label="รายการบทความการเกษตร">
          {filteredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`${BASE_PATH}/${article.slug}`}
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
                <p>{article.author}</p>
                <span className="stou-handle">
                  หัวข้อ: {article.topic_id} · อ้างอิง {article.reference_count}{' '}
                  รายการ
                </span>
              </div>
              <span className="rice-card-action">
                อ่านบทความ <ArrowRightOutlined aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rice-empty">ไม่พบบทความที่ตรงกับตัวกรอง</div>
      )}
    </main>
  );
}

function FrontierAgriResearchArticle({ catalog }) {
  const { slug } = useParams();
  const article = catalog.articles.find((item) => item.slug === slug);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(Boolean(article));
  const [error, setError] = useState(!article);

  useEffect(() => {
    if (!article) return undefined;
    setLoading(true);
    setError(false);
    fetch(`/data/frontier-agri-research/articles/${article.article_file}`)
      .then((response) => {
        if (!response.ok)
          throw new Error('Frontier agriculture article not found');
        return response.text();
      })
      .then(setContent)
      .catch((loadError) => {
        console.error('Error loading frontier agriculture article:', loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [article]);

  if (loading) {
    return (
      <div className="rice-loading">
        <Spin size="large" tip="กำลังโหลดบทความ..." />
      </div>
    );
  }
  if (error || !article)
    return <Navigate to={`${BASE_PATH}/catalog`} replace />;

  const references = article.references || [];
  const linkedReferences = references.filter((reference) => reference.url);

  return (
    <main className="rice-page stou-page rice-article frontier-agri-page">
      <PageNav backTo={`${BASE_PATH}/catalog`} />
      <div className="rice-article-layout">
        <article className="rice-article-main">
          <header className="rice-article-header">
            <span>
              พ.ศ. {article.source_year} · {article.category}
            </span>
            <h1>{article.title}</h1>
            <p>{article.author}</p>
          </header>
          <div className="rice-markdown">
            <FrontierArticleMarkdown content={content} />
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
                <dt>อัปเดตล่าสุด</dt>
                <dd>{article.updated_at || `พ.ศ. ${article.source_year}`}</dd>
              </div>
              <div>
                <dt>หัวข้อ</dt>
                <dd>{article.topic_id}</dd>
              </div>
              <div>
                <dt>อ้างอิง</dt>
                <dd>{article.reference_count} รายการ</dd>
              </div>
            </dl>
          </div>
          <div className="stou-source-links">
            <strong>เว็บอ้างอิงในบทความ</strong>
            {linkedReferences.length > 0 ? (
              <ol className="frontier-source-list">
                {linkedReferences.map((reference) => (
                  <li key={reference.id}>
                    <a href={reference.url} target="_blank" rel="noreferrer">
                      <LinkOutlined /> {reference.label || reference.url}
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="frontier-source-empty">
                บทความนี้มีรายการอ้างอิงท้ายบทความ แต่ต้นฉบับยังไม่มี URL
                ตรงให้เปิด
              </p>
            )}
          </div>
          <div className="rice-aside-note">
            บทความนี้จัดรูปแบบจากคลังงานวิจัยด้านการเกษตร
            ควรเปิดดูแหล่งอ้างอิงท้ายบทความและตรวจสอบข้อมูลล่าสุด
            ก่อนนำผลการศึกษาไปใช้กับพื้นที่จริง
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function FrontierAgriResearchKnowledge() {
  const location = useLocation();
  const { catalog, loading, error } = useCatalog();

  if (loading) return <LoadingState />;
  if (error || !catalog) return <ErrorState />;
  if (location.pathname === BASE_PATH) {
    return <FrontierAgriResearchHub catalog={catalog} />;
  }
  if (location.pathname === `${BASE_PATH}/catalog`) {
    return <FrontierAgriResearchCatalog catalog={catalog} />;
  }
  return <FrontierAgriResearchArticle catalog={catalog} />;
}
