import { useMemo, useState } from 'react';
import { CarOutlined, LineChartOutlined, LinkOutlined } from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';

const SOURCE_URL = 'https://mex.moc.go.th/page/dit/checkprice/type/W/catid/4';
const OIL_SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';
const CATEGORIES = [
  { id: '3', label: 'ผัก' },
  { id: '4', label: 'ผลไม้' },
  { id: '7', label: 'พืชไร่' },
  { id: '10', label: 'ข้าว' },
  { id: '5', label: 'ของแห้ง' },
];
const COMMON_OIL_ORDER = [
  'ดีเซล B20',
  'ไฮดีเซล S',
  'แก๊สโซฮอล 95 S EVO',
  'แก๊สโซฮอล 91 S EVO',
  'แก๊สโซฮอล E20 S EVO',
  'แก๊สโซฮอล E85 S EVO',
];

async function fetchAgriPrices(catid) {
  const res = await fetch(`/.netlify/functions/moc-price-proxy?catid=${encodeURIComponent(catid)}`);
  if (!res.ok) throw new Error(`MOC price proxy returned ${res.status}`);

  const json = await res.json();
  if (!json.success || !Array.isArray(json.items)) {
    throw new Error(json.message || 'MOC price proxy returned no data');
  }

  return json;
}

async function fetchOilPrices() {
  const localProxy = await fetch('/api/bangchak-oil-price?source=api-v2');
  if (localProxy.ok) {
    const json = await localProxy.json();
    return {
      success: true,
      source: 'บริษัท บางจาก คอร์ปอเรชั่น จำกัด (มหาชน)',
      sourceUrl: OIL_SOURCE_URL,
      unit: 'บาท/ลิตร',
      items: normalizeOilItems(json),
    };
  }

  const res = await fetch('/.netlify/functions/bangchak-oil-price-proxy?source=api-v2');
  if (!res.ok) throw new Error(`Bangchak oil price proxy returned ${res.status}`);

  const json = await res.json();
  if (!json.success || !Array.isArray(json.items)) {
    throw new Error(json.message || 'Bangchak oil price proxy returned no data');
  }

  return json;
}

function isOilPriceText(text = '') {
  return /^\d+(?:\.\d{1,2})?$/.test(String(text).trim());
}

function isRegularOilPrice(text = '') {
  const price = Number.parseFloat(String(text).trim());
  return Number.isFinite(price) && price <= 80;
}

function isValidOilName(name = '') {
  return Boolean(String(name).trim()) && !/พรีเมียม|premium/i.test(name);
}

function getOilSortIndex(name) {
  const index = COMMON_OIL_ORDER.indexOf(name);
  return index === -1 ? COMMON_OIL_ORDER.length : index;
}

