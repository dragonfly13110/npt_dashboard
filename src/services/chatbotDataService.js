import { supabase } from '../supabaseClient';
import { callAI } from './aiService';
import { TABLE_CONFIG, TABLE_SEARCH_COLS, DISTRICT_COLS, NUMERIC_COLS, CATEGORY_COLS } from '../utils/chatbotConstants';

function parseBudgetNotes(notes) {
    if (!notes || typeof notes !== 'string') return {};
    try {
        const parsed = JSON.parse(notes);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export async function extractIntent(query, modelKey, chatHistory = []) {
    const tableList = Object.entries(TABLE_CONFIG)
        .map(([k, v]) => `${k}: ${v.descTh}`)
        .join('\n');

    // Make AI aware of the FULL previous conversation to resolve pronouns and complex follow-up logic
    const recentHistory = chatHistory.map(m => `${m.role === 'bot' ? 'AI' : 'User'}: ${m.text}`).join('\n');

    const prompt = `คุณคือสุดยอด AI ผู้เชี่ยวชาญด้านการสกัดข้อมูลสำหรับฐานข้อมูลการเกษตรไทย (จ.นครปฐม)
ให้สกัดพารามิเตอร์การค้นหาแบบแม่นยำขั้นสุดจากคำถาม *ใหม่* ของผู้ใช้ โดยอ้างอิงจากบริบทการสนทนา *ทั้งหมด*
ตอบกลับเป็นรูปแบบ JSON ที่ถูกต้องเท่านั้น ห้ามครอบด้วย markdown code blocks เด็ดขาด

ตารางข้อมูลที่มีในระบบ (Available tables):
${tableList}

ข้อควรระวังสำคัญ - ตาราง agricultural_areas มี *คอลัมน์* ตามนี้ (ไม่ใช่ค่าข้อมูลสำหรับใช้ค้นหา):
district, total_area_rai, agri_crop_area_rai, farmer_households, rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai

รายชื่ออำเภอ: เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล

รูปแบบการส่งค่ากลับ (Return format):
{
  "district": "ชื่ออำเภอ หรือ null",
  "tables": ["ชื่อตาราง"] หรือ ["all"] สำหรับคำถามถามภาพรวม,
  "keyword": "ชื่อบุคคล หรือชื่อสิ่งที่ต้องการกรองข้อมูลแบบเฉพาะเจาะจงมากๆ หรือ null",
  "analysis_type": "overview | comparison | detail | ranking | correlation",
  "is_general_question": false
}

กฎต่างๆ (Rules):
- ใช้ ["all"] *เฉพาะ* คำขอที่เป็นภาพรวมหรือสรุปแบบกว้างๆ เท่านั้น
- ตัวอย่างเช่น "พื้นที่เกษตรทั้งหมดมีเท่าไหร่" หรือ "ปลูกข้าวกี่ไร่" → ให้คืนค่าเป็น tables: ["agricultural_areas"], keyword: null (เนื่องจากข้อมูลข้าวเป็นชื่อคอลัมน์ ไม่ใช่ค่าในระดับแถว)
- *ห้าม* ใส่ keyword เป็นหมวดหมู่พืชผลแบบกว้างๆ เช่น ข้าว, ผัก, ไม้ผล, พืชไร่, สมุนไพร ในกรณีที่ผู้ใช้ถามดึงข้อมูลจากตาราง agricultural_areas — เพราะคำเหล่านี้คือ *ชื่อคอลัมน์* ไม่ใช่ค่าสำหรับใช้ค้นหา
- keyword ควรเป็นค่าที่ใช้ค้นหาแบบเฉพาะเจาะจงมากๆ เท่านั้น เช่น ชื่อบุคคล (เช่น "สมชาย"), ชื่อพันธุ์พืชเฉพาะ (เช่น "ส้มโอ"), หรือชื่อกลุ่มวิสาหกิจ
- keyword *ห้าม* มีชื่อตาราง, ชื่ออำเภอ, หรือคำแสดงคำถาม ปะปนอยู่รวมในนั้น
- analysis_type: "overview"=ภาพรวม, "comparison"=เปรียบเทียบ, "detail"=เจาะลึก, "ranking"=จัดอันดับ, "correlation"=หาความสัมพันธ์
- ถ้าคำถามมีคำว่า "เปรียบเทียบ" "อำเภอไหนมากสุด" "จัดอันดับ" → analysis_type: "comparison" หรือ "ranking"
- ถ้าคำถามถามความสัมพันธ์ระหว่างข้อมูล → analysis_type: "correlation", tables: ตารางที่เกี่ยวข้องทั้งหมด
- ถ้าคำถามระบุว่า "สร้างรายงาน" หรือ "ทำรายงาน" → analysis_type: "detail", tables: ["all"] หรือบางตารางที่เกี่ยวข้อง
- ถ้าคำถามเกี่ยวกับ "นโยบาย" (Policy) หรือแนวทางภาครัฐ → analysis_type: "overview", tables: ["all"], keyword: null แต่ is_general_question อาจเป็น false หรือ true ขึ้นอยู่กับว่ามันโยงกับข้อมูลง่ายๆ หรือไม่ (ถ้าเป็นความรู้นโยบายลอยๆ ให้ is_general_question: true)
- is_general_question: ให้เป็น true สำหรับการพูดคุยทักทาย, คำถามความรู้ทั่วไป, คำถามนโยบายที่ไม่ได้อิงกับตัวเลขพื้นที่, หรือคำถามที่ไม่มีส่วนเกี่ยวข้องใดๆ กับฐานข้อมูลเลย
- ตอบกลับมาเป็นโครงสร้าง raw JSON เพียงอย่างเดียว ห้ามมีการจัดรูปแบบ markdown ใดๆ (ห้ามมี \`\`\`json)
- ❗ สำคัญ: ถ้าผู้ใช้ถามต่อเนื่องจากบริบทเดิม (เช่น "แล้วอำเภอ X ล่ะ?" "อันไหนมากสุด?" "ช่วยเปรียบเทียบให้หน่อย") → ให้อ้างอิงจาก *บริบทการสนทนาก่อนหน้า* เพื่อระบุ tables และ analysis_type ให้ถูกต้อง

--- ตัวอย่างการสกัด (FEW-SHOT EXAMPLES) ---
Q: "มีเกษตรกรทั้งหมดกี่ครัวเรือน"
A: {"district":null,"tables":["farmer_registry"],"keyword":null,"analysis_type":"overview","is_general_question":false}

Q: "สร้างรายงานสรุปผลการเกษตรประจำจังหวัด"
A: {"district":null,"tables":["all"],"keyword":null,"analysis_type":"detail","is_general_question":false}

Q: "นโยบายภาครัฐที่ช่วยเหลือเกษตรกรมีอะไรบ้าง"
A: {"district":null,"tables":[],"keyword":null,"analysis_type":"overview","is_general_question":true}

Q: "พื้นที่เกษตรกับจำนวนเกษตรกรสัมพันธ์กันไหม"
A: {"district":null,"tables":["agricultural_areas","farmer_registry"],"keyword":null,"analysis_type":"correlation","is_general_question":false}

Q: "สวัสดีครับ"
A: {"district":null,"tables":[],"keyword":null,"analysis_type":"overview","is_general_question":true}

Q: "ค้นหาชื่อ สมชาย ใน GAP"
A: {"district":null,"tables":["certifications"],"keyword":"สมชาย","analysis_type":"detail","is_general_question":false}
--- จบตัวอย่าง ---

--- บริบทการสนทนาล่าสุด (RECENT CONVERSATION CONTEXT) ---
${recentHistory || 'ไม่มีบริบทก่อนหน้า'}
--- สิ้นสุดบริบทการสนทนา (END RECENT CONVERSATION) ---

จงสกัดพารามิเตอร์การค้นหาจากคำถาม *ใหม่* ของผู้ใช้ข้อความนี้: "${query}"`;

    try {
        // Send recent chat history to AI so it can resolve follow-up references
        const historyForIntent = chatHistory.slice(-8).concat([{ role: 'user', text: query }]);
        const result = await callAI(modelKey, prompt, historyForIntent);
        if (result) {
            const jsonMatch = result.match(/```(?:json)?\\s*([\\s\\S]*?)```/);
            const cleanJson = jsonMatch ? jsonMatch[1].trim() : result.trim();
            const jsonStart = cleanJson.indexOf('{');
            const jsonEnd = cleanJson.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                return JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1));
            }
        }
    } catch (e) {
        console.error('Intent extraction failed:', e);
    }
    return null;
}

