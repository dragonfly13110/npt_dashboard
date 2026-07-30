import { createClient } from '@supabase/supabase-js';
import { reportCriticalError } from './lib/error-alert.js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const KKU_API_KEY =
  process.env.LANDING_CHATBOT_API_KEY ||
  process.env.VITE_LANDING_CHATBOT_API_KEY;
const CONFIGURED_KKU_API_URL =
  process.env.VITE_LANDING_CHATBOT_API_URL ||
  'https://gen.ai.kku.ac.th/okmd/api/v1';
const KKU_API_URL = CONFIGURED_KKU_API_URL.startsWith('/api/kku/')
  ? `https://gen.ai.kku.ac.th/${CONFIGURED_KKU_API_URL.replace(/^\/api\/kku\//, '')}`
  : CONFIGURED_KKU_API_URL;
const KKU_MODEL = process.env.FORECAST_KKU_MODEL || 'gemini-3.5-flash';
const WEATHER_TIMEOUT_MS = 8000;
const KKU_TIMEOUT_MS = 120000;

const getResponseHeaders = (origin = '') => ({
  ...corsHeaders(origin, { methods: 'GET, POST, OPTIONS' }),
  'Content-Type': 'application/json',
});

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export function parseKkuSse(streamText) {
  let text = '';
  let finishReason = '';
  let remainingTokens = null;

  for (const match of streamText.matchAll(/^data:\s*(.+)$/gm)) {
    const data = match[1].trim();
    if (data === '[DONE]') continue;
    const chunk = JSON.parse(data);
    text += chunk.choices?.[0]?.delta?.content || '';
    finishReason = chunk.choices?.[0]?.finish_reason || finishReason;
    remainingTokens =
      chunk.model_quota?.daily_remaining_tokens ?? remainingTokens;
  }

  return { text, finishReason, remainingTokens };
}

export function extractKkuGrounding(result) {
  const sources = (Array.isArray(result?.sources) ? result.sources : [])
    .filter((source) => {
      try {
        return ['http:', 'https:'].includes(new URL(source?.url).protocol);
      } catch {
        return false;
      }
    })
    .map((source) => ({
      title: source.title || source.url,
      url: source.url,
      cited_texts: Array.isArray(source.cited_texts)
        ? source.cited_texts.filter(Boolean)
        : [],
    }));

  return {
    sources: [
      ...sources
        .reduce((unique, source) => {
          const existing = unique.get(source.url);
          unique.set(
            source.url,
            existing
              ? {
                  ...existing,
                  cited_texts: [
                    ...new Set([
                      ...existing.cited_texts,
                      ...source.cited_texts,
                    ]),
                  ],
                }
              : source
          );
          return unique;
        }, new Map())
        .values(),
    ],
    searchQueries: Array.isArray(result?.search_queries)
      ? result.search_queries.filter(Boolean)
      : [],
  };
}

export function parseForecastJson(generatedText) {
  if (!generatedText) {
    throw new Error('AI returned empty response.');
  }

  let jsonText = generatedText.trim();
  const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = jsonText.match(jsonRegex);
  if (match) {
    jsonText = match[1];
  }

  const parsed = JSON.parse(jsonText.trim());
  if (!parsed?.summary || !Array.isArray(parsed.details)) {
    throw new Error('Parsed JSON is missing summary or details array.');
  }
  return parsed;
}

function isUsableForecast(row) {
  return (
    row &&
    typeof row.summary === 'string' &&
    row.summary.trim() &&
    !row.summary.startsWith('Pending AI analysis') &&
    Array.isArray(row.details)
  );
}

