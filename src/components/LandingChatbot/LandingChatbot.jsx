import { useState, useEffect, useRef } from 'react';
import { Button, Input, Tooltip, Avatar, message as antMessage } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    CloseOutlined,
    CommentOutlined,
    ClearOutlined,
    QuestionCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined
} from '@ant-design/icons';
import './LandingChatbot.css';

const API_URL = (import.meta.env.VITE_LANDING_CHATBOT_API_URL || '/api/kku/okmd/api/v1') + '/chat/completions';
const API_KEY = import.meta.env.VITE_LANDING_CHATBOT_API_KEY || 'sk_dl0cb9rVTEYh960G4Ovy7xOYMagsl5cmWquk0aqjyLCTXYPqR9PVBvvzI6DNZAso';
const MODEL_NAME = import.meta.env.VITE_LANDING_CHATBOT_MODEL || 'deepseek-v4-flash';
const DAILY_LIMIT = 10;

const SYSTEM_PROMPT = `คุณคือ "น้องข้าวหอม" 🌾 AI ผู้ช่วยผู้รอบรู้ประจำศูนย์ข้อมูลการเกษตรอัจฉริยะจังหวัดนครปฐม (NPT Agri Dashboard)
บทบาทหลักของคุณคือ:
1. แนะนำผู้ใช้งานทั่วไปว่าระบบแดชบอร์ดของเรามีอะไรบ้าง มีข้อมูลและเมนูอะไรบ้าง
2. แนะนำคีย์เวิร์ดหรือหัวข้อที่ผู้ใช้ต้องการค้นหาเพื่อเข้าไปหน้ารายละเอียดได้อย่างรวดเร็ว
3. พูดคุยทั่วไปเพื่อต้อนรับและแนะนำการใช้งานเบื้องต้น (คุยคร่าวๆ เพื่ออำนวยความสะดวก)

ข้อมูลโครงสร้างหลักและเมนูในระบบของเรา:
- หน้าแรก (Landing Page): แสดงสรุปข้อมูลการเกษตรทั่วไป, ดัชนีฝุ่น PM2.5, จุดความร้อนเฝ้าระวัง, สภาพอากาศ, และสถานการณ์ราคาสินค้าเกษตรรายวัน
- แผนที่อัจฉริยะ (Smart Map): วิเคราะห์พิกัดแปลงเกษตร, แหล่งท่องเที่ยวเชิงเกษตร
- ระบบภาพรวมสรุป (Interactive Dashboard): สำหรับแสดงสถิติวิเคราะห์เปรียบเทียบในรูปแบบโต้ตอบ
- พยากรณ์เตือนภัยโรคและแมลง (AI Disease Forecast): เตือนภัยระบาดล่วงหน้า 7 วันด้วย AI
- ชุมชนเกษตรกร (Farmer Forum): บอร์ดถามตอบ ปรึกษาปัญหา และพูดคุยแบ่งปันข้อมูล
- ข้อมูลสาธารณะที่เปิดให้ค้นหา: แปลงใหญ่ (Large Plots), ท่องเที่ยวเกษตร, วิสาหกิจชุมชน, สถาบันเกษตรกร, เกษตรกรปราดเปรื่อง (Smart Farmer - SF), และเกษตรกรรุ่นใหม่ (Young Smart Farmer - YSF)
- ระบบภายในสำหรับเจ้าหน้าที่ (Admin Area): ต้องลงชื่อเข้าใช้เพื่อดูและจัดการ บุคลากร, สินทรัพย์, งบประมาณโครงการ และประวัติการเปลี่ยนแปลงข้อมูล

หัวข้อ/คีย์เวิร์ดตัวอย่างสำหรับการแนะนำให้ผู้ใช้ไปใช้ช่องค้นหาในเว็บ:
- "ราคาส้มโอวันนี้กี่บาท" หรือ "ราคามะพร้าวน้ำหอม"
- "ข้อมูลแปลงใหญ่บางเลน" หรือ "มาตรฐาน GAP"
- "พื้นที่เพาะปลูกในอำเภอกำแพงแสน" หรือ "ความชื้นดินดอนตูม"
- "Young Smart Farmer นครชัยศรี" หรือ "วิสาหกิจชุมชนสามพราน"

คำแนะนำในการตอบคำถาม:
- ตอบด้วยความสุภาพ น่ารัก เป็นมิตร อ่อนน้อมถ่อมตนตามประเพณีไทย ใช้สรรพนามแทนตัวเองว่า "น้องข้าวหอม" หรือ "หนู" และเรียกผู้ใช้ว่า "คุณพี่" หรือ "คุณเกษตรกร" หรือ "คุณผู้ใช้งาน"
- ใช้ Emoji เกษตรพองาม เช่น 🌾 🧑‍🌾 🚜 📈 🤖
- ตอบให้กระชับ ชัดเจน ทีละ 2-3 ย่อหน้าสั้นๆ เพื่อให้อ่านง่ายบนกล่องสนทนาขนาดเล็ก
- หากผู้ใช้ต้องการรายงานวิเคราะห์เชิงลึก หรือข้อมูลตัวเลขดิบจำนวนมาก ให้แนะนำให้พวกเขาคลิกเข้าไปที่เมนู "ดูสรุปข้อมูลแบบ Interactive" หรือหน้ารายละเอียดของระบบ
- หากผู้ใช้ถามเรื่องที่ไม่เกี่ยวกับการเกษตรเลย หรือพยายามให้ทำเขียนโค้ด ให้เบี่ยงเบนคำตอบกลับมาอย่างนุ่มนวลว่า "น้องข้าวหอมเป็นผู้ช่วยด้านข้อมูลเกษตรนครปฐม ขออนุญาตตอบเฉพาะเรื่องที่เกี่ยวข้องกับการเกษตรและระบบแดชบอร์ดนี้นะคะ 🌾"

แนวทางการใส่ลิงก์นำทางแนะนำ:
- หากผู้ใช้ถามเกี่ยวกับพยากรณ์เตือนภัยโรคพืชและแมลงศัตรูพืช ให้ใส่ลิงก์นี้ในคำตอบเสมอ: [ระบบพยากรณ์เตือนภัยโรคและแมลงศัตรูพืช](/public/disease-forecast)
- หากผู้ใช้ถามเกี่ยวกับแผนที่ หรือ พิกัดแปลงเกษตร ให้ใส่ลิงก์นี้: [แผนที่อัจฉริยะ](/smart-map)
- หากผู้ใช้ถามเกี่ยวกับรายงานข้อมูลภาพรวม หรือสรุปตัวเลขสถิติรวมของจังหวัด ให้ใส่ลิงก์นี้: [ระบบภาพรวมสรุปแบบ Interactive](/interactive-dashboard)
- หากผู้ใช้ถามเกี่ยวกับข้อมูลเกษตรกรปราดเปรื่อง/Smart Farmer ให้ใส่ลิงก์นี้: [ข้อมูลเกษตรกรปราดเปรื่อง (SF)](/public/smart-farmer-sf)
- หากผู้ใช้ถามเกี่ยวกับ Young Smart Farmer ให้ใส่ลิงก์นี้: [ข้อมูลเกษตรกรรุ่นใหม่ (YSF)](/public/young-smart-farmer-ysf)
- หากผู้ใช้ถามเกี่ยวกับวิสาหกิจชุมชน ให้ใส่ลิงก์นี้: [ข้อมูลวิสาหกิจชุมชน](/public/community-enterprises)
- หากผู้ใช้ถามเกี่ยวกับแปลงใหญ่ ให้ใส่ลิงก์นี้: [ข้อมูลแปลงใหญ่](/public/large-plots)
- หากผู้ใช้ถามเกี่ยวกับท่องเที่ยวเชิงเกษตร ให้ใส่ลิงก์นี้: [ข้อมูลท่องเที่ยวเชิงเกษตร](/public/agri-tourism)
- รูปแบบลิงก์ต้องใช้ Markdown เช่น [ข้อความลิงก์](เส้นทางญาติ) เท่านั้น ห้ามเขียน URL เต็ม และห้ามลิงก์ออกไปภายนอกระบบ`;

