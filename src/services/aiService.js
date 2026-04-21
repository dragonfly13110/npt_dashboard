import { AI_PROXY_URL, GEMMA_MODEL, GEMINI_MODEL } from '../utils/chatbotConstants';

export async function callOpenRouterAI(systemPrompt, messagesHistory, settings, retries = 2) {
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

            const payloadBody = {
                model: 'google/gemma-4-31b-it', // fallback or future model
                messages: apiMessages,
                temperature: settings?.deepThinking ? 0.7 : 0.5,
                max_tokens: 12000,
            };

            // Enable OpenRouter Reasoning based on settings
            if (settings?.deepThinking) {
                payloadBody.include_reasoning = true;
            }

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'openrouter',
                    body: payloadBody
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

export async function callGeminiAI(modelIdentifier, systemPrompt, messagesHistory, settings, retries = 2) {
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

            // Model capability detection
            const isGemma = modelIdentifier.includes('gemma');
            const isThinkingModel = modelIdentifier.includes('thinking');
            
            const requestBody = {
                contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: settings?.deepThinking ? 0.7 : 0.5,
                    maxOutputTokens: 12000,
                    ...(settings?.deepThinking && {
                        thinkingConfig: isGemma 
                            ? { thinkingLevel: 'high' } // Support for Gemma 4 Thinking
                            : isThinkingModel 
                                ? { thinkingBudget: 2048 } // Support for Gemini Thinking
                                : undefined
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
                    body: { model: modelIdentifier, ...requestBody }
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
    if (modelKey === 'gemma') {
        return callGeminiAI(GEMMA_MODEL, systemPrompt, messagesHistory, settings);
    }
    if (modelKey === 'gemini') {
        return callGeminiAI(GEMINI_MODEL, systemPrompt, messagesHistory, settings);
    }
    return callOpenRouterAI(systemPrompt, messagesHistory, settings);
}
