import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Input,
  Button,
  Avatar,
  Spin,
  Card,
  Typography,
  Tooltip,
  Upload,
  Select,
  message as antMessage,
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  DeleteOutlined,
  BulbOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  PaperClipOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  ClearOutlined,
  StopOutlined,
} from '@ant-design/icons';

import {
  AI_MODELS,
  QUICK_PROMPTS,
  SYSTEM_PROMPT,
} from '../utils/chatbotConstants';
import { callAI } from '../services/aiService';
import {
  fetchDatabaseContext,
  buildContextForAI,
} from '../services/chatbotDataService';

import ChatMessage from '../components/Chatbot/ChatMessage';
import LoadingIndicator from '../components/Chatbot/LoadingIndicator';
import khaolamAvatar from '../assets/khaolam-avatar.png';

const { Text } = Typography;

/* ── Inline CSS ────────────────────────────────────── */
const styles = {
  page: {
    height: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  /* ─── Toolbar ─── */
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    background: '#ffffff',
    borderRadius: '16px 16px 0 0',
    borderBottom: '1px solid #f0f2f5',
    flexWrap: 'wrap',
  },
  toolbarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginRight: 'auto',
  },
  toolbarTitleText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  toolbarSubtext: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 500,
  },
  modelSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 10px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  modelSelectorLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  /* Toggle pill */
  togglePill: (isActive, activeColor) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 24,
    border: `1.5px solid ${isActive ? activeColor : '#e2e8f0'}`,
    background: isActive ? `${activeColor}10` : '#f8fafc',
    color: isActive ? activeColor : '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }),
  toggleDot: (isActive, color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: isActive ? color : '#cbd5e1',
    transition: 'all 0.2s ease',
    boxShadow: isActive ? `0 0 6px ${color}80` : 'none',
  }),
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 24,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  /* ─── Chat area ─── */
  chatCard: {
    flex: 1,
    borderRadius: '0 0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: 'none',
  },
  chatScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px 12px',
  },
  /* ─── Quick prompts ─── */
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 8,
    padding: '12px 20px 8px',
    borderTop: '1px solid #f0f2f5',
  },
  quickCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    color: '#334155',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    lineHeight: 1.4,
  },
  quickIcon: {
    fontSize: 18,
    flexShrink: 0,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    borderRadius: 8,
  },
  /* ─── Attached file ─── */
  attachedBar: {
    padding: '8px 20px',
    background: '#fff',
    borderTop: '1px solid #f0f2f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    padding: '5px 14px',
    borderRadius: 10,
    border: '1px solid #93c5fd',
  },
  /* ─── Input area ─── */
  inputArea: {
    padding: '12px 16px 14px',
    borderTop: '1px solid #f0f2f5',
    background: '#fafbfc',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusChip: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: 10,
    background: `${color}12`,
    color: color,
    border: `1px solid ${color}30`,
  }),
};

