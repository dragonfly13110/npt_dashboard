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
async function analyzeQuery(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    // Determine which tables to query based on keywords
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

    // Check for overview/summary query
    const isOverview = /สรุป|ภาพรวม|ทั้งหมด|overview|summary|รวม/.test(lowerQuery);

    // Find matching tables
    let matchedTables = [];
    if (isOverview) {
        matchedTables = Object.keys(TABLE_CONFIG);
    } else {
        for (const [table, keywords] of Object.entries(tableKeywords)) {
            if (keywords.some(kw => lowerQuery.includes(kw))) {
                matchedTables.push(table);
            }
        }
    }

    // If no match, try all tables for count overview
    if (matchedTables.length === 0) {
        matchedTables = Object.keys(TABLE_CONFIG);
    }

    // Fetch data from matched tables
    for (const table of matchedTables) {
        try {
            const { count, error: countError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (countError) continue;

            const tableInfo = TABLE_CONFIG[table];
            const entry = {
                table,
                label: tableInfo.label,
                icon: tableInfo.icon,
                group: tableInfo.group,
                count: count || 0,
                sample: null,
            };

            // For specific queries, fetch sample data
            if (!isOverview && matchedTables.length <= 3 && count > 0) {
                const { data } = await supabase
                    .from(table)
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);
                entry.sample = data;
            }

            results.push(entry);
        } catch {
            // skip
        }
    }

    return { results, isOverview, query };
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
        let text = `${r.icon} **${r.label}**\n\nมีข้อมูลทั้งหมด **${r.count.toLocaleString()} รายการ** ในกลุ่มงาน "${r.group}"\n`;

        if (r.sample && r.sample.length > 0) {
            text += `\n📋 **ข้อมูลล่าสุด ${r.sample.length} รายการ:**\n`;
            r.sample.forEach((row, i) => {
                const name = row.name || row.full_name || row.project_name || row.center_name ||
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
                                content: 'คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับ Admin ระบบจัดการข้อมูลการเกษตรจังหวัดนครปฐม หน้าที่ของคุณคือตอบคำถามด้วยความสุภาพ เป็นมืออาชีพ พร้อมจัดรูปแบบให้น่าอ่านมากที่สุด (ใช้ Markdown, แบ่ง Bullet ข้อย่อย, ใส่ Emoji เข้ามาคั่นข้อความเพื่อให้การอ่านดูผ่อนคลาย) โดยอิงตามข้อมูลจริงที่แนบมาให้ อย่าแต่งข้อมูลตัวเลขหรือข้อเท็จจริงขึ้นมาเพิ่มเติมเด็ดขาด ถ้าไม่มีข้อมูลให้บอกว่าไม่พบในระบบ'
                            },
                            {
                                role: 'user',
                                content: `คำถามจาก Admin: ${msg}\n\n--- ข้อมูลดิบจากข้อความที่ค้นพบในฐานข้อมูล ---\n${basicResponse.text}\n---------------------------\nโปรดสรุปและตอบคำถามจากข้อมูลด้านบนให้กระชับและเข้าใจง่ายสำหรับ Admin`
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
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'ขออภัยครับ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง 🙏',
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
