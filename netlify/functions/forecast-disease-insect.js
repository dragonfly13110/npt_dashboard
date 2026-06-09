import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const KKU_API_KEY =
  process.env.VITE_LANDING_CHATBOT_API_KEY ||
  process.env.LANDING_CHATBOT_API_KEY;
const KKU_API_BASE =
  process.env.VITE_LANDING_CHATBOT_API_URL ||
  'https://gen.ai.kku.ac.th/okmd/api/v1';
const KKU_FORECAST_MODEL = process.env.FORECAST_KKU_MODEL || 'gemini-3.5-flash';
const WEATHER_TIMEOUT_MS = 8000;
const GEMINI_TIMEOUT_MS = 30000;
const KKU_TIMEOUT_MS = 45000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// Fallback removed - we now retry and fail cleanly
async function callKkuForecast(prompt) {
  if (!KKU_API_KEY) {
    throw new Error('KKU API key is not configured.');
  }

  const response = await fetchWithTimeout(
    `${KKU_API_BASE.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KKU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: KKU_FORECAST_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert crop disease and pest forecast analyst for Nakhon Pathom. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    },
    KKU_TIMEOUT_MS
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `KKU ${KKU_FORECAST_MODEL} Error (status ${response.status}): ${errText}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseForecastJson(generatedText) {
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

// Main forecast logic
const generateForecast = async (event = {}) => {
  console.log('Starting Daily Crop Disease & Pest Risk AI Forecast...');

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
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

    // Support manual date override for backfilling/testing (e.g. ?date=2026-06-05 or {"date": "2026-06-05"})
    if (
      event &&
      event.queryStringParameters &&
      event.queryStringParameters.date
    ) {
      bangkokDateStr = event.queryStringParameters.date;
    } else if (event && event.body) {
      try {
        const body =
          typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        if (body && body.date) {
          bangkokDateStr = body.date;
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    // 0. Check if forecast for this date already exists (to prevent redundant API calls during cron retries)
    const isManualTrigger =
      (event && event.httpMethod === 'POST') ||
      (event &&
        event.queryStringParameters &&
        event.queryStringParameters.force === 'true');

    if (!isManualTrigger) {
      const { data: existing, error: checkError } = await supabase
        .from('ai_disease_forecasts')
        .select('forecast_date')
        .eq('forecast_date', bangkokDateStr)
        .maybeSingle();

      if (!checkError && existing) {
        console.log(
          `Forecast for ${bangkokDateStr} already exists. Skipping generation.`
        );
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            message: `Forecast for ${bangkokDateStr} already exists. Skipped.`,
          }),
        };
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

    // 4. Set up Gemini API request and retry loop
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in env variables.');
    }

    const model = 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const basePrompt = `คุณคือผู้เชี่ยวชาญด้านโรคพืชและแมลงศัตรูพืชในเขตจังหวัดนครปฐม ประเทศไทย (พืชหลัก: ข้าว, อ้อย, มันสำปะหลัง, กล้วยไม้, มะพร้าวน้ำหอม, พืชผัก)
วิเคราะห์สถานการณ์และพยากรณ์ความเสี่ยงโรคพืชและแมลงศัตรูพืชที่มีโอกาสระบาด "ล่วงหน้า 7 วัน" ในจังหวัดนครปฐม นับตั้งแต่วันที่ ${bangkokDateStr} เป็นต้นไป

โดยใช้ข้อมูลสนับสนุนด้านล่างนี้:
1. ข้อมูลสภาพอากาศย้อนหลัง 14 วันล่าสุดในนครปฐม:
${weatherSummary}

2. ข้อมูลพยากรณ์สภาพอากาศล่วงหน้า 7 วันในนครปฐม:
${weatherForecastSummary}

3. ข้อมูลรายงานการระบาดของโรค/แมลง ล่าสุดในพื้นที่:
${outbreakSummary}`;

    const groundingInstruction = `

4. ทำการค้นหาข้อมูลทางอินเทอร์เน็ตเพิ่มเติม (Google Search Grounding) เกี่ยวกับ "คำเตือนระบาดโรคพืชและแมลงศัตรูพืช กรมส่งเสริมการเกษตร หรือ กรมวิชาการเกษตร ช่วงเดือน/ปีนี้ ในภาคกลางและจังหวัดนครปฐม"`;

    const responseFormatInstruction = `

วิเคราะห์และตอบกลับในรูปแบบ JSON วัตถุที่มีโครงสร้างต่อไปนี้อย่างเคร่งครัด (ตอบเป็นภาษาไทยทั้งหมด):
{
  "summary": "บทสรุปคาดการณ์ภาพรวมสถานการณ์และเตือนภัยโรค/แมลงศัตรูพืชล่วงหน้า 7 วัน (ความยาว 3-4 ประโยคกระชับ เข้าใจง่าย อ้างอิงอากาศย้อนหลังและล่วงหน้า)",
  "details": [
    {
      "name": "ชื่อโรคพืชหรือแมลงศัตรูพืช (เช่น เพลี้ยกระโดดสีน้ำตาล, โรคใบด่างมันสำปะหลัง, หนอนหัวดำมะพร้าว)",
      "type": "ประเภท (เลือกระหว่าง: 'โรคพืช' หรือ 'แมลงศัตรูพืช')",
      "target_crop": "พืชเจ้าบ้านที่ได้รับผลกระทบ (เช่น ข้าว, มะพร้าว, อ้อย, มันสำปะหลัง)",
      "risk_level": "ระดับความเสี่ยง (เลือกระหว่าง: 'สูง' หรือ 'ปานกลาง' หรือ 'ต่ำ')",
      "description": "อธิบายสาเหตุความเสี่ยงล่วงหน้า 7 วัน โดยวิเคราะห์ทิศทางความชื้น/ฝน/ความร้อนจากอากาศที่ผ่านมาและอากาศล่วงหน้า 7 วัน และข้อมูลเตือนภัย",
      "prevention": "ข้อแนะนำในการเฝ้าระวัง ป้องกัน หรือการดูแลรักษาล่วงหน้า (สำหรับเกษตรกรและเจ้าหน้าที่)"
    }
  ]
}`;

    const maxRetries = 3;
    let resultJson = null;
    let aiFailureReason = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Forecast generation attempt ${attempt} of ${maxRetries}...`);
      try {
        let generatedText = '';
        let isGroundingSuccess = false;

        // 1. Try with Google Search Grounding
        try {
          console.log(
            `[Attempt ${attempt}] Attempting forecast generation with Google Search Grounding...`
          );
          const prompt = `${basePrompt}${groundingInstruction}${responseFormatInstruction}`;
          const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.2 },
          };

          const response = await fetchWithTimeout(
            url,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            },
            GEMINI_TIMEOUT_MS
          );

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(
              `Gemini API Error (status ${response.status}): ${errText}`
            );
          }

          const data = await response.json();
          generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            isGroundingSuccess = true;
            console.log(
              `[Attempt ${attempt}] Successfully generated forecast using Google Search Grounding.`
            );
          }
        } catch (groundingErr) {
          console.warn(
            `[Attempt ${attempt}] Google Search Grounding failed:`,
            groundingErr.message
          );
          aiFailureReason = groundingErr.message;
        }

        // 2. Fallback to standard model without Search Grounding
        if (!isGroundingSuccess) {
          console.log(
            `[Attempt ${attempt}] Falling back to standard model without Search Grounding...`
          );
          const prompt = `${basePrompt}${responseFormatInstruction}`;
          const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          };

          const response = await fetchWithTimeout(
            url,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            },
            GEMINI_TIMEOUT_MS
          );

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(
              `Gemini API Fallback Error (status ${response.status}): ${errText}`
            );
          }

          const data = await response.json();
          generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        resultJson = parseForecastJson(generatedText);
        console.log(
          `[Attempt ${attempt}] Successfully generated and parsed forecast.`
        );
        break; // Break the retry loop on success
      } catch (err) {
        console.error(`[Attempt ${attempt}] Failed:`, err.message);
        aiFailureReason = err.message;

        if (attempt < maxRetries) {
          const delayMs = 2000 * attempt; // 2s, 4s delay
          console.log(`Waiting ${delayMs}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!resultJson) {
      console.log(
        `Google Gemini forecast failed after ${maxRetries} attempts. Trying KKU ${KKU_FORECAST_MODEL} fallback...`
      );
      try {
        const prompt = `${basePrompt}${responseFormatInstruction}`;
        const generatedText = await callKkuForecast(prompt);
        resultJson = parseForecastJson(generatedText);
        console.log(
          `Successfully generated forecast using KKU ${KKU_FORECAST_MODEL}.`
        );
      } catch (kkuErr) {
        throw new Error(
          `Failed to generate forecast after Google and KKU attempts. Google last error: ${aiFailureReason}. KKU error: ${kkuErr.message}`
        );
      }
    }

    // 5. Store/Upsert in Supabase
    const { error: insertErr } = await supabase
      .from('ai_disease_forecasts')
      .upsert(
        {
          forecast_date: bangkokDateStr,
          summary: resultJson.summary,
          details: resultJson.details,
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
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: `Forecast generated and saved successfully for ${bangkokDateStr}`,
        data: resultJson,
      }),
    };
  } catch (err) {
    console.error('Forecast generation error:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

const forecastHandler = async (event = {}) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  // Support scheduled trigger or direct endpoint request
  return generateForecast(event);
};

export const handler = forecastHandler;
