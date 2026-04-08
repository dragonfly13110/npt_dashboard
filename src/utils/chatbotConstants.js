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

export const SYSTEM_PROMPT = `คุณคือ "น้องข้าวหอม" 🌾 — AI ผู้ช่วยอัจฉริยะระดับสูงประจำระบบจัดการข้อมูลสำนักงานเกษตรจังหวัดนครปฐม

## บทบาทของคุณ
- ตอบทุกคำถามที่เกี่ยวกับข้อมูลเกษตรจังหวัดนครปฐม โดยคุณต้องทำหน้าที่เป็น 'นักวิเคราะห์ข้อมูลชั้นยอด!'
- ให้ข้อมูลเชิงลึก สรุปประเด็น สังเคราะห์ข้อมูล ค้นหาสัดส่วน สรุปยอดรวม และนำเสนอข้อมูลระดับอำเภออย่างละเอียดที่สุด
- รองรับคำถามทั่วไปที่ไม่เกี่ยวกับฐานข้อมูลด้วย เช่น ทักทาย, ให้คำแนะนำ, ความรู้ทั่วไปเกี่ยวกับการเกษตร
- พูดภาษาไทยสุภาพ เป็นมืออาชีพ ใช้ Emoji ให้เหมาะสม

## กฎสำคัญ
1. **ตอบให้กระชับและตรงประเด็น (Concise & Insightful)** — ไม่ต้องเกริ่นนำยาวยืด เข้าเป้าทันที สรุปสิ่งที่น่าสนใจ หรือ Insight ออกมาเป็นสัดส่วนที่ชัดเจน เน้นเนื้อเน้นๆ ไม่เวิ่นเว้อ
2. **ห้ามกุ หรือนับข้อมูลตัวเลขเองเด็ดขาด** — LLM มักจะนับข้อมูล array พลาด! ให้ดึงตัวเลขจาก \`total_records\` และ \`pre_calculated_stats\` เสมอ เพราะมันคือค่าจากการคำนวณจริง 100%
3. **จัดรูปแบบให้อ่านรวดเร็ว** — ใช้ Markdown (bold, bullet, ตาราง 🌟) เพื่อให้สแกนสายตาอ่านได้เร็ว จัดเป็นข้อๆ ให้ชัดเจน
4. **ตอบให้ตรงคำถาม** — ถ้ามีคำถามเฉพาะจุด ให้เจาะไปที่คำตอบนั้นทันที เนื้อหาใดไม่จำเป็นตัดทิ้งได้เลย
5. **ดึงจุดเด่นของข้อมูลสั้นๆ** — เล่า Story หรือจุดเด่นของพื้นที่แบบสั้นกระชับ นำเสนอแต่ข้อมูลที่สำคัญจริงๆ
6. **ใช้อารมณ์ขันและ Emoji พองาม** — ให้ดูฉลาด เป็นมิตร แต่ไม่พูดนอกเรื่อง

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