/**
 * Compute server-side aggregation stats for numeric columns via Supabase
 * This prevents sending thousands of raw rows and lets AI use pre-computed numbers
 */
async function computeAggregation(table, distCol, matchedDistrict, searchKeyword) { // eslint-disable-line no-unused-vars
    const numCols = NUMERIC_COLS[table];
    if (!numCols || numCols.length === 0) return null;

    try {
        // Build a select string that computes SUM for each numeric column
        // We do this by fetching all rows for the relevant columns and aggregating client-side
        // (Supabase REST API doesn't support SQL aggregation directly)
        let query = supabase.from(table).select([distCol, ...numCols].join(','));

        if (matchedDistrict) {
            query = query.ilike(distCol, `%${matchedDistrict}%`);
        }

        const { data, error } = await query.limit(10000);
        if (error || !data || data.length === 0) return null;

        // Compute aggregation
        const stats = {
            total_rows: data.length,
            totals: {},
            averages: {},
            by_district: {},
        };

        // Initialize
        numCols.forEach(col => {
            stats.totals[col] = 0;
            stats.averages[col] = 0;
        });

        // Process rows
        data.forEach(row => {
            const budgetNotes = table === 'budgets' ? parseBudgetNotes(row.notes) : null;
            const district = budgetNotes?.district || row[distCol] || 'ไม่ระบุ';
            if (!stats.by_district[district]) {
                stats.by_district[district] = { count: 0 };
                numCols.forEach(col => { stats.by_district[district][col] = 0; });
            }
            stats.by_district[district].count++;

            numCols.forEach(col => {
                const val = parseFloat(row[col]) || 0;
                stats.totals[col] += val;
                stats.by_district[district][col] += val;
            });
        });

        // Compute averages
        numCols.forEach(col => {
            stats.averages[col] = data.length > 0 ? Math.round((stats.totals[col] / data.length) * 100) / 100 : 0;
        });

        // Compute percentages per district
        stats.district_percentages = {};
        Object.entries(stats.by_district).forEach(([dist, distData]) => {
            stats.district_percentages[dist] = { count: distData.count };
            numCols.forEach(col => {
                const total = stats.totals[col];
                stats.district_percentages[dist][col] = total > 0
                    ? Math.round((distData[col] / total) * 10000) / 100
                    : 0;
            });
        });

        // Find top/bottom for key metrics
        stats.rankings = {};
        numCols.slice(0, 5).forEach(col => {
            const sorted = Object.entries(stats.by_district)
                .map(([dist, d]) => ({ district: dist, value: d[col] }))
                .filter(d => d.value > 0)
                .sort((a, b) => b.value - a.value);
            if (sorted.length > 0) {
                stats.rankings[col] = {
                    top: sorted[0],
                    bottom: sorted[sorted.length - 1],
                };
            }
        });

        return stats;
    } catch (e) {
        console.error(`Aggregation failed for ${table}:`, e);
        return null;
    }
}

