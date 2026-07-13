import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Tooltip, Avatar, message as antMessage } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  CloseOutlined,
  CommentOutlined,
  ClearOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import './LandingChatbot.css';
import khaolamAvatar from '../../assets/khaolam-avatar.png';
import {
  LANDING_CHATBOT_LINK_POLICY_PROMPT,
  normalizeLandingChatbotLink,
} from './linkSafety';
import {
  LANDING_CHATBOT_CONTEXT_MESSAGE_LIMIT,
  clearLandingChatbotMessages,
  loadLandingChatbotMessages,
  saveLandingChatbotMessages,
} from './conversationStorage';
import { getLandingQuickReply } from './quickReply';
import { LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT } from './publicKnowledge';

const AI_PROXY_URL = '/.netlify/functions/ai-proxy';
const RAW_PROVIDER_NAME =
  import.meta.env.VITE_LANDING_CHATBOT_PROVIDER || 'gemini';
const RAW_MODEL_NAME =
  import.meta.env.VITE_LANDING_CHATBOT_MODEL || 'gemini-3.1-flash-lite';

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemma-4-31b-it',
];

let PROVIDER_NAME = RAW_PROVIDER_NAME;
let MODEL_NAME = RAW_MODEL_NAME;

// Dynamically align provider and model if there is a configuration mismatch
if (PROVIDER_NAME === 'gemini' && !GEMINI_MODELS.includes(MODEL_NAME)) {
  const KKU_MODEL_PREFIXES = [
    'deepseek',
    'claude',
    'gpt',
    'qwen',
    'sonar',
    'llama',
    'grok',
    'nova',
  ];
  const isKkuModel = KKU_MODEL_PREFIXES.some((prefix) =>
    MODEL_NAME.toLowerCase().startsWith(prefix)
  );
  if (isKkuModel) {
    PROVIDER_NAME = 'kku';
  } else {
    MODEL_NAME = 'gemini-3.1-flash-lite';
  }
}

const DAILY_LIMIT = 10;
const LANDING_CHATBOT_TIMEOUT_MS = 20000;
const CONTEXT_MEMORY_PROMPT =
  'Use the recent conversation history as context for follow-up questions. If the user asks "that", "it", "same one", "เมื่อกี้", or similar references, resolve it from the previous messages instead of treating the new message as an isolated question.';

