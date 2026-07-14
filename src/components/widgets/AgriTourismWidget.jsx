import { useMemo, useState } from 'react';
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';

const text = (value) => String(value || '').trim();

export default function AgriTourismWidget({
  data = {},
  loading = false,
  summary = false,
  onOpen,
}) {
  const rows = useMemo(() => data.list || [], [data.list]);
  const districts = useMemo(
    () => [...new Set(rows.map((row) => text(row.district)).filter(Boolean))],
    [rows]
  );
  const types = useMemo(
    () => [...new Set(rows.map((row) => text(row.spot_type)).filter(Boolean))],
    [rows]
  );
  const [district, setDistrict] = useState('all');
  const [query, setQuery] = useState('');
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('th');
    return rows.filter((row) => {
      if (district !== 'all' && text(row.district) !== district) return false;
      if (!needle) return true;
      return [row.spot_name, row.district, row.subdistrict, row.spot_type]
        .map(text)
        .some((value) => value.toLocaleLowerCase('th').includes(needle));
    });
  }, [district, query, rows]);

  const total = data.count ?? rows.length;

  if (summary) {
    return (
      <button
        type="button"
        className="tourism-kpi-widget"
        onClick={onOpen}
        aria-label="แหล่งท่องเที่ยว ดูรายละเอียด"
      >
        <span className="tourism-kpi-title">
          <EnvironmentOutlined /> แหล่งท่องเที่ยว
        </span>
        <span className="tourism-kpi-values">
          <span>
            <strong>{total.toLocaleString('th-TH')} แห่ง</strong>
            <small>สถานที่ทั้งหมด</small>
          </span>
          <span>
            <strong>{districts.length.toLocaleString('th-TH')} อำเภอ</strong>
            <small>พื้นที่ให้บริการ</small>
          </span>
          <span>
            <strong>{types.length.toLocaleString('th-TH')} ประเภท</strong>
            <small>รูปแบบท่องเที่ยว</small>
          </span>
        </span>
        <span className="tourism-kpi-open">ดูรายละเอียด →</span>
      </button>
    );
  }

  const clearFilters = () => {
    setDistrict('all');
    setQuery('');
  };

  return (
    <section className="tourism-detail-widget">
      <header className="tourism-detail-head">
        <div>
          <small>ข้อมูลท่องเที่ยวเชิงเกษตร</small>
          <h2>แหล่งท่องเที่ยวจังหวัดนครปฐม</h2>
          <p>ค้นหาสถานที่ กิจกรรม และช่องทางติดต่อในแต่ละอำเภอ</p>
        </div>
        <strong>{total.toLocaleString('th-TH')} แห่ง</strong>
      </header>

      <div className="tourism-detail-toolbar">
        <label>
          <span>อำเภอ</span>
          <select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="all">ทุกอำเภอ</option>
            {districts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="tourism-detail-search">
          <span>ค้นหา</span>
          <div>
            <SearchOutlined />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ชื่อสถานที่ / อำเภอ / ประเภท"
            />
          </div>
        </label>
        <button type="button" onClick={clearFilters}>
          ล้างตัวกรอง
        </button>
      </div>

      <div className="tourism-detail-stats">
        <div>
          <span>สถานที่ทั้งหมด</span>
          <strong>{total.toLocaleString('th-TH')} แห่ง</strong>
        </div>
        <div>
          <span>อำเภอที่มีข้อมูล</span>
          <strong>{districts.length.toLocaleString('th-TH')} อำเภอ</strong>
        </div>
        <div>
          <span>ประเภทการท่องเที่ยว</span>
          <strong>{types.length.toLocaleString('th-TH')} ประเภท</strong>
        </div>
      </div>

      <div className="tourism-detail-results">
        <div className="tourism-detail-result-title">
          <strong>รายการสถานที่</strong>
          <span>{filteredRows.length.toLocaleString('th-TH')} รายการ</span>
        </div>
        {loading ? (
          <div className="tourism-detail-empty">กำลังโหลดข้อมูล...</div>
        ) : filteredRows.length ? (
          <div className="tourism-detail-list">
            {filteredRows.map((row) => (
              <article key={row.id || row.spot_name}>
                <EnvironmentOutlined />
                <div>
                  <span>{text(row.spot_type) || 'ไม่ระบุประเภท'}</span>
                  <h3>{text(row.spot_name) || 'ไม่ระบุชื่อสถานที่'}</h3>
                  <p>
                    อ.{text(row.district) || '-'}
                    {text(row.subdistrict) && ` · ต.${text(row.subdistrict)}`}
                    {text(row.contact_person) &&
                      ` · ติดต่อ ${text(row.contact_person)}`}
                    {text(row.phone) && ` ${text(row.phone)}`}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="tourism-detail-empty">ไม่พบข้อมูลตามตัวกรอง</div>
        )}
      </div>

      <a className="tourism-detail-more" href="/public/agri-tourism">
        ดูตารางข้อมูลเต็ม →
      </a>
    </section>
  );
}
