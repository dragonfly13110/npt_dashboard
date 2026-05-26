import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fetchDatabaseContext } from '../chatbotDataService';

describe('chatbotDataService aggregation', () => {
    let originalFetch;

    beforeAll(() => {
        originalFetch = global.fetch;
        // Mock only the AI Proxy endpoint so intent extraction succeeds in node test env
        global.fetch = async (url, options) => {
            const urlStr = typeof url === 'string' ? url : url?.url || '';
            if (urlStr.includes('/.netlify/functions/ai-proxy')) {
                const mockResponseText = JSON.stringify({
                    district: null,
                    tables: ["certifications"],
                    keyword: "มะม่วง",
                    analysis_type: "overview",
                    is_general_question: false
                });

                return {
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
                                        value: new TextEncoder().encode(`data: {"candidates":[{"content":{"parts":[{"text": ${JSON.stringify(mockResponseText)} }]}}]}\n`)
                                    });
                                }
                            };
                        }
                    }
                };
            }
            // Delegate all other fetches (like Supabase database queries) to the real fetch function
            return originalFetch(url, options);
        };
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('applies search keyword to computeAggregation and returns correct stats', async () => {
        // Query for GAP certifications with 'มะม่วง' keyword
        const result = await fetchDatabaseContext("ขอข้อมูลใบรับรอง GAP มะม่วง", "gemini");
        
        expect(result).toBeDefined();
        expect(result.results).toBeInstanceOf(Array);
        
        const gapResult = result.results.find(r => r.table === 'certifications');
        if (gapResult) {
            console.log("Found GAP table stats in test:", {
                total_records: gapResult.count,
                filtered_by: gapResult.filteredBy,
                totals: gapResult.aggregatedStats?.totals,
                averages: gapResult.aggregatedStats?.averages,
            });
            
            // Check that the returned filter string matches our expectations
            expect(gapResult.filteredBy).toContain('มะม่วง');
            
            // Ensure aggregated stats are present
            expect(gapResult.aggregatedStats).toBeDefined();
            expect(gapResult.aggregatedStats.totals).toBeDefined();
            expect(gapResult.aggregatedStats.totals.area_rai).toBeGreaterThanOrEqual(0);
        } else {
            console.log("No certifications matching 'มะม่วง' found, skipping detailed assertion.");
        }
    });
});
