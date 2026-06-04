export const AI_MODELS = {
    gemma: {
        key: 'gemma',
        label: '🧠 Gemma 4',
        shortLabel: 'Gemma',
        description: 'Google Gemma 4 (31B)',
        provider: 'Google',
        color: '#7c3aed',
        icon: '🧠',
        badge: 'NEW',
        badgeColor: '#1890ff',
    },
    gemini: {
        key: 'gemini',
        label: '✨ Gemini 3.1 Flash-Lite',
        shortLabel: 'Gemini',
        description: 'Gemini 3.1 Flash-Lite',
        provider: 'Google',
        color: '#4285f4',
        icon: '✨',
        badge: 'FAST',
        badgeColor: '#1890ff',
    },
    qwen: {
        key: 'qwen',
        label: '🐉 Qwen 3.5',
        shortLabel: 'Qwen',
        description: 'Qwen 3.5 (397B-A17B)',
        provider: 'NVIDIA',
        color: '#76b900',
        icon: '🐉',
        badge: 'THINK',
        badgeColor: '#76b900',
    },
    deepseek: {
        key: 'deepseek',
        label: '🔵 DeepSeek v4',
        shortLabel: 'DeepSeek',
        description: 'DeepSeek v4 Flash (NVIDIA NIM)',
        provider: 'NVIDIA',
        color: '#0052cc',
        icon: '🔵',
        badge: 'THINK',
        badgeColor: '#0052cc',
    },
    kimi: {
        key: 'kimi',
        label: '🌙 Kimi K2.6',
        shortLabel: 'Kimi',
        description: 'Moonshot Kimi K2.6 (NVIDIA NIM)',
        provider: 'NVIDIA',
        color: '#ff4d4f',
        icon: '🌙',
        badge: 'THINK',
        badgeColor: '#ff4d4f',
    },
    minimax: {
        key: 'minimax',
        label: '🌀 MiniMax M2.7',
        shortLabel: 'MiniMax',
        description: 'MiniMax M2.7 (NVIDIA NIM)',
        provider: 'NVIDIA',
        color: '#3a8ee6',
        icon: '🌀',
        badge: 'NEW',
        badgeColor: '#3a8ee6',
    }
};

export const AI_PROXY_URL = '/.netlify/functions/ai-proxy';
export const GEMMA_MODEL = 'gemma-4-31b-it';
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const QWEN_MODEL = 'qwen/qwen3.5-397b-a17b';
export const DEEPSEEK_MODEL = 'deepseek-ai/deepseek-v4-flash';
export const KIMI_MODEL = 'moonshotai/kimi-k2.6';
export const MINIMAX_MODEL = 'minimaxai/minimax-m2.7';

