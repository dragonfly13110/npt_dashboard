import { AI_PROXY_URL, GEMMA_MODEL, GEMINI_MODEL } from '../utils/chatbotConstants';

/**
 * Handles requests for Google Gemini API (including Gemini 3.1 and Gemma 4)
 */
async function callGeminiAI(modelIdentifier, systemPrompt, messagesHistory, settings, fileData, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            let contents = [];
            if (Array.isArray(messagesHistory)) {
                contents = messagesHistory.map((m, idx) => {
                    const isLastMsg = idx === messagesHistory.length - 1;
                    const parts = [{ text: m.text }];
                    
                    // แทรกไฟล์ลงในข้อความล่าสุดของผู้ใช้
                    if (isLastMsg && m.role !== 'bot' && fileData) {
                        parts.unshift(fileData); // แทรก inlineData ไว้ก่อน text
                    }
                    
                    return {
                        role: m.role === 'bot' ? 'model' : 'user',
                        parts
                    };
                });
            } else {
                const parts = [{ text: messagesHistory }];
                if (fileData) parts.unshift(fileData);
                contents = [{ role: 'user', parts }];
            }

            const requestBody = {
                contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: settings?.deepThinking ? 0.7 : 0.5,
                    maxOutputTokens: 16000, 
                    ...(settings?.deepThinking && {
                        thinkingConfig: { thinkingLevel: 'high' }
                    })
                }
            };

            // Support Google Search grounding for both Gemini and Gemma
            if (settings?.webSearch) {
                requestBody.tools = [{ googleSearch: {} }];
            }

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'gemini',
                    body: { model: modelIdentifier, ...requestBody }
                })
            });

            if (res.status === 429) {
                const waitMs = (attempt + 1) * 2000;
                console.warn(`API rate limited, waiting ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            
            // Extract and join all text parts (ignoring internal reasoning/thoughts)
            const parts = data.candidates?.[0]?.content?.parts || [];
            const resultText = parts
                .filter(p => !p.thought) // Filters out internal thought parts
                .map(p => p.text || '')
                .join('')
                .trim();
            
            return resultText || null;
            
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    return null;
}

/**
 * Legacy support for OpenRouter if needed for other models
 */
async function callOpenRouterAI(modelIdentifier, systemPrompt, messagesHistory, settings, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const apiMessages = [{ role: 'system', content: systemPrompt }];
            if (Array.isArray(messagesHistory)) {
                apiMessages.push(...messagesHistory.map(m => ({
                    role: m.role === 'bot' ? 'assistant' : 'user',
                    content: m.text
                })));
            } else {
                apiMessages.push({ role: 'user', content: messagesHistory });
            }

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'openrouter',
                    body: {
                        model: modelIdentifier,
                        messages: apiMessages,
                        temperature: 0.5,
                        max_tokens: 8000
                    }
                })
            });

            if (!res.ok) throw new Error('OpenRouter Error');
            const data = await res.json();
            return data.choices?.[0]?.message?.content || null;
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

/**
 * Main AI Call Entry Point
 */
export async function callAI(modelKey, systemPrompt, messagesHistory, settings, fileData) {
    // เสริมคำสั่งให้ AI กล้าใช้ Search และไฟล์มากขึ้น
    let finalSystemPrompt = systemPrompt;
    if (settings?.webSearch) {
        finalSystemPrompt += "\n(สำคัญ: หากผู้ใช้ถามถึงข้อมูลปัจจุบัน ราคาสินค้า หรือข่าวสาร ให้คุณใช้เครื่องมือ Google Search เพื่อหาคำตอบที่อัปเดตที่สุดเสมอ)";
    }
    if (fileData) {
        finalSystemPrompt += "\n(สำคัญ: คุณได้รับไฟล์ PDF ที่แนบมาด้วย ให้คุณวิเคราะห์เนื้อหาในไฟล์นี้เพื่อตอบคำถามของผู้ใช้ หากผู้ใช้ขอให้สรุปหรือถามรายละเอียดเกี่ยวกับเอกสาร)";
    }

    if (modelKey === 'gemma') {
        return callGeminiAI(GEMMA_MODEL, finalSystemPrompt, messagesHistory, settings, fileData);
    }
    if (modelKey === 'gemini') {
        return callGeminiAI(GEMINI_MODEL, finalSystemPrompt, messagesHistory, settings, fileData);
    }
    
    return callOpenRouterAI(modelKey, finalSystemPrompt, messagesHistory, settings);
}
