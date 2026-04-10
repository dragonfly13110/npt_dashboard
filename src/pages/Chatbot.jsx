import { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Avatar, Spin, Card, Typography, Tooltip, Switch } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    DeleteOutlined,
    BulbOutlined,
    DatabaseOutlined,
    QuestionCircleOutlined,
    GlobalOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';

import { AI_MODELS, QUICK_PROMPTS, SYSTEM_PROMPT } from '../utils/chatbotConstants';
import { callAI } from '../services/aiService';
import { fetchDatabaseContext, buildContextForAI } from '../services/chatbotDataService';

import ChatMessage from '../components/Chatbot/ChatMessage';
import ModelSelector from '../components/Chatbot/ModelSelector';

const { Text } = Typography;

export default function Chatbot() {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'สวัสดีครับ! 🌾 ผม **น้องข้าวหอม** ผู้ช่วย AI ประจำสำนักงานเกษตรจังหวัดนครปฐม\\n\\nผมรู้ข้อมูลทุกอย่างในระบบ ถามได้ทุกเรื่อง เช่น:\\n• 📍 พื้นที่การเกษตรแต่ละอำเภอ\\n• 🌿 แปลงใหญ่, มาตรฐาน GAP\\n• 🏪 วิสาหกิจชุมชน, Smart Farmer\\n• 🏫 ศูนย์เรียนรู้, ศจช., ศดปช.\\n• ⛈️ ภัยพิบัติ, PM2.5\\n• 💬 หรือจะคุยเรื่องทั่วไปก็ได้ครับ!\\n\\n🔄 เลือกโมเดล AI ที่ต้องการได้ด้านบนนะครับ\\nลองถามได้เลย หรือเลือกคำถามด้านล่าง 👇',
            timestamp: Date.now(),
            type: 'greeting',
            modelKey: null,
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini');
    const [aiSettings, setAiSettings] = useState({
        deepThinking: false,
        webSearch: false
    });
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
            let finalSystemPrompt = SYSTEM_PROMPT;
            if (aiSettings.deepThinking) {
                finalSystemPrompt += `\n\n[โหมดวิเคราะห์เชิงลึก / DEEP ANALYSIS MODE]
คุณต้องวิเคราะห์อย่างละเอียดลึกซึ้งที่สุด:
- สำรวจทุกมิติของข้อมูล (ภาพรวม→รายอำเภอ→เปรียบเทียบ→หาความสัมพันธ์)
- คำนวณสัดส่วน % และจัดอันดับ
- ค้นหาจุดเด่น จุดด้อย และ Outlier
- สรุป Insight สำคัญที่ซ่อนอยู่ในข้อมูล
- นำเสนอข้อเสนอแนะเชิงนโยบายหรือการพัฒนา`;
            }

            const analysis = await fetchDatabaseContext(msg, currentModel, validHistory);

            let aiText;
            let responseType = 'specific';

            if (analysis.isGeneral) {
                const historyToSend = [...validHistory, { role: 'user', text: `คำถาม: ${msg}` }];
                aiText = await callAI(currentModel, finalSystemPrompt, historyToSend, aiSettings);
                responseType = 'general';
            } else {
                const dbContext = buildContextForAI(analysis);
                const analysisHint = {
                    overview: 'สรุปภาพรวมข้อมูลทั้งหมดอย่างครบถ้วน จัดเป็นหมวดหมู่ พร้อมตัวเลขสำคัญ',
                    comparison: 'เปรียบเทียบข้อมูลระหว่างอำเภอ/หมวดหมู่ ใช้ตารางเปรียบเทียบ จัดอันดับ คำนวณ %',
                    detail: 'วิเคราะห์เชิงลึกเฉพาะจุด ให้รายละเอียดครบถ้วน',
                    ranking: 'จัดอันดับข้อมูลจากมากไปน้อย ใช้ตาราง พร้อมวิเคราะห์ว่าทำไมอันดับ 1 ถึงเด่น',
                    correlation: 'วิเคราะห์ความสัมพันธ์ระหว่างชุดข้อมูล เช่น พื้นที่เกษตรเยอะ มีเกษตรกรเยอะตามไหม?',
                };
                const hint = analysisHint[analysis.analysisType] || analysisHint.overview;
                const userPrompt = `คำถาม: ${msg}

🎯 ประเภทการวิเคราะห์: ${analysis.analysisType || 'overview'}
📋 แนวทาง: ${hint}

--- ข้อมูลจริงจากฐานข้อมูลสำนักงานเกษตรจังหวัดนครปฐม (PRE-AGGREGATED) ---
${dbContext}
--- จบข้อมูล ---

⚠️ คำแนะนำสำหรับการวิเคราะห์:
1. ใช้ตัวเลขจาก aggregated_stats.totals/.averages/.rankings เป็นหลัก (คำนวณจริงจาก DB ทั้งหมด)
2. ใช้ aggregated_stats.district_percentages สำหรับคำนวณสัดส่วน %
3. ใช้ aggregated_stats.by_district สำหรับเปรียบเทียบรายอำเภอ
4. ห้ามนับ sample_records เอง — ใช้ pre-computed numbers เท่านั้น
5. สรุป 💡 Insight สำคัญ 2-5 ข้อทุกครั้ง`;

                const historyToSend = [...validHistory, { role: 'user', text: userPrompt }];
                aiText = await callAI(currentModel, finalSystemPrompt, historyToSend, aiSettings);
                responseType = analysis.isOverview ? 'overview' : 'specific';
            }

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f6f8fa', padding: '6px 12px', borderRadius: 12, border: '1px solid #d0d7de', marginRight: 4 }}>
                        <Tooltip title="เปิดโหมดค้นหาอินเทอร์เน็ต เพื่อตอบเรื่องทั่วไปอัปเดตล่าสุด (Gemini รองรับ)">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <GlobalOutlined style={{ color: aiSettings.webSearch ? '#1890ff' : '#8c8c8c' }} />
                                <span style={{ fontSize: 12, color: '#595959', fontWeight: 500 }}>ต่อเน็ต</span>
                                <Switch size="small" checked={aiSettings.webSearch} onChange={v => setAiSettings({...aiSettings, webSearch: v})} disabled={selectedModel !== 'gemini'} />
                            </div>
                        </Tooltip>
                        
                        <div style={{ width: 1, height: 16, background: '#d0d7de' }} />
                        
                        <Tooltip title="เปิดการวิเคราะห์เชิงลึก AI จะให้เหตุผลแสดงกระบวนการคิดอย่างละเอียดก่อนตอบให้เห็น">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AppstoreOutlined style={{ color: aiSettings.deepThinking ? '#722ed1' : '#8c8c8c' }} />
                                <span style={{ fontSize: 12, color: '#595959', fontWeight: 500 }}>คิดเชิงลึก</span>
                                <Switch size="small" checked={aiSettings.deepThinking} onChange={v => setAiSettings({...aiSettings, deepThinking: v})} />
                            </div>
                        </Tooltip>
                    </div>

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
                variant="outlined"
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
