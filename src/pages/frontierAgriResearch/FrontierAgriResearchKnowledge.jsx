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

const COLLECTION_CONFIGS = {
  frontier: {
    basePath: '/public/frontier-agri-research',
    catalogUrl: '/data/frontier-agri-research/catalog.json',
    kicker: 'FRONTIER AGRICULTURAL RESEARCH',
    title: 'คลังบทความด้านการเกษตรทั่วโลก',
    heroDescription:
      'รวมบทความวิจัยการเกษตรจากทั่วโลก ตั้งแต่ชีวภาพ ดิน น้ำ AI หุ่นยนต์ ไปจนถึงระบบอาหารและการยอมรับเทคโนโลยี',
    introEyebrow: 'อ่านงานวิจัยให้เห็นหลักฐาน',
    introTitle: 'จากงานวิจัยทั่วโลก สู่คำถามที่ใช้ต่อในงานเกษตร',
    introDescription:
      'คลังนี้รวบรวมบทความภาษาไทยจากงานวิจัยและข้อมูลเกษตรนานาชาติ แยกหมวดให้ค้นง่าย พร้อมวันที่อัปเดต เงื่อนไขของผลการศึกษา และอ้างอิงท้ายบทความเพื่อเปิดดูเว็บต้นทางได้เมื่อมี URL',
    scopeLabel: 'ขอบเขตคลังบทความด้านการเกษตรทั่วโลก',
    categoryLabel: 'หมวดบทความการเกษตรทั่วโลก',
    articleLabel: 'รายการบทความการเกษตร',
    searchLabel: 'ค้นหาบทความด้านการเกษตรทั่วโลก',
    searchPlaceholder: 'ค้นชื่อเรื่อง หมวด หัวข้อย่อย หรือคำสำคัญ...',
    articleNote:
      'บทความนี้จัดรูปแบบจากคลังงานวิจัยด้านการเกษตร ควรเปิดดูแหล่งอ้างอิงท้ายบทความและตรวจสอบข้อมูลล่าสุดก่อนนำผลการศึกษาไปใช้กับพื้นที่จริง',
  },
  npt: {
    basePath: '/public/npt-research',
    catalogUrl: '/data/npt-research/catalog.json',
    kicker: 'NAKHON PATHOM AGRICULTURAL RESEARCH',
    title: 'คลังงานวิจัยพืชนครปฐม',
    heroDescription:
      'รวมบทความปริทัศน์งานวิจัยด้านการเกษตรในจังหวัดนครปฐม ช่วงปี 2023–2026 ครอบคลุม 11 โดเมน พร้อมเงื่อนไข ผลการศึกษา และแหล่งอ้างอิง',
    introEyebrow: 'อ่านงานวิจัยเชิงพื้นที่',
    introTitle: 'จากงานวิจัยในนครปฐม สู่การใช้ประโยชน์ในพื้นที่',
    introDescription:
      'คลังนี้รวบรวมบทความปริทัศน์งานวิจัยที่ทำหรือตีพิมพ์โดยหน่วยงานในจังหวัดนครปฐม แยกตามโดเมนตั้งแต่ข้าว ไม้ผล พืชผัก ดิน น้ำ เทคโนโลยี ไปจนถึงอาหารและการแปรรูป พร้อมวันทบทวนและลิงก์อ้างอิงต้นทาง',
    scopeLabel: 'ขอบเขตคลังงานวิจัยพืชนครปฐม',
    categoryLabel: 'หมวดงานวิจัยพืชนครปฐม',
    articleLabel: 'รายการบทความวิจัยพืชนครปฐม',
    searchLabel: 'ค้นหางานวิจัยพืชนครปฐม',
    searchPlaceholder: 'ค้นชื่อเรื่อง โดเมน หัวข้อย่อย หรือคำสำคัญ...',
    articleNote:
      'บทความนี้เป็นบทความปริทัศน์เชิงพื้นที่ ควรเปิดดูเงื่อนไขของผลการศึกษาและแหล่งอ้างอิงท้ายบทความก่อนนำไปใช้กับแปลงจริง',
  },
};

