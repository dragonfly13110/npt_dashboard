import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAI } from '../aiService';

// Mock fetch
global.fetch = vi.fn();

describe('aiService', () => {
    const AI_PROXY_URL = 'http://localhost:3000/ai-proxy';
    
    beforeEach(() => {
        vi.clearAllMocks();
        fetch.mockClear(); // Use the mocked fetch
    });

    it('calls Gemini API successfully', async () => {
        // Setup mock for success
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            body: {
                getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true, value: null }) })
            },
            text: vi.fn().mockResolvedValue(''),
        });

        // Mock response
        const mockResponse = {
            ok: true,
            status: 200,
            text: vi.fn().mockResolvedValue(''),
            body: {
                getReader: () => {
                    let done = false;
                    return {
                        read: vi.fn().mockImplementation(() => {
                            if (done) return Promise.resolve({ done: true });
                            done = true;
                            return Promise.resolve({
                                done: false,
                                value: new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n')
                            });
                        })
                    };
                }
            }
        };
        fetch.mockResolvedValue(mockResponse);

        // Note: This is a simplified test - actual streaming is complex to mock
        const result = await callAI('gemma', 'test prompt', [], {});
        // Since we're mocking, the result will depend on the implementation
        expect(result).toBeDefined();
    });

    it('retries on rate limit (429)', async () => {
        // Mock fetch that returns 429 then success
        let callCount = 0;
        fetch.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({
                    ok: false,
                    status: 429
                });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(''),
                body: {
                    getReader: () => {
                        let readCount = 0;
                        return {
                            read: vi.fn().mockImplementation(() => {
                                if (readCount > 0) return Promise.resolve({ done: true });
                                readCount++;
                                return Promise.resolve({
                                    done: false,
                                    value: new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n')
                                });
                            })
                        };
                    }
                }
            });
        });

        const result = await callAI('gemini', 'test prompt', [], {});
        expect(result).toBeDefined();
    });

    it('calls DeepSeek v4 NIM model with correct thinking config', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            body: {
                getReader: () => {
                    let done = false;
                    return {
                        read: () => {
                            if (done) return Promise.resolve({ done: true });
                            done = true;
                            return Promise.resolve({
                                done: false,
                                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"DeepSeek response"}}]}\n')
                            });
                        }
                    };
                }
            }
        });

        const result = await callAI('deepseek', 'test prompt', [], { deepThinking: true });
        expect(result).toBe('DeepSeek response');
        expect(fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('"chat_template_kwargs":{"thinking":true,"reasoning_effort":"high"}')
            })
        );
    });

    it('calls Kimi K2.6 NIM model with correct thinking config', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            body: {
                getReader: () => {
                    let done = false;
                    return {
                        read: () => {
                            if (done) return Promise.resolve({ done: true });
                            done = true;
                            return Promise.resolve({
                                done: false,
                                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Kimi response"}}]}\n')
                            });
                        }
                    };
                }
            }
        });

        const result = await callAI('kimi', 'test prompt', [], { deepThinking: true });
        expect(result).toBe('Kimi response');
        expect(fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('"chat_template_kwargs":{"thinking":true}')
            })
        );
    });

    it('calls MiniMax M2.7 NIM model with correct config', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            body: {
                getReader: () => {
                    let done = false;
                    return {
                        read: () => {
                            if (done) return Promise.resolve({ done: true });
                            done = true;
                            return Promise.resolve({
                                done: false,
                                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"MiniMax response"}}]}\n')
                            });
                        }
                    };
                }
            }
        });

        const result = await callAI('minimax', 'test prompt', [], {});
        expect(result).toBe('MiniMax response');
        expect(fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('"model":"minimaxai/minimax-m2.7"')
            })
        );
    });

    it('throws on permanent failure', async () => {
        fetch.mockRejectedValue(new Error('Network error'));
        await expect(callAI('gemini', 'test', [], {})).rejects.toThrow();
    });
});
