import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Input, Radio, Card, Tag } from 'antd';
import './Farmer69.css';

export default function Farmer69Catalog() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  useEffect(() => {
    fetch('/data/farmer69/catalog.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load catalog');
        return res.json();
      })
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching farmer manual catalog:', err);
        setLoading(false);
      });
  }, []);

  const categories = [
    'ทั้งหมด',
    ...new Set(catalog.map((item) => item.category).filter(Boolean)),
  ];

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(item.topics) &&
        item.topics.some((topic) =>
          topic.toLowerCase().includes(searchQuery.toLowerCase())
        ));

    const matchesCategory =
      selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="farmer69-loading-container">
        <Spin
          size="large"
          tip="กำลังโหลดคลังความรู้คู่มือขึ้นทะเบียนเกษตรกร..."
        />
      </div>
    );
  }

  return (
    <div className="farmer69-container">
      <div className="farmer69-nav">
        <Link className="farmer69-back-link" to="/">
          🏠 กลับหน้าหลักแดชบอร์ด
        </Link>
      </div>

      <div className="farmer69-header">
        <h1>📖 คลังความรู้คู่มือขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร 2569</h1>
        <p>
          ข้อมูลอ้างอิงทางกฎระเบียบและแนวทางการปฏิบัติงานขึ้นทะเบียนเกษตรกร ปี
          2569 สำหรับประชาชนและเจ้าหน้าที่
        </p>
      </div>

      <div className="farmer69-search-filter">
        <div className="farmer69-search-wrapper">
          <Input.Search
            placeholder="ค้นหา เช่น เอกสารสิทธิ์, สมุดทะเบียนหาย, ผักกี่งาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="large"
          />
        </div>

        <div className="farmer69-filter-wrapper">
          <Radio.Group
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="middle"
          >
            {categories.map((cat) => (
              <Radio.Button key={cat} value={cat}>
                {cat} (
                {cat === 'ทั้งหมด'
                  ? catalog.length
                  : catalog.filter((i) => i.category === cat).length}
                )
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>
      </div>

      <div className="farmer69-grid">
        {filteredCatalog.map((item) => (
          <Card
            key={item.slug}
            className="farmer69-card"
            title={
              <div className="farmer69-card-header">
                <span className="farmer69-card-category">{item.category}</span>
                <h3>{item.title}</h3>
              </div>
            }
            actions={[
              <Link key="view" to={`/public/farmer-manual/${item.slug}`}>
                อ่านเนื้อหาเต็ม →
              </Link>,
            ]}
          >
            <div className="farmer69-card-body">
              <div className="farmer69-topics">
                {item.topics.slice(0, 5).map((topic, i) => (
                  <Tag key={i} color="blue">
                    {topic}
                  </Tag>
                ))}
              </div>
              <div className="farmer69-citation">{item.citation_text}</div>
            </div>
          </Card>
        ))}

        {filteredCatalog.length === 0 && (
          <div className="farmer69-empty">
            ไม่พบหัวข้อคู่มือที่ตรงกับคำค้นของคุณ
          </div>
        )}
      </div>
    </div>
  );
}
