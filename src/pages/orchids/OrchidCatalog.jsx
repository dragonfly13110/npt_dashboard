import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import '../pesticides/Pesticides.css';
import './OrchidKnowledge.css';

const sortThaiLabels = (labels) =>
  [...labels].sort((a, b) => a.localeCompare(b, 'th'));

const ORCHID_COLLECTIONS = {
  production: {
    dataPath: '/data/orchids/catalog.json',
    articlePath: '/public/orchids',
    title: 'องค์ความรู้การผลิตกล้วยไม้',
    description:
      'รวมเนื้อหาหลักจากคู่มือการผลิต ตั้งแต่การปลูกเลี้ยง โรงเรือน น้ำ ปุ๋ย โรค แมลง การขยายพันธุ์ และหลังการเก็บเกี่ยว',
    sourceNote:
      'แหล่งข้อมูลหลักจากเอกสารปี พ.ศ. 2560 เนื้อหาด้านกฎหมาย ทะเบียน และอัตราการใช้สารเคมี ควรตรวจสอบกับฉลากและข้อกำหนดปัจจุบันก่อนนำไปใช้จริง',
    placeholder: 'ค้นหาหัวข้อ การปลูกเลี้ยง โรค แมลง ปุ๋ย...',
  },
  research: {
    dataPath: '/data/orchids/research/catalog.json',
    articlePath: '/public/orchids/research',
    title: 'งานวิจัยและนวัตกรรมกล้วยไม้',
    description:
      'สรุปงานวิจัยกล้วยไม้ทั่วโลก ค.ศ. 2020–กลางปี 2026 ครอบคลุมจีโนม การปรับปรุงพันธุ์ การผลิต การอนุรักษ์ และอุตสาหกรรม',
    sourceNote:
      'ชุดนี้เป็นบทสรุปงานวิจัย ไม่ใช่คู่มือปฏิบัติโดยตรง ตัวเลขและข้อค้นพบควรตรวจสอบกับงานต้นฉบับและบริบทของชนิดกล้วยไม้ก่อนนำไปใช้',
    placeholder: 'ค้นหางานวิจัย จีโนม การออกดอก เนื้อเยื่อ...',
  },
};

export default function OrchidCatalog({ collection = 'production' }) {
  const settings =
    ORCHID_COLLECTIONS[collection] || ORCHID_COLLECTIONS.production;
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  useEffect(() => {
    fetch(settings.dataPath)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load orchid catalog');
        return response.json();
      })
      .then((data) => setCatalog(data))
      .catch((error) => console.error('Error loading orchid catalog:', error))
      .finally(() => setLoading(false));
  }, [settings.dataPath]);

  const categories = useMemo(
    () => [
      'ทั้งหมด',
      ...sortThaiLabels(
        new Set(catalog.map((item) => item.category).filter(Boolean))
      ),
    ],
    [catalog]
  );

  const filteredCatalog = catalog.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const searchable = [item.title, item.category, item.subcategory]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (
      (!query || searchable.includes(query)) &&
      (selectedCategory === 'ทั้งหมด' || item.category === selectedCategory)
    );
  });

  if (loading) {
    return (
      <div className="orchid-catalog-loading">
        <Spin size="large" tip="กำลังโหลดองค์ความรู้การผลิตกล้วยไม้..." />
      </div>
    );
  }

  return (
    <div
      className={`pesticides-container orchid-catalog-container orchid-collection-${collection}`}
    >
      <div className="pesticides-nav" style={{ marginBottom: 16 }}>
        <Link
          className="article-back-link"
          to="/public/orchids"
          style={{ marginBottom: 0 }}
        >
          ← กลับองค์ความรู้กล้วยไม้
        </Link>
        <Link
          className="article-back-link"
          to="/"
          style={{ margin: '0 0 0 16px', color: '#64748b' }}
        >
          🏠 หน้าหลัก
        </Link>
      </div>

      <div className="pesticides-header orchid-header">
        <h1>{settings.title}</h1>
        <p>
          {settings.description} รวม {catalog.length} รายการ
        </p>
      </div>

      <div className="orchid-source-note">{settings.sourceNote}</div>

      <div className="search-filter-section">
        <div className="search-wrapper">
          <svg
            className="search-icon-svg"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder={settings.placeholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="orchid-category">
            หมวดความรู้
          </label>
          <select
            id="orchid-category"
            className="category-select"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredCatalog.length > 0 ? (
        <div className="pesticides-grid">
          {filteredCatalog.map((item) => (
            <Link
              key={item.slug}
              to={`${settings.articlePath}/${item.slug}`}
              className="pesticide-card"
            >
              <div>
                <div className="card-category">{item.category}</div>
                <div className="card-title">{item.title}</div>
                <div className="card-meta-tags">
                  {item.subcategory && (
                    <span className="meta-tag plant">{item.subcategory}</span>
                  )}
                </div>
              </div>
              <div className="card-footer">
                <span>หน้า {item.source_pages || '-'}</span>
                <span>พ.ศ. {item.source_year || '-'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>ไม่พบหัวข้อที่ตรงกับคำค้นหรือหมวดที่เลือก</p>
        </div>
      )}
    </div>
  );
}
