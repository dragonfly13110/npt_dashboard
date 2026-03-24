import { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Avatar, Spin, Card, Tag, Typography, Tooltip } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    UserOutlined,
    DeleteOutlined,
    BulbOutlined,
    DatabaseOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const { Text } = Typography;

// ──────── Table Config ────────
const TABLE_CONFIG = {
    agricultural_areas: { label: 'พื้นที่การเกษตร', icon: '🌾', group: 'ยุทธศาสตร์' },
    learning_centers: { label: 'ศูนย์เรียนรู้ (ศพก.)', icon: '🏫', group: 'ยุทธศาสตร์' },
    disasters: { label: 'ภัยพิบัติ', icon: '⛈️', group: 'ยุทธศาสตร์' },
    farmer_registry: { label: 'ทะเบียนเกษตรกร', icon: '📋', group: 'ยุทธศาสตร์' },
    gis_areas: { label: 'พิกัด GIS', icon: '📍', group: 'ยุทธศาสตร์' },
    kpi_plans: { label: 'แผน/KPI', icon: '📊', group: 'ยุทธศาสตร์' },
    large_plots: { label: 'แปลงใหญ่', icon: '🌿', group: 'ส่งเสริมการผลิต' },
    certifications: { label: 'มาตรฐาน GAP', icon: '✅', group: 'ส่งเสริมการผลิต' },
    crop_production: { label: 'ผลผลิตพืช', icon: '🌽', group: 'ส่งเสริมการผลิต' },
    community_enterprises: { label: 'วิสาหกิจชุมชน', icon: '🏪', group: 'พัฒนาเกษตรกร' },
    smart_farmers: { label: 'เกษตรกรรุ่นใหม่', icon: '👨‍🌾', group: 'พัฒนาเกษตรกร' },
    farmer_groups: { label: 'กลุ่มแม่บ้าน/ยุวฯ', icon: '👩‍🌾', group: 'พัฒนาเกษตรกร' },
    farmer_institutes: { label: 'สถาบันเกษตรกร', icon: '🤝', group: 'พัฒนาเกษตรกร' },
    agri_tourism: { label: 'ท่องเที่ยวเกษตร', icon: '🏕️', group: 'พัฒนาเกษตรกร' },
    forecast_plots: { label: 'แปลงพยากรณ์', icon: '🔬', group: 'อารักขาพืช' },
    pest_centers: { label: 'ศจช.', icon: '🏥', group: 'อารักขาพืช' },
    soil_fertilizer_centers: { label: 'ศดปช.', icon: '🧪', group: 'อารักขาพืช' },
    fire_hotspots: { label: 'จุดเฝ้าระวัง PM2.5', icon: '🔥', group: 'อารักขาพืช' },
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

// ──────── LLM Config ────────
const MODELS = [
    'moonshotai/kimi-k2-instruct',
    'openai/gpt-oss-120b',
    'groq/compound',
    'llama-3.3-70b-versatile'
];

// ──────── Data Analysis Engine ────────
const TABLE_SEARCH_COLS = {
    agricultural_areas: ['district'],
    learning_centers: ['center_name', 'manager', 'chairman_name', 'featured_product', 'main_crop'],
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

async function analyzeQuery(query) {
    const results = [];
    let matchedDistrict = null;
    let searchKeyword = null;
    let matchedTables = [];
    let isOverview = false;

    // --- STEP 1: Use LLM for Intent Extraction ---
    try {
        const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI data extractor for an agriculture database. Extract search parameters from the user's Thai query.
Return ONLY valid JSON.
{
  "district": "เมืองนครปฐม", // Match exactly one: เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล. Or null if not specified.
  "tables": ["large_plots"], // Array of table mapping to intent. Options: agricultural_areas, learning_centers, disasters, farmer_registry, gis_areas, kpi_plans, large_plots, certifications, crop_production, community_enterprises, smart_farmers, farmer_groups, farmer_institutes, agri_tourism, forecast_plots, pest_centers, soil_fertilizer_centers, fire_hotspots. ONLY use ["all"] if the user asks for a generic system-wide dashboard summary. DO NOT use ["all"] just because the word "ทั้งหมด" is present if a specific table is mentioned (e.g. "พื้นที่เกษตรทั้งหมด" should be ["agricultural_areas"]).
  "keyword": null // A SPECIFIC filter keyword like a plant/crop name (e.g. "ส้มโอ") or person's name. STRICTLY EXCLUDE table names, district names, and question words (มีกี่, บอก, ชื่ออะไรบ้าง, แนะนำ, ขอข้อมูล, อำเภอ). Set to null if none.
}`
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0,
                response_format: { type: 'json_object' }
            })
        });

        if (aiRes.ok) {
            const data = await aiRes.json();
            const intent = JSON.parse(data.choices[0].message.content);
            
            matchedDistrict = (intent.district && intent.district !== 'null') ? intent.district : null;
            searchKeyword = (intent.keyword && intent.keyword !== 'null') ? intent.keyword : null;
            
            if (intent.tables && Array.isArray(intent.tables) && intent.tables.length > 0) {
                if (intent.tables.includes('all')) {
                    matchedTables = Object.keys(TABLE_CONFIG);
                    isOverview = true;
                } else {
                    matchedTables = intent.tables.filter(t => TABLE_CONFIG[t]);
                }
            }
        }
    } catch (e) {
        console.error("LLM Intent Parsing Error:", e);
    }

    const lowerQuery = query.toLowerCase();

    // --- STEP 2: Heuristic Fallback (if LLM fails) ---
    if (matchedTables.length === 0) {
        const districts = ['เมืองนครปฐม', 'เมือง', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม', 'บางเลน', 'สามพราน', 'พุทธมณฑล'];
        searchKeyword = lowerQuery;

        for (const d of districts) {
            if (lowerQuery.includes(d)) {
                matchedDistrict = d === 'เมือง' ? 'เมืองนครปฐม' : d;
                searchKeyword = searchKeyword.replace(d, '');
                break;
            }
        }

        const tableKeywords = {
            agricultural_areas: ['พื้นที่', 'เกษตร', 'ไร่', 'ข้าว', 'พืช', 'สวน', 'นา', 'agricultural'],
            learning_centers: ['ศูนย์เรียนรู้', 'ศพก', 'learning', 'center'],
            disasters: ['ภัย', 'น้ำท่วม', 'แล้ง', 'วาตภัย', 'disaster'],
            farmer_registry: ['ทะเบียน', 'เกษตรกร', 'ครัวเรือน', 'registry'],
            gis_areas: ['gis', 'พิกัด', 'แผนที่', 'ละติจูด'],
            kpi_plans: ['kpi', 'ตัวชี้วัด', 'แผน', 'เป้าหมาย'],
            large_plots: ['แปลงใหญ่', 'large plot', 'สินค้า'],
            certifications: ['gap', 'มาตรฐาน', 'ใบรับรอง', 'certification', 'อินทรีย์'],
            crop_production: ['ผลผลิต', 'เก็บเกี่ยว', 'ตัน', 'crop'],
            community_enterprises: ['วิสาหกิจ', 'ชุมชน', 'otop', 'enterprise'],
            smart_farmers: ['smart farmer', 'เกษตรกรรุ่นใหม่', 'young'],
            farmer_groups: ['กลุ่มแม่บ้าน', 'ยุวเกษตรกร', 'group'],
            farmer_institutes: ['สถาบัน', 'institute', 'สหกรณ์'],
            agri_tourism: ['ท่องเที่ยว', 'tourism', 'ฟาร์มสเตย์'],
            forecast_plots: ['พยากรณ์', 'แมลง', 'ศัตรูพืช', 'forecast'],
            pest_centers: ['ศจช', 'ศัตรูพืชชุมชน', 'pest center'],
            soil_fertilizer_centers: ['ศดปช', 'ดิน', 'ปุ๋ย', 'soil', 'fertilizer'],
            fire_hotspots: ['ไฟ', 'เผา', 'pm2.5', 'pm25', 'หมอกควัน', 'fire', 'hotspot'],
        };

        Object.values(tableKeywords).flat().forEach(k => {
            searchKeyword = searchKeyword.replace(new RegExp(k, 'g'), '');
        });
        searchKeyword = searchKeyword.replace(/มีกี่|อะไรบ้าง|คืออะไร|บอก|หน่วย|จำนวน|สรุป|ภาพรวม|ทั้งหมด|ล่าสุด|รายการ|ข้อมูล|หน่อย|กี่|ที่ไหน|ไหม|ครับ|ค่ะ/g, '').trim();
        if (searchKeyword.length < 2) searchKeyword = null;

        for (const [table, keywords] of Object.entries(tableKeywords)) {
            if (keywords.some(kw => lowerQuery.includes(kw))) {
                matchedTables.push(table);
            }
        }

        isOverview = (matchedTables.length === 0) && /สรุป|ภาพรวม|ทั้งหมด|overview|summary|รวม/.test(lowerQuery);

        if (isOverview || matchedTables.length === 0) {
            matchedTables = Object.keys(TABLE_CONFIG);
            isOverview = true;
        }
    }

    // If no match, try all tables for count overview
    if (matchedTables.length === 0) {
        matchedTables = Object.keys(TABLE_CONFIG);
    }

    // Fetch data from matched tables
    for (const table of matchedTables) {
        try {
            let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
            let dataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(30);

            const distCol = DISTRICT_COLS[table] || 'district';
            if (matchedDistrict) {
                countQuery = countQuery.ilike(distCol, `%${matchedDistrict}%`);
                dataQuery = dataQuery.ilike(distCol, `%${matchedDistrict}%`);
            }

            if (searchKeyword && TABLE_SEARCH_COLS[table] && TABLE_SEARCH_COLS[table].length > 0) {
                const cols = TABLE_SEARCH_COLS[table];
                const orString = cols.map(c => `${c}.ilike.%${searchKeyword}%`).join(',');
                countQuery = countQuery.or(orString);
                dataQuery = dataQuery.or(orString);
            }

            let { count, error: countError } = await countQuery;
            let sampleData = [];
            let isFiltered = !!matchedDistrict || !!searchKeyword;

            if (countError) {
                // Fallback: The search OR query failed, or district column is missing. Try only district.
                let fbCountQuery = supabase.from(table).select('*', { count: 'exact', head: true });
                let fbDataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(30);
                
                if (matchedDistrict) {
                    fbCountQuery = fbCountQuery.ilike(distCol, `%${matchedDistrict}%`);
                    fbDataQuery = fbDataQuery.ilike(distCol, `%${matchedDistrict}%`);
                }
                
                let fbObj = await fbCountQuery;

                if (fbObj.error) {
                    // Ultimate Fallback: Try with NO filters at all.
                    fbCountQuery = supabase.from(table).select('*', { count: 'exact', head: true });
                    fbDataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(30);
                    fbObj = await fbCountQuery;
                    isFiltered = false;
                } else {
                    isFiltered = !!matchedDistrict;
                }

                count = fbObj.count || 0;
                
                const shouldFetch = !isOverview && count > 0 && (matchedTables.length <= 3 || !!searchKeyword);
                if (shouldFetch) {
                    const fallbackData = await fbDataQuery;
                    sampleData = fallbackData.data || [];
                }
            } else {
                const shouldFetch = !isOverview && count > 0 && (matchedTables.length <= 3 || !!searchKeyword);
                if (shouldFetch) {
                    const { data } = await dataQuery;
                    sampleData = data || [];
                }
            }

            const tableInfo = TABLE_CONFIG[table];
            const entry = {
                table,
                label: tableInfo.label,
                icon: tableInfo.icon,
                group: tableInfo.group,
                count: count || 0,
                sample: sampleData.length > 0 ? sampleData : null,
                filteredBy: isFiltered ? (searchKeyword ? `คำค้น "${searchKeyword}"` : matchedDistrict) : null
            };

            results.push(entry);
        } catch {
            // skip
        }
    }

    return { results, isOverview, query, matchedDistrict };
}

function generateResponse({ results, isOverview, query }) {
    if (results.length === 0) {
        return {
            text: 'ขออภัยครับ ไม่พบข้อมูลที่ตรงกับคำถามของคุณ ลองถามใหม่หรือเลือกจากคำถามที่แนะนำด้านล่างครับ',
            data: null,
            type: 'error',
        };
    }

    const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

    if (isOverview) {
        // Group by department
        const groups = {};
        results.forEach(r => {
            if (!groups[r.group]) groups[r.group] = [];
            groups[r.group].push(r);
        });

        let text = `📊 **สรุปภาพรวมข้อมูลในระบบ**\n\nมีข้อมูลทั้งหมด **${totalRecords.toLocaleString()} รายการ** จาก ${results.length} หมวดข้อมูล\n\n`;

        Object.entries(groups).forEach(([group, items]) => {
            const groupTotal = items.reduce((sum, r) => sum + r.count, 0);
            text += `**${group}** (${groupTotal.toLocaleString()} รายการ)\n`;
            items.forEach(item => {
                text += `  ${item.icon} ${item.label}: ${item.count.toLocaleString()} รายการ\n`;
            });
            text += '\n';
        });

        return { text, data: results, type: 'overview' };
    }

    // Specific query response
    if (results.length === 1) {
        const r = results[0];
        let text = `${r.icon} **${r.label}**\n\n`;
        
        if (r.filteredBy) {
            text += `พบข้อมูลในพื้นที่ **${r.filteredBy}** จำนวน **${r.count.toLocaleString()} รายการ**\n`;
        } else {
            text += `มีข้อมูลทั้งหมด **${r.count.toLocaleString()} รายการ** ในกลุ่มงาน "${r.group}"\n`;
        }

        if (r.sample && r.sample.length > 0) {
            text += `\n📋 **ข้อมูลตัวอย่าง ${Math.min(r.sample.length, 5)} รายการแรก:**\n`;
            r.sample.slice(0, 5).forEach((row, i) => {
                const name = row.name || row.plot_name || row.full_name || row.project_name || row.center_name ||
                    row.group_name || row.spot_name || row.area_name || row.crop_name ||
                    row.kpi_name || row.district || '-';
                const district = row.district ? ` (${row.district})` : '';
                text += `  ${i + 1}. ${name}${district}\n`;
            });
        }

        return { text, data: results, type: 'specific' };
    }

    // Multiple tables matched
    let text = `🔍 พบข้อมูลที่เกี่ยวข้อง **${results.length} หมวด** รวม **${totalRecords.toLocaleString()} รายการ**\n\n`;
    results.forEach(r => {
        text += `${r.icon} **${r.label}**: ${r.count.toLocaleString()} รายการ`;
        if (r.sample && r.sample.length) {
            const name = r.sample[0].name || r.sample[0].full_name || r.sample[0].project_name ||
                r.sample[0].center_name || r.sample[0].district || '';
            text += ` — ล่าสุด: ${name}`;
        }
        text += '\n';
    });

    return { text, data: results, type: 'multi' };
}

// ──────── Chat Message Component ────────
function ChatMessage({ message, isLast }) {
    const isBot = message.role === 'bot';

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
                        ? 'linear-gradient(135deg, #1a7f37, #2ea043)'
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
                    // Bold markdown
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
                {/* Data summary cards */}
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
                    {message.modelUsed && (
                        <span style={{ 
                            background: isBot ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)', 
                            padding: '2px 8px', 
                            borderRadius: 12,
                            fontSize: 10
                        }}>
                            🧠 {message.modelUsed}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ──────── Main Chatbot Page ────────
export default function Chatbot() {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'สวัสดีครับ! 🌾 ผมเป็นผู้ช่วยข้อมูลเกษตรจังหวัดนครปฐม\n\nคุณสามารถถามเกี่ยวกับข้อมูลในระบบได้ เช่น:\n• พื้นที่การเกษตร\n• แปลงใหญ่\n• มาตรฐาน GAP\n• วิสาหกิจชุมชน\n• ศูนย์เรียนรู้\n• ภัยพิบัติ\n\nลองถามได้เลยครับ หรือเลือกจากคำถามด้านล่าง 👇',
            timestamp: Date.now(),
            type: 'greeting',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
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

        // Add user message
        const userMsg = { role: 'user', text: msg, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Analyze query and generate response
            const analysis = await analyzeQuery(msg);
            const basicResponse = generateResponse(analysis);

            // Generate AI Response using Groq/OpenAI format
            const randomModel = MODELS[Math.floor(Math.random() * MODELS.length)];
            let aiText = basicResponse.text; // Fallback
            let modelUsed = null;

            // Prepare streamlined JSON context for the LLM
            const llmContextData = analysis.results.map(r => ({
                dataset: r.label,
                total_count_found: r.count,
                filtered_by_district: r.filteredBy || 'none',
                sample_records: r.sample ? r.sample.map(s => {
                    const cleanObj = {};
                    for (const [key, val] of Object.entries(s)) {
                        if (val === null || val === undefined || val === '') continue; // Skip empties to save tokens
                        if (['id', 'created_at', 'updated_at', 'latitude', 'longitude', 'lat', 'lng'].includes(key)) continue; // Skip bulky system metadata
                        if (key.includes('image') || key.includes('url') || key.includes('file') || key.includes('path')) continue;
                        cleanObj[key] = val;
                    }
                    return cleanObj;
                }) : []
            }));

            try {
                const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: randomModel,
                        messages: [
                            {
                                role: 'system',
                                content: `คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับ Admin ระบบจัดการข้อมูลการเกษตรจังหวัดนครปฐม หน้าที่ของคุณคือตอบคำถามด้วยความสุภาพ เป็นมืออาชีพ พร้อมจัดรูปแบบให้น่าอ่าน (ใช้ Markdown, Bullet) และอ้างอิงข้อมูลจำนวนตัวเลขหรือรายละเอียดจากฐานข้อมูลที่ให้ไป ห้ามกุข้อมูลเพิ่มเองเด็ดขาด ถ้าผู้ใช้ถามถึงพื้นที่ใด ให้ตรวจสอบข้อมูล filtered_by_district และตอบข้อมูลของพื้นที่นั้นให้ชัดเจน

คำศัพท์ฐานข้อมูลที่สำคัญ (Data Dictionary):
- total_area_rai: พื้นที่ภูมิศาสตร์/เขตการปกครองทั้งหมด (Total Land Area)
- agri_crop_area_rai: พื้นที่ทำการเกษตรด้านพืช (Agricultural Area)
- farmer_households: จำนวนครัวเรือนเกษตรกร
- household_count: จำนวนครัวเรือน
ให้ระวังการสับสนระหว่าง "พื้นที่ทั้งหมด" (total_area_rai) กับ "พื้นที่การเกษตรทั้งหมด" (agri_crop_area_rai)`
                            },
                            {
                                role: 'user',
                                content: `คำถาม: ${msg}\n\n--- ข้อมูลดิบจากฐานข้อมูล ---\nJSON Data:\n${JSON.stringify(llmContextData, null, 2)}\n---------------------------\nโปรดสรุปและตอบคำถาม`
                            }
                        ],
                        temperature: 0.6,
                        max_tokens: 1500
                    })
                });

                if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    if (aiData.choices && aiData.choices.length > 0) {
                        aiText = aiData.choices[0].message.content;
                        modelUsed = randomModel;
                    }
                } else {
                    const errText = await aiRes.text();
                    console.error("AI API Error:", errText);
                    // OpenRouter models might fail on Groq's endpoint if the API key config doesn't actually support it directly like this, but we'll try!
                }
            } catch (apiErr) {
                console.error("Failed to fetch from AI API:", apiErr);
            }

            const botMsg = {
                role: 'bot',
                text: aiText,
                data: basicResponse.data,
                type: basicResponse.type,
                timestamp: Date.now(),
                modelUsed: modelUsed || 'Mock DB Data' // Store model used
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error("Chatbot Outer Error:", err);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: `ขออภัยครับ เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}\n\n${err.stack}`,
                timestamp: Date.now(),
                type: 'error',
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
        }]);
    };

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
            }}>
                <div className="md-page-header" style={{ marginBottom: 0 }}>
                    <h2>🤖 ผู้ช่วยข้อมูลเกษตร AI</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#656d76' }}>
                        <DatabaseOutlined /> ถามข้อมูลจากระบบได้ทันที • ดึงข้อมูลจริงจาก Database
                    </p>
                </div>
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
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px 20px 12px',
                    }}
                >
                    {messages.map((msg, i) => (
                        <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                            <Avatar
                                size={36}
                                icon={<RobotOutlined />}
                                style={{ background: 'linear-gradient(135deg, #1a7f37, #2ea043)', flexShrink: 0 }}
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
                                <Text type="secondary">กำลังค้นหาข้อมูล...</Text>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Quick Prompts */}
                {messages.length <= 2 && (
                    <div style={{
                        padding: '8px 20px 4px',
                        borderTop: '1px solid #f0f2f5',
                    }}>
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
                                        borderRadius: 20,
                                        fontSize: 12,
                                        height: 30,
                                        border: '1px solid #d0d7de',
                                        background: '#fff',
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
                            placeholder="ถามข้อมูลเกษตรได้เลย..."
                            disabled={loading}
                            size="large"
                            style={{
                                borderRadius: 24,
                                paddingLeft: 20,
                                fontSize: 14,
                            }}
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
                                background: '#1a7f37',
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            💡 ข้อมูลดึงจากฐานข้อมูลจริง ณ เวลาที่ถาม
                        </Text>
                    </div>
                </div>
            </Card>
        </div>
    );
}
