import { supabase } from '../../supabaseClient';

const DEFAULT_COORDS = { lat: 13.82, lon: 100.06 }; // Nakhon Pathom Center

// Helper to format Thai time
function getThaiTime(dateObj = new Date()) {
  return dateObj.toISOString();
}

// 1. Weather Summary
export async function getWeatherSummary() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_COORDS.lat}&longitude=${DEFAULT_COORDS.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();

    if (!data.current) throw new Error('No current weather data');

    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const humidity = data.current.relative_humidity_2m;

    // WMO weather code mapping
    const getWmoDesc = (wmoCode) => {
      const wmo = {
        0: 'แจ่มใส',
        1: 'ส่วนใหญ่แจ่มใส',
        2: 'มีเมฆบางส่วน',
        3: 'มีเมฆมาก',
        45: 'มีหมอก',
        48: 'หมอกลงจัด',
        51: 'ฝนปรอยบางเบา',
        53: 'ฝนปรอยปานกลาง',
        55: 'ฝนปรอยหนัก',
        61: 'ฝนตกเล็กน้อย',
        63: 'ฝนตกปานกลาง',
        65: 'ฝนตกหนัก',
        80: 'ฝนตกซู่เล็กน้อย',
        81: 'ฝนตกซู่ปานกลาง',
        82: 'ฝนตกซู่หนัก',
        95: 'ฝนฟ้าคะนอง',
      };
      return wmo[wmoCode] || 'แปรปรวน';
    };

    const status = temp >= 35 ? 'warning' : temp >= 38 ? 'danger' : 'success';
    const statusLabel = getWmoDesc(code);

    return {
      value: temp,
      unit: '°C',
      status,
      statusLabel,
      secondaryText: `ความชื้นสัมพัทธ์ ${humidity}%`,
      updatedAt: data.current.time,
      sourceLabel: 'Open-Meteo',
    };
  } catch (error) {
    console.error('Weather Summary Failed:', error);
    return {
      value: null,
      unit: '°C',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'Open-Meteo',
    };
  }
}

// 2. Air Quality Summary
export async function getAirQualitySummary() {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${DEFAULT_COORDS.lat}&longitude=${DEFAULT_COORDS.lon}&current=pm2_5,pm10,european_aqi&timezone=Asia%2FBangkok`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AQI API error: ${res.status}`);
    const data = await res.json();

    if (!data.current) throw new Error('No current AQI data');

    const pm25 = Math.round(data.current.pm2_5);
    let status = 'success';
    let statusLabel = 'ดีมาก';

    if (pm25 > 15 && pm25 <= 35) {
      status = 'normal';
      statusLabel = 'ปานกลาง';
    } else if (pm25 > 35 && pm25 <= 55) {
      status = 'warning';
      statusLabel = 'เริ่มมีผลกระทบ';
    } else if (pm25 > 55) {
      status = 'danger';
      statusLabel = 'มีผลกระทบ';
    }

    return {
      value: pm25,
      unit: 'มคก./ลบ.ม.',
      status,
      statusLabel,
      secondaryText: `PM10: ${Math.round(data.current.pm10)} | AQI: ${Math.round(data.current.european_aqi)}`,
      updatedAt: data.current.time,
      sourceLabel: 'Open-Meteo',
    };
  } catch (error) {
    console.error('Air Quality Summary Failed:', error);
    return {
      value: null,
      unit: 'มคก./ลบ.ม.',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'Open-Meteo',
    };
  }
}

