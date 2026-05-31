import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

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

const createFallbackForecast = (bangkokDateStr, weatherForecastSummary, weatherSummary, outbreakSummary, reason) => ({
    summary: `ระบบ AI ภายนอกยังไม่ตอบสนองตามเวลาที่กำหนด จึงสร้างคำเตือนเบื้องต้นจากข้อมูลอากาศและประวัติการระบาดที่มีในระบบ ณ วันที่ ${bangkokDateStr} แนะนำให้เฝ้าระวังโรคพืชที่สัมพันธ์กับความชื้น ฝน และอุณหภูมิในช่วง 7 วันข้างหน้า พร้อมตรวจแปลงจริงก่อนตัดสินใจใช้มาตรการควบคุม รายการนี้เป็น fallback อัตโนมัติเนื่องจาก: ${reason}`,
    details: [
        {
            name: 'โรคพืชที่สัมพันธ์กับฝนและความชื้น',
            type: 'โรคพืช',
            target_crop: 'ข้าว, กล้วยไม้, ไม้ผล, พืชผัก',
            risk_level: 'ปานกลาง',
            description: `ประเมินจากข้อมูลอากาศย้อนหลังและพยากรณ์ล่วงหน้าในระบบ หากมีฝนต่อเนื่อง ความชื้นสูง หรืออุณหภูมิเหมาะสม ให้เพิ่มความถี่การสำรวจแปลง\n\nข้อมูลย้อนหลัง:\n${weatherSummary}\n\nพยากรณ์ล่วงหน้า:\n${weatherForecastSummary}`,
            prevention: 'สำรวจแปลงช่วงเช้าและเย็น ลดความชื้นสะสมในทรงพุ่ม/แปลงปลูก กำจัดส่วนพืชเป็นโรค และใช้สารหรือชีวภัณฑ์ตามคำแนะนำทางวิชาการเมื่อพบอาการเริ่มต้น'
        },
        {
            name: 'แมลงศัตรูพืชที่เพิ่มจำนวนหลังฝน',
            type: 'แมลงศัตรูพืช',
            target_crop: 'ข้าว, อ้อย, มันสำปะหลัง, พืชผัก',
            risk_level: 'ปานกลาง',
            description: `หลังฝนหรืออากาศแปรปรวน แมลงบางชนิดอาจเพิ่มจำนวนเร็ว ควรตรวจจุดเสี่ยงและแปลงที่เคยมีประวัติระบาด\n\nประวัติระบาดล่าสุด:\n${outbreakSummary}`,
            prevention: 'ติดตามกับดักและสำรวจใบ/ยอด/โคนต้นอย่างสม่ำเสมอ ใช้วิธีเขตกรรม ชีววิธี และสารป้องกันกำจัดตามระดับความเสียหายทางเศรษฐกิจ'
        }
    ]
});