function normalizeOilItems(json) {
  const payload = Array.isArray(json) ? json[0] : json;
  const rawOilList = payload?.OilList;
  const oilList = typeof rawOilList === 'string' ? JSON.parse(rawOilList) : rawOilList;
  if (!Array.isArray(oilList)) return [];

  return oilList
    .map((item) => {
      const name = String(item.OilName || '').trim();
      const today = String(item.PriceToday || '').trim();
      const tomorrow = String(item.PriceTomorrow || '').trim();
      if (!isValidOilName(name) || (!isOilPriceText(today) && !isOilPriceText(tomorrow))) return null;
      if (!isRegularOilPrice(today)) return null;
      return {
        name,
        today,
        tomorrow,
        diff: String(item.PriceDifTomorrow || item.PriceDifYesterday || '').trim(),
        icon: item.Icon || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => getOilSortIndex(a.name) - getOilSortIndex(b.name));
}

function formatThaiDate(dateText) {
  if (!dateText) return '';
  const date = new Date(`${dateText}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPriceText(item) {
  if (item.price_range) return item.price_range;
  if (Number.isFinite(item.day_price)) {
    return item.day_price.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  }
  return item.avg_price || '-';
}

function PriceSkeleton() {
  return (
    <div className="price-ios-skeleton-list" aria-label="กำลังโหลดราคาผลผลิต">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="price-ios-skeleton-row" key={index} />
      ))}
    </div>
  );
}

export default function AgriPricesWidget() {
  const [selectedCategory, setSelectedCategory] = useState('4');
  const { data, isLoading, error } = useApiCache(
    ['moc-agri-prices', selectedCategory],
    () => fetchAgriPrices(selectedCategory),
    { staleMinutes: 30, cacheMinutes: 120 }
  );
  const { data: oilData, isLoading: isOilLoading, error: oilError } = useApiCache(
    ['bangchak-oil-prices-api-v2'],
    fetchOilPrices,
    { staleMinutes: 30, cacheMinutes: 120 }
  );

  const items = useMemo(() => data?.items || [], [data]);
  const oilItems = useMemo(() => (oilData?.items || []).slice(0, 6), [oilData]);
  const dataDateText = formatThaiDate(data?.dataDate);
  const selectedLabel = data?.category || CATEGORIES.find((item) => item.id === selectedCategory)?.label;

  return (
    <section className="price-ios-card slide-up-anim" aria-label="ราคาผลผลิตทางการเกษตร">
      <div className="price-ios-glow" />

      <div className="price-ios-oil-panel" aria-label="ราคาน้ำมันบางจาก">
        <div className="price-ios-oil-strip-head">
          <span><CarOutlined /> ราคาน้ำมัน</span>
          <a href={oilData?.sourceUrl || OIL_SOURCE_URL} target="_blank" rel="noreferrer">
            อ้างอิง: บางจาก
          </a>
        </div>
        {isOilLoading ? (
          <div className="price-ios-oil-loading">กำลังดึงราคาน้ำมัน...</div>
        ) : oilError ? (
          <div className="price-ios-oil-loading">ยังดึงราคาน้ำมันไม่ได้ กดเปิดเว็บบางจากเพื่อดูข้อมูลล่าสุด</div>
        ) : (
          <div className="price-ios-oil-list">
            {oilItems.map((item) => (
              <a
                className="price-ios-oil-item"
                href={oilData?.sourceUrl || OIL_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                key={item.name}
                title={`${item.name} จากเว็บบางจาก`}
              >
                <span>{item.name}</span>
                <strong>{item.today || '-'} <small>บาท/ลิตร</small></strong>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="price-ios-header">
        <div className="price-ios-title">
          <div className="price-ios-icon"><LineChartOutlined /></div>
          <div>
            <span className="price-ios-eyebrow">กรมการค้าภายใน</span>
            <h3>ราคาผลผลิตทางการเกษตร</h3>
            <p>{selectedLabel} · {dataDateText ? `ข้อมูล ณ ${dataDateText}` : 'ข้อมูลล่าสุด'}</p>
          </div>
        </div>
        <a
          className="price-ios-source"
          href={data?.sourceUrl || SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          title="เปิดแหล่งข้อมูล"
          aria-label="เปิดแหล่งข้อมูลราคา"
        >
          <LinkOutlined />
        </a>
      </div>

      <div className="price-ios-tabs" aria-label="เลือกหมวดราคา">
        {CATEGORIES.map((category) => (
          <button
            className={selectedCategory === category.id ? 'is-active' : ''}
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="price-ios-meta">
        <span>{isLoading ? 'กำลังดึงข้อมูล' : `พบ ${items.length.toLocaleString('th-TH')} รายการ`}</span>
        <span>{selectedLabel}</span>
      </div>

      <div className="price-ios-list">
        {isLoading ? (
          <PriceSkeleton />
        ) : error ? (
          <div className="price-ios-state">
            <strong>ยังดึงข้อมูลราคาไม่ได้</strong>
            <span>ลองรีเฟรชอีกครั้ง หรือเปิดแหล่งข้อมูลจากกรมการค้าภายใน</span>
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <article key={item.id || item.no} className="price-ios-item">
              <div className="price-ios-product">
                <strong title={item.product_name}>{item.product_name}</strong>
                <span>{item.market_name || 'กรมการค้าภายใน'}</span>
              </div>
              <div className="price-ios-value">
                <strong>{getPriceText(item)}</strong>
                <span>{item.unit}{item.avg_price ? ` · เฉลี่ย ${item.avg_price}` : ''}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="price-ios-state">
            <strong>ไม่พบรายการราคา</strong>
            <span>ยังไม่มีข้อมูลในหมวด {selectedLabel}</span>
          </div>
        )}
      </div>
    </section>
  );
}
