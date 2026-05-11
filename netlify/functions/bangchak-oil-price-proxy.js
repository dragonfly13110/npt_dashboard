const SOURCE_URL = 'https://oil-price.bangchak.co.th/BcpOilPrice2/th';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function decodeHtml(text = '') {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(text = '') {
  return decodeHtml(text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '));
}

function extractRows(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripTags(cell[1])).filter(Boolean))
    .filter((cells) => cells.length >= 3);

  return rows
    .map((cells) => {
      const [name, today, tomorrow, diff] = cells;
      if (!name || /ชนิดน้ำมัน|oil type/i.test(name)) return null;
      if (!/\d/.test(today || '')) return null;
      return { name, today, tomorrow: tomorrow || '', diff: diff || '' };
    })
    .filter(Boolean);
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NPTDashboard/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Bangchak page returned ${response.status}`);
    }

    const html = await response.text();
    const items = extractRows(html);

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
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
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