export async function fetchDatabaseContext(query, modelKey, chatHistory = []) {
    const intent = await extractIntent(query, modelKey, chatHistory);

    if (intent?.is_general_question) {
        return { results: [], isOverview: false, isGeneral: true, query, intent };
    }

    let matchedDistrict = intent?.district || null;
    let searchKeyword = intent?.keyword || null;
    let matchedTables = [];
    let isOverview = false;
    const analysisType = intent?.analysis_type || 'overview';

    if (intent?.tables?.length > 0) {
        if (intent.tables.includes('all')) {
            matchedTables = Object.keys(TABLE_CONFIG);
            isOverview = true;
        } else {
            matchedTables = intent.tables.filter(t => TABLE_CONFIG[t]);
        }
    }

    // Heuristic fallback
    if (matchedTables.length === 0) {
        const lowerQuery = query.toLowerCase();
        const tableKeywords = {
            agricultural_areas: ['พื้นที่', 'เกษตร', 'ไร่', 'ข้าว', 'พืช', 'สวน', 'นา'],
            learning_centers: ['ศูนย์เรียนรู้', 'ศพก'],
            disasters: ['ภัย', 'น้ำท่วม', 'แล้ง', 'วาตภัย'],
            farmer_registry: ['ทะเบียน', 'เกษตรกร', 'ครัวเรือน'],
            gis_areas: ['gis', 'พิกัด', 'แผนที่'],
            large_plots: ['แปลงใหญ่', 'สินค้า'],
            certifications: ['gap', 'มาตรฐาน', 'ใบรับรอง', 'อินทรีย์'],
            crop_production: ['ผลผลิต', 'เก็บเกี่ยว', 'ตัน'],
            community_enterprises: ['วิสาหกิจ', 'ชุมชน'],
            smart_farmers: ['smart farmer', 'เกษตรกรรุ่นใหม่', 'young'],
            farmer_groups: ['กลุ่มแม่บ้าน', 'ยุวเกษตรกร'],
            farmer_institutes: ['สถาบัน', 'สหกรณ์'],
            agri_tourism: ['ท่องเที่ยว', 'ฟาร์มสเตย์'],
            forecast_plots: ['พยากรณ์', 'แมลง', 'ศัตรูพืช'],
            pest_centers: ['ศจช', 'ศัตรูพืชชุมชน'],
            soil_fertilizer_centers: ['ศดปช', 'ดิน', 'ปุ๋ย'],
            fire_hotspots: ['ไฟ', 'เผา', 'pm2.5', 'หมอกควัน'],
            daily_weather: ['สภาพอากาศ', 'อุณหภูมิ', 'ฝน', 'ลม', 'อากาศ', 'ร้อน', 'หนาว'],
            budgets: ['งบ', 'งบประมาณ', 'โครงการ', 'กิจกรรม', 'แผนใช้จ่าย', 'แผนดำเนินงาน', 'ผู้รับผิดชอบ', 'รอบ 2', '2569'],
        };

        for (const [table, keywords] of Object.entries(tableKeywords)) {
            if (keywords.some(kw => lowerQuery.includes(kw))) {
                matchedTables.push(table);
            }
        }

        if (matchedTables.length === 0) {
            matchedTables = Object.keys(TABLE_CONFIG);
            isOverview = true;
        }
    }

    // For comparison/correlation queries, ensure we pull multiple tables
    if ((analysisType === 'comparison' || analysisType === 'correlation') && matchedTables.length < 2) {
        // Add related tables for richer analysis
        const relatedGroups = {
            agricultural_areas: ['farmer_registry', 'crop_production'],
            farmer_registry: ['agricultural_areas', 'smart_farmers'],
            large_plots: ['certifications', 'crop_production'],
            smart_farmers: ['learning_centers', 'farmer_groups'],
            certifications: ['large_plots', 'crop_production'],
            disasters: ['agricultural_areas', 'farmer_registry'],
        };
        const existing = new Set(matchedTables);
        matchedTables.forEach(t => {
            (relatedGroups[t] || []).forEach(related => {
                if (!existing.has(related)) {
                    matchedTables.push(related);
                    existing.add(related);
                }
            });
        });
    }

    const results = [];
    // Reduced from 2,000 to 200 for sample data — aggregation handles the heavy lifting now
    const sampleLimit = 200;

    // Process tables in parallel for speed
    const tablePromises = matchedTables.map(async (table) => {
        try {
            const distCol = DISTRICT_COLS[table] || 'district';
            let usedKeyword = false;

            let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
            let dataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(sampleLimit);

            if (matchedDistrict) {
                countQuery = countQuery.ilike(distCol, `%${matchedDistrict}%`);
                dataQuery = dataQuery.ilike(distCol, `%${matchedDistrict}%`);
            }

            if (searchKeyword && TABLE_SEARCH_COLS[table]?.length > 0) {
                const cols = TABLE_SEARCH_COLS[table];
                const orString = cols.map(c => `${c}.ilike.%${searchKeyword}%`).join(',');
                try {
                    countQuery = countQuery.or(orString);
                    dataQuery = dataQuery.or(orString);
                    usedKeyword = true;
                } catch { /* swallow */ }
            }

            let { count, error: countError } = await countQuery;
            let sampleData = [];

            if (!countError && count === 0 && usedKeyword) {
                if(window?.console) console.log(`[Chatbot] Keyword "${searchKeyword}" returned 0 for ${table}, retrying without keyword...`);
                let fbCountQuery = supabase.from(table).select('*', { count: 'exact', head: true });
                let fbDataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(sampleLimit);
                if (matchedDistrict) {
                    fbCountQuery = fbCountQuery.ilike(distCol, `%${matchedDistrict}%`);
                    fbDataQuery = fbDataQuery.ilike(distCol, `%${matchedDistrict}%`);
                }
                const fbResult = await fbCountQuery;
                count = fbResult.count || 0;
                countError = fbResult.error;
                if (!countError && count > 0) {
                    const fbData = await fbDataQuery;
                    sampleData = fbData.data || [];
                }
                usedKeyword = false;
            }

            if (countError) {
                const fb = await supabase.from(table).select('*', { count: 'exact', head: true });
                count = fb.count || 0;
                if (count > 0) {
                    const fbData = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(sampleLimit);
                    sampleData = fbData.data || [];
                }
            } else if (sampleData.length === 0) {
                if (count > 0) {
                    const { data } = await dataQuery;
                    sampleData = data || [];
                }
            }

            // Compute server-side aggregation for numeric tables
            const aggregatedStats = await computeAggregation(table, distCol, matchedDistrict, searchKeyword);

            // District and Category summary (lightweight)
            let districtSummary = null;
            let categorySummary = null;
            try {
                let colsToSelect = [distCol];
                if (CATEGORY_COLS[table]) {
                    colsToSelect = [...colsToSelect, ...CATEGORY_COLS[table]];
                }
                let summaryQuery = supabase.from(table).select(colsToSelect.join(','));
                
                if (matchedDistrict) {
                    summaryQuery = summaryQuery.ilike(distCol, `%${matchedDistrict}%`);
                }
                if (usedKeyword && searchKeyword && TABLE_SEARCH_COLS[table]?.length > 0) {
                    const cols = TABLE_SEARCH_COLS[table];
                    const orString = cols.map(c => `${c}.ilike.%${searchKeyword}%`).join(',');
                    summaryQuery = summaryQuery.or(orString);
                }
                // Fetch up to 10000 rows for counting only
                const { data: summaryData } = await summaryQuery.limit(10000);
                if (summaryData && summaryData.length > 0) {
                    const distCounts = {};
                    const catCounts = {};
                    if (CATEGORY_COLS[table]) {
                        CATEGORY_COLS[table].forEach(c => catCounts[c] = {});
                    }

                    summaryData.forEach(row => {
                        // District count
                        const budgetNotes = table === 'budgets' ? parseBudgetNotes(row.notes) : null;
                        const d = budgetNotes?.district || row[distCol] || 'ไม่ระบุ';
                        distCounts[d] = (distCounts[d] || 0) + 1;
                        
                        // Category count
                        if (CATEGORY_COLS[table]) {
                            CATEGORY_COLS[table].forEach(c => {
                                const val = row[c] || 'ไม่ระบุ';
                                catCounts[c][val] = (catCounts[c][val] || 0) + 1;
                            });
                        }
                    });
                    districtSummary = distCounts;
                    if (CATEGORY_COLS[table]) {
                        categorySummary = catCounts;
                    }
                }
            } catch { /* skip summary */ }

            return {
                table,
                label: TABLE_CONFIG[table].label,
                icon: TABLE_CONFIG[table].icon,
                group: TABLE_CONFIG[table].group,
                count: count || 0,
                districtSummary,
                categorySummary,
                aggregatedStats,
                sample: sampleData.length > 0 ? sampleData : null,
                filteredBy: matchedDistrict || (usedKeyword && searchKeyword ? `คำค้น "${searchKeyword}"` : null),
            };
        } catch {
            return null;
        }
    });

    const tableResults = await Promise.all(tablePromises);
    tableResults.forEach(r => { if (r) results.push(r); });

    return { results, isOverview, isGeneral: false, query, intent, matchedDistrict, analysisType };
}

