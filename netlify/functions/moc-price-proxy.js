const MOC_BASE_URL = 'https://mex.moc.go.th';
const DEFAULT_TYPE = 'W';
const DEFAULT_CATEGORY_ID = '4';
const CATEGORIES = {
  3: 'ผัก',
  4: 'ผลไม้-ค่าส่ง',
  5: 'เครื่องเทศ/ของแห้ง',
  7: 'พืชไร่-ธัญพืช',
  10: 'ข้าวสาร',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function extractCurrentDate(html) {
  const match = html.match(/d\.date\s*=\s*'([^']+)'/);
  return match?.[1] || new Date().toISOString().slice(0, 10);
}

function extractCaption(html) {
  const match = html.match(/<caption>\s*([\s\S]*?)\s*<\/caption>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizePriceItem(item, dataDate) {
  return {
    id: item.DT_RowId,
    no: item.NO,
    product_name: item.NAME,
    price_range: item.PRICE,
    day_price: Number.parseFloat(item.AVG),
    avg_price: item.AVG,
    unit: item.UNIT,
    data_date: dataDate,
    market_name: 'กรมการค้าภายใน',
    province: 'ส่วนกลาง',
    source: 'MOC',
  };
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const type = DEFAULT_TYPE;
    const requestedCatid = url.searchParams.get('catid') || DEFAULT_CATEGORY_ID;
    const catid = CATEGORIES[requestedCatid] ? requestedCatid : DEFAULT_CATEGORY_ID;
    const pageUrl = `${MOC_BASE_URL}/page/dit/checkprice/type/${type}/catid/${catid}`;

    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NPTDashboard/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`MOC page returned ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();
    const dataDate = extractCurrentDate(pageHtml);
    const caption = extractCaption(pageHtml);

    const body = new URLSearchParams({
      catid,
      type,
      date: dataDate,
      draw: '1',
      start: '0',
      length: '100',
      'columns[0][data]': 'NO',
      'columns[1][data]': 'NAME',
      'columns[2][data]': 'PRICE',
      'columns[3][data]': 'AVG',
      'columns[4][data]': 'UNIT',
      'order[0][column]': '1',
      'order[0][dir]': 'asc',
      'search[value]': '',
    });

    const dataResponse = await fetch(`${MOC_BASE_URL}/page/dit/getcheckprice/type/${type}/catid/${catid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: pageUrl,
        'User-Agent': 'Mozilla/5.0 (compatible; NPTDashboard/1.0)',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      body,
    });

    if (!dataResponse.ok) {
      throw new Error(`MOC data returned ${dataResponse.status}`);
    }

    const json = await dataResponse.json();
    const items = Array.isArray(json.data) ? json.data.map((item) => normalizePriceItem(item, dataDate)) : [];

    return new Response(JSON.stringify({
      success: true,
      source: 'กรมการค้าภายใน กระทรวงพาณิชย์',
      sourceUrl: pageUrl,
      category: CATEGORIES[catid],
      categoryId: catid,
      dataDate,
      caption,
      recordsTotal: json.recordsTotal || items.length,
      items,
    }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'MOC proxy error',
      message: err.message,
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
  path: '/.netlify/functions/moc-price-proxy',
};