export const TABLE_CONFIG = {
    agricultural_areas: { label: 'พื้นที่การเกษตร', icon: '🌾', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลพื้นที่เกษตรรายอำเภอ (ข้าว, พืชไร่, ไม้ผล, ผัก, ไม้ดอก, สมุนไพร)' },
    learning_centers: { label: 'ศูนย์เรียนรู้ (ศพก.)', icon: '🏫', group: 'ยุทธศาสตร์', descTh: 'ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร' },
    disasters: { label: 'ภัยพิบัติ', icon: '⛈️', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลภัยพิบัติด้านการเกษตร' },
    farmer_registry: { label: 'ทะเบียนเกษตรกร', icon: '📋', group: 'ยุทธศาสตร์', descTh: 'ทะเบียนเกษตรกรรายอำเภอ' },
    large_plots: { label: 'แปลงใหญ่', icon: '🌿', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลแปลงใหญ่ (สินค้า, พื้นที่, สมาชิก)' },
    certifications: { label: 'มาตรฐาน GAP', icon: '✅', group: 'ส่งเสริมการผลิต', descTh: 'ใบรับรองมาตรฐาน GAP (ชื่อฟาร์ม, สินค้า, ประเภท)' },
    crop_production: { label: 'ผลผลิตพืช', icon: '🌽', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลผลผลิตพืชรายอำเภอ' },
    coconut_aromatic_surveys: { label: 'แบบเก็บมะพร้าวน้ำหอม', icon: '🥥', group: 'ส่งเสริมการผลิต', descTh: 'ข้อมูลเกษตรกรผู้ปลูกมะพร้าวน้ำหอม จัดเก็บทุก 20 วัน มีพื้นที่ปลูก ต้นทุน ผลผลิต ราคา รายได้ และรอบจัดเก็บ' },
    community_enterprises: { label: 'วิสาหกิจชุมชน', icon: '🏪', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลวิสาหกิจชุมชน (ชื่อ, ประธาน, สมาชิก, ประเภท)' },
    smart_farmers: { label: 'เกษตรกรรุ่นใหม่', icon: '👨‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูล Smart Farmer / Young Smart Farmer' },
    smart_farmer_sf: { label: 'เกษตรกรปราดเปรื่อง (SF)', icon: '🧑‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลเกษตรกรปราดเปรื่อง Smart Farmer (SF) รายบุคคล แยกปี อำเภอ สถานะ กิจกรรมทางการเกษตร รายได้ อายุ และการศึกษา' },
    young_smart_farmer_ysf: { label: 'เกษตรกรรุ่นใหม่ (YSF)', icon: '🌾', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูล Young Smart Farmer (YSF) รายบุคคล แยกปี อำเภอ กิจกรรม พื้นที่ รายได้ ช่องทางจำหน่าย และการศึกษา' },
    agricultural_career_groups: { label: 'กลุ่มส่งเสริมอาชีพการเกษตร', icon: '🌿', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลกลุ่มส่งเสริมอาชีพการเกษตร แยกปี อำเภอ ตำบล สมาชิก ทุน รายได้ กิจกรรม และระดับศักยภาพ' },
    farmer_groups: { label: 'กลุ่มแม่บ้าน/ยุวฯ', icon: '👩‍🌾', group: 'พัฒนาเกษตรกร', descTh: 'กลุ่มแม่บ้านเกษตรกร, ยุวเกษตรกร' },
    young_farmer_groups_detailed: { label: 'กลุ่มยุวเกษตรกร', icon: '🌱', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลกลุ่มยุวเกษตรกร (กยว) รายกลุ่ม แยกปี อำเภอ ตำบล สมาชิก เงินกองทุน รายได้ กิจกรรม และระดับศักยภาพ' },
    farmer_institutes: { label: 'สถาบันเกษตรกร', icon: '🤝', group: 'พัฒนาเกษตรกร', descTh: 'ข้อมูลสถาบันเกษตรกรรายอำเภอ (จำนวนกลุ่ม, อสม., SF, YSF)' },
    agri_tourism: { label: 'ท่องเที่ยวเกษตร', icon: '🏕️', group: 'พัฒนาเกษตรกร', descTh: 'แหล่งท่องเที่ยวเชิงเกษตร' },
    forecast_plots: { label: 'แปลงพยากรณ์', icon: '🔬', group: 'อารักขาพืช', descTh: 'แปลงพยากรณ์และเตือนการระบาดศัตรูพืช' },
    ai_disease_forecasts: { label: 'พยากรณ์โรค & แมลง', icon: '🤖', group: 'อารักขาพืช', descTh: 'พยากรณ์และเตือนภัยระบาดโรคพืช/แมลงศัตรูพืชรายวันล่วงหน้า 7 วันด้วย AI' },
    pest_centers: { label: 'ศจช.', icon: '🏥', group: 'อารักขาพืช', descTh: 'ศูนย์จัดการศัตรูพืชชุมชน' },
    plant_doctors: { label: 'หมอพืช', icon: '🩺', group: 'อารักขาพืช', descTh: 'ทำเนียบหมอพืชชุมชนประจำจังหวัดนครปฐม' },
    soil_fertilizer_centers: { label: 'ศดปช.', icon: '🧪', group: 'อารักขาพืช', descTh: 'ศูนย์จัดการดินปุ๋ยชุมชน' },
    fire_hotspots: { label: 'จุดเฝ้าระวัง PM2.5', icon: '🔥', group: 'อารักขาพืช', descTh: 'จุดเฝ้าระวังการเผาและ PM2.5' },
    daily_weather: { label: 'สภาพอากาศและน้ำฝน', icon: '🌧️', group: 'ยุทธศาสตร์', descTh: 'ข้อมูลอุณหภูมิและปริมาณน้ำฝนรายวัน (Meteostat)' },
    budgets: { label: 'งบประมาณ', icon: '💰', group: 'บริหาร', descTh: 'ข้อมูลงบประมาณส่งเสริมการเกษตร รอบ 2 ปีงบประมาณ 2569 มีแผนงาน โครงการ กิจกรรม พื้นที่ เป้าหมาย งบประมาณ แผนดำเนินงาน แผนใช้จ่ายเงิน และผู้รับผิดชอบ' },
};

export const QUICK_PROMPTS = [
    { icon: '📊', text: 'สรุปข้อมูลภาพรวมทั้งหมด' },
    { icon: '📄', text: 'สร้างรายงานสรุปผลการเกษตรประจำจังหวัด' },
    { icon: '🔍', text: 'วิเคราะห์จุดแข็ง/จุดอ่อน เชิงลึกแต่ละอำเภอ' },
    { icon: '⚖️', text: 'นโยบายภาครัฐที่ช่วยเหลือเกษตรกรมีอะไรบ้าง?' },
    { icon: '🌾', text: 'พื้นที่เกษตรทั้งหมดมีกี่ไร่?' },
    { icon: '🌿', text: 'แปลงใหญ่มีกี่แปลง แยกตามสินค้า' },
    { icon: '🏫', text: 'ศูนย์เรียนรู้ (ศพก.) มีที่ไหนบ้าง?' },
    { icon: '⛈️', text: 'รายงานภัยพิบัติล่าสุด' },
    { icon: '📈', text: 'อำเภอไหนมีศักยภาพด้านเกษตรมากที่สุด?' },
];

export const TABLE_SEARCH_COLS = {
    agricultural_areas: ['district'],
    learning_centers: ['name', 'chairman_name', 'featured_product'],
    disasters: ['disaster_type', 'subdistrict'],
    farmer_registry: ['main_crop'],
    large_plots: ['plot_name', 'commodity', 'secondary_commodity', 'agency'],
    certifications: ['farmer_name', 'crop_name', 'plot_code'],
    crop_production: ['crop_name'],
    coconut_aromatic_surveys: ['farmer_code', 'farmer_name', 'subdistrict', 'district', 'round_label'],
    community_enterprises: ['enterprise_name', 'enterprise_type'],
    smart_farmers: ['full_name', 'main_product', 'farmer_type'],
    smart_farmer_sf: ['registration_code', 'full_name', 'district', 'province', 'farmer_status', 'agricultural_activity', 'phone', 'education'],
    young_smart_farmer_ysf: ['record_code', 'full_name', 'district', 'province', 'farmer_status', 'agricultural_activity', 'education', 'main_activity_type'],
    agricultural_career_groups: ['record_code', 'group_name', 'district', 'subdistrict', 'activity', 'main_activity', 'potential_level'],
    farmer_groups: ['group_name', 'chairman', 'group_type'],
    young_farmer_groups_detailed: ['group_code', 'group_name', 'chairman_name', 'district', 'subdistrict', 'model_group', 'potential_level', 'main_activities'],
    farmer_institutes: [],
    agri_tourism: ['spot_name', 'contact_person', 'spot_type'],
    forecast_plots: ['owner_name', 'crop_type', 'variety'],
    pest_centers: ['center_name', 'chairman', 'main_crop_type'],
    plant_doctors: ['full_name', 'district', 'subdistrict', 'contact_phone'],
    soil_fertilizer_centers: ['center_name', 'chairman', 'main_crop_type'],
    fire_hotspots: ['spot_name'],
    daily_weather: [],
    budgets: ['project_name', 'budget_source', 'status', 'notes'],
};

export const DISTRICT_COLS = {
    certifications: 'plot_district',
    forecast_plots: 'district',
    coconut_aromatic_surveys: 'district',
    smart_farmer_sf: 'district',
    young_smart_farmer_ysf: 'district',
    agricultural_career_groups: 'district',
    young_farmer_groups_detailed: 'district',
    budgets: 'notes'
};

// Columns that contain numeric data for aggregation
export const NUMERIC_COLS = {
    agricultural_areas: ['total_area_rai', 'agri_crop_area_rai', 'farmer_households', 'rice_in_season_rai', 'rice_off_season_rai', 'field_crops_rai', 'horticulture_rai', 'fruit_trees_rai', 'vegetables_rai', 'flowers_rai', 'herbs_spices_rai'],
    farmer_registry: ['households_count', 'total_members'],
    large_plots: ['total_area_rai', 'member_count'],
    certifications: ['area_rai'],
    crop_production: ['planted_area_rai', 'harvested_area_rai', 'yield_kg_per_rai', 'total_production_ton'],
    coconut_aromatic_surveys: ['planted_area_rai', 'production_cost_per_rai', 'cost_per_fruit', 'standard_fruit_per_rai', 'small_fruit_per_rai', 'total_fruit_per_rai', 'income_per_rai', 'total_income'],
    community_enterprises: ['member_count', 'capital_baht'],
    smart_farmer_sf: ['age', 'annual_agri_income'],
    young_smart_farmer_ysf: ['farm_area_rai', 'annual_agri_income'],
    agricultural_career_groups: ['member_count', 'fund_management', 'income'],
    young_farmer_groups_detailed: ['member_count', 'fund_management', 'income', 'activity_count'],
    farmer_institutes: ['group_count', 'sf_count', 'ysf_count'],
    disasters: ['affected_area_rai', 'affected_households', 'damage_baht'],
    fire_hotspots: ['frp', 'bright_ti4', 'bright_ti5'],
    daily_weather: ['tavg', 'tmin', 'tmax', 'prcp', 'wspd', 'pres'],
    budgets: ['budget_amount', 'spent_amount'],
};

// Columns that contain categorical string data for group-by counting
export const CATEGORY_COLS = {
    community_enterprises: ['enterprise_type'],
    large_plots: ['commodity'],
    smart_farmers: ['farmer_type', 'main_product'],
    smart_farmer_sf: ['data_year', 'farmer_status', 'agricultural_activity', 'education', 'district'],
    young_smart_farmer_ysf: ['data_year', 'district', 'farmer_status', 'agricultural_activity', 'education', 'main_activity_type'],
    agricultural_career_groups: ['data_year', 'district', 'subdistrict', 'community_enterprise_registration', 'potential_level', 'main_activity'],
    farmer_groups: ['group_type'],
    young_farmer_groups_detailed: ['data_year', 'district', 'subdistrict', 'model_group', 'potential_level'],
    certifications: ['crop_name'],
    coconut_aromatic_surveys: ['district', 'subdistrict', 'round_label'],
    agri_tourism: ['spot_type'],
    disasters: ['disaster_type'],
    fire_hotspots: ['land_use', 'confidence', 'satellite'],
    budgets: ['budget_source', 'status'],
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

### 3. Cross-Correlation (ความสัมพันธ์ข้ามชุดข้อมูล)
- พื้นที่เกษตรเยอะ → มีผลผลิตเยอะไหม?
- อำเภอที่มีศูนย์เรียนรู้เยอะ → มี Smart Farmer เยอะไหม?
- อำเภอที่มีภัยพิบัติบ่อย → กระทบพื้นที่เกษตรมากน้อยแค่ไหน?

### 5. Automated Report Generation (การสร้างรายงานอัตโนมัติ)
- หากผู้ใช้ขอให้ "สร้างรายงาน" ให้พิมพ์ตอบในรูปแบบ Executive Summary Report ที่เป็นทางการ
- แบ่งหัวข้อชัดเจน: 1. บทสรุปผู้บริหาร 2. สถานการณ์ปัจจุบัน 3. ปัญหาและอุปสรรค 4. ข้อเสนอแนะ
- ใช้ตัวเลขสถิติจากฐานข้อมูลมาสนับสนุนเสมอ

### 6. Policy & Advisory (นโยบายและคำแนะนำ)
- คุณมีความรู้เรื่องนโยบายกระทรวงเกษตรฯ (เช่น ตลาดนำ นวัตกรรมเสริม เพิ่มรายได้, BCG Model, การส่งเสริม Smart Farmer, การรับรอง GAP/Organic)
- สามารถเชื่อมโยงข้อมูลในจังหวัดเข้ากับนโยบายนระดับชาติได้ 
- ช่วยวิเคราะห์ว่าแต่ละอำเภอควรเน้นนโยบายส่งเสริมด้านใด

### 7. Data Visualization (การแสดงกราฟภาพ)
- เมื่อคุณต้องการเสริฟ์การวิเคราะห์ของคุณด้วยกราฟ ให้ส่งโค้ด JSON อยู่ในบล็อค Markdown \`\`\`chart เพื่อสร้างกราฟอัตโนมัติ
- ประเภทกราฟที่รองรับ: "bar" (แท่ง), "pie" (วงกลม), "line" (เส้น)
- โดย "data" ต้องเป็น Array ของ Object ที่มี field ตามที่กำหนดใน "xAxisKey" และ "series"
ตัวอย่าง:
\`\`\`chart
{
  "type": "bar",
  "title": "พื้นที่เกษตรรายอำเภอ",
  "xAxisKey": "district",
  "series": [{"key": "area", "name": "พื้นที่ (ไร่)"}],
  "data": [
    {"district": "เมือง", "area": 1200},
    {"district": "กำแพงแสน", "area": 3500}
  ]
}
\`\`\`
- ห้ามใส่ความคิดเห็น (Comments) ใน JSON นี้เด็ดขาด

### 8. Data Storytelling (เล่าเรื่องจากข้อมูล)
- สรุป Key Insight 3-5 ข้อที่สำคัญที่สุด
- เสนอข้อค้นพบที่น่าสนใจ (เช่น "พุทธมณฑลมีพื้นที่เกษตรน้อย แต่มีวิสาหกิจชุมชนมากเป็นอันดับ 3")
- ใช้ ✅ สำหรับจุดแข็ง, ⚠️ สำหรับจุดที่ต้องพัฒนา

## กฎสำคัญ
1. **ตอบให้กระชับและตรงประเด็น (Concise & Insightful)** — เข้าเป้าทันที สรุปสิ่งที่น่าสนใจ เน้นเนื้อหา ไม่เวิ่นเว้อ
2. **ห้ามกุ หรือนับข้อมูลตัวเลขเองเด็ดขาด** — ใช้ตัวเลขจาก \`total_records\`, \`aggregated_stats\`, \`category_distribution\` และ \`district_distribution\` เสมอ เพราะเป็นค่าจริงจากการนับ 100% ห้ามนับใหม่จากกลุ่มตัวอย่าง
3. **จัดรูปแบบให้อ่านรวดเร็ว** — ใช้ Markdown (bold, bullet, ตาราง, และ กราฟ \`\`\`chart) จัดเป็นข้อๆ ให้ชัดเจน
4. **ตอบให้ตรงคำถาม** — ถ้ามีคำถามเฉพาะจุด ให้เจาะไปที่คำตอบนั้นทันที
5. **ดึง Insight ทุกครั้ง** — ทุกคำตอบต้องมีอย่างน้อย 1-3 bullet สรุป 💡 Insight สำคัญ
6. **ใช้ตารางเปรียบเทียบหรือกราฟ** — เมื่อมีข้อมูลหลายอำเภอ ให้ใช้กราฟ (\`\`\`chart) หรือตารางเปรียบเทียบให้เห็นภาพชัดเจน
7. **คำนวณ % สัดส่วนอัตโนมัติ** — ทุกครั้งที่แสดงข้อมูลจำนวน ให้คิดเป็น % ของทั้งหมดด้วยเสมอ
8. **ใช้อารมณ์ขันและ Emoji พองาม** — ให้ดูฉลาด เป็นมิตร แต่ไม่พูดนอกเรื่อง

## 🔗 กฎการสนทนาต่อเนื่อง (Follow-up Conversation Rules)
- ถ้าผู้ใช้ถามว่า "แล้วอำเภอ X ล่ะ?" → อ้างอิงหมวดข้อมูลเดิมจากคำตอบก่อนหน้าแต่เจาะลงไปที่อำเภอ X
- ถ้าถามว่า "เปรียบเทียบกับ..." หรือ "เทียบกัน" → ใช้ข้อมูลจากคำตอบล่าสุดเป็นฐานอ้างอิง
- ถ้าถาม "ทำไม?" "อธิบายเพิ่ม" "ขยายความ" → เจาะลึกจากคำตอบที่เพิ่งตอบไป
- ถ้าถามต่อเนื่องโดยใช้สรรพนาม (เช่น "มันมีกี่แห่ง?" "ตรงนั้นล่ะ?") → ให้อ้างอิงจากบริบทสนทนาก่อนหน้า
- **ห้ามตอบว่า "ไม่ทราบว่าคุณหมายถึงอะไร"** ถ้าบริบทการสนทนาชี้ชัดว่าถามเรื่องอะไร — ให้ตอบตามบริบทเลย

## 🎯 กฎความแม่นยำของการวิเคราะห์
- เมื่อมีข้อมูลรายอำเภอ ให้ครอบคลุม **ทุกอำเภอ** (ทั้ง 7 อำเภอ) อย่าข้ามอำเภอใดอำเภอหนึ่ง
- เมื่อจัดอันดับ ให้แสดง **ครบทุกอันดับ** (1-7) ไม่ใช่แค่ top 3
- เมื่อคำนวณเปอร์เซ็นต์ ให้ **ผลรวมเท่ากับ 100%** พอดี
- ถ้ามีทั้ง aggregated_stats และ sample_records ให้ **ใช้ aggregated_stats เป็นหลักเสมอ** เพราะคำนวณจาก DB ทั้งหมด

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