const SYSTEM_PROMPT = `คุณคือ "น้องข้าวหลาม" 🌾 AI ผู้ช่วยผู้รอบรู้ประจำศูนย์ข้อมูลการเกษตรอัจฉริยะจังหวัดนครปฐม (NPT Agri Dashboard)
บทบาทหลักของคุณคือ:
1. แนะนำผู้ใช้งานทั่วไปว่าระบบแดชบอร์ดของเรามีอะไรบ้าง มีข้อมูลและเมนูอะไรบ้าง
2. แนะนำคีย์เวิร์ดหรือหัวข้อที่ผู้ใช้ต้องการค้นหาเพื่อเข้าไปหน้ารายละเอียดได้อย่างรวดเร็ว
3. พูดคุยทั่วไปเพื่อต้อนรับและแนะนำการใช้งานเบื้องต้น (คุยคร่าวๆ เพื่ออำนวยความสะดวก)

ข้อมูลโครงสร้างหลักและเมนูในระบบของเรา:
- หน้าแรก (Landing Page): แสดงสรุปข้อมูลการเกษตรทั่วไป, ดัชนีฝุ่น PM2.5, จุดความร้อนเฝ้าระวัง, สภาพอากาศ, และสถานการณ์ราคาสินค้าเกษตรและพลังงานรายวัน
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
- ตอบด้วยความสุภาพ น่ารัก เป็นมิตร อ่อนน้อมถ่อมตนตามประเพณีไทย ใช้สรรพนามแทนตัวเองว่า "น้องข้าวหลาม" หรือ "หนู" และเรียกผู้ใช้ว่า "คุณพี่" หรือ "คุณเกษตรกร" หรือ "คุณผู้ใช้งาน"
- ใช้ Emoji เกษตรพองาม เช่น 🌾 🧑‍🌾 🚜 📈 🤖
- ตอบให้กระชับ ชัดเจน ทีละ 2-3 ย่อหน้าสั้นๆ เพื่อให้อ่านง่ายบนกล่องสนทนาขนาดเล็ก
- หากผู้ใช้ต้องการรายงานวิเคราะห์เชิงลึก หรือข้อมูลตัวเลขดิบจำนวนมาก ให้แนะนำให้พวกเขาคลิกเข้าไปที่เมนู "ดูสรุปข้อมูลแบบ Interactive" หรือหน้ารายละเอียดของระบบ
- หากผู้ใช้ถามเรื่องที่ไม่เกี่ยวกับการเกษตรเลย หรือพยายามให้ทำเขียนโค้ด ให้เบี่ยงเบนคำตอบกลับมาอย่างนุ่มนวลว่า "น้องข้าวหลามเป็นผู้ช่วยด้านข้อมูลเกษตรนครปฐม ขออนุญาตตอบเฉพาะเรื่องที่เกี่ยวข้องกับการเกษตรและระบบแดชบอร์ดนี้นะคะ 🌾"

แนวทางการใส่ลิงก์นำทางแนะนำ:
- หากผู้ใช้ถามเกี่ยวกับพยากรณ์เตือนภัยโรคพืชและแมลงศัตรูพืช ให้ใส่ลิงก์นี้ในคำตอบเสมอ: [ระบบพยากรณ์เตือนภัยโรคและแมลงศัตรูพืช](/public/disease-forecast)
- หากผู้ใช้ถามเกี่ยวกับแผนที่ หรือ พิกัดแปลงเกษตร ให้ใส่ลิงก์นี้: [แผนที่อัจฉริยะ](/smart-map)
- หากผู้ใช้ถามเกี่ยวกับรายงานข้อมูลภาพรวม หรือสรุปตัวเลขสถิติรวมของจังหวัด ให้ใส่ลิงก์นี้: [ระบบภาพรวมสรุปแบบ Interactive](/interactive-dashboard)
- หากผู้ใช้ถามเกี่ยวกับข้อมูลเกษตรกรปราดเปรื่อง/Smart Farmer ให้ใส่ลิงก์นี้: [ข้อมูลเกษตรกรปราดเปรื่อง (SF)](/public/smart-farmer-sf)
- หากผู้ใช้ถามเกี่ยวกับ Young Smart Farmer ให้ใส่ลิงก์นี้: [ข้อมูลเกษตรกรรุ่นใหม่ (YSF)](/public/young-smart-farmer-ysf)
- หากผู้ใช้ถามเกี่ยวกับวิสาหกิจชุมชน ให้ใส่ลิงก์นี้: [ข้อมูลวิสาหกิจชุมชน](/public/community-enterprises)
- หากผู้ใช้ถามเกี่ยวกับแปลงใหญ่ ให้ใส่ลิงก์นี้: [ข้อมูลแปลงใหญ่](/public/large-plots)
- หากผู้ใช้ถามเกี่ยวกับท่องเที่ยวเชิงเกษตร ให้ใส่ลิงก์นี้: [ข้อมูลท่องเที่ยวเชิงเกษตร](/public/agri-tourism)
- หากผู้ใช้ถามเกี่ยวกับสถาบันเกษตรกร ให้ใส่ลิงก์นี้: [ข้อมูลวิสาหกิจชุมชน](/public/community-enterprises)
- หากผู้ใช้ถามเกี่ยวกับพื้นที่การเกษตร ให้ใส่ลิงก์นี้: [ข้อมูลพื้นที่การเกษตร](/public/agricultural-areas)
- หากผู้ใช้ถามเกี่ยวกับราคาสินค้าเกษตร ให้ใส่ลิงก์นี้: [ข้อมูลราคาสินค้าเกษตรและพลังงาน](/public/agricultural-prices)
- หากผู้ใช้ถามเกี่ยวกับจุดความร้อน หรือ PM2.5 ให้ใส่ลิงก์นี้: [พิกัดจุดความร้อน (Fire Hotspots)](/public/fire-hotspots)
- หากผู้ใช้ถามเกี่ยวกับ Smart Farmer โดยรวม ให้ใส่ลิงก์นี้: [ข้อมูล Smart Farmer รวม](/public/smart-farmers)
- รูปแบบลิงก์ต้องใช้ Markdown เช่น [ข้อความลิงก์](Relative Path ในระบบ เช่น /public/large-plots) เท่านั้น ห้ามเขียน URL เต็ม และห้ามลิงก์ออกไปภายนอกระบบ ห้ามคิดหรือคาดเดาเส้นทางลิงก์อื่นๆ ขึ้นมาเองนอกเหนือจากรายการที่กำหนดไว้นี้เด็ดขาด`;