// 3. Hotspot Summary (last 24 hours in Nakhon Pathom)
export async function getHotspotSummary() {
  try {
    const url = `/api/gistda/api/2.0/resources/features/viirs/24h?limit=1000&offset=0&ct_tn=${encodeURIComponent('ราชอาณาจักรไทย')}&pv_idn=73`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Hotspot API error: ${res.status}`);
    const json = await res.json();

    const items =
      json.features || json.data || (Array.isArray(json) ? json : []);
    const count = items.length;

    const status =
      count === 0
        ? 'success'
        : count < 3
          ? 'normal'
          : count < 10
            ? 'warning'
            : 'danger';
    const statusLabel = count === 0 ? 'ปกติ' : `พบจุดความร้อน ${count} จุด`;

    return {
      value: count,
      unit: 'จุด',
      status,
      statusLabel,
      secondaryText: 'ดาวเทียม VIIRS ระบบตรวจจับความร้อน',
      updatedAt: getThaiTime(),
      sourceLabel: 'GISTDA',
    };
  } catch (error) {
    console.error('Hotspot Summary Failed:', error);
    return {
      value: null,
      unit: 'จุด',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'GISTDA',
    };
  }
}

// 4. Disease/Pest Warning Summary
export async function getDiseaseForecastSummary() {
  try {
    const { data, error } = await supabase
      .from('ai_disease_forecasts')
      .select('*')
      .order('forecast_date', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error('No disease forecast data found');

    const forecast = data[0];
    const details = forecast.details || [];

    // Find highest risk level
    const hasHighRisk = details.some((d) => d.risk_level === 'สูง');
    const hasMedRisk = details.some((d) => d.risk_level === 'ปานกลาง');

    const status = hasHighRisk ? 'danger' : hasMedRisk ? 'warning' : 'success';
    const statusLabel = hasHighRisk
      ? 'เสี่ยงสูง'
      : hasMedRisk
        ? 'เฝ้าระวัง'
        : 'ปกติ';

    const firstDetail = details[0]
      ? `${details[0].name} (${details[0].risk_level})`
      : 'ไม่มีความเสี่ยงพืช';

    return {
      value: firstDetail,
      unit: '',
      status,
      statusLabel,
      secondaryText: `พืชเสี่ยงหลัก: ${details[0]?.target_crop || 'ข้าว'}`,
      updatedAt: forecast.forecast_date,
      sourceLabel: 'กรมส่งเสริมการเกษตร (AI)',
    };
  } catch (error) {
    console.error('Disease Forecast Summary Failed:', error);
    return {
      value: null,
      unit: '',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'กรมส่งเสริมการเกษตร (AI)',
    };
  }
}

// 5. Soil Moisture Estimate Summary
export async function getSoilMoistureSummary() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_COORDS.lat}&longitude=${DEFAULT_COORDS.lon}&hourly=soil_moisture_0_to_1cm&models=icon_seamless&timezone=Asia%2FBangkok&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Soil Moisture API error: ${res.status}`);
    const data = await res.json();

    if (!data.hourly || !data.hourly.soil_moisture_0_to_1cm) {
      throw new Error('No soil moisture hourly data');
    }

    // Get current hour index
    const now = new Date();
    const currentHour = now.getHours();
    const soilMoistureVal =
      data.hourly.soil_moisture_0_to_1cm[currentHour] ||
      data.hourly.soil_moisture_0_to_1cm[0];
    const percentage = Math.round(soilMoistureVal * 100);

    let status = 'normal';
    let statusLabel = 'ปานกลาง';
    if (soilMoistureVal <= 0.15) {
      status = 'danger';
      statusLabel = 'แห้งมาก';
    } else if (soilMoistureVal <= 0.22) {
      status = 'warning';
      statusLabel = 'แห้ง';
    } else if (soilMoistureVal <= 0.32) {
      status = 'success';
      statusLabel = 'เหมาะสม';
    }

    return {
      value: percentage,
      unit: '%',
      status,
      statusLabel,
      secondaryText: 'ค่าประมาณความชื้นดินจากแบบจำลองสภาพอากาศ',
      updatedAt: getThaiTime(),
      sourceLabel: 'Open-Meteo',
    };
  } catch (error) {
    console.error('Soil Moisture Summary Failed:', error);
    return {
      value: null,
      unit: '%',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'Open-Meteo',
    };
  }
}