// Main forecast logic
const generateForecast = async () => {
    console.log('Starting Daily Crop Disease & Pest Risk AI Forecast...');

    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return {
                statusCode: 500,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Missing Supabase configuration. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' })
            };
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const now = new Date();
        const bangkokDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

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
            const forecastUrl = 'https://api.open-meteo.com/v1/forecast?latitude=13.8196&longitude=100.0602&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,wind_speed_10m_max&timezone=Asia%2FBangkok&forecast_days=7';
            const forecastRes = await fetchWithTimeout(forecastUrl, {}, 8000);
            if (forecastRes.ok) {
                const forecastData = await forecastRes.json();
                const daily = forecastData.daily || {};
                const times = daily.time || [];
                const temps = daily.temperature_2m_mean || [];
                const rain = daily.rain_sum || [];
                weatherForecastSummary = times.map((t, i) => `Date: ${t}, Avg Temp: ${temps[i]}°C, Rain: ${rain[i]}mm`).join('\n');
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
        const weatherSummary = weatherData && weatherData.length > 0 
            ? weatherData.map(w => `Date: ${w.date}, Avg Temp: ${w.tavg}°C, Min: ${w.tmin}°C, Max: ${w.tmax}°C, Rain: ${w.prcp}mm, Wind: ${w.wspd}km/h`).join('\n')
            : 'No weather records found for the past 14 days.';

        const outbreakSummary = outbreakData && outbreakData.length > 0
            ? outbreakData.map(o => `Crop: ${o.affected_crop}, Pest/Disease: ${o.pest_name}, District: ${o.district}, Severity: ${o.severity}, Date: ${o.report_date}`).join('\n')
            : 'No recent pest outbreaks reported.';;

        // 4. Set up Gemini API request
        let aiFailureReason = '';

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

        let generatedText = '';
        let isGroundingSuccess = false;

        // Try generating with search grounding first
        if (GEMINI_API_KEY) {
            try {
                console.log('Attempting forecast generation with Google Search Grounding...');
                const prompt = `${basePrompt}${groundingInstruction}${responseFormatInstruction}`;
                const requestBody = {
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    tools: [
                        {
                            google_search: {}
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2
                    }
                };

                const response = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                }, 12000);

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Gemini API Error (status ${response.status}): ${errText}`);
                }

                const data = await response.json();
                generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (generatedText) {
                    isGroundingSuccess = true;
                    console.log('Successfully generated forecast using Google Search Grounding.');
                }
            } catch (groundingErr) {
                console.warn('Forecast generation with Google Search Grounding failed:', groundingErr.message);
                aiFailureReason = groundingErr.message;
                console.log('Falling back to standard forecast generation without Search Grounding...');
            }
        } else {
            aiFailureReason = 'GEMINI_API_KEY is not configured in env variables.';
        }

        // If search grounding failed or returned empty, call standard model
        if (!isGroundingSuccess && GEMINI_API_KEY) {
            const prompt = `${basePrompt}${responseFormatInstruction}`;
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2
                }
            };

            try {
                const response = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                }, 12000);

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Gemini API Fallback Error (status ${response.status}): ${errText}`);
                }

                const data = await response.json();
                generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            } catch (fallbackErr) {
                console.warn('Standard forecast generation failed:', fallbackErr.message);
                aiFailureReason = fallbackErr.message;
            }
        }

        // Parse and validate the response JSON
        let resultJson;
        if (generatedText) {
            try {
                let jsonText = generatedText.trim();
                // Match ```json ... ``` or ``` ... ```
                const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = jsonText.match(jsonRegex);
                if (match) {
                    jsonText = match[1];
                }
                resultJson = JSON.parse(jsonText.trim());
            } catch (parseErr) {
                console.error('Failed to parse JSON from model:', generatedText);
                aiFailureReason = `Invalid JSON format from AI: ${parseErr.message}`;
            }
        }

        if (!resultJson?.summary || !Array.isArray(resultJson.details)) {
            resultJson = createFallbackForecast(
                bangkokDateStr,
                weatherForecastSummary,
                weatherSummary,
                outbreakSummary,
                aiFailureReason || 'GEMINI_API_KEY is not configured or Gemini returned empty response'
            );
        }

        // 5. Store/Upsert in Supabase
        const { error: insertErr } = await supabase
            .from('ai_disease_forecasts')
            .upsert({
                forecast_date: bangkokDateStr,
                summary: resultJson.summary,
                details: resultJson.details,
                updated_at: new Date().toISOString()
            }, { onConflict: 'forecast_date' });

        if (insertErr) {
            throw insertErr;
        }

        console.log(`Successfully generated and saved AI disease forecast for ${bangkokDateStr}`);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: `Forecast generated and saved successfully for ${bangkokDateStr}`,
                data: resultJson
            })
        };

    } catch (err) {
        console.error('Forecast generation error:', err.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: err.message })
        };
    }
};

const forecastHandler = async (event = {}) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    
    // Support scheduled trigger or direct endpoint request
    return generateForecast();
};

export const handler = forecastHandler;
