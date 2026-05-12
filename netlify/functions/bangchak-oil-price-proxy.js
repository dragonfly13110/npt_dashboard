const SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const COMMON_OIL_ORDER = [
  'ดีเซล B20',
  'ไฮดีเซล S',
  'แก๊สโซฮอล 95 S EVO',
  'แก๊สโซฮอล 91 S EVO',
  'แก๊สโซฮอล E20 S EVO',
  'แก๊สโซฮอล E85 S EVO',
];

function isPriceText(text = '') {
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
      if (!isValidOilName(name) || (!isPriceText(today) && !isPriceText(tomorrow))) return null;
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

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NPTDashboard/1.0)',
        Accept: 'application/json,text/plain,*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Bangchak page returned ${response.status}`);
    }

    const json = await response.json();
    const items = normalizeOilItems(json);

    if (!items.length) {
      throw new Error('No oil price rows found');
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'บริษัท บางจาก คอร์ปอเรชั่น จำกัด (มหาชน)',
      sourceUrl: SOURCE_URL,
      unit: 'บาท/ลิตร',
      items,
    }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Bangchak oil price proxy error',
      message: err.message,
      sourceUrl: SOURCE_URL,
    }), {
      status: 502,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }
};

export const config = {
  path: '/.netlify/functions/bangchak-oil-price-proxy',
};
