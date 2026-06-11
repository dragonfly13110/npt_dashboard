const MAPPING = {
  3: 'W13000', // ผัก
  4: 'W14000', // ผลไม้
  5: 'W15000', // ของแห้ง
  7: 'W16000', // พืชไร่
  10: 'R11000', // ข้าว
};

const CATEGORY_NAMES = {
  W13000: 'ผัก',
  W14000: 'ผลไม้-ค่าส่ง',
  W15000: 'เครื่องเทศ/ของแห้ง',
  W16000: 'พืชไร่-ธัญพืช',
  R11000: 'ข้าวสาร',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function fetchInBatches(tasks, batchSize, fn) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    const url = new URL(request.url);
    const requestedCatid = url.searchParams.get('catid') || '4';
    const groupId = MAPPING[requestedCatid] || 'W14000';

    // 1. Fetch products list in the category
    const prodUrl = `https://pricelist.dit.go.th/getdata.php?ID=${groupId}&TYPE=product`;
    const prodRes = await fetch(prodUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!prodRes.ok) {
      throw new Error(`getdata.php returned status ${prodRes.status}`);
    }

    const products = await prodRes.json();
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('No products found for this category');
    }

    // Limit to first 25 products to prevent Netlify function timeout
    const targetProducts = products.slice(0, 25);

    // Calculate date range BE (past 7 days)
    const today = new Date();
    const toDateBE = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() + 543}`;

    const fromDate = new Date();
    fromDate.setDate(today.getDate() - 7);
    const fromDateBE = `${String(fromDate.getDate()).padStart(2, '0')}/${String(fromDate.getMonth() + 1).padStart(2, '0')}/${fromDate.getFullYear() + 543}`;

    const items = await fetchInBatches(targetProducts, 8, async (p, idx) => {
      const pid = p.product_id;
      const pname = p.product_name;
      const priceUrl = 'https://pricelist.dit.go.th/main_price.php?seltime=day';

      const body = new URLSearchParams({
        day1: fromDateBE,
        day2: toDateBE,
        protype: '2', // Wholesale price
        progroup: groupId,
        proname: pid,
      });

      try {
        const res = await fetch(priceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://pricelist.dit.go.th/main_price.php',
          },
          body,
        });

        if (!res.ok) return null;

        const html = await res.text();

        // Parse averages: [timestamp, avg_price] (handling commas)
        const avgPoints = [];
        const avgRegex = /\[(\d{13}),\s*([\d,.]+)\]/g;
        let match;
        while ((match = avgRegex.exec(html)) !== null) {
          avgPoints.push({
            timestamp: parseInt(match[1]),
            avg: parseFloat(match[2].replace(/,/g, '')),
          });
        }

        if (avgPoints.length === 0) return null;

        // Parse ranges: [timestamp, min_price, max_price]
        const rangePoints = [];
        const rangeRegex = /\[(\d{13}),\s*([\d.]+),\s*([\d.]+)\]/g;
        while ((match = rangeRegex.exec(html)) !== null) {
          rangePoints.push({
            timestamp: parseInt(match[1]),
            min: parseFloat(match[2]),
            max: parseFloat(match[3]),
          });
        }

        // Parse unit from header e.g. บาท/กก. or บาท/100 ก.ก.
        const unitRegex = /บาท\/([^<\)\"\r\n]+)/;
        const unitMatch = html.match(unitRegex);
        let unit = 'กก.';
        if (unitMatch) {
          unit = unitMatch[1].trim().replace(/['\"]/g, '');
        }

        const lastPoint = avgPoints[avgPoints.length - 1];
        const lastDate = new Date(lastPoint.timestamp);
        const lastDateStr = lastDate.toISOString().slice(0, 10);
        const lastAvg = lastPoint.avg;

        const lastRange = rangePoints.find(
          (r) => r.timestamp === lastPoint.timestamp
        );
        const priceRange = lastRange
          ? `${lastRange.min} - ${lastRange.max}`
          : `${lastAvg}`;

        return {
          id: pid,
          no: idx + 1,
          product_name: pname,
          price_range: priceRange,
          day_price: lastAvg,
          avg_price: lastAvg.toString(),
          unit,
          data_date: lastDateStr,
          market_name: 'กรมการค้าภายใน',
          province: 'ส่วนกลาง',
          source: 'MOC',
        };
      } catch {
        return null;
      }
    });

    const validItems = items.filter(Boolean);

    // Format output payload according to the frontend requirements
    const payload = {
      success: true,
      source: 'กรมการค้าภายใน กระทรวงพาณิชย์',
      sourceUrl: `https://pricelist.dit.go.th/main_price.php?seltime=day`,
      category: CATEGORY_NAMES[groupId],
      categoryId: requestedCatid,
      dataDate: validItems[0]?.data_date || today.toISOString().slice(0, 10),
      caption: `ราคาผลผลิตทางการเกษตร หมวด ${CATEGORY_NAMES[groupId]}`,
      recordsTotal: validItems.length,
      items: validItems,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'MOC proxy error',
        message: err.message,
      }),
      {
        status: 502,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
};

export const config = {
  path: '/.netlify/functions/moc-price-proxy',
};