function useCatalog(catalogUrl) {
  const [state, setState] = useState({
    catalog: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    setState({ catalog: null, loading: true, error: false });
    fetch(catalogUrl)
      .then((response) => {
        if (!response.ok)
          throw new Error('Agricultural research catalog not found');
        return response.json();
      })
      .then((catalog) => {
        if (active) setState({ catalog, loading: false, error: false });
      })
      .catch((error) => {
        console.error('Error loading agricultural research catalog:', error);
        if (active) setState({ catalog: null, loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, [catalogUrl]);

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

function Header({ catalog, config, catalogPage = false }) {
  return (
    <section
      className={catalogPage ? 'rice-catalog-header' : 'rice-hero'}
      style={{
        '--knowledge-header-image': `url("${CLOUDINARY_ASSETS.agriHero}")`,
      }}
    >
      <span className="rice-kicker">{config.kicker}</span>
      <h1>{config.title}</h1>
      <p>
        {catalogPage
          ? `ค้นหาและอ่านบทความวิจัย ${catalog.stats.total} เรื่อง พร้อมรายการอ้างอิงและลิงก์เว็บต้นทาง`
          : config.heroDescription}
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

function FrontierAgriResearchHub({ catalog, config }) {
  const categories = Object.entries(catalog.stats.categories);

  return (
    <main className="rice-page stou-page rice-hub frontier-agri-page">
      <PageNav />
      <Header catalog={catalog} config={config} />
      <CatalogStats catalog={catalog} />

      <section
        className="stou-intro"
        aria-label={config.scopeLabel}
      >
        <div>
          <span className="stou-eyebrow">{config.introEyebrow}</span>
          <h2>{config.introTitle}</h2>
          <p>{config.introDescription}</p>
        </div>
        <Link className="stou-primary-link" to={`${config.basePath}/catalog`}>
          เปิดรายการบทความ <ArrowRightOutlined />
        </Link>
      </section>

      <KnowledgeSectionHeading
        kicker="แบ่งตามด้านการเกษตร"
        title="เลือกหัวข้อที่ต้องการอ่าน"
        count={`${catalog.stats.total} เรื่อง`}
      />
      <section className="rice-hub-grid" aria-label={config.categoryLabel}>
        {categories.map(([category, count]) => (
          <Link
            key={category}
            to={`${config.basePath}/catalog?category=${encodeURIComponent(category)}`}
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

function FrontierAgriResearchCatalog({ catalog, config }) {
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
      <Header catalog={catalog} config={config} catalogPage />
      <CatalogStats catalog={catalog} />

      <KnowledgeSectionHeading
        kicker="ค้นหาและกรองได้"
        title={config.title}
        count={`พบ ${filteredArticles.length} เรื่อง`}
      />
      <div className="rice-toolbar stou-toolbar">
        <label className="rice-search">
          <span className="sr-only">{config.searchLabel}</span>
          <SearchOutlined aria-hidden="true" />
          <input
            type="search"
            placeholder={config.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="stou-filter-row">
          <div className="rice-tabs" aria-label={config.categoryLabel}>
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
        <section className="rice-grid" aria-label={config.articleLabel}>
          {filteredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`${config.basePath}/${article.slug}`}
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

function FrontierAgriResearchArticle({ catalog, config }) {
  const { slug } = useParams();
  const article = catalog.articles.find((item) => item.slug === slug);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(Boolean(article));
  const [error, setError] = useState(!article);

  useEffect(() => {
    if (!article) return undefined;
    setLoading(true);
    setError(false);
    fetch(`${config.catalogUrl.replace(/\/catalog\.json$/, '')}/articles/${article.article_file}`)
      .then((response) => {
        if (!response.ok)
          throw new Error('Agricultural research article not found');
        return response.text();
      })
      .then(setContent)
      .catch((loadError) => {
        console.error('Error loading agricultural research article:', loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [article, config]);

  if (loading) {
    return (
      <div className="rice-loading">
        <Spin size="large" tip="กำลังโหลดบทความ..." />
      </div>
    );
  }
  if (error || !article)
    return <Navigate to={`${config.basePath}/catalog`} replace />;

  const references = article.references || [];
  const linkedReferences = references.filter((reference) => reference.url);

  return (
    <main className="rice-page stou-page rice-article frontier-agri-page">
      <PageNav backTo={`${config.basePath}/catalog`} />
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
            {config.articleNote}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function FrontierAgriResearchKnowledge({ collection = 'frontier' }) {
  const config = COLLECTION_CONFIGS[collection] || COLLECTION_CONFIGS.frontier;
  const location = useLocation();
  const { catalog, loading, error } = useCatalog(config.catalogUrl);

  if (loading) return <LoadingState />;
  if (error || !catalog) return <ErrorState />;
  if (location.pathname === config.basePath) {
    return <FrontierAgriResearchHub catalog={catalog} config={config} />;
  }
  if (location.pathname === `${config.basePath}/catalog`) {
    return <FrontierAgriResearchCatalog catalog={catalog} config={config} />;
  }
  return <FrontierAgriResearchArticle catalog={catalog} config={config} />;
}