export default function Chatbot() {
  const [messages, setMessages] = useState(() => {
    const defaultGreeting = {
      role: 'bot',
      text: `สวัสดีครับ! 🌾 ผม **น้องข้าวหลาม** ผู้ช่วย AI ประจำสำนักงานเกษตรจังหวัดนครปฐม\n\nผมรู้ข้อมูลทุกอย่างในระบบ ถามได้ทุกเรื่อง เช่น:\n• 📍 พื้นที่การเกษตรแต่ละอำเภอ\n• 🌿 แปลงใหญ่, มาตรฐาน GAP\n• 🏪 วิสาหกิจชุมชน, Smart Farmer\n• 🏫 ศูนย์เรียนรู้, ศจช., ศดปช.\n• ⛈️ ภัยพิบัติ, PM2.5\n• 💬 หรือจะคุยเรื่องทั่วไปก็ได้ครับ!\n\nลองถามได้เลย หรือเลือกคำถามด้านล่าง 👇`,
      timestamp: Date.now(),
      type: 'greeting',
      modelKey: null,
    };
    try {
      const stored = localStorage.getItem('npt_dashboard_chatbot_messages_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading chatbot history:', e);
    }
    return [defaultGreeting];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    try {
      // Keep only last 50 messages to save space
      const toStore = messages.slice(-50);
      localStorage.setItem(
        'npt_dashboard_chatbot_messages_v1',
        JSON.stringify(toStore)
      );
    } catch (e) {
      console.error('Error saving chatbot history:', e);
    }
  }, [messages]);
  const [selectedModel, setSelectedModel] = useState('kkuGeminiFlash');
  const [selectedProvider, setSelectedProvider] = useState('OKMD AI');
  const [aiSettings, setAiSettings] = useState({
    deepThinking: false,
    webSearch: false,
  });
  const [attachedFile, setAttachedFile] = useState(null);
  const abortControllerRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-turn off webSearch when switching to unsupported model
  const handleModelChange = (key) => {
    setSelectedModel(key);
    setSelectedProvider(AI_MODELS[key]?.provider || selectedProvider);
    // If switching to a model that doesn't support webSearch, turn it off
    if (key !== 'gemini' && key !== 'gemma') {
      setAiSettings((prev) => ({ ...prev, webSearch: false }));
    }
  };

  const handleProviderChange = (provider) => {
    const firstModel = Object.values(AI_MODELS).find(
      (model) => model.provider === provider
    );
    setSelectedProvider(provider);
    if (firstModel) handleModelChange(firstModel.key);
  };

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) => [
      ...prev,
      {
        role: 'bot',
        text: '🛑 ยกเลิกการสร้างข้อความแล้ว',
        timestamp: Date.now(),
        type: 'error',
      },
    ]);
    setLoading(false);
  }, []);

  const handleSend = useCallback(
    async (text) => {
      const msg = text || input.trim();
      if (!msg || loading) return;

      const currentModel = selectedModel;
      let actualModelUsed = currentModel;

      const validHistory = messages
        .filter(
          (m) =>
            (m.role === 'user' || m.role === 'bot') &&
            m.type !== 'greeting' &&
            m.type !== 'error'
        )
        .slice(-16)
        .map((m) => {
          if (m.role === 'bot' && m.text && m.text.length > 600) {
            return {
              ...m,
              text:
                m.text.substring(0, 600) +
                '\n...[สรุปคำตอบยาว — ตัดท้ายเพื่อประหยัด token]',
            };
          }
          return m;
        });

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsg = { role: 'user', text: msg, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setIsStreaming(false);

      try {
        let fileData = null;
        if (attachedFile) {
          fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target.result.split(',')[1];
              resolve({
                inlineData: {
                  data: base64,
                  mimeType: attachedFile.type,
                },
              });
            };
            reader.readAsDataURL(attachedFile);
          });
        }

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

        const analysis = await fetchDatabaseContext(
          msg,
          currentModel,
          validHistory,
          controller.signal
        );

        let aiText;
        let responseType = 'specific';

        if (!analysis.directAnswer) {
          const botMsgPlaceholder = {
            role: 'bot',
            text: '',
            type: 'specific',
            timestamp: Date.now(),
            modelKey: currentModel,
            isStreaming: true,
          };
          setMessages((prev) => [...prev, botMsgPlaceholder]);
        }

        const onChunk = (chunkText, accumulatedText) => {
          setIsStreaming(true);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                text: accumulatedText,
              };
            }
            return updated;
          });
        };

        const executeAiCall = async (modelKey, promptHistory) => {
          try {
            return await callAI(
              modelKey,
              finalSystemPrompt,
              promptHistory,
              aiSettings,
              fileData,
              controller.signal,
              onChunk
            );
          } catch (firstErr) {
            if (firstErr.name === 'AbortError' || controller.signal?.aborted) {
              throw firstErr;
            }

            // Determine fallback model
            const fallbackModelKey =
              modelKey === 'deepseekV4' || modelKey === 'kkuDeepseek'
                ? 'gemini'
                : 'kkuDeepseek';

            actualModelUsed = fallbackModelKey;

            console.warn(
              `Model ${modelKey} failed. Falling back to ${fallbackModelKey}...`,
              firstErr
            );

            // Notify user
            const failedModelName = AI_MODELS[modelKey]?.shortLabel || modelKey;
            const fallbackModelName =
              AI_MODELS[fallbackModelKey]?.shortLabel || fallbackModelKey;
            antMessage.warning(
              `⚠️ ${failedModelName} ขัดข้อง กำลังสลับใช้ ${fallbackModelName} แทนอัตโนมัติ...`
            );

            // Update selected model & provider state in UI so subsequent chats use fallback
            setSelectedModel(fallbackModelKey);
            setSelectedProvider(
              AI_MODELS[fallbackModelKey]?.provider || selectedProvider
            );

            // Update the placeholder message's model key if present
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  modelKey: fallbackModelKey,
                };
              }
              return updated;
            });

            let fallbackSettings = aiSettings;
            if (fallbackModelKey !== 'gemini' && fallbackModelKey !== 'gemma') {
              fallbackSettings = { ...aiSettings, webSearch: false };
              setAiSettings(fallbackSettings);
            }

            // Retry with fallback
            return await callAI(
              fallbackModelKey,
              finalSystemPrompt,
              promptHistory,
              fallbackSettings,
              fileData,
              controller.signal,
              onChunk
            );
          }
        };

        if (analysis.isGeneral) {
          const historyToSend = [
            ...validHistory,
            { role: 'user', text: `คำถาม: ${msg}` },
          ];
          aiText = await executeAiCall(currentModel, historyToSend);
          responseType = 'general';
        } else {
          const dbContext = buildContextForAI(analysis);
          const analysisHint = {
            overview:
              'สรุปภาพรวมข้อมูลทั้งหมดอย่างครบถ้วน จัดเป็นหมวดหมู่ พร้อมตัวเลขสำคัญ',
            comparison:
              'เปรียบเทียบข้อมูลระหว่างอำเภอ/หมวดหมู่ ใช้ตารางเปรียบเทียบ จัดอันดับ คำนวณ %',
            detail: 'วิเคราะห์เชิงลึกเฉพาะจุด ให้รายละเอียดครบถ้วน',
            ranking:
              'จัดอันดับข้อมูลจากมากไปน้อย ใช้ตาราง พร้อมวิเคราะห์ว่าทำไมอันดับ 1 ถึงเด่น',
            correlation:
              'วิเคราะห์ความสัมพันธ์ระหว่างชุดข้อมูล เช่น พื้นที่เกษตรเยอะ มีเกษตรกรเยอะตามไหม?',
          };
          const hint =
            analysisHint[analysis.analysisType] || analysisHint.overview;
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

          const historyToSend = [
            ...validHistory,
            { role: 'user', text: userPrompt },
          ];
          aiText = await executeAiCall(currentModel, historyToSend);
          responseType = analysis.isOverview ? 'overview' : 'specific';
        }

        setAttachedFile(null);

        if (!aiText) {
          if (analysis.results?.length > 0) {
            const totalRecords = analysis.results.reduce(
              (s, r) => s + r.count,
              0
            );
            aiText = `📊 พบข้อมูลที่เกี่ยวข้อง ${analysis.results.length} หมวด รวม ${totalRecords.toLocaleString()} รายการ\n\n`;
            analysis.results.forEach((r) => {
              aiText += `${r.icon} **${r.label}**: ${r.count.toLocaleString()} รายการ\n`;
            });
            aiText +=
              '\n⚠️ ระบบ AI ไม่สามารถตอบได้ชั่วคราว แต่ข้อมูลดิบจากฐานข้อมูลแสดงด้านบนครับ';
          } else {
            aiText =
              'ขออภัยครับ ระบบ AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ 🙏';
          }
        }

        if (analysis.directAnswer) {
          const botMsg = {
            role: 'bot',
            text: aiText,
            data: analysis.results,
            type: responseType,
            timestamp: Date.now(),
            modelKey: actualModelUsed,
          };
          setMessages((prev) => [...prev, botMsg]);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                text: aiText,
                data: analysis.results,
                type: responseType,
                timestamp: Date.now(),
                modelKey: actualModelUsed,
                isStreaming: false,
              };
            }
            return updated;
          });
        }
      } catch (err) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          // Request was aborted by user or unmount, ignore error display
          return;
        }
        let errorMsg = err.message;
        if (errorMsg === 'Failed to fetch') {
          errorMsg =
            'การเชื่อมต่อขัดข้อง (Failed to fetch) — อาจเกิดจากไฟล์มีขนาดใหญ่เกินไป (> 4MB) หรือเซิร์ฟเวอร์ของคุณดับไป';
        } else if (errorMsg.includes('502') || errorMsg.includes('504')) {
          errorMsg =
            'AI ใช้เวลาคิดและค้นหาข้อมูลนานเกินไปจนหมดเวลา (Timeout 502) — แนะนำให้ปิดโหมด "ต่อเน็ต" หรือ "คิดเชิงลึก" เพื่อให้ตอบกลับเร็วขึ้นครับ';
        }
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const errorMsgObj = {
            role: 'bot',
            text: `⚠️ เกิดข้อผิดพลาดจาก ${AI_MODELS[actualModelUsed]?.description || actualModelUsed}: ${errorMsg}\n\nลองสลับไปใช้โมเดลอื่น หรือลองใหม่อีกครั้งครับ 🙏`,
            timestamp: Date.now(),
            type: 'error',
            modelKey: actualModelUsed,
          };
          if (
            lastIndex >= 0 &&
            updated[lastIndex].role === 'bot' &&
            (updated[lastIndex].isStreaming || updated[lastIndex].text === '')
          ) {
            updated[lastIndex] = errorMsgObj;
          } else {
            updated.push(errorMsgObj);
          }
          return updated;
        });
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setLoading(false);
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    },
    [
      input,
      loading,
      messages,
      selectedModel,
      selectedProvider,
      aiSettings,
      attachedFile,
      setSelectedModel,
      setSelectedProvider,
      setAiSettings,
    ]
  );

  const handleClear = useCallback(() => {
    setMessages([
      {
        role: 'bot',
        text: 'เริ่มการสนทนาใหม่ครับ 🌾 ถามอะไรได้เลย!',
        timestamp: Date.now(),
        type: 'greeting',
        modelKey: null,
      },
    ]);
    try {
      localStorage.removeItem('npt_dashboard_chatbot_messages_v1');
    } catch (e) {
      console.error('Error clearing chatbot history:', e);
    }
  }, []);

  const currentModelConfig = AI_MODELS[selectedModel];
  // NVIDIA Qwen doesn't support Google Search grounding
  const canUseWebSearch =
    selectedModel === 'gemini' || selectedModel === 'gemma';
  const providerOptions = ['Google', 'NVIDIA', 'OKMD AI']
    .filter((provider) =>
      Object.values(AI_MODELS).some((model) => model.provider === provider)
    )
    .map((provider) => ({ value: provider, label: provider }));
  const modelOptions = Object.values(AI_MODELS)
    .filter((model) => model.provider === selectedProvider)
    .map((model) => ({
      value: model.key,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{model.icon}</span>
          <span style={{ fontWeight: 700 }}>{model.shortLabel}</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            {model.description}
          </span>
          {model.badge && (
            <span
              style={{
                marginLeft: 'auto',
                background: model.badgeColor,
                color: '#fff',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 6,
                fontWeight: 800,
              }}
            >
              {model.badge}
            </span>
          )}
        </div>
      ),
    }));

  return (
    <div style={styles.page}>
      {/* ═══ Dark Toolbar ═══ */}
      <div style={styles.toolbar}>
        {/* Title */}
        <div style={styles.toolbarTitle}>
          <Avatar
            size={32}
            src={khaolamAvatar}
            style={{
              background: `linear-gradient(135deg, ${currentModelConfig.color}, ${currentModelConfig.color}aa)`,
              boxShadow: `0 0 12px ${currentModelConfig.color}40`,
            }}
          />
          <div>
            <div style={styles.toolbarTitleText}>น้องข้าวหลาม</div>
            <div style={styles.toolbarSubtext}>
              <DatabaseOutlined style={{ marginRight: 4 }} />
              AI ผู้ช่วยข้อมูลเกษตร
            </div>
          </div>
        </div>
        {/* Model Selector */}
        <div style={styles.modelSelector}>
          <span style={styles.modelSelectorLabel}>ผู้ให้บริการ</span>
          <Select
            value={selectedProvider}
            onChange={handleProviderChange}
            disabled={loading}
            options={providerOptions}
            style={{ width: 140 }}
            size="middle"
          />
          <Select
            value={selectedModel}
            onChange={handleModelChange}
            disabled={loading}
            options={modelOptions}
            style={{ width: 300 }}
            popupMatchSelectWidth={360}
            size="middle"
          />
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: '#e2e8f0',
            margin: '0 4px',
          }}
        />

        {/* Toggle Buttons */}
        <Tooltip
          title={
            canUseWebSearch
              ? 'ค้นหาข้อมูลจากอินเทอร์เน็ต (Google Search)'
              : 'รองรับเฉพาะ Gemini / Gemma'
          }
        >
          <div
            style={{
              ...styles.togglePill(aiSettings.webSearch, '#38bdf8'),
              opacity: canUseWebSearch ? 1 : 0.4,
              pointerEvents: canUseWebSearch ? 'auto' : 'none',
            }}
            onClick={() =>
              setAiSettings((p) => ({ ...p, webSearch: !p.webSearch }))
            }
          >
            <div style={styles.toggleDot(aiSettings.webSearch, '#38bdf8')} />
            <GlobalOutlined style={{ fontSize: 12 }} />
            <span>ต่อเน็ต</span>
          </div>
        </Tooltip>

        <Tooltip
          title={
            aiSettings.webSearch
              ? 'ไม่สามารถใช้คิดเชิงลึกพร้อมกับต่อเน็ตได้'
              : 'วิเคราะห์เชิงลึก แสดงกระบวนการคิด'
          }
        >
          <div
            style={{
              ...styles.togglePill(aiSettings.deepThinking, '#a78bfa'),
              opacity: aiSettings.webSearch ? 0.35 : 1,
              pointerEvents: aiSettings.webSearch ? 'none' : 'auto',
            }}
            onClick={() =>
              setAiSettings((p) => ({ ...p, deepThinking: !p.deepThinking }))
            }
          >
            <div style={styles.toggleDot(aiSettings.deepThinking, '#a78bfa')} />
            <ThunderboltOutlined style={{ fontSize: 12 }} />
            <span>คิดเชิงลึก</span>
          </div>
        </Tooltip>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: '#e2e8f0',
            margin: '0 4px',
          }}
        />

        {/* Clear */}
        <Tooltip title="ล้างการสนทนา">
          <div
            style={styles.clearBtn}
            onClick={handleClear}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.borderColor = '#f8717133';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <ClearOutlined style={{ fontSize: 12 }} />
            <span>ล้าง</span>
          </div>
        </Tooltip>
      </div>

      {/* ═══ Chat Container ═══ */}
      <Card
        variant="borderless"
        style={styles.chatCard}
        styles={{
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        {/* Messages */}
        <div style={styles.chatScroll}>
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              isLast={i === messages.length - 1}
            />
          ))}

          {loading && !isStreaming && (
            <LoadingIndicator currentModelConfig={AI_MODELS[selectedModel]} />
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts — show only at start */}
        {messages.length <= 2 && (
          <div>
            <div
              style={{
                padding: '8px 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <BulbOutlined style={{ color: '#f59e0b', fontSize: 13 }} />
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                คำถามแนะนำ
              </Text>
            </div>
            <div style={styles.quickGrid}>
              {QUICK_PROMPTS.map((p, i) => (
                <div
                  key={i}
                  style={styles.quickCard}
                  onClick={() => !loading && handleSend(p.text)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      currentModelConfig.color;
                    e.currentTarget.style.background = `${currentModelConfig.color}08`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 2px 8px ${currentModelConfig.color}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={styles.quickIcon}>{p.icon}</div>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attached file bar */}
        {attachedFile && (
          <div style={styles.attachedBar}>
            <div style={styles.attachedBadge}>
              <FilePdfOutlined style={{ color: '#ef4444', fontSize: 16 }} />
              <Text
                ellipsis
                style={{ maxWidth: 200, fontSize: 12, fontWeight: 500 }}
              >
                {attachedFile.name}
              </Text>
              <CloseCircleOutlined
                style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
                onClick={() => setAttachedFile(null)}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              📎 ไฟล์พร้อมวิเคราะห์
            </Text>
          </div>
        )}

        {/* ═══ Input Area ═══ */}
        <div style={styles.inputArea}>
          <div style={styles.inputRow}>
            <Upload
              accept=".pdf"
              showUploadList={false}
              beforeUpload={(file) => {
                const isPdf = file.type === 'application/pdf';
                if (!isPdf) {
                  antMessage.error('อัปโหลดได้เฉพาะไฟล์ PDF เท่านั้น');
                  return false;
                }
                const isLt4M = file.size / 1024 / 1024 < 4;
                if (!isLt4M) {
                  antMessage.error(
                    'ไฟล์ต้องมีขนาดไม่เกิน 4MB (ข้อจำกัดของระบบ)'
                  );
                  return false;
                }
                setAttachedFile(file);
                return false;
              }}
            >
              <Tooltip title="แนบไฟล์ PDF เพื่อวิเคราะห์">
                <Button
                  icon={<PaperClipOutlined />}
                  size="large"
                  style={{
                    borderRadius: 14,
                    width: 44,
                    height: 44,
                    border: '1px solid #e2e8f0',
                  }}
                  disabled={loading}
                />
              </Tooltip>
            </Upload>
            <div style={styles.inputWrapper}>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={() => handleSend()}
                placeholder={
                  attachedFile
                    ? 'ถามคำถามเกี่ยวกับ PDF นี้...'
                    : 'ถามอะไรก็ได้เลยครับ...'
                }
                disabled={loading}
                size="large"
                style={{
                  borderRadius: 14,
                  paddingLeft: 18,
                  paddingRight: 18,
                  fontSize: 14,
                  height: 44,
                  border: '1px solid #e2e8f0',
                }}
                prefix={
                  <QuestionCircleOutlined
                    style={{ color: '#cbd5e1', marginRight: 4 }}
                  />
                }
              />
            </div>
            {loading ? (
              <Tooltip title="หยุดการสร้างข้อความ">
                <Button
                  type="primary"
                  danger
                  icon={<StopOutlined />}
                  onClick={handleCancel}
                  size="large"
                  style={{
                    borderRadius: 14,
                    width: 50,
                    height: 44,
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  }}
                />
              </Tooltip>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSend()}
                size="large"
                style={{
                  borderRadius: 14,
                  width: 50,
                  height: 44,
                  background: `linear-gradient(135deg, ${currentModelConfig.color}, ${currentModelConfig.color}cc)`,
                  border: 'none',
                  boxShadow: `0 2px 8px ${currentModelConfig.color}30`,
                }}
              />
            )}
          </div>

          {/* Status chips */}
          <div style={styles.statusBar}>
            <div style={styles.statusChip(currentModelConfig.color)}>
              {currentModelConfig.icon} {currentModelConfig.shortLabel}
            </div>
            {aiSettings.webSearch && canUseWebSearch && (
              <div style={styles.statusChip('#38bdf8')}>
                <GlobalOutlined style={{ fontSize: 10 }} /> ต่อเน็ต
              </div>
            )}
            {aiSettings.deepThinking && !aiSettings.webSearch && (
              <div style={styles.statusChip('#a78bfa')}>
                <ThunderboltOutlined style={{ fontSize: 10 }} /> คิดเชิงลึก
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
              รองรับ PDF
            </Text>
          </div>
        </div>
      </Card>

      {/* Animations */}
      <style>{`
                @keyframes chatFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
    </div>
  );
}