// 6. Reservoir Water Summary
export async function getReservoirSummary() {
  try {
    const res = await fetch('https://app.rid.go.th/reservoir/api/dam/public');
    if (!res.ok) throw new Error(`RID API error: ${res.status}`);
    const json = await res.json();

    const allDams = json.date ? json.data.flatMap((region) => region.dam) : [];

    // Sum capacity and volume for Srinagarind (200401) and Vajiralongkorn (200402)
    const targetIds = ['200401', '200402'];
    const mainDams = allDams.filter((d) => targetIds.includes(d.id));

    const combinedCap = mainDams.reduce((s, d) => s + (d.capacity || 0), 0);
    const combinedVol = mainDams.reduce((s, d) => s + (d.volume || 0), 0);
    const combinedPct = combinedCap > 0 ? (combinedVol / combinedCap) * 100 : 0;

    let status = 'normal';
    let statusLabel = 'น้ำปานกลาง';
    if (combinedPct >= 80) {
      status = 'success';
      statusLabel = 'น้ำอุดมสมบูรณ์';
    } else if (combinedPct < 30) {
      status = 'danger';
      statusLabel = 'น้ำน้อยวิกฤต';
    } else if (combinedPct < 50) {
      status = 'warning';
      statusLabel = 'น้ำน้อย';
    }

    return {
      value: Math.round(combinedPct),
      unit: '%',
      status,
      statusLabel,
      secondaryText: 'น้ำใช้การได้ เขื่อนศรีนครินทร์ + วชิราลงกรณ',
      updatedAt: getThaiTime(),
      sourceLabel: 'กรมชลประทาน',
    };
  } catch (error) {
    console.error('Reservoir Summary Failed:', error);
    return {
      value: null,
      unit: '%',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'กรมชลประทาน',
    };
  }
}

// 7. Agricultural Prices Summary (Rice category 10)
export async function getAgriPriceSummary() {
  try {
    const res = await fetch('/.netlify/functions/moc-price-proxy?catid=10');
    if (!res.ok) throw new Error(`MOC proxy error: ${res.status}`);
    const json = await res.json();

    if (
      !json.success ||
      !Array.isArray(json.items) ||
      json.items.length === 0
    ) {
      throw new Error('No items in MOC price response');
    }

    // Find Jasmine Rice (ข้าวหอมมะลิ)
    const jasmineRice =
      json.items.find((item) => item.name.includes('ข้าวหอมมะลิ')) ||
      json.items[0];

    // Extract price number from price string (e.g. "14500.00" or "14,500 - 15,000")
    const priceRaw = jasmineRice.price_max || jasmineRice.price_min || '14500';
    const priceNum = parseFloat(String(priceRaw).replace(/,/g, ''));

    return {
      value: isNaN(priceNum) ? priceRaw : priceNum.toLocaleString('th-TH'),
      unit: 'บาท/ตัน',
      status: 'normal',
      statusLabel: jasmineRice.name,
      secondaryText: `ราคาขั้นต่ำ: ${jasmineRice.price_min} | ราคาแนะนำ`,
      updatedAt: json.dataDate || getThaiTime(),
      sourceLabel: 'กระทรวงพาณิชย์',
    };
  } catch (error) {
    console.error('Agri Price Summary Failed:', error);
    return {
      value: null,
      unit: 'บาท/ตัน',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'กระทรวงพาณิชย์',
    };
  }
}