// Main forecast logic
export const generateForecast = async (event = {}, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const responseHeaders = getResponseHeaders(origin);
  console.log('Starting Daily Crop Disease & Pest Risk AI Forecast...');

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({
          error:
            'Missing Supabase configuration. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const now = new Date();
    let bangkokDateStr = now.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Bangkok',
    });
    let parsedBody = {};

    // Support manual date override for backfilling/testing (e.g. ?date=2026-06-05 or {"date": "2026-06-05"})
    if (
      event &&
      event.queryStringParameters &&
      event.queryStringParameters.date
    ) {
      bangkokDateStr = event.queryStringParameters.date;
    } else if (event && event.body) {
      try {
        parsedBody =
          typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        if (parsedBody && parsedBody.date) {
          bangkokDateStr = parsedBody.date;
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    // 0. Check if forecast for this date already exists (to prevent redundant API calls during cron retries)
    const isForceTrigger =
      (event &&
        event.queryStringParameters &&
        event.queryStringParameters.force === 'true') ||
      parsedBody?.force === true;

    if (!isForceTrigger) {
      const { data: existing, error: checkError } = await supabase
        .from('ai_disease_forecasts')
        .select('forecast_date, summary, details')
        .eq('forecast_date', bangkokDateStr)
        .maybeSingle();

      if (!checkError && isUsableForecast(existing)) {
        console.log(
          `Forecast for ${bangkokDateStr} already exists. Skipping generation.`
        );
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: JSON.stringify({
            message: `มีข้อมูลพยากรณ์วันที่ ${bangkokDateStr} อยู่แล้ว`,
            data: existing,
          }),
        };
      }

      if (!checkError && existing) {
        console.log(
          `Forecast for ${bangkokDateStr} exists but is incomplete. Regenerating.`
        );
      }
    }

    // 1. Fetch recent weather (14 days)
    const { data: weatherData, error: weatherErr } = await supabase
      .from('daily_weather')
      .select('date, tavg, tmin, tmax, prcp, wspd')
      .order('date', { ascending: false })
      .limit(14);

    if (weatherErr) {
      console.error('Error fetching weather data:', weatherErr.message);
    }

    // 2. Fetch 7-day upcoming weather forecast from Open-Meteo
    let weatherForecastSummary = '';
    try {
      const forecastUrl =
        'https://api.open-meteo.com/v1/forecast?latitude=13.8196&longitude=100.0602&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,wind_speed_10m_max&timezone=Asia%2FBangkok&forecast_days=7';
      const forecastRes = await fetchWithTimeout(
        forecastUrl,
        {},
        WEATHER_TIMEOUT_MS
      );
      if (forecastRes.ok) {
        const forecastData = await forecastRes.json();
        const daily = forecastData.daily || {};
        const times = daily.time || [];
        const temps = daily.temperature_2m_mean || [];
        const rain = daily.rain_sum || [];
        weatherForecastSummary = times
          .map(
            (t, i) => `Date: ${t}, Avg Temp: ${temps[i]}°C, Rain: ${rain[i]}mm`
          )
          .join('\n');
      } else {
        weatherForecastSummary = 'Unavailable';
      }
    } catch (fErr) {
      console.error('Error fetching upcoming weather forecast:', fErr.message);
      weatherForecastSummary = 'Unavailable';
    }

    // 3. Fetch recent pest outbreaks
    const { data: outbreakData, error: outbreakErr } = await supabase
      .from('pest_outbreaks')
      .select('pest_name, affected_crop, district, severity, report_date')
      .order('report_date', { ascending: false })
      .limit(30);

    if (outbreakErr) {
      console.error('Error fetching outbreak data:', outbreakErr.message);
    }

    // 4. Summarize weather and outbreaks for the AI prompt
    const weatherSummary =
      weatherData && weatherData.length > 0
        ? weatherData
            .map(
              (w) =>
                `Date: ${w.date}, Avg Temp: ${w.tavg}°C, Min: ${w.tmin}°C, Max: ${w.tmax}°C, Rain: ${w.prcp}mm, Wind: ${w.wspd}km/h`
            )
            .join('\n')
        : 'No weather records found for the past 14 days.';

    const outbreakSummary =
      outbreakData && outbreakData.length > 0
        ? outbreakData
            .map(
              (o) =>
                `Crop: ${o.affected_crop}, Pest/Disease: ${o.pest_name}, District: ${o.district}, Severity: ${o.severity}, Date: ${o.report_date}`
            )
            .join('\n')
        : 'No recent pest outbreaks reported.';

    // 4. Generate a grounded, evidence-rich forecast.
    if (!KKU_API_KEY) {
      throw new Error('LANDING_CHATBOT_API_KEY is not configured.');
    }

    const prompt = `คุณคือผู้เชี่ยวชาญโรคพืชและแมลงศัตรูพืชของจังหวัดนครปฐม ประเทศไทย
พยากรณ์ความเสี่ยงล่วงหน้า 7 วัน เริ่ม ${bangkokDateStr}

พืชสำคัญที่ต้องพิจารณาเป็นพิเศษ: ข้าว, ส้มโอ, มะพร้าว, ฝรั่ง, กล้วยไม้, สมุนไพร, พืชผัก
รายการนี้เป็นขอบเขตเฝ้าระวัง ไม่ใช่รายการบังคับ ห้ามสร้างความเสี่ยงเพื่อให้ครบทุกพืช ให้ใส่เฉพาะภัยที่มีหลักฐานสนับสนุนและควรลงมือเฝ้าระวังจริง หากไม่พบความเสี่ยงสำคัญให้ details เป็น []

ข้อมูลอากาศย้อนหลัง 14 วัน:
${weatherSummary}

พยากรณ์อากาศล่วงหน้า 7 วัน:
${weatherForecastSummary}

รายงานการระบาดล่าสุดในระบบ:
${outbreakSummary}

ใช้ Google Search ค้นหลายคำค้นเพื่อยืนยันข้อมูลล่าสุด โดยให้ความสำคัญกับกรมส่งเสริมการเกษตร กรมวิชาการเกษตร กรมอุตุนิยมวิทยา หน่วยงานรัฐ มหาวิทยาลัย และแหล่งอารักขาพืชที่ตรวจสอบได้ ค้นทั้งคำเตือนช่วงเดือน/ปีปัจจุบัน เงื่อนไขอากาศที่เอื้อต่อภัย อาการจำแนก และแนวทาง IPM

หลักการวิเคราะห์:
- เชื่อมโยงหลักฐาน 4 ส่วน: อากาศย้อนหลัง, อากาศล่วงหน้า, รายงานพื้นที่, ผลค้นเว็บ
- แยกข้อเท็จจริงออกจากข้ออนุมาน และระบุ confidence ตามความแข็งแรงของหลักฐาน
- ไม่อ้างว่าพบการระบาดในนครปฐมหากแหล่งข้อมูลไม่ได้ระบุจริง
- ไม่แนะนำชื่อสาร อัตราใช้ หรือช่วงเว้นเก็บเกี่ยวจากการคาดเดา หากกล่าวถึงสารเคมีให้เตือนว่าต้องตรวจทะเบียนและฉลากปัจจุบันก่อนใช้
- ให้รายละเอียดมากพอที่เจ้าหน้าที่ใช้ตรวจแปลงและตัดสินใจได้

ตอบเป็น JSON ภาษาไทยเท่านั้น ห้ามมี Markdown:
{
  "summary": "สรุปภาพรวม 5-8 ประโยค พร้อมเหตุผลหลัก ช่วงเวลาที่ควรเฝ้าระวัง และสิ่งที่ควรทำก่อน",
  "details": [
    {
      "disease_id": "เลือกหนึ่งค่า: rice-blast, pomelo-canker, coconut-bud-rot, guava-anthracnose-fruit-rot, orchid-black-rot, herb-root-collar-rot, vegetable-soft-rot, other",
      "name": "ชื่อภัย",
      "type": "โรคพืช หรือ แมลงศัตรูพืช",
      "target_crop": "หนึ่งในพืชสำคัญ 7 กลุ่ม",
      "risk_level": "สูง หรือ ปานกลาง หรือ ต่ำ",
      "confidence": "สูง หรือ ปานกลาง หรือ ต่ำ",
      "description": "บทวิเคราะห์ละเอียดว่าทำไมจึงเสี่ยงใน 7 วันนี้ โดยชี้ว่าข้อใดเป็นข้อมูลและข้อใดเป็นการอนุมาน",
      "evidence": [
        {
          "factor": "อากาศย้อนหลัง/อากาศล่วงหน้า/รายงานพื้นที่/ข้อมูลเว็บ",
          "observation": "ข้อมูลที่พบพร้อมวันที่หรือพื้นที่เมื่อมี",
          "implication": "ความหมายต่อความเสี่ยง"
        }
      ],
      "symptoms_to_watch": ["อาการสำคัญที่ใช้ตรวจแยกในแปลง"],
      "monitoring_actions": ["วิธีตรวจแปลง ช่วงเวลา และจุดที่ต้องดู"],
      "ipm_actions": ["การจัดการแบบผสมผสาน เรียงจากวิธีที่เสี่ยงต่ำก่อน"],
      "prevention": "สรุปสิ่งที่เกษตรกรและเจ้าหน้าที่ควรทำทันที"
    }
  ],
  "sources": [
    {
      "title": "ชื่อหน้าเว็บหรือหน่วยงาน",
      "url": "URL ที่ได้จากผลค้นเว็บจริงเท่านั้น",
      "cited_texts": ["ข้อเท็จจริงที่นำมาใช้วิเคราะห์จากแหล่งนี้"]
    }
  ],
  "search_queries": ["คำค้นที่ใช้จริง"]
}`;

    const maxRetries = 2;
    let resultJson = null;
    let grounding = null;
    let aiFailureReason = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Grounded KKU forecast attempt ${attempt} of ${maxRetries}...`
        );
        const response = await fetchWithTimeout(
          `${KKU_API_URL.replace(/\/$/, '')}/chat/completions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${KKU_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: KKU_MODEL,
              messages: [{ role: 'user', content: prompt }],
              tools: [{ type: 'web_search' }],
              temperature: 0.2,
              max_tokens: 24000,
              stream: true,
            }),
          },
          KKU_TIMEOUT_MS
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `KKU API Error (status ${response.status}): ${errText}`
          );
        }

        const stream = parseKkuSse(await response.text());
        if (stream.finishReason === 'error') {
          throw new Error('KKU returned finish_reason=error.');
        }
        if (stream.finishReason === 'length') {
          throw new Error('KKU response exceeded max_tokens.');
        }
        resultJson = parseForecastJson(stream.text);
        grounding = extractKkuGrounding(resultJson);
        if (!grounding.sources.length) {
          throw new Error('KKU returned no web search citations.');
        }
        console.log('KKU forecast completed.', {
          remainingTokens: stream.remainingTokens,
          sources: grounding.sources.length,
        });
        break;
      } catch (err) {
        aiFailureReason = err.message;
        console.error(`[Attempt ${attempt}] Failed:`, err.message);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    if (!resultJson) {
      throw new Error(
        `Grounded KKU forecast failed after ${maxRetries} attempts: ${aiFailureReason}`
      );
    }

    // 5. Store/Upsert in Supabase
    const { error: insertErr } = await supabase
      .from('ai_disease_forecasts')
      .upsert(
        {
          forecast_date: bangkokDateStr,
          summary: resultJson.summary,
          details: resultJson.details,
          sources: grounding.sources,
          search_queries: grounding.searchQueries,
          model: KKU_MODEL,
          generation_mode: 'kku_web_search_grounded',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'forecast_date' }
      );

    if (insertErr) {
      throw insertErr;
    }

    console.log(
      `Successfully generated and saved AI disease forecast for ${bangkokDateStr}`
    );

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        message: `Forecast generated and saved successfully for ${bangkokDateStr}`,
        data: {
          ...resultJson,
          sources: grounding.sources,
          search_queries: grounding.searchQueries,
          model: KKU_MODEL,
          generation_mode: 'kku_web_search_grounded',
        },
      }),
    };
  } catch (err) {
    console.error('Forecast generation error:', err.message);
    const alert = reportCriticalError({
      functionName: 'forecast-disease-insect',
      event: 'forecast_generation_failed',
      requestId:
        context?.requestId || event?.requestContext?.requestId || 'scheduled',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Forecast generation failed' }),
    };
  }
};

const forecastHandler = async (event = {}, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const responseHeaders = getResponseHeaders(origin);
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: responseHeaders, body: '' };
  if (!isOriginAllowed(origin)) {
    return {
      statusCode: 403,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }

  // Support scheduled trigger or direct endpoint request
  return generateForecast(event, context);
};

export const handler = forecastHandler;
