import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import './Pesticides.css';

export default function PesticidesCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedPlant, setSelectedPlant] = useState('ทั้งหมด');

  useEffect(() => {
    fetch('/data/pesticides/catalog.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load catalog');
        return res.json();
      })
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching pesticides catalog:', err);
        setLoading(false);
      });
  }, []);

  // Extract unique categories and plants
  const categories = [
    'ทั้งหมด',
    ...new Set(catalog.map((item) => item.category).filter(Boolean)),
  ];
  const plants = [
    'ทั้งหมด',
    ...new Set(catalog.map((item) => item.plant).filter(Boolean)),
  ];

  // Filtering logic
  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.plant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pest_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(item.commonNames) &&
        item.commonNames.some((name) =>
          name.toLowerCase().includes(searchQuery.toLowerCase())
        ));

    const matchesCategory =
      selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
    const matchesPlant =
      selectedPlant === 'ทั้งหมด' || item.plant === selectedPlant;

    return matchesSearch && matchesCategory && matchesPlant;
  });

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
        <Spin size="large" tip="กำลังโหลดคลังความรู้ยากำจัดศัตรูพืช..." />
      </div>
    );
  }

  return (
    <div className="pesticides-container">
      <div className="pesticides-nav" style={{ marginBottom: 16 }}>
        <Link className="article-back-link" to="/" style={{ marginBottom: 0 }}>
          🏠 กลับหน้าหลักแดชบอร์ด
        </Link>
      </div>
      <div className="pesticides-header">
        <h1>คลังความรู้การใช้สารป้องกันกำจัดศัตรูพืช</h1>
        <p>
          ฐานข้อมูลคำแนะนำทางวิชาการและแนวทางการหมุนเวียนสารอย่างปลอดภัย
          สำหรับกลุ่มงานส่งเสริมการเกษตรและเกษตรกรจังหวัดนครปฐม
        </p>
      </div>

      <div className="search-filter-section">
        {/* Search Input */}
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
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาชื่อเรื่อง พืช ศัตรูพืช หรือสารเคมี..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filters */}
        <div className="filter-group" style={{ marginBottom: 16 }}>
          <div className="filter-label">หมวดหมู่ความรู้</div>
          <div className="filter-tags">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-tag ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Plant Filters */}
        <div className="filter-group">
          <div className="filter-label">กรองตามชนิดพืช</div>
          <div className="filter-tags">
            {plants.map((p) => (
              <button
                key={p}
                className={`filter-tag ${selectedPlant === p ? 'active' : ''}`}
                onClick={() => setSelectedPlant(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Results */}
      {filteredCatalog.length > 0 ? (
        <div className="pesticides-grid">
          {filteredCatalog.map((item) => (
            <Link
              key={item.slug}
              to={`/public/pesticides/${item.slug}`}
              className="pesticide-card"
            >
              <div>
                <div className="card-category">{item.category}</div>
                <div className="card-title">{item.title}</div>
                <div className="card-meta-tags">
                  {item.plant && (
                    <span className="meta-tag plant">{item.plant}</span>
                  )}
                  {item.pest_type && (
                    <span className="meta-tag pest-type">{item.pest_type}</span>
                  )}
                </div>
              </div>
              <div className="card-footer">
                <span>ปีที่มา: {item.source_year || 'ไม่ระบุ'}</span>
                <span>รีวิวล่าสุด: {item.last_reviewed || 'ไม่ระบุ'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>ไม่พบข้อมูลตามคำค้นหาหรือตัวกรองที่เลือก</p>
        </div>
      )}
    </div>
  );
}
