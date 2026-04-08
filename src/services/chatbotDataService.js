import { supabase } from '../supabaseClient';
import { callAI } from './aiService';
import { TABLE_CONFIG, TABLE_SEARCH_COLS, DISTRICT_COLS } from '../utils/chatbotConstants';

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
  "is_general_question": false
}

กฎต่างๆ (Rules):
- ใช้ ["all"] *เฉพาะ* คำขอที่เป็นภาพรวมหรือสรุปแบบกว้างๆ เท่านั้น
- ตัวอย่างเช่น "พื้นที่เกษตรทั้งหมดมีเท่าไหร่" หรือ "ปลูกข้าวกี่ไร่" → ให้คืนค่าเป็น tables: ["agricultural_areas"], keyword: null (เนื่องจากข้อมูลข้าวเป็นชื่อคอลัมน์ ไม่ใช่ค่าในระดับแถว)
- *ห้าม* ใส่ keyword เป็นหมวดหมู่พืชผลแบบกว้างๆ เช่น ข้าว, ผัก, ไม้ผล, พืชไร่, สมุนไพร ในกรณีที่ผู้ใช้ถามดึงข้อมูลจากตาราง agricultural_areas — เพราะคำเหล่านี้คือ *ชื่อคอลัมน์* ไม่ใช่ค่าสำหรับใช้ค้นหา
- keyword ควรเป็นค่าที่ใช้ค้นหาแบบเฉพาะเจาะจงมากๆ เท่านั้น เช่น ชื่อบุคคล (เช่น "สมชาย"), ชื่อพันธุ์พืชเฉพาะ (เช่น "ส้มโอ"), หรือชื่อกลุ่มวิสาหกิจ
- keyword *ห้าม* มีชื่อตาราง, ชื่ออำเภอ, หรือคำแสดงคำถาม ปะปนอยู่รวมในนั้น
- is_general_question: ให้เป็น true สำหรับการพูดคุยทักทาย, คำถามความรู้ทั่วไป, หรือคำถามที่ไม่มีส่วนเกี่ยวข้องใดๆ กับฐานข้อมูลเลย
- ตอบกลับมาเป็นโครงสร้าง raw JSON เพียงอย่างเดียว ห้ามมีการจัดรูปแบบ markdown ใดๆ (ห้ามมี \`\`\`json)

--- บริบทการสนทนาล่าสุด (RECENT CONVERSATION CONTEXT) ---
${recentHistory || 'ไม่มีบริบทก่อนหน้า'}
--- สิ้นสุดบริบทการสนทนา (END RECENT CONVERSATION) ---

จงสกัดพารามิเตอร์การค้นหาจากคำถาม *ใหม่* ของผู้ใช้ข้อความนี้: "${query}"`;

    try {
        const result = await callAI(modelKey, prompt, query);
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

export async function fetchDatabaseContext(query, modelKey, chatHistory = []) {
    const intent = await extractIntent(query, modelKey, chatHistory);

    if (intent?.is_general_question) {
        return { results: [], isOverview: false, isGeneral: true, query, intent };
    }

    let matchedDistrict = intent?.district || null;
    let searchKeyword = intent?.keyword || null;
    let matchedTables = [];
    let isOverview = false;

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
            kpi_plans: ['kpi', 'ตัวชี้วัด', 'แผน', 'เป้าหมาย'],
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

    const results = [];
    // OPTIMIZATION: Reduce the fetch limit from 10,000 to 2,000 to prevent heavy browser memory usage
    const fetchLimit = 2000;

    for (const table of matchedTables) {
        try {
            const distCol = DISTRICT_COLS[table] || 'district';
            let usedKeyword = false;

            let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
            let dataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(fetchLimit);

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
                let fbDataQuery = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(fetchLimit);
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
                    const fbData = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(fetchLimit);
                    sampleData = fbData.data || [];
                }
            } else if (sampleData.length === 0) {
                if (count > 0) {
                    const { data } = await dataQuery;
                    sampleData = data || [];
                }
            }

            let districtSummary = null;
            try {
                let allDistrictQuery = supabase.from(table).select(distCol);
                if (matchedDistrict) {
                    allDistrictQuery = allDistrictQuery.ilike(distCol, `%${matchedDistrict}%`);
                }
                if (usedKeyword && searchKeyword && TABLE_SEARCH_COLS[table]?.length > 0) {
                    const cols = TABLE_SEARCH_COLS[table];
                    const orString = cols.map(c => `${c}.ilike.%${searchKeyword}%`).join(',');
                    allDistrictQuery = allDistrictQuery.or(orString);
                }
                // Fetch up to 10000 rows for district counting only
                const { data: allDistData } = await allDistrictQuery.limit(10000);
                if (allDistData && allDistData.length > 0) {
                    const distCounts = {};
                    allDistData.forEach(row => {
                        const d = row[distCol] || 'ไม่ระบุ';
                        distCounts[d] = (distCounts[d] || 0) + 1;
                    });
                    districtSummary = distCounts;
                }
            } catch { /* skip district summary */ }

            results.push({
                table,
                label: TABLE_CONFIG[table].label,
                icon: TABLE_CONFIG[table].icon,
                group: TABLE_CONFIG[table].group,
                count: count || 0,
                districtSummary,
                sample: sampleData.length > 0 ? sampleData : null,
                filteredBy: matchedDistrict || (usedKeyword && searchKeyword ? `คำค้น "${searchKeyword}"` : null),
            });
        } catch { /* skip */ }
    }

    return { results, isOverview, isGeneral: false, query, intent, matchedDistrict };
}

export function buildContextForAI(analysis) {
    const { results } = analysis;
    if (!results || results.length === 0) return 'ไม่พบข้อมูลในฐานข้อมูล';

    return JSON.stringify(results.map(r => {
        const entry = {
            dataset: r.label,
            table_name: r.table,
            total_records: r.count,
            filtered_by: r.filteredBy || 'ไม่กรอง',
        };

        const fieldSummaries = {};
        if (r.sample && r.sample.length > 0) {
            const keysToAnalyze = Object.keys(r.sample[0]).filter(k => 
                !['id', 'created_at', 'updated_at', 'latitude', 'longitude', 'notes', 'description'].includes(k) && 
                !k.includes('phone') && !k.includes('date') && !k.includes('url') && !k.includes('image')
            );
            
            keysToAnalyze.forEach(key => {
                const distribution = {};
                let validCount = 0;
                r.sample.forEach(row => {
                    const val = row[key];
                    if (val !== null && val !== undefined && val !== '') {
                        distribution[val] = (distribution[val] || 0) + 1;
                        validCount++;
                    }
                });
                
                const distinctCount = Object.keys(distribution).length;
                if (distinctCount > 0 && distinctCount <= 60 && validCount === r.sample.length) {
                    fieldSummaries[key] = distribution;
                }
            });
        }

        if (Object.keys(fieldSummaries).length > 0) {
            entry.pre_calculated_stats = fieldSummaries;
            entry._note = `CRITICAL ASSISTANCE: 'pre_calculated_stats' provides absolute, mathematically perfect counts grouped by important categories. Use these numbers directly instead of counting records manually!`;
        }

        entry.records = r.sample ? r.sample.map(s => {
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