// 8. Fuel Prices Summary
export async function getOilPriceSummary() {
  try {
    // 1. Try local proxy
    let localRes = await fetch('/api/bangchak-oil-price?source=api-v2');
    let json;

    if (
      localRes.ok &&
      localRes.headers.get('content-type')?.includes('application/json')
    ) {
      json = await localRes.json();
    } else {
      // 2. Try Netlify proxy
      const netlifyRes = await fetch(
        '/.netlify/functions/bangchak-oil-price-proxy?source=api-v2'
      );
      if (!netlifyRes.ok)
        throw new Error(`Oil API proxy error: ${netlifyRes.status}`);
      json = await netlifyRes.json();
    }

    if (
      !json.success ||
      !Array.isArray(json.items) ||
      json.items.length === 0
    ) {
      throw new Error('No items in oil price response');
    }

    // Find Diesel B7 (ดีเซล)
    const diesel =
      json.items.find(
        (item) =>
          item.name.toLowerCase().includes('ดีเซล') ||
          item.name.includes('Diesel')
      ) || json.items[0];
    const price = parseFloat(diesel.price);

    return {
      value: isNaN(price) ? diesel.price : price.toFixed(2),
      unit: 'บาท/ลิตร',
      status: 'normal',
      statusLabel: diesel.name,
      secondaryText: 'ราคาขายปลีก กรุงเทพมหานครและปริมณฑล',
      updatedAt: getThaiTime(),
      sourceLabel: 'บางจาก คอร์ปอเรชั่น',
    };
  } catch (error) {
    console.error('Oil Price Summary Failed:', error);
    return {
      value: null,
      unit: 'บาท/ลิตร',
      status: 'unavailable',
      statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
      secondaryText: '',
      updatedAt: null,
      sourceLabel: 'บางจาก คอร์ปอเรชั่น',
    };
  }
}

// 9. Province Overview stats
export async function getProvinceOverviewSummary() {
  try {
    const [
      { data: agriAreas, error: errAgri },
      { count: ceCount, error: errCe },
      { count: lpCount, error: errLp },
      { data: instData, error: errInst },
      { count: atCount, error: errAt },
    ] = await Promise.all([
      supabase
        .from('agricultural_areas')
        .select('total_area_rai, farmer_households')
        .neq('district', 'รวม'),
      supabase
        .from('community_enterprises')
        .select('*', { count: 'exact', head: true }),
      supabase.from('large_plots').select('*', { count: 'exact', head: true }),
      supabase.from('farmer_institutes').select('total_groups'),
      supabase.from('agri_tourism').select('*', { count: 'exact', head: true }),
    ]);

    if (errAgri) throw errAgri;
    if (errCe) throw errCe;
    if (errLp) throw errLp;
    if (errInst) throw errInst;
    if (errAt) throw errAt;

    // Calculate sums
    const totalArea = (agriAreas || []).reduce(
      (sum, item) => sum + (Number(item.total_area_rai) || 0),
      0
    );
    const households = (agriAreas || []).reduce(
      (sum, item) => sum + (Number(item.farmer_households) || 0),
      0
    );
    const instGroups = (instData || []).reduce(
      (sum, item) => sum + (Number(item.total_groups) || 0),
      0
    );

    return {
      agriArea: { value: totalArea, unit: 'ไร่' },
      farmerHouseholds: { value: households, unit: 'ราย' },
      largePlots: { value: lpCount || 0, unit: 'กลุ่ม' },
      communityEnterprises: { value: ceCount || 0, unit: 'แห่ง' },
      farmerInstitutes: { value: instGroups || 0, unit: 'แห่ง' },
      agriTourism: { value: atCount || 0, unit: 'แห่ง' },
      updatedAt: getThaiTime(),
    };
  } catch (error) {
    console.error('Province Overview Stats Summary Failed:', error);
    // Return empty defaults to avoid breaking the UI
    return {
      agriArea: { value: 0, unit: 'ไร่' },
      farmerHouseholds: { value: 0, unit: 'ราย' },
      largePlots: { value: 0, unit: 'กลุ่ม' },
      communityEnterprises: { value: 0, unit: 'แห่ง' },
      farmerInstitutes: { value: 0, unit: 'แห่ง' },
      agriTourism: { value: 0, unit: 'แห่ง' },
      updatedAt: null,
      error: error.message,
    };
  }
}
