import { useMemo } from 'react';
import { LineChartOutlined, LinkOutlined } from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';

const SOURCE_URL = 'https://mex.moc.go.th/page/dit/checkprice/type/W/catid/4';

async function fetchAgriPrices() {
  const res = await fetch('/.netlify/functions/moc-price-proxy');
  if (!res.ok) throw new Error(`MOC price proxy returned ${res.status}`);

  const json = await res.json();
  if (!json.success || !Array.isArray(json.items)) {
    throw new Error(json.message || 'MOC price proxy returned no data');
  }

  return json;
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

export default function AgriPricesWidget() {
  const { data, isLoading, error } = useApiCache(
    ['moc-agri-prices', 'fruit-wholesale'],
    fetchAgriPrices,
    { staleMinutes: 30, cacheMinutes: 120 }
  );

  const items = useMemo(() => data?.items?.slice(0, 24) || [], [data]);
  const dataDateText = formatThaiDate(data?.dataDate);

  return (
    <div className="widget-box price-widget slide-up-anim" style={{ animationDelay: '0.15s', justifyContent: 'flex-start' }}>
      <div className="widget-header" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div className="widget-icon bg-green-100 text-green-600"><LineChartOutlined /></div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ marginBottom: 2 }}>ราคาผลผลิตทางการเกษตร</h4>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              ผลไม้-ค่าส่ง • กรมการค้าภายใน
            </div>
          </div>
        </div>
        <a
          href={data?.sourceUrl || SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          title="เปิดแหล่งข้อมูล"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#047857',
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            flex: '0 0 auto',
          }}
        >
          <LinkOutlined />
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          color: '#065f46',
          background: '#d1fae5',
          border: '1px solid #a7f3d0',
        }}>
          {dataDateText ? `ข้อมูล ณ ${dataDateText}` : 'ข้อมูลล่าสุด'}
        </span>
        {!isLoading && (
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
            พบ {items.length.toLocaleString('th-TH')} รายการ
          </span>
        )}
      </div>

      <div className="price-history-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
        {isLoading ? (
          <div className="skeleton-pulse" style={{ height: 280, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="w-loader">กำลังโหลดราคาจากกระทรวงพาณิชย์...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '30px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>!</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, lineHeight: 1.6, maxWidth: '85%', margin: '0 auto' }}>
              ยังดึงข้อมูลราคาจากกระทรวงพาณิชย์ไม่ได้ในขณะนี้
            </div>
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div key={item.id || item.no} className="price-item" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 12, gap: 2 }}>
                <span style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 700 }} title={item.product_name}>
                  {item.product_name}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {item.market_name || 'กรมการค้าภายใน'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 105 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  {getPriceText(item)}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  {item.unit}{item.avg_price ? ` • เฉลี่ย ${item.avg_price}` : ''}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '30px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>?</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, lineHeight: 1.6, maxWidth: '85%', margin: '0 auto' }}>
              ไม่พบรายการราคาผลไม้-ค่าส่งจากกระทรวงพาณิชย์
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
