import {
  AI_PROXY_URL,
  GEMMA_MODEL,
  GEMINI_MODEL,
  QWEN_MODEL,
  KIMI_MODEL,
  MISTRAL_LARGE_MODEL,
  DEEPSEEK_V4_FLASH_MODEL,
  LLAMA31_8B_MODEL,
  LLAMA33_MODEL,
  LLAMA4_MAVERICK_MODEL,
  MINISTRAL_14B_MODEL,
  KKU_MODEL_IDS,
} from '../utils/chatbotConstants';
import {
  addPromptGuardrails,
  guardMessagesHistory,
} from './promptGuardService';

/**
 * Handles requests for Google Gemini API (including Gemini 3.1 and Gemma 4)
 */
async function callGeminiAI(
  modelIdentifier,
  systemPrompt,
  messagesHistory,
  settings,
  fileData,
  retries = 2,
  signal = null,
  onChunk = null
) {
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
            parts,
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
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: settings?.deepThinking ? 0.7 : 0.5,
          maxOutputTokens: 16000,
        },
      };

      // Google Search grounding — supported on both Gemini and Gemma
      if (settings?.webSearch) {
        requestBody.tools = [{ googleSearch: {} }];
        // googleSearch conflicts with thinkingConfig, so skip thinking when searching
      } else if (settings?.deepThinking) {
        // thinkingConfig is a top-level field, NOT inside generationConfig
        requestBody.generationConfig.thinkingConfig = { thinkingLevel: 'high' };
      }

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          provider: 'gemini',
          body: { model: modelIdentifier, stream: true, ...requestBody },
        }),
      });

      if (res.status === 429) {
        const waitMs = (attempt + 1) * 2000;
        console.warn(`API rate limited, waiting ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let resultText = '';
      let buffer = '';

      try {
        while (true) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep the last incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                const parts = data.candidates?.[0]?.content?.parts || [];
                const chunkText = parts
                  .filter((p) => !p.thought)
                  .map((p) => p.text || '')
                  .join('');
                resultText += chunkText;
                if (onChunk && chunkText) {
                  onChunk(chunkText, resultText);
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

      // Append any remaining complete data in buffer
      if (buffer.startsWith('data: ')) {
        const dataStr = buffer.slice(6).trim();
        if (dataStr && dataStr !== '[DONE]') {
          try {
            const data = JSON.parse(dataStr);
            const parts = data.candidates?.[0]?.content?.parts || [];
            const chunkText = parts
              .filter((p) => !p.thought)
              .map((p) => p.text || '')
              .join('');
            resultText += chunkText;
            if (onChunk && chunkText) {
              onChunk(chunkText, resultText);
            }
          } catch (e) {}
        }
      }

      return resultText || null;
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

/**
 * Legacy support for OpenRouter if needed for other models
 */
async function callOpenRouterAI(
  modelIdentifier,
  systemPrompt,
  messagesHistory,
  settings,
  retries = 2,
  signal = null,
  onChunk = null
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const apiMessages = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(messagesHistory)) {
        apiMessages.push(
          ...messagesHistory.map((m) => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: m.text,
          }))
        );
      } else {
        apiMessages.push({ role: 'user', content: messagesHistory });
      }

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          provider: 'openrouter',
          body: {
            model: modelIdentifier,
            messages: apiMessages,
            temperature: 0.5,
            max_tokens: 8000,
          },
        }),
      });

      if (!res.ok) throw new Error('OpenRouter Error');
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || null;
      if (onChunk && content) {
        onChunk(content, content);
      }
      return content;
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

/**
 * Handles requests for NVIDIA API (Qwen 3.5 via OpenAI-compatible format)
 */
async function callNvidiaAI(
  modelIdentifier,
  systemPrompt,
  messagesHistory,
  settings,
  retries = 2,
  signal = null,
  onChunk = null
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const apiMessages = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(messagesHistory)) {
        apiMessages.push(
          ...messagesHistory.map((m) => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: m.text,
          }))
        );
      } else {
        apiMessages.push({ role: 'user', content: messagesHistory });
      }

      // Dynamically set chat_template_kwargs according to model requirements
      const chat_template_kwargs = {};
      if (settings?.deepThinking) {
        if (modelIdentifier === 'moonshotai/kimi-k2.6') {
          chat_template_kwargs.thinking = true;
        } else {
          chat_template_kwargs.enable_thinking = true;
        }
      }

      const nvidiaBody = {
        model: modelIdentifier,
        messages: apiMessages,
        max_tokens: 16384,
        temperature: settings?.deepThinking ? 0.7 : 0.6,
        top_p: 0.95,
        stream: true,
      };

      if (Object.keys(chat_template_kwargs).length > 0) {
        nvidiaBody.chat_template_kwargs = chat_template_kwargs;
      }

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          provider: 'nvidia',
          body: nvidiaBody,
        }),
      });

      if (res.status === 429) {
        const waitMs = (attempt + 1) * 2000;
        console.warn(`NVIDIA API rate limited, waiting ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      // Parse SSE stream (OpenAI-compatible format)
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let resultText = '';
      let buffer = '';

      try {
        while (true) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
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
                const delta = data.choices?.[0]?.delta;
                if (delta?.content) {
                  resultText += delta.content;
                  if (onChunk) {
                    onChunk(delta.content, resultText);
                  }
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
            const delta = data.choices?.[0]?.delta;
            if (delta?.content) {
              resultText += delta.content;
              if (onChunk) {
                onChunk(delta.content, resultText);
              }
            }
          } catch (e) {}
        }
      }

      return resultText || null;
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

async function callKkuAI(
  modelIdentifier,
  systemPrompt,
  messagesHistory,
  settings,
  retries = 2,
  signal = null,
  onChunk = null
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const apiMessages = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(messagesHistory)) {
        apiMessages.push(
          ...messagesHistory.map((m) => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: m.text,
          }))
        );
      } else {
        apiMessages.push({ role: 'user', content: messagesHistory });
      }

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          provider: 'kku',
          body: {
            model: modelIdentifier,
            messages: apiMessages,
            temperature: settings?.deepThinking ? 0.7 : 0.5,
            max_tokens: 4096,
            stream: true,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      // Parse SSE stream (OpenAI-compatible format)
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let resultText = '';
      let buffer = '';

      try {
        while (true) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
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
                const delta = data.choices?.[0]?.delta;
                if (delta?.content) {
                  resultText += delta.content;
                  if (onChunk) {
                    onChunk(delta.content, resultText);
                  }
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
            const delta = data.choices?.[0]?.delta;
            if (delta?.content) {
              resultText += delta.content;
              if (onChunk) {
                onChunk(delta.content, resultText);
              }
            }
          } catch (e) {}
        }
      }

      return resultText || null;
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