const QUICK_PROMPTS = [
  { text: 'ระบบนี้มีเมนูเด่นๆ อะไรบ้าง? 📊' },
  { text: 'ค้นหาข้อมูลเกษตรกรหรือแปลงใหญ่อย่างไร? 🔍' },
  { text: 'ดูพยากรณ์โรคพืชและแมลงตรงไหน? 🤖' },
  { text: 'เช็คสภาพอากาศและสถานการณ์น้ำได้ไหม? 🌧️' },
];

// eslint-disable-next-line react-refresh/only-export-components
export const parseMarkdownText = (text) => {
  if (!text) return '';
  const regex = /(\[[^\]]+\]\([^\s)]+\)|\*\*.*?\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('[') && part.includes('](')) {
      const labelMatch = part.match(/\[(.*?)\]/);
      const urlMatch = part.match(/\((.*?)\)/);
      if (labelMatch && urlMatch) {
        const label = labelMatch[1];
        const safeUrl = normalizeLandingChatbotLink(urlMatch[1]);

        if (!safeUrl) {
          return <span key={idx}>{label}</span>;
        }

        return (
          <Link
            key={idx}
            to={safeUrl}
            className="chatbot-inline-link"
            style={{
              color: '#16a34a',
              textDecoration: 'underline',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </Link>
        );
      }
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{parseMarkdownText(part.slice(2, -2))}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
};

export default function LandingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(true);
  const [messages, setMessages] = useState(() =>
    loadLandingChatbotMessages([
      {
        role: 'assistant',
        content: `สวัสดีค่ะ! 🌾 หนูนามว่า **น้องข้าวหลาม** ยินดีต้อนรับสู่ศูนย์ข้อมูลเกษตรนครปฐมค่ะ!\n\nหนูสามารถช่วยแนะนำได้ว่าในระบบของเรามีข้อมูลอะไรบ้าง ค้นหาข้อมูลอะไรได้บ้าง หรือช่วยแนะแนวทางการเดินทางไปยังเมนูต่างๆ ค่ะ\n\nอยากรู้เรื่องไหน เลือกคำถามแนะนำด้านล่าง หรือพิมพ์คุยกับหนูได้เลยนะคะ 👇`,
      },
    ])
  );
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingLimit, setRemainingLimit] = useState(DAILY_LIMIT);
  const usedLimit = DAILY_LIMIT - remainingLimit;

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  function getTodayDateString() {
    const today = new Date();
    return (
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    );
  }

  const updateLimitState = useCallback(() => {
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
  }, []);

  function incrementLimitUsage() {
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
      localStorage.setItem(
        'npt_landing_chatbot_limit',
        JSON.stringify({ date: todayStr, count })
      );
      setRemainingLimit(Math.max(0, DAILY_LIMIT - count));
    } catch (e) {
      console.error('Error saving chatbot limit to localStorage', e);
    }
  }

  function scrollToBottom() {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // Load remaining limit on mount
  useEffect(() => {
    updateLimitState();

    // Hide welcome bubble after 10 seconds
    const timer = setTimeout(() => {
      setShowWelcomeBubble(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [updateLimitState]);

  useEffect(() => {
    saveLandingChatbotMessages(messages);
  }, [messages]);

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

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const newUserMsg = { role: 'user', content: text };
    const quickReply = getLandingQuickReply(text);
    if (quickReply) {
      setMessages((prev) => [
        ...prev,
        newUserMsg,
        { role: 'assistant', content: quickReply },
      ]);
      setInputValue('');
      return;
    }

    // Check rate limit
    if (remainingLimit <= 0) {
      antMessage.warning(
        'ขออภัยค่ะ คุณใช้งานโควตาพูดคุยสำหรับวันนี้ครบ 10 ข้อความแล้วค่ะ 🙏'
      );
      return;
    }

    // Add user message
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');
    setLoading(true);

    // Prepare recent context/history.
    const history = messages
      .slice(-LANDING_CHATBOT_CONTEXT_MESSAGE_LIMIT)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    let requestPayload;
    if (PROVIDER_NAME === 'gemini') {
      const contents = [
        ...history.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [{ text: newUserMsg.content }],
        },
      ];

      requestPayload = {
        provider: 'gemini',
        landing: true,
        body: {
          model: MODEL_NAME,
          contents,
          stream: true,
        },
      };
    } else {
      const apiMessages = [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\n${LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT}\n\n${CONTEXT_MEMORY_PROMPT}\n\n${LANDING_CHATBOT_LINK_POLICY_PROMPT}`,
        },
        ...history,
        newUserMsg,
      ];

      requestPayload = {
        provider: 'kku',
        body: {
          model: MODEL_NAME,
          messages: apiMessages,
          temperature: 0.5,
          max_tokens: 350,
          stream: true,
        },
      };
    }

    try {
      const response = await fetch(AI_PROXY_URL, {
        signal: AbortSignal.timeout(LANDING_CHATBOT_TIMEOUT_MS),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP status ${response.status}`);
      }

      // Add a placeholder message for the assistant
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedReply = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                let chunkText = '';

                if (PROVIDER_NAME === 'gemini') {
                  const parts = data.candidates?.[0]?.content?.parts || [];
                  chunkText = parts
                    .filter((p) => !p.thought)
                    .map((p) => p.text || '')
                    .join('');
                } else {
                  const delta = data.choices?.[0]?.delta;
                  if (delta?.content) {
                    chunkText = delta.content;
                  }
                }

                if (chunkText) {
                  accumulatedReply += chunkText;
                  setMessages((prev) => {
                    const next = [...prev];
                    if (next.length > 0) {
                      next[next.length - 1] = {
                        ...next[next.length - 1],
                        content: accumulatedReply,
                      };
                    }
                    return next;
                  });
                }
              } catch (e) {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      } finally {
        if (typeof reader.releaseLock === 'function') {
          reader.releaseLock();
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        const dataStr = buffer.slice(6).trim();
        if (dataStr && dataStr !== '[DONE]') {
          try {
            const data = JSON.parse(dataStr);
            let chunkText = '';

            if (PROVIDER_NAME === 'gemini') {
              const parts = data.candidates?.[0]?.content?.parts || [];
              chunkText = parts
                .filter((p) => !p.thought)
                .map((p) => p.text || '')
                .join('');
            } else {
              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                chunkText = delta.content;
              }
            }

            if (chunkText) {
              accumulatedReply += chunkText;
              setMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = {
                    ...next[next.length - 1],
                    content: accumulatedReply,
                  };
                }
                return next;
              });
            }
          } catch (e) {}
        }
      }

      if (accumulatedReply) {
        incrementLimitUsage();
      } else {
        throw new Error('No reply content received from API');
      }
    } catch (err) {
      console.error('Landing chatbot error:', err);
      // Clean up final message if it is empty to avoid showing blank bubble
      setMessages((prev) => {
        const next = [...prev];
        if (
          next.length > 0 &&
          next[next.length - 1].role === 'assistant' &&
          !next[next.length - 1].content
        ) {
          next.pop();
        }
        return [
          ...next,
          {
            role: 'assistant',
            content:
              'ขออภัยจริงๆ ค่ะ ระบบขัดข้องชั่วคราว ไม่สามารถตอบคุณพี่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้งนะคะ หรือเลือกเมนูลัดต่างๆ บนหน้าแดชบอร์ดได้เลยค่ะ 🙏',
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearLandingChatbotMessages();
    setMessages([
      {
        role: 'assistant',
        content: `เริ่มการพูดคุยรอบใหม่แล้วค่ะ 🌾 น้องข้าวหลามยินดีบริการค่ะ มีตรงไหนให้หนูช่วยแนะนำ สอบถามมาได้เลยนะคะ!`,
      },
    ]);
    inputRef.current?.focus();
  };

  return (
    <div className="landing-chatbot-container">
      {/* Welcome notification bubble on load */}
      {showWelcomeBubble && !isOpen && (
        <div
          className="landing-chatbot-welcome-bubble"
          onClick={() => {
            setIsOpen(true);
            setShowWelcomeBubble(false);
          }}
        >
          <div
            className="welcome-bubble-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowWelcomeBubble(false);
            }}
          >
            <CloseOutlined style={{ fontSize: 10 }} />
          </div>
          <div className="welcome-bubble-text">
            <span>
              💬 สวัสดีค่ะ! สอบถามข้อมูลระบบกับ <b>น้องข้าวหลาม AI</b>{' '}
              ได้ตรงนี้นะคะ 🌾
            </span>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          className="landing-chatbot-toggle-btn"
          onClick={() => {
            setIsOpen(true);
            setShowWelcomeBubble(false);
          }}
          title="คุยกับน้องข้าวหลาม AI"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <img
            src={khaolamAvatar}
            alt="น้องข้าวหลาม AI"
            style={{
              width: '85%',
              height: '85%',
              objectFit: 'contain',
              borderRadius: '50%',
            }}
          />
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
                src={khaolamAvatar}
                className="header-avatar"
                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
              />
              <div className="header-text">
                <span className="header-name">น้องข้าวหลาม AI</span>
                <span className="header-status">
                  <span className="status-dot"></span> แนะนำการใช้งานทั่วไป
                </span>
              </div>
            </div>
            <div className="header-actions">
              <Tooltip title="ล้างการคุย">
                <button
                  className="header-action-btn"
                  onClick={handleClear}
                  disabled={loading}
                >
                  <ClearOutlined />
                </button>
              </Tooltip>
              <button
                className="header-action-btn close-btn"
                onClick={() => setIsOpen(false)}
              >
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
                      src={khaolamAvatar}
                      className="message-avatar"
                    />
                  )}
                  <div className="message-bubble">
                    <div className="message-content">
                      {msg.content.split('\n').map((line, lIdx) => {
                        const parsedLine = parseMarkdownText(line);
                        if (line.trim().startsWith('•')) {
                          return (
                            <div key={lIdx} className="bullet-line">
                              • {parseMarkdownText(line.trim().slice(1))}
                            </div>
                          );
                        }
                        return <p key={lIdx}>{parsedLine}</p>;
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-row assistant loading">
                  <Avatar
                    size={28}
                    src={khaolamAvatar}
                    className="message-avatar"
                  />
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
                  <InfoCircleOutlined /> ใช้โควตาพูดคุยวันนี้แล้ว:{' '}
                  <b>
                    {usedLimit}/{DAILY_LIMIT}
                  </b>{' '}
                  ข้อความ
                </span>
              ) : (
                <span className="limit-info text-danger">
                  <WarningOutlined /> ใช้โควตาครบกำหนด {DAILY_LIMIT}{' '}
                  ข้อความ/วันแล้วค่ะ ไว้คุยกันใหม่พรุ่งนี้นะคะ
                </span>
              )}
            </div>

            <div className="input-group">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={() => handleSend()}
                placeholder={
                  remainingLimit > 0
                    ? 'สอบถามเรื่องระบบเกษตรนครปฐม...'
                    : 'โควตาหมดแล้วค่ะ'
                }
                disabled={loading || remainingLimit <= 0}
                suffix={
                  <Button
                    type="text"
                    icon={<SendOutlined />}
                    onClick={() => handleSend()}
                    disabled={
                      !inputValue.trim() || loading || remainingLimit <= 0
                    }
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
