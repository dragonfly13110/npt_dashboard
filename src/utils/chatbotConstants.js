export const AI_MODELS = {
    qwen: {
        key: 'qwen',
        label: '🧠 Qwen 3.6+',
        shortLabel: 'Qwen',
        description: 'Qwen 3.6 Plus (Free)',
        provider: 'OpenRouter',
        color: '#7c3aed',
        icon: '🧠',
        badge: 'FREE',
        badgeColor: '#52c41a',
    },
    gemini: {
        key: 'gemini',
        label: '✨ Gemini Flash',
        shortLabel: 'Gemini',
        description: 'Gemini 3.1 Flash-Lite',
        provider: 'Google',
        color: '#4285f4',
        icon: '✨',
        badge: 'FAST',
        badgeColor: '#1890ff',
    }
};

export const AI_PROXY_URL = '/.netlify/functions/ai-proxy';
export const OPENROUTER_MODEL = 'qwen/qwen3.6-plus:free';
export const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

export const TABLE_CONFIG = {
    agricultural_areas: { label: 'พื้นที่การเกษตร', icon: '🌾', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลพื้นที่เกษตรรายอำเภอ (ข้าว, พืชไร่, ไม้ผล, ผัก, ไม้ดอก, สมุนไพร)' },
    learning_centers: { label: 'ศูนย์เรียนรู้ (ศพก.)', icon: '🏫', group: 'ยุทธศาสตร์', descTh: 'ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร' },
    disasters: { label: 'ภัยพิบัติ', icon: '⛈️', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลภัยพิบัติด้านการเกษตร' },
    farmer_registry: { label: 'ทะเบียนเกษตรกร', icon: '📋', group: 'ยุทธศาสตร์', descTh: 'ทะเบียนเกษตรกรรายอำเภอ' },
    gis_areas: { label: 'พิกัด GIS', icon: '📍', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลพิกัดภูมิศาสตร์พื้นที่เกษตร' },
    kpi_plans: { label: 'แผน/KPI', icon: '📊', group: 'ยุทธศาสตร์', descTh: 'ตัวชี้วัดและแผนงานประจำปี' },
    large_plots: { label: 'แปลงใหญ่', icon: '🌿', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลแปลงใหญ่ (สินค้า, พื้นที่, สมาชิก)' },
    certifications: { label: 'มาตรฐาน GAP', icon: '✅', group: 'ส่งเสริมการผลิต', descTh: 'ใบรับรองมาตรฐาน GAP (ชื่อเกษตรกร, พืช, พื้นที่)' },
    crop_production: { label: 'ผลผลิตพืช', icon: '🌽', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลผลผลิตพืชรายอำเภอ' },
    community_enterprises: { label: 'วิสาหกิจชุมชน', icon: '🏪', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลวิสาหกิจชุมชน (ชื่อ, ประธาน, สมาชิก, ประเภท)' },
    smart_farmers: { label: 'เกษตรกรรุ่นใหม่', icon: '👨‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูล Smart Farmer / Young Smart Farmer' },
    farmer_groups: { label: 'กลุ่มแม่บ้าน/ยุวฯ', icon: '👩‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'กลุ่มแม่บ้านเกษตรกร, ยุวเกษตรกร' },
    farmer_institutes: { label: 'สถาบันเกษตรกร', icon: '🤝', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลสถาบันเกษตรกรรายอำเภอ (จำนวนกลุ่ม, อสม., SF, YSF)' },
    agri_tourism: { label: 'ท่องเที่ยวเกษตร', icon: '🏕️', group: 'พัฒนาเกษตรกร', descTh: 'แหล่งท่องเที่ยวเชิงเกษตร' },
    forecast_plots: { label: 'แปลงพยากรณ์', icon: '🔬', group: 'อารักขาพืช', descTh: 'แปลงพยากรณ์และเตือนการระบาดศัตรูพืช' },
    pest_centers: { label: 'ศจช.', icon: '🏥', group: 'อารักขาพืช', descTh: 'ศูนย์จัดการศัตรูพืชชุมชน' },
    soil_fertilizer_centers: { label: 'ศดปช.', icon: '🧪', group: 'อารักขาพืช', descTh: 'ศูนย์จัดการดินปุ๋ยชุมชน' },
    fire_hotspots: { label: 'จุดเฝ้าระวัง PM2.5', icon: '🔥', group: 'อารักขาพืช', descTh: 'จุดเฝ้าระวังการเผาและ PM2.5' },
};

export const QUICK_PROMPTS = [
    { icon: '📊', text: 'สรุปข้อมูลภาพรวมทั้งหมด' },
    { icon: '🌾', text: 'มีพื้นที่เกษตรทั้งหมดกี่ไร่' },
    { icon: '🌿', text: 'แปลงใหญ่มีกี่แปลง แบ่งตามสินค้าอะไรบ้าง' },
    { icon: '✅', text: 'มีใบรับรอง GAP กี่ราย' },
    { icon: '🏪', text: 'วิสาหกิจชุมชนมีกี่แห่ง' },
    { icon: '👨‍🌾', text: 'Smart Farmer มีกี่คน' },
    { icon: '🏫', text: 'ศูนย์เรียนรู้มีที่ไหนบ้าง' },
    { icon: '⛈️', text: 'ข้อมูลภัยพิบัติล่าสุด' },
    { icon: '📈', text: 'เปรียบเทียบข้อมูลเกษตรทุกอำเภอ' },
    { icon: '🔍', text: 'อำเภอไหนมีศักยภาพด้านเกษตรมากที่สุด' },
];

export const TABLE_SEARCH_COLS = {
    agricultural_areas: ['district'],
    learning_centers: ['name', 'chairman_name', 'featured_product'],
    disasters: ['disaster_type', 'subdistrict'],
    farmer_registry: ['main_crop'],
    gis_areas: ['area_name', 'area_type'],
    kpi_plans: ['kpi_name', 'project_name'],
    large_plots: ['plot_name', 'commodity', 'secondary_commodity', 'agency'],
    certifications: ['farmer_name', 'crop_name', 'plot_code'],
    crop_production: ['crop_name'],
    community_enterprises: ['enterprise_name', 'enterprise_type'],
    smart_farmers: ['full_name', 'main_product', 'farmer_type'],
    farmer_groups: ['group_name', 'chairman', 'group_type'],
    farmer_institutes: [],
    agri_tourism: ['spot_name', 'contact_person', 'spot_type'],
    forecast_plots: ['owner_name', 'crop_type', 'variety'],
    pest_centers: ['center_name', 'chairman', 'main_crop_type'],
    soil_fertilizer_centers: ['center_name', 'chairman', 'main_crop_type'],
    fire_hotspots: ['spot_name'],
};

export const DISTRICT_COLS = {
    certifications: 'plot_district',
    forecast_plots: 'district'
};

// Columns that contain numeric data for aggregation
export const NUMERIC_COLS = {
    agricultural_areas: ['total_area_rai', 'agri_crop_area_rai', 'farmer_households', 'rice_in_season_rai', 'rice_off_season_rai', 'field_crops_rai', 'horticulture_rai', 'fruit_trees_rai', 'vegetables_rai', 'flowers_rai', 'herbs_spices_rai'],
    farmer_registry: ['households_count', 'total_members'],
    large_plots: ['total_area_rai', 'member_count'],
    certifications: ['certified_area_rai'],
    crop_production: ['planted_area_rai', 'harvested_area_rai', 'yield_kg_per_rai', 'total_production_ton'],
    community_enterprises: ['member_count', 'capital_baht'],
    farmer_institutes: ['group_count', 'sf_count', 'ysf_count'],
    disasters: ['affected_area_rai', 'affected_households', 'damage_baht'],
};

export const SYSTEM_PROMPT = `คุณคือ "น้องข้าวหอม" 🌾 — AI ผู้ช่วยอัจฉริยะระดับสูงประจำระบบจัดการข้อมูลสำนักงานเกษตรจังหวัดนครปฐม

## บทบาทของคุณ
- คุณคือ **นักวิเคราะห์ข้อมูลเกษตรชั้นยอด** ที่ไม่ทำแค่ "อ่านตัวเลข" แต่สามารถ **สังเคราะห์ เปรียบเทียบ หาความสัมพันธ์ และค้นหา Insight ที่ซ่อนอยู่** ได้
- ให้ข้อมูลเชิงลึก สรุปประเด็น สังเคราะห์ข้อมูล ค้นหาสัดส่วน สรุปยอดรวม และนำเสนอข้อมูลระดับอำเภออย่างละเอียดที่สุด
- รองรับคำถามทั่วไปที่ไม่เกี่ยวกับฐานข้อมูลด้วย เช่น ทักทาย, ให้คำแนะนำ, ความรู้ทั่วไปเกี่ยวกับการเกษตร
- พูดภาษาไทยสุภาพ เป็นมืออาชีพ ใช้ Emoji ให้เหมาะสม

## 🔬 เทคนิคการวิเคราะห์ที่คุณ *ต้อง* ใช้ (ถ้าข้อมูลเพียงพอ)

### 1. Comparative Analysis (การเปรียบเทียบ)
- เปรียบเทียบข้อมูล **ข้ามอำเภอ**: อำเภอไหนเด่นสุด/น้อยสุดในแต่ละมิติ
- เปรียบเทียบ **ข้ามหมวดข้อมูล**: เช่น อำเภอที่มีเกษตรกรเยอะ มี GAP เยอะด้วยไหม?
- ใช้ตารางเปรียบเทียบให้ชัดเจน

### 2. Distribution & Concentration Analysis (การกระจายตัว)
- วิเคราะห์ว่าข้อมูลกระจุกตัวอยู่ที่ไหน (เช่น 80% ของ GAP อยู่ที่ 2 อำเภอ)
- หาอำเภอที่มี **ศักยภาพ** vs อำเภอที่ต้อง **พัฒนาเพิ่ม**
- คำนวณ % สัดส่วนของแต่ละอำเภอ

### 3. Gap Analysis (การวิเคราะห์ช่องว่าง)
- เปรียบเทียบ KPI เป้าหมาย vs ผลงานจริง (ถ้ามีข้อมูล)
- หาจุดที่ต้องปรับปรุง

### 4. Cross-Correlation (ความสัมพันธ์ข้ามชุดข้อมูล)
- พื้นที่เกษตรเยอะ → มีผลผลิตเยอะไหม?
- อำเภอที่มีศูนย์เรียนรู้เยอะ → มี Smart Farmer เยอะไหม?
- อำเภอที่มีภัยพิบัติบ่อย → กระทบพื้นที่เกษตรมากน้อยแค่ไหน?

### 5. Data Storytelling (เล่าเรื่องจากข้อมูล)
- สรุป Key Insight 3-5 ข้อที่สำคัญที่สุด
- เสนอข้อค้นพบที่น่าสนใจ (เช่น "พุทธมณฑลมีพื้นที่เกษตรน้อย แต่มีวิสาหกิจชุมชนมากเป็นอันดับ 3")
- ใช้ ✅ สำหรับจุดแข็ง, ⚠️ สำหรับจุดที่ต้องพัฒนา

## กฎสำคัญ
1. **ตอบให้กระชับและตรงประเด็น (Concise & Insightful)** — เข้าเป้าทันที สรุปสิ่งที่น่าสนใจ เน้นเนื้อหา ไม่เวิ่นเว้อ
2. **ห้ามกุ หรือนับข้อมูลตัวเลขเองเด็ดขาด** — ใช้ตัวเลขจาก \`total_records\`, \`aggregated_stats\`, และ \`pre_calculated_stats\` เสมอ เพราะเป็นค่าจากการคำนวณจริง 100%
3. **จัดรูปแบบให้อ่านรวดเร็ว** — ใช้ Markdown (bold, bullet, ตาราง 🌟) จัดเป็นข้อๆ ให้ชัดเจน
4. **ตอบให้ตรงคำถาม** — ถ้ามีคำถามเฉพาะจุด ให้เจาะไปที่คำตอบนั้นทันที
5. **ดึง Insight ทุกครั้ง** — ทุกคำตอบต้องมีอย่างน้อย 1-3 bullet สรุป 💡 Insight สำคัญ
6. **ใช้ตารางเปรียบเทียบ** — เมื่อมีข้อมูลหลายอำเภอหรือหลายหมวด ให้ใช้ Markdown table เสมอ
7. **คำนวณ % สัดส่วนอัตโนมัติ** — ทุกครั้งที่แสดงข้อมูลจำนวน ให้คิดเป็น % ของทั้งหมดด้วยเสมอ
8. **ใช้อารมณ์ขันและ Emoji พองาม** — ให้ดูฉลาด เป็นมิตร แต่ไม่พูดนอกเรื่อง

## คำศัพท์สำคัญ
- total_area_rai = พื้นที่ภูมิศาสตร์/เขตปกครองทั้งหมด
- agri_crop_area_rai = พื้นที่ทำการเกษตรด้านพืช
- farmer_households = จำนวนครัวเรือนเกษตรกร
- rice_in_season_rai = ข้าวนาปี, rice_off_season_rai = ข้าวนาปรัง
- field_crops_rai = พืชไร่, horticulture_rai = ไม้ดอกไม้ประดับ
- fruit_trees_rai = ไม้ผล, vegetables_rai = พืชผัก
- herbs_spices_rai = สมุนไพร/เครื่องเทศ

## ข้อมูลจังหวัดนครปฐม
- 7 อำเภอ: เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล
- ข้อมูลครอบคลุม: ยุทธศาสตร์, ส่งเสริมการผลิต, พัฒนาเกษตรกร, อารักขาพืช`;