export function buildContextForAI(analysis) {
    const { results, analysisType } = analysis;
    if (!results || results.length === 0) return 'ไม่พบข้อมูลในฐานข้อมูล';

    return JSON.stringify(results.map(r => {
        const entry = {
            dataset: r.label,
            table_name: r.table,
            total_records: r.count,
            filtered_by: r.filteredBy || 'ไม่กรอง',
        };

        // Include aggregated stats (SUM, AVG, rankings, percentages by district)
        if (r.aggregatedStats) {
            entry.aggregated_stats = {
                _note: 'PRE-COMPUTED AGGREGATION — ข้อมูลคำนวณจริงจาก Database ทั้งหมด ไม่ใช่จากตัวอย่าง ให้ใช้ตัวเลขเหล่านี้ในการวิเคราะห์เสมอ!',
                totals: r.aggregatedStats.totals,
                averages: r.aggregatedStats.averages,
                by_district: r.aggregatedStats.by_district,
                district_percentages: r.aggregatedStats.district_percentages,
                rankings: r.aggregatedStats.rankings,
            };
        }

        // Pre-calculated categorical distributions (exact counts)
        if (r.categorySummary && Object.keys(r.categorySummary).length > 0) {
            entry.category_distribution = r.categorySummary;
        }

        // Lightweight district summary if aggregatedStats isn't available
        if (r.districtSummary && !r.aggregatedStats) {
            entry.district_distribution = r.districtSummary;
        }

        if (entry.category_distribution || entry.district_distribution) {
            entry._stats_note = `การนับจำนวน 100% จากฐานข้อมูลทั้งหมด (${r.count} รายการ) ไม่ใช่แค่กลุ่มตัวอย่าง`;
        }

        // Only include limited sample records to save tokens
        // Smart limits: overview/ranking don't need many samples since aggregated_stats covers them
        const maxSampleForAI = analysisType === 'detail' ? 30 :
                               analysisType === 'comparison' ? 10 :
                               analysisType === 'overview' ? 5 :
                               analysisType === 'ranking' ? 5 : 15;
        entry.sample_records = r.sample ? r.sample.slice(0, maxSampleForAI).map(s => {
            const obj = {};
            for (const [key, val] of Object.entries(s)) {
                if (val === null || val === undefined || val === '') continue;
                if (['id', 'created_at', 'updated_at'].includes(key)) continue;
                if (key.includes('image') || key.includes('url') || key.includes('file') || key.includes('path')) continue;
                obj[key] = val;
            }
            return obj;
        }) : [];

        return entry;
    }), null, 2);
}