/**
 * Main AI Call Entry Point
 */
export async function callAI(
  modelKey,
  systemPrompt,
  messagesHistory,
  settings,
  fileData,
  signal = null,
  onChunk = null
) {
  // เสริมคำสั่งให้ AI กล้าใช้ Search และไฟล์มากขึ้น
  let finalSystemPrompt = systemPrompt;
  if (settings?.webSearch) {
    finalSystemPrompt +=
      '\n(สำคัญ: หากผู้ใช้ถามถึงข้อมูลปัจจุบัน ราคาสินค้า หรือข่าวสาร ให้คุณใช้เครื่องมือ Google Search เพื่อหาคำตอบที่อัปเดตที่สุดเสมอ)';
  }
  if (fileData) {
    finalSystemPrompt +=
      '\n(สำคัญ: คุณได้รับไฟล์ PDF ที่แนบมาด้วย ให้คุณวิเคราะห์เนื้อหาในไฟล์นี้เพื่อตอบคำถามของผู้ใช้ หากผู้ใช้ขอให้สรุปหรือถามรายละเอียดเกี่ยวกับเอกสาร)';
  }

  finalSystemPrompt = addPromptGuardrails(finalSystemPrompt);
  const guardedMessagesHistory = guardMessagesHistory(messagesHistory);

  if (modelKey === 'gemma') {
    return callGeminiAI(
      GEMMA_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      fileData,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'gemini') {
    return callGeminiAI(
      GEMINI_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      fileData,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'qwen') {
    return callNvidiaAI(
      QWEN_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'kimi') {
    return callNvidiaAI(
      KIMI_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'mistralLarge') {
    return callNvidiaAI(
      MISTRAL_LARGE_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'deepseekV4') {
    return callNvidiaAI(
      DEEPSEEK_V4_FLASH_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'llama31_8b') {
    return callNvidiaAI(
      LLAMA31_8B_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'llama33') {
    return callNvidiaAI(
      LLAMA33_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'llama4_maverick') {
    return callNvidiaAI(
      LLAMA4_MAVERICK_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (modelKey === 'ministral14b') {
    return callNvidiaAI(
      MINISTRAL_14B_MODEL,
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  if (KKU_MODEL_IDS[modelKey]) {
    return callKkuAI(
      KKU_MODEL_IDS[modelKey],
      finalSystemPrompt,
      guardedMessagesHistory,
      settings,
      2,
      signal,
      onChunk
    );
  }
  return callOpenRouterAI(
    modelKey,
    finalSystemPrompt,
    guardedMessagesHistory,
    settings,
    2,
    signal,
    onChunk
  );
}