const QUICK_PROMPTS = [
    { text: 'ระบบนี้มีเมนูเด่นๆ อะไรบ้าง? 📊' },
    { text: 'ค้นหาข้อมูลเกษตรกรหรือแปลงใหญ่อย่างไร? 🔍' },
    { text: 'ดูพยากรณ์โรคพืชและแมลงตรงไหน? 🤖' },
    { text: 'เช็คสภาพอากาศและสถานการณ์น้ำได้ไหม? 🌧️' }
];

const parseMarkdownText = (text) => {
    if (!text) return '';
    const regex = /(\[.*?\]\(.*?\))|(\*\*.*?\*\*)/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
        if (!part) return null;
        if (part.startsWith('[') && part.includes('](')) {
            const labelMatch = part.match(/\[(.*?)\]/);
            const urlMatch = part.match(/\((.*?)\)/);
            if (labelMatch && urlMatch) {
                const label = labelMatch[1];
                const url = urlMatch[1];
                return (
                    <a
                        key={idx}
                        href={url}
                        className="chatbot-inline-link"
                        style={{
                            color: '#16a34a',
                            textDecoration: 'underline',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {label}
                    </a>
                );
            }
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return <span key={idx}>{part}</span>;
    });
};

export default function LandingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [showWelcomeBubble, setShowWelcomeBubble] = useState(true);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `สวัสดีค่ะ! 🌾 หนูนามว่า **น้องข้าวหอม** ยินดีต้อนรับสู่ศูนย์ข้อมูลเกษตรนครปฐมค่ะ!\n\nหนูสามารถช่วยแนะนำได้ว่าในระบบของเรามีข้อมูลอะไรบ้าง ค้นหาข้อมูลอะไรได้บ้าง หรือช่วยแนะแนวทางการเดินทางไปยังเมนูต่างๆ ค่ะ\n\nอยากรู้เรื่องไหน เลือกคำถามแนะนำด้านล่าง หรือพิมพ์คุยกับหนูได้เลยนะคะ 👇`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [remainingLimit, setRemainingLimit] = useState(DAILY_LIMIT);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // Load remaining limit on mount
    useEffect(() => {
        updateLimitState();
        
        // Hide welcome bubble after 10 seconds
        const timer = setTimeout(() => {
            setShowWelcomeBubble(false);
        }, 12000);
        return () => clearTimeout(timer);
    }, []);

    // Scroll to bottom when messages change or open status changes
    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            // Focus input with slight delay to ensure render
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [messages, isOpen]);

    const getTodayDateString = () => {
        const today = new Date();
        return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    };

    const updateLimitState = () => {
        try {
            const todayStr = getTodayDateString();
            const stored = localStorage.getItem('npt_landing_chatbot_limit');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.date === todayStr) {
                    setRemainingLimit(Math.max(0, DAILY_LIMIT - parsed.count));
                    return;
                }
            }
            // If no data or date is different, reset limit
            setRemainingLimit(DAILY_LIMIT);
        } catch (e) {
            console.error('Error reading chatbot limit from localStorage', e);
            setRemainingLimit(DAILY_LIMIT);
        }
    };

    const incrementLimitUsage = () => {
        try {
            const todayStr = getTodayDateString();
            const stored = localStorage.getItem('npt_landing_chatbot_limit');
            let count = 1;
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.date === todayStr) {
                    count = parsed.count + 1;
                }
            }
            localStorage.setItem('npt_landing_chatbot_limit', JSON.stringify({ date: todayStr, count }));
            setRemainingLimit(Math.max(0, DAILY_LIMIT - count));
        } catch (e) {
            console.error('Error saving chatbot limit to localStorage', e);
        }
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (textToSend) => {
        const text = (textToSend || inputValue).trim();
        if (!text || loading) return;

        // Check rate limit
        if (remainingLimit <= 0) {
            antMessage.warning('ขออภัยค่ะ คุณใช้งานโควตาพูดคุยสำหรับวันนี้ครบ 10 ข้อความแล้วค่ะ 🙏');
            return;
        }

        // Add user message
        const newUserMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setLoading(true);

        // Prepare context/history in OpenAI format
        // Keep last 6 messages to preserve context but save token bandwidth
        const history = messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
        }));

        const apiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            newUserMsg
        ];

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: apiMessages,
                    temperature: 0.5,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `HTTP status ${response.status}`);
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;

            if (reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
                incrementLimitUsage();
            } else {
                throw new Error('No reply content received from API');
            }
        } catch (err) {
            console.error('Landing chatbot error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'ขออภัยจริงๆ ค่ะ ระบบขัดข้องชั่วคราว ไม่สามารถตอบคุณพี่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้งนะคะ หรือเลือกเมนูลัดต่างๆ บนหน้าแดชบอร์ดได้เลยค่ะ 🙏'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setMessages([
            {
                role: 'assistant',
                content: `เริ่มการพูดคุยรอบใหม่แล้วค่ะ 🌾 น้องข้าวหอมยินดีบริการค่ะ มีตรงไหนให้หนูช่วยแนะนำ สอบถามมาได้เลยนะคะ!`
            }
        ]);
        inputRef.current?.focus();
    };

    return (
        <div className="landing-chatbot-container">
            {/* Welcome notification bubble on load */}
            {showWelcomeBubble && !isOpen && (
                <div className="landing-chatbot-welcome-bubble" onClick={() => { setIsOpen(true); setShowWelcomeBubble(false); }}>
                    <div className="welcome-bubble-close" onClick={(e) => { e.stopPropagation(); setShowWelcomeBubble(false); }}>
                        <CloseOutlined style={{ fontSize: 10 }} />
                    </div>
                    <div className="welcome-bubble-text">
                        <span>💬 สวัสดีค่ะ! สอบถามข้อมูลระบบกับ <b>น้องข้าวหอม AI</b> ได้ตรงนี้นะคะ 🌾</span>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    className="landing-chatbot-toggle-btn"
                    onClick={() => { setIsOpen(true); setShowWelcomeBubble(false); }}
                    title="คุยกับน้องข้าวหอม AI"
                >
                    <CommentOutlined className="toggle-icon-chat" />
                    <span className="toggle-btn-badge">AI</span>
                </button>
            )}

            {/* Chat Box Panel */}
            {isOpen && (
                <div className="landing-chatbot-panel">
                    {/* Header */}
                    <div className="chatbot-panel-header">
                        <div className="header-info">
                            <Avatar
                                size={36}
                                icon={<RobotOutlined />}
                                className="header-avatar"
                            />
                            <div className="header-text">
                                <span className="header-name">น้องข้าวหอม AI</span>
                                <span className="header-status">
                                    <span className="status-dot"></span> แนะนำการใช้งานทั่วไป
                                </span>
                            </div>
                        </div>
                        <div className="header-actions">
                            <Tooltip title="ล้างการคุย">
                                <button className="header-action-btn" onClick={handleClear} disabled={loading}>
                                    <ClearOutlined />
                                </button>
                            </Tooltip>
                            <button className="header-action-btn close-btn" onClick={() => setIsOpen(false)}>
                                <CloseOutlined />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="chatbot-panel-body">
                        <div className="messages-container">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message-row ${msg.role}`}>
                                    {msg.role === 'assistant' && (
                                        <Avatar
                                            size={28}
                                            icon={<RobotOutlined />}
                                            className="message-avatar"
                                        />
                                    )}
                                    <div className="message-bubble">
                                        <div className="message-content">
                                            {msg.content.split('\n').map((line, lIdx) => {
                                                const parsedLine = parseMarkdownText(line);
                                                if (line.trim().startsWith('•')) {
                                                    return <div key={lIdx} className="bullet-line">• {parseMarkdownText(line.trim().slice(1))}</div>;
                                                }
                                                return <p key={lIdx}>{parsedLine}</p>;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="message-row assistant loading">
                                    <Avatar size={28} icon={<RobotOutlined />} className="message-avatar" />
                                    <div className="message-bubble loading-bubble">
                                        <div className="typing-loader">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Prompt Sugestions - only show when conversation is empty or short */}
                        {messages.length <= 2 && (
                            <div className="quick-prompts-container">
                                <div className="quick-prompts-title">
                                    <QuestionCircleOutlined /> คำถามที่พบบ่อย
                                </div>
                                <div className="quick-prompts-grid">
                                    {QUICK_PROMPTS.map((prompt, pIdx) => (
                                        <button
                                            key={pIdx}
                                            className="quick-prompt-chip"
                                            onClick={() => handleSend(prompt.text)}
                                            disabled={loading || remainingLimit <= 0}
                                        >
                                            {prompt.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Input Area */}
                    <div className="chatbot-panel-footer">
                        {/* Rate Limit Banner */}
                        <div className="limit-banner">
                            {remainingLimit > 0 ? (
                                <span className="limit-info text-success">
                                    <InfoCircleOutlined /> โควตาพูดคุยคงเหลือในวันนี้: <b>{remainingLimit}/{DAILY_LIMIT}</b> ข้อความ
                                </span>
                            ) : (
                                <span className="limit-info text-danger">
                                    <WarningOutlined /> ใช้โควตาครบกำหนด {DAILY_LIMIT} ข้อความ/วันแล้วค่ะ ไว้คุยกันใหม่พรุ่งนี้นะคะ
                                </span>
                            )}
                        </div>

                        <div className="input-group">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onPressEnter={() => handleSend()}
                                placeholder={remainingLimit > 0 ? "สอบถามเรื่องระบบเกษตรนครปฐม..." : "โควตาหมดแล้วค่ะ"}
                                disabled={loading || remainingLimit <= 0}
                                suffix={
                                    <Button
                                        type="text"
                                        icon={<SendOutlined />}
                                        onClick={() => handleSend()}
                                        disabled={!inputValue.trim() || loading || remainingLimit <= 0}
                                        className="footer-send-btn"
                                    />
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
