import { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Avatar, Spin, Card, Tag, Typography, Tooltip, Segmented, Badge } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    UserOutlined,
    DeleteOutlined,
    BulbOutlined,
    DatabaseOutlined,
    QuestionCircleOutlined,
    ThunderboltOutlined,
    ExperimentOutlined,
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const { Text } = Typography;

// ══════════════════════════════════════════════
// ────────── AI MODEL CONFIGURATIONS ──────────
// ══════════════════════════════════════════════

const AI_MODELS = {
    qwen: {
        key: 'qwen',
        label: '🧠 Qwen 3.6+',
        shortLabel: 'Qwen',
        description: 'Qwen 3.6 Plus (Free)',
        provider: 'OpenRouter',
        color: '#7c3aed',
        icon: '🧠',
        badge: 'FREE',
        badgeColor: '#52c41a',
    },
    gemini: {
        key: 'gemini',
        label: '✨ Gemini Flash',
        shortLabel: 'Gemini',
        description: 'Gemini 3.1 Flash Lite',
        provider: 'Google',
        color: '#4285f4',
        icon: '✨',
        badge: 'FAST',
        badgeColor: '#1890ff',
    }
};

// ── OpenRouter Config ──
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = 'qwen/qwen3.6-plus:free';

// ── Gemini Config ──
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// ──────── Table Config ────────
const TABLE_CONFIG = {
    agricultural_areas: { label: 'พื้นที่การเกษตร', icon: '🌾', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลพื้นที่เกษตรรายอำเภอ (ข้าว, พืชไร่, ไม้ผล, ผัก, ไม้ดอก, สมุนไพร)' },
    learning_centers: { label: 'ศูนย์เรียนรู้ (ศพก.)', icon: '🏫', group: 'ยุทธศาสตร์', descTh: 'ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร' },
    disasters: { label: 'ภัยพิบัติ', icon: '⛈️', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลภัยพิบัติด้านการเกษตร' },
    farmer_registry: { label: 'ทะเบียนเกษตรกร', icon: '📋', group: 'ยุทธศาสตร์', descTh: 'ทะเบียนเกษตรกรรายอำเภอ' },
    gis_areas: { label: 'พิกัด GIS', icon: '📍', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลพิกัดภูมิศาสตร์พื้นที่เกษตร' },
    kpi_plans: { label: 'แผน/KPI', icon: '📊', group: 'ยุทธศาสตร์', descTh: 'ตัวชี้วัดและแผนงานประจำปี' },
    large_plots: { label: 'แปลงใหญ่', icon: '🌿', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลแปลงใหญ่ (สินค้า, พื้นที่, สมาชิก)' },
    certifications: { label: 'มาตรฐาน GAP', icon: '✅', group: 'ส่งเสริมการผลิต', descTh: 'ใบรับรองมาตรฐาน GAP (ชื่อเกษตรกร, พืช, พื้นที่)' },
    crop_production: { label: 'ผลผลิตพืช', icon: '🌽', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลผลผลิตพืชรายอำเภอ' },
    community_enterprises: { label: 'วิสาหกิจชุมชน', icon: '🏪', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลวิสาหกิจชุมชน (ชื่อ, ประธาน, สมาชิก, ประเภท)' },
    smart_farmers: { label: 'เกษตรกรรุ่นใหม่', icon: '👨‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูล Smart Farmer / Young Smart Farmer' },
    farmer_groups: { label: 'กลุ่มแม่บ้าน/ยุวฯ', icon: '👩‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'กลุ่มแม่บ้านเกษตรกร, ยุวเกษตรกร' },
    farmer_institutes: { label: 'สถาบันเกษตรกร', icon: '🤝', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลสถาบันเกษตรกรรายอำเภอ (จำนวนกลุ่ม, อสม., SF, YSF)' },
    agri_tourism: { label: 'ท่องเที่ยวเกษตร', icon: '🏕️', group: 'พัฒนาเกษตรกร', descTh: 'แหล่งท่องเที่ยวเชิงเกษตร' },
    forecast_plots: { label: 'แปลงพยากรณ์', icon: '🔬', group: 'อารักขาพืช', descTh: 'แปลงพยากรณ์และเตือนการระบาดศัตรูพืช' },
    pest_centers: { label: 'ศจช.', icon: '🏥', group: 'อารักขาพืช', descTh: 'ศูนย์จัดการศัตรูพืชชุมชน' },
    soil_fertilizer_centers: { label: 'ศดปช.', icon: '🧪', group: 'อารักขาพืช', descTh: 'ศูนย์จัดการดินปุ๋ยชุมชน' },
    fire_hotspots: { label: 'จุดเฝ้าระวัง PM2.5', icon: '🔥', group: 'อารักขาพืช', descTh: 'จุดเฝ้าระวังการเผาและ PM2.5' },
};

// ──────── Quick Prompts ────────
const QUICK_PROMPTS = [
    { icon: '📊', text: 'สรุปข้อมูลภาพรวมทั้งหมด' },
    { icon: '🌾', text: 'มีพื้นที่เกษตรทั้งหมดกี่ไร่' },
    { icon: '🌿', text: 'แปลงใหญ่มีกี่แปลง แบ่งตามสินค้าอะไรบ้าง' },
    { icon: '✅', text: 'มีใบรับรอง GAP กี่ราย' },
    { icon: '🏪', text: 'วิสาหกิจชุมชนมีกี่แห่ง' },
    { icon: '👨‍🌾', text: 'Smart Farmer มีกี่คน' },
    { icon: '🏫', text: 'ศูนย์เรียนรู้มีที่ไหนบ้าง' },
    { icon: '⛈️', text: 'ข้อมูลภัยพิบัติล่าสุด' },
];

// ──────── Search Config ────────
const TABLE_SEARCH_COLS = {
    agricultural_areas: ['district'],
    learning_centers: ['name', 'chairman_name', 'featured_product'],
    disasters: ['disaster_type', 'subdistrict'],
    farmer_registry: ['main_crop'],
    gis_areas: ['area_name', 'area_type'],
    kpi_plans: ['kpi_name', 'project_name'],
    large_plots: ['plot_name', 'commodity', 'secondary_commodity', 'agency'],
    certifications: ['farmer_name', 'crop_name', 'plot_code'],
    crop_production: ['crop_name'],
    community_enterprises: ['enterprise_name', 'enterprise_type'],
    smart_farmers: ['full_name', 'main_product', 'farmer_type'],
    farmer_groups: ['group_name', 'chairman', 'group_type'],
    farmer_institutes: [],
    agri_tourism: ['spot_name', 'contact_person', 'spot_type'],
    forecast_plots: ['owner_name', 'crop_type', 'variety'],
    pest_centers: ['center_name', 'chairman', 'main_crop_type'],
    soil_fertilizer_centers: ['center_name', 'chairman', 'main_crop_type'],
    fire_hotspots: ['spot_name'],
};

const DISTRICT_COLS = {
    certifications: 'plot_district',
    forecast_plots: 'district'
};

// ══════════════════════════════════════════════
// ────────── AI API CALL FUNCTIONS ────────────
// ══════════════════════════════════════════════

// ── OpenRouter (Qwen) ──
async function callOpenRouterAI(systemPrompt, messagesHistory, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Build messages array
            const apiMessages = [{ role: 'system', content: systemPrompt }];
            if (Array.isArray(messagesHistory)) {
                apiMessages.push(...messagesHistory.map(m => ({
                    role: m.role === 'bot' ? 'assistant' : 'user',
                    content: m.text
                })));
            } else {
                apiMessages.push({ role: 'user', content: messagesHistory });
            }

            const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: apiMessages,
                    temperature: 0.5,
                    max_tokens: 8000,
                })
            });

            if (res.status === 429) {
                const waitMs = (attempt + 1) * 3000;
                console.warn(`OpenRouter rate limited, waiting ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            return data.choices?.[0]?.message?.content || null;
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

// ── Google Gemini ──
async function callGeminiAI(systemPrompt, messagesHistory, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            let contents = [];
            if (Array.isArray(messagesHistory)) {
                contents = messagesHistory.map(m => ({
                    role: m.role === 'bot' ? 'model' : 'user',
                    parts: [{ text: m.text }]
                }));
            } else {
                contents = [{ role: 'user', parts: [{ text: messagesHistory }] }];
            }

            const res = await fetch(
                `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        generationConfig: {
                            temperature: 0.5,
                            maxOutputTokens: 8000,
                        }
                    })
                }
            );

            if (res.status === 429) {
                const waitMs = (attempt + 1) * 2000;
                console.warn(`Gemini rate limited, waiting ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    return null;
}

// ── Unified AI Call (route by selected model) ──
async function callAI(modelKey, systemPrompt, messagesHistory) {
    if (modelKey === 'gemini') {
        return callGeminiAI(systemPrompt, messagesHistory);
    }
    return callOpenRouterAI(systemPrompt, messagesHistory);
}

// ══════════════════════════════════════════════
// ────────── INTENT EXTRACTION ────────────────
// ══════════════════════════════════════════════

async function extractIntent(query, modelKey, chatHistory = []) {
    const tableList = Object.entries(TABLE_CONFIG)
        .map(([k, v]) => `${k}: ${v.descTh}`)
        .join('\n');

    // Make AI aware of previous conversation to resolve pronouns and context like "แบ่งเป็นอำเภอละกี่แห่ง"
    const recentHistory = chatHistory.slice(-4).map(m => `${m.role === 'bot' ? 'AI' : 'User'}: ${m.text}`).join('\n');

    const prompt = `You are an AI data extractor for a Thai agriculture database (จ.นครปฐม).
Extract search parameters from the user's NEW query, using the recent conversation context to understand pronouns or follow-up questions.
Return ONLY valid JSON, no markdown code blocks.

Available tables:
${tableList}

IMPORTANT - agricultural_areas table has these COLUMNS (not searchable values):
district, total_area_rai, agri_crop_area_rai, farmer_households, rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai

Districts: เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล

Return format:
{
  "district": "อำเภอ or null",
  "tables": ["table_name"] or ["all"] for overview questions,
  "keyword": "a specific person name or very specific item name to filter by, or null",
  "is_general_question": false
}

Rules:
- Use ["all"] ONLY for generic overview/summary requests
- "พื้นที่เกษตรทั้งหมด" or "ปลูกข้าวกี่ไร่" → tables: ["agricultural_areas"], keyword: null (because rice data is in columns, NOT row values)
- NEVER set keyword for general crop categories like ข้าว, ผัก, ไม้ผล, พืชไร่, สมุนไพร when asking about agricultural_areas — these are COLUMN NAMES in the table, not searchable values
- keyword should ONLY be a specific searchable value like a person's name (e.g. "สมชาย"), a specific crop variety (e.g. "ส้มโอ"), or enterprise name
- keyword should NOT include table names, district names, or question words
- is_general_question: true for greetings, general knowledge, or questions unrelated to the database
- Return raw JSON only, no markdown formatting

--- RECENT CONVERSATION CONTEXT ---
${recentHistory || 'No previous context'}
--- END RECENT CONVERSATION ---

Extract search parameters for this NEW user query: "${query}"`;

    try {
        const result = await callAI(modelKey, prompt, query);
        if (result) {
            // Extract JSON from potential markdown code blocks or raw text
            const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
            const cleanJson = jsonMatch ? jsonMatch[1].trim() : result.trim();
            // Find the JSON object in the text
            const jsonStart = cleanJson.indexOf('{');
            const jsonEnd = cleanJson.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                return JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1));
            }
        }
    } catch (e) {
        console.error('Intent extraction failed:', e);
    }
    return null;
}

// ══════════════════════════════════════════════
// ────────── DATA ANALYSIS ENGINE ─────────────
// ══════════════════════════════════════════════

async function fetchDatabaseContext(query, modelKey, chatHistory = []) {
    const intent = await extractIntent(query, modelKey, chatHistory);

    if (intent?.is_general_question) {
        return { results: [], isOverview: false, isGeneral: true, query, intent };
    }

    let matchedDistrict = intent?.district || null;
    let searchKeyword = intent?.keyword || null;
    let matchedTables = [];
    let isOverview = false;

    if (intent?.tables?.length > 0) {
        if (intent.tables.includes('all')) {
            matchedTables = Object.keys(TABLE_CONFIG);
            isOverview = true;
        } else {
            matchedTables = intent.tables.filter(t => TABLE_CONFIG[t]);
        }
    }

    // Heuristic fallback
    if (matchedTables.length === 0) {
        const lowerQuery = query.toLowerCase();
        const tableKeywords = {
            agricultural_areas: ['พื้นที่', 'เกษตร', 'ไร่', 'ข้าว', 'พืช', 'สวน', 'นา'],
            learning_centers: ['ศูนย์เรียนรู้', 'ศพก'],
            disasters: ['ภัย', 'น้ำท่วม', 'แล้ง', 'วาตภัย'],
            farmer_registry: ['ทะเบียน', 'เกษตรกร', 'ครัวเรือน'],
            gis_areas: ['gis', 'พิกัด', 'แผนที่'],
            kpi_plans: ['kpi', 'ตัวชี้วัด', 'แผน', 'เป้าหมาย'],
            large_plots: ['แปลงใหญ่', 'สินค้า'],
            certifications: ['gap', 'มาตรฐาน', 'ใบรับรอง', 'อินทรีย์'],
            crop_production: ['ผลผลิต', 'เก็บเกี่ยว', 'ตัน'],
            community_enterprises: ['วิสาหกิจ', 'ชุมชน'],
            smart_farmers: ['smart farmer', 'เกษตรกรรุ่นใหม่', 'young'],
            farmer_groups: ['กลุ่มแม่บ้าน', 'ยุวเกษตรกร'],
            farmer_institutes: ['สถาบัน', 'สหกรณ์'],
            agri_tourism: ['ท่องเที่ยว', 'ฟาร์มสเตย์'],
            forecast_plots: ['พยากรณ์', 'แมลง', 'ศัตรูพืช'],
            pest_centers: ['ศจช', 'ศัตรูพืชชุมชน'],
            soil_fertilizer_centers: ['ศดปช', 'ดิน', 'ปุ๋ย'],
            fire_hotspots: ['ไฟ', 'เผา', 'pm2.5', 'หมอกควัน'],
        };

        for (const [table, keywords] of Object.entries(tableKeywords)) {
            if (keywords.some(kw => lowerQuery.includes(kw))) {
                matchedTables.push(table);
            }
        }

        if (matchedTables.length === 0) {
            matchedTables = Object.keys(TABLE_CONFIG);
            isOverview = true;
        }
    }

    // Fetch data from matched tables
    const results = [];
    for (const table of matchedTables) {
        try {
            const distCol = DISTRICT_COLS[table] || 'district';
            let usedKeyword = false;

            // Highly increased bounds for intelligence: 3000 rows for specific targets, 100 for global overviews
            const fetchLimit = isOverview ? 100 : 3000;
            let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
            let dataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(fetchLimit);

            if (matchedDistrict) {
                countQuery = countQuery.ilike(distCol, `%${matchedDistrict}%`);
                dataQuery = dataQuery.ilike(distCol, `%${matchedDistrict}%`);
            }

            if (searchKeyword && TABLE_SEARCH_COLS[table]?.length > 0) {
                const cols = TABLE_SEARCH_COLS[table];
                const orString = cols.map(c => `${c}.ilike.%${searchKeyword}%`).join(',');
                try {
                    countQuery = countQuery.or(orString);
                    dataQuery = dataQuery.or(orString);
                    usedKeyword = true;
                } catch { /* swallow */ }
            }

            let { count, error: countError } = await countQuery;
            let sampleData = [];

            // FALLBACK: If keyword filter returned 0 results, retry WITHOUT keyword
            if (!countError && count === 0 && usedKeyword) {
                if(window?.console) console.log(`[Chatbot] Keyword "${searchKeyword}" returned 0 for ${table}, retrying without keyword...`);
                let fbCountQuery = supabase.from(table).select('*', { count: 'exact', head: true });
                let fbDataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(fetchLimit);
                if (matchedDistrict) {
                    fbCountQuery = fbCountQuery.ilike(distCol, `%${matchedDistrict}%`);
                    fbDataQuery = fbDataQuery.ilike(distCol, `%${matchedDistrict}%`);
                }
                const fbResult = await fbCountQuery;
                count = fbResult.count || 0;
                countError = fbResult.error;
                if (!countError && count > 0) {
                    const fbData = await fbDataQuery;
                    sampleData = fbData.data || [];
                }
                usedKeyword = false;
            }

            if (countError) {
                // Error fallback: try with NO filters at all
                const fb = await supabase.from(table).select('*', { count: 'exact', head: true });
                count = fb.count || 0;
                if (count > 0) {
                    const fbData = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(fetchLimit);
                    sampleData = fbData.data || [];
                }
            } else if (sampleData.length === 0) {
                // Fetch sample data if we haven't already
                if (count > 0) {
                    const { data } = await dataQuery;
                    sampleData = data || [];
                }
            }

            results.push({
                table,
                label: TABLE_CONFIG[table].label,
                icon: TABLE_CONFIG[table].icon,
                group: TABLE_CONFIG[table].group,
                count: count || 0,
                sample: sampleData.length > 0 ? sampleData : null,
                filteredBy: matchedDistrict || (usedKeyword && searchKeyword ? `คำค้น "${searchKeyword}"` : null),
            });
        } catch { /* skip */ }
    }

    return { results, isOverview, isGeneral: false, query, intent, matchedDistrict };
}

// ──────── Build AI Context ────────
function buildContextForAI(analysis) {
    const { results } = analysis;
    if (!results || results.length === 0) return 'ไม่พบข้อมูลในฐานข้อมูล';

    return JSON.stringify(results.map(r => ({
        dataset: r.label,
        table_name: r.table,
        total_records: r.count,
        filtered_by: r.filteredBy || 'ไม่กรอง',
        records: r.sample ? r.sample.map(s => {
            const obj = {};
            for (const [key, val] of Object.entries(s)) {
                if (val === null || val === undefined || val === '') continue;
                if (['id', 'created_at', 'updated_at'].includes(key)) continue;
                if (key.includes('image') || key.includes('url') || key.includes('file') || key.includes('path')) continue;
                obj[key] = val;
            }
            return obj;
        }) : [],
    })), null, 2);
}

// ──────── System Prompt ────────
const SYSTEM_PROMPT = `คุณคือ "น้องข้าวหอม" 🌾 — AI ผู้ช่วยอัจฉริยะระดับสูงประจำระบบจัดการข้อมูลสำนักงานเกษตรจังหวัดนครปฐม

## บทบาทของคุณ
- ตอบทุกคำถามที่เกี่ยวกับข้อมูลเกษตรจังหวัดนครปฐม โดยคุณต้องทำหน้าที่เป็น 'นักวิเคราะห์ข้อมูลชั้นยอด!'
- ให้ข้อมูลเชิงลึก สรุปประเด็น สังเคราะห์ข้อมูล ค้นหาสัดส่วน สรุปยอดรวม และนำเสนอข้อมูลระดับอำเภออย่างละเอียดที่สุด
- รองรับคำถามทั่วไปที่ไม่เกี่ยวกับฐานข้อมูลด้วย เช่น ทักทาย, ให้คำแนะนำ, ความรู้ทั่วไปเกี่ยวกับการเกษตร
- พูดภาษาไทยสุภาพ เป็นมืออาชีพ ใช้ Emoji ให้เหมาะสม

## กฎสำคัญ
1. **วิเคราะห์เชิงลึกเต็มที่** — แจกแจงข้อมูลให้ละเอียด หากมีการขอสถิติ ให้รวมยอด สรุปแนวโน้มต่างๆ หรือจัดลำดับข้อมูลเสมอ
2. **ห้ามกุข้อมูลตัวเลข** — ต้องอ้างอิงจากข้อมูลที่ได้รับเท่านั้น
3. **จัดรูปแบบให้อ่านง่ายและเป๊ะมาก** — ใช้ Markdown (bold, bullet, ตารางสรุปข้อมูล 🌟) เพื่อแยกข้อมูลให้ชัดเจนและน่าอ่าน
4. **ถ้าไม่มีข้อมูล** ให้บอกตรงๆ ว่ายังไม่มีข้อมูลในระบบที่ดึงมา
5. **ถ้าผู้ใช้ถามเรื่องพื้นที่เฉพาะ** ให้เน้นข้อมูลของพื้นที่นั้นและสรุปสิ่งที่น่าสนใจ

## คำศัพท์สำคัญ
- total_area_rai = พื้นที่ภูมิศาสตร์/เขตปกครองทั้งหมด
- agri_crop_area_rai = พื้นที่ทำการเกษตรด้านพืช
- farmer_households = จำนวนครัวเรือนเกษตรกร
- rice_in_season_rai = ข้าวนาปี, rice_off_season_rai = ข้าวนาปรัง
- field_crops_rai = พืชไร่, horticulture_rai = ไม้ดอกไม้ประดับ
- fruit_trees_rai = ไม้ผล, vegetables_rai = พืชผัก
- herbs_spices_rai = สมุนไพร/เครื่องเทศ

## ข้อมูลจังหวัดนครปฐม
- 7 อำเภอ: เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล
- ข้อมูลครอบคลุม: ยุทธศาสตร์, ส่งเสริมการผลิต, พัฒนาเกษตรกร, อารักขาพืช`;

// ══════════════════════════════════════════════
// ────────── CHAT MESSAGE COMPONENT ───────────
// ══════════════════════════════════════════════

function ChatMessage({ message, isLast }) {
    const isBot = message.role === 'bot';
    const modelConfig = message.modelKey ? AI_MODELS[message.modelKey] : null;

    return (
        <div
            className={`chat-message ${isBot ? 'bot' : 'user'}`}
            style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                flexDirection: isBot ? 'row' : 'row-reverse',
                animation: isLast ? 'chatFadeIn 0.3s ease-out' : 'none',
            }}
        >
            <Avatar
                size={36}
                icon={isBot ? <RobotOutlined /> : <UserOutlined />}
                style={{
                    background: isBot
                        ? `linear-gradient(135deg, ${modelConfig?.color || '#1a7f37'}, ${modelConfig?.color || '#2ea043'}88)`
                        : 'linear-gradient(135deg, #1565c0, #42a5f5)',
                    flexShrink: 0,
                    marginTop: 2,
                }}
            />
            <div
                style={{
                    maxWidth: '78%',
                    background: isBot ? '#f6f8fa' : '#1a7f37',
                    color: isBot ? '#1f2328' : '#fff',
                    borderRadius: isBot ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                    padding: '12px 18px',
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
            >
                {message.text.split('\n').map((line, i) => {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                        <div key={i} style={{ minHeight: line === '' ? 8 : 'auto' }}>
                            {parts.map((part, j) =>
                                j % 2 === 1
                                    ? <strong key={j}>{part}</strong>
                                    : <span key={j}>{part}</span>
                            )}
                        </div>
                    );
                })}
                {/* Data summary tags */}
                {isBot && message.data && message.type === 'overview' && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {message.data.filter(d => d.count > 0).map(d => (
                            <Tag key={d.table} color="green" style={{ borderRadius: 12, fontSize: 12 }}>
                                {d.icon} {d.label}: {d.count.toLocaleString()}
                            </Tag>
                        ))}
                    </div>
                )}
                <div style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: isBot ? 'flex-start' : 'flex-end',
                }}>
                    <span>{new Date(message.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    {modelConfig && (
                        <span style={{
                            background: isBot ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                        }}>
                            {modelConfig.icon} {modelConfig.description}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// ────────── MODEL SELECTOR COMPONENT ─────────
// ══════════════════════════════════════════════

function ModelSelector({ selectedModel, onChange, disabled }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#f6f8fa',
            borderRadius: 12,
            padding: '6px 12px',
            border: '1px solid #d0d7de',
        }}>
            <ExperimentOutlined style={{ color: '#656d76', fontSize: 14 }} />
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>AI Model:</Text>
            <Segmented
                value={selectedModel}
                onChange={onChange}
                disabled={disabled}
                size="small"
                options={Object.values(AI_MODELS).map(m => ({
                    label: (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 4px',
                        }}>
                            <span>{m.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>{m.shortLabel}</span>
                            <span style={{
                                background: m.badgeColor,
                                color: '#fff',
                                fontSize: 9,
                                padding: '0 5px',
                                borderRadius: 6,
                                fontWeight: 700,
                                lineHeight: '16px',
                            }}>
                                {m.badge}
                            </span>
                        </div>
                    ),
                    value: m.key,
                }))}
                style={{ background: '#fff' }}
            />
        </div>
    );
}

// ══════════════════════════════════════════════
// ────────── MAIN CHATBOT PAGE ────────────────
// ══════════════════════════════════════════════

export default function Chatbot() {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'สวัสดีครับ! 🌾 ผม **น้องข้าวหอม** ผู้ช่วย AI ประจำสำนักงานเกษตรจังหวัดนครปฐม\n\nผมรู้ข้อมูลทุกอย่างในระบบ ถามได้ทุกเรื่อง เช่น:\n• 📍 พื้นที่การเกษตรแต่ละอำเภอ\n• 🌿 แปลงใหญ่, มาตรฐาน GAP\n• 🏪 วิสาหกิจชุมชน, Smart Farmer\n• 🏫 ศูนย์เรียนรู้, ศจช., ศดปช.\n• ⛈️ ภัยพิบัติ, PM2.5\n• 💬 หรือจะคุยเรื่องทั่วไปก็ได้ครับ!\n\n🔄 เลือกโมเดล AI ที่ต้องการได้ด้านบนนะครับ\nลองถามได้เลย หรือเลือกคำถามด้านล่าง 👇',
            timestamp: Date.now(),
            type: 'greeting',
            modelKey: null,
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini');
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async (text) => {
        const msg = text || input.trim();
        if (!msg || loading) return;

        const currentModel = selectedModel;
        const modelConfig = AI_MODELS[currentModel];

        // Capture valid history before appending the actual new message
        // Exclude greeting and error messages.
        const validHistory = messages.filter(m =>
            (m.role === 'user' || m.role === 'bot') &&
            m.type !== 'greeting' &&
            m.type !== 'error'
        );

        const userMsg = { role: 'user', text: msg, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Step 1: Analyze query & fetch relevant data (with conversation context)
            const analysis = await fetchDatabaseContext(msg, currentModel, validHistory);

            let aiText;
            let responseType = 'specific';

            if (analysis.isGeneral) {
                const historyToSend = [...validHistory, { role: 'user', text: `คำถาม: ${msg}` }];
                aiText = await callAI(currentModel, SYSTEM_PROMPT, historyToSend);
                responseType = 'general';
            } else {
                const dbContext = buildContextForAI(analysis);
                const userPrompt = `คำถาม: ${msg}

--- ข้อมูลจริงจากฐานข้อมูลสำนักงานเกษตรจังหวัดนครปฐม ---
${dbContext}
--- จบข้อมูล ---

โปรดวิเคราะห์ข้อมูลข้างต้นและตอบคำถามอย่างละเอียด ถ้ามีข้อมูลตัวเลข ให้อ้างอิงจากข้อมูลจริงเท่านั้น`;

                const historyToSend = [...validHistory, { role: 'user', text: userPrompt }];
                aiText = await callAI(currentModel, SYSTEM_PROMPT, historyToSend);
                responseType = analysis.isOverview ? 'overview' : 'specific';
            }

            // Fallback if AI fails
            if (!aiText) {
                if (analysis.results?.length > 0) {
                    const totalRecords = analysis.results.reduce((s, r) => s + r.count, 0);
                    aiText = `📊 พบข้อมูลที่เกี่ยวข้อง ${analysis.results.length} หมวด รวม ${totalRecords.toLocaleString()} รายการ\n\n`;
                    analysis.results.forEach(r => {
                        aiText += `${r.icon} **${r.label}**: ${r.count.toLocaleString()} รายการ\n`;
                    });
                    aiText += '\n⚠️ ระบบ AI ไม่สามารถตอบได้ชั่วคราว แต่ข้อมูลดิบจากฐานข้อมูลแสดงด้านบนครับ';
                } else {
                    aiText = 'ขออภัยครับ ระบบ AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ 🙏';
                }
            }

            const botMsg = {
                role: 'bot',
                text: aiText,
                data: analysis.results,
                type: responseType,
                timestamp: Date.now(),
                modelKey: currentModel,
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error('Chatbot Error:', err);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: `⚠️ เกิดข้อผิดพลาดจาก ${modelConfig.description}: ${err.message}\n\nลองสลับไปใช้โมเดลอื่น หรือลองใหม่อีกครั้งครับ 🙏`,
                timestamp: Date.now(),
                type: 'error',
                modelKey: currentModel,
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleClear = () => {
        setMessages([{
            role: 'bot',
            text: 'เริ่มการสนทนาใหม่ครับ 🌾 ถามอะไรได้เลย!',
            timestamp: Date.now(),
            type: 'greeting',
            modelKey: null,
        }]);
    };

    const currentModelConfig = AI_MODELS[selectedModel];

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 10,
            }}>
                <div className="md-page-header" style={{ marginBottom: 0 }}>
                    <h2>🤖 น้องข้าวหอม — AI ผู้ช่วยข้อมูลเกษตร</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#656d76' }}>
                        <DatabaseOutlined /> ถามได้ทุกเรื่อง • ข้อมูลจริงจาก Database • สลับโมเดลได้
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ModelSelector
                        selectedModel={selectedModel}
                        onChange={setSelectedModel}
                        disabled={loading}
                    />
                    <Tooltip title="ล้างแชท">
                        <Button
                            icon={<DeleteOutlined />}
                            onClick={handleClear}
                            style={{ borderRadius: 8 }}
                        >
                            ล้างแชท
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Chat Container */}
            <Card
                bordered
                style={{
                    flex: 1,
                    borderRadius: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}
                styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' } }}
            >
                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 12px' }}>
                    {messages.map((msg, i) => (
                        <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                            <Avatar
                                size={36}
                                icon={<RobotOutlined />}
                                style={{
                                    background: `linear-gradient(135deg, ${currentModelConfig.color}, ${currentModelConfig.color}88)`,
                                    flexShrink: 0,
                                }}
                            />
                            <div style={{
                                background: '#f6f8fa',
                                borderRadius: '4px 18px 18px 18px',
                                padding: '16px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <Spin size="small" />
                                <Text type="secondary">
                                    {currentModelConfig.icon} กำลังวิเคราะห์ด้วย {currentModelConfig.description}...
                                </Text>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Quick Prompts */}
                {messages.length <= 2 && (
                    <div style={{ padding: '8px 20px 4px', borderTop: '1px solid #f0f2f5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <BulbOutlined style={{ color: '#bf8700', fontSize: 13 }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>คำถามแนะนำ</Text>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {QUICK_PROMPTS.map((p, i) => (
                                <Button
                                    key={i}
                                    size="small"
                                    onClick={() => handleSend(p.text)}
                                    disabled={loading}
                                    style={{
                                        borderRadius: 20, fontSize: 12, height: 30,
                                        border: '1px solid #d0d7de', background: '#fff',
                                    }}
                                >
                                    {p.icon} {p.text}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div style={{
                    padding: '12px 20px 16px',
                    borderTop: '1px solid #f0f2f5',
                    background: '#fafbfc',
                }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onPressEnter={() => handleSend()}
                            placeholder="ถามอะไรก็ได้... ข้อมูลเกษตร หรือ เรื่องทั่วไป"
                            disabled={loading}
                            size="large"
                            style={{ borderRadius: 24, paddingLeft: 20, fontSize: 14 }}
                            prefix={<QuestionCircleOutlined style={{ color: '#8b949e' }} />}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => handleSend()}
                            loading={loading}
                            size="large"
                            style={{
                                borderRadius: 24,
                                minWidth: 50,
                                background: currentModelConfig.color,
                                borderColor: currentModelConfig.color,
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {currentModelConfig.icon} กำลังใช้ {currentModelConfig.description} ({currentModelConfig.provider}) — ดึงข้อมูลจริงจาก Database
                        </Text>
                    </div>
                </div>
            </Card>
        </div>
    );
}
