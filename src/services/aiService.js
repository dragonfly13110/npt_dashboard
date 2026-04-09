import { AI_PROXY_URL, OPENROUTER_MODEL, GEMINI_MODEL } from '../utils/chatbotConstants';

export async function callOpenRouterAI(systemPrompt, messagesHistory, retries = 2) {
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
                        model: OPENROUTER_MODEL,
                        messages: apiMessages,
                        temperature: 0.5,
                        max_tokens: 12000,
                    }
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

export async function callGeminiAI(systemPrompt, messagesHistory, settings, retries = 2) {
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

            const requestBody = {
                contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: settings?.deepThinking ? 0.7 : 0.5,
                    maxOutputTokens: 12000,
                    // Enable internal chain-of-thought reasoning when deep thinking is on
                    ...(settings?.deepThinking && {
                        thinkingConfig: { thinkingBudget: 2048 }
                    })
                }
            };

            if (settings?.webSearch) {
                requestBody.tools = [{ googleSearch: {} }];
            }

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'gemini',
                    body: { model: GEMINI_MODEL, ...requestBody }
                })
            });

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

export async function callAI(modelKey, systemPrompt, messagesHistory, settings) {
    if (modelKey === 'gemini') {
        return callGeminiAI(systemPrompt, messagesHistory, settings);
    }
    return callOpenRouterAI(systemPrompt, messagesHistory);
}
