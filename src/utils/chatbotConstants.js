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
  mistralLarge: {
    key: 'mistralLarge',
    label: '🌪️ Mistral Large 3',
    shortLabel: 'Mistral Large',
    description: 'Mistral Large 3 (675B)',
    provider: 'NVIDIA',
    color: '#fdba74',
    icon: '🌪️',
    badge: 'FAST & HUGE',
    badgeColor: '#f97316',
  },
  deepseekV4: {
    key: 'deepseekV4',
    label: '🧩 DeepSeek v4 Flash',
    shortLabel: 'DeepSeek v4',
    description: 'DeepSeek v4 Flash',
    provider: 'NVIDIA',
    color: '#0f766e',
    icon: '🧩',
    badge: 'FAST',
    badgeColor: '#0f766e',
  },
  llama31_8b: {
    key: 'llama31_8b',
    label: '🦙 Llama 3.1 (8B)',
    shortLabel: 'Llama 3.1 8B',
    description: 'Meta Llama 3.1 8B Instruct',
    provider: 'NVIDIA',
    color: '#3b82f6',
    icon: '🦙',
    badge: 'FAST',
    badgeColor: '#3b82f6',
  },
  llama33: {
    key: 'llama33',
    label: '🦙 Llama 3.3 (70B)',
    shortLabel: 'Llama 3.3',
    description: 'Meta Llama 3.3 70B Instruct',
    provider: 'NVIDIA',
    color: '#2563eb',
    icon: '🦙',
    badge: 'SMART',
    badgeColor: '#2563eb',
  },
  llama4_maverick: {
    key: 'llama4_maverick',
    label: '🦙 Llama 4 Maverick (17B)',
    shortLabel: 'Llama 4 Maverick',
    description: 'Meta Llama 4 Maverick MoE',
    provider: 'NVIDIA',
    color: '#1d4ed8',
    icon: '🦙',
    badge: 'NEW & FAST',
    badgeColor: '#1d4ed8',
  },
  ministral14b: {
    key: 'ministral14b',
    label: '🌪️ Ministral 14B',
    shortLabel: 'Ministral 14B',
    description: 'Mistral Ministral 14B Instruct',
    provider: 'NVIDIA',
    color: '#fb923c',
    icon: '🌪️',
    badge: 'FAST',
    badgeColor: '#fb923c',
  },
  kkuDeepseek: {
    key: 'kkuDeepseek',
    label: '🧩 OKMD DeepSeek v4 Flash',
    shortLabel: 'OKMD DeepSeek',
    description: 'DeepSeek v4 Flash',
    provider: 'OKMD AI',
    color: '#0f766e',
    icon: '🧩',
    badge: 'EXT',
    badgeColor: '#0f766e',
  },
  kkuClaudeSonnet: {
    key: 'kkuClaudeSonnet',
    label: '🟧 Claude Sonnet 4.6',
    shortLabel: 'Claude Sonnet',
    description: 'Claude Sonnet 4.6',
    provider: 'OKMD AI',
    color: '#c2410c',
    icon: '🟧',
  },
  kkuGptMini: {
    key: 'kkuGptMini',
    label: '⚫ GPT-5.4 Mini',
    shortLabel: 'GPT Mini',
    description: 'GPT-5.4 Mini',
    provider: 'OKMD AI',
    color: '#111827',
    icon: '⚫',
  },
  kkuGeminiFlash: {
    key: 'kkuGeminiFlash',
    label: '✨ Gemini 3.5 Flash',
    shortLabel: 'Gemini Flash',
    description: 'Gemini 3.5 Flash',
    provider: 'OKMD AI',
    color: '#2563eb',
    icon: '✨',
  },
  kkuQwenMax: {
    key: 'kkuQwenMax',
    label: '🐉 Qwen 3.7 Max',
    shortLabel: 'Qwen Max',
    description: 'Qwen 3.7 Max',
    provider: 'OKMD AI',
    color: '#16a34a',
    icon: '🐉',
  },
  kkuSonarPro: {
    key: 'kkuSonarPro',
    label: '🔎 Sonar Pro',
    shortLabel: 'Sonar Pro',
    description: 'Perplexity Sonar Pro',
    provider: 'OKMD AI',
    color: '#0891b2',
    icon: '🔎',
  },
  kkuLlamaMaverick: {
    key: 'kkuLlamaMaverick',
    label: '🦙 Llama 4 Maverick',
    shortLabel: 'Llama Maverick',
    description: 'Llama 4 Maverick',
    provider: 'OKMD AI',
    color: '#7c3aed',
    icon: '🦙',
  },
  kkuDeepseekPro: {
    key: 'kkuDeepseekPro',
    label: '🧩 DeepSeek v4 Pro',
    shortLabel: 'DeepSeek Pro',
    description: 'DeepSeek v4 Pro',
    provider: 'OKMD AI',
    color: '#0f766e',
    icon: '🧩',
  },
  kkuGrok43: {
    key: 'kkuGrok43',
    label: '❌ Grok 4.3',
    shortLabel: 'Grok 4.3',
    description: 'xAI Grok 4.3',
    provider: 'OKMD AI',
    color: '#27272a',
    icon: '❌',
    badge: 'NEW',
    badgeColor: '#27272a',
  },
  kkuGpt54: {
    key: 'kkuGpt54',
    label: '⚫ GPT-5.4',
    shortLabel: 'GPT 5.4',
    description: 'OpenAI GPT-5.4',
    provider: 'OKMD AI',
    color: '#10b981',
    icon: '⚫',
    badge: 'SMART',
    badgeColor: '#10b981',
  },
  kkuLlama4Scout: {
    key: 'kkuLlama4Scout',
    label: '🦙 Llama 4 Scout',
    shortLabel: 'Llama Scout',
    description: 'Meta Llama 4 Scout',
    provider: 'OKMD AI',
    color: '#3b82f6',
    icon: '🦙',
  },
  kkuQwenPlus: {
    key: 'kkuQwenPlus',
    label: '🐉 Qwen 3.7 Plus',
    shortLabel: 'Qwen Plus',
    description: 'Qwen 3.7 Plus',
    provider: 'OKMD AI',
    color: '#16a34a',
    icon: '🐉',
  },
  kkuNovaPro: {
    key: 'kkuNovaPro',
    label: '🔶 Nova Pro',
    shortLabel: 'Nova Pro',
    description: 'Amazon Nova Pro v1',
    provider: 'OKMD AI',
    color: '#ff9900',
    icon: '🔶',
  },
  kkuGeminiPro: {
    key: 'kkuGeminiPro',
    label: '✨ Gemini 3.1 Pro',
    shortLabel: 'Gemini Pro',
    description: 'Gemini 3.1 Pro Preview',
    provider: 'OKMD AI',
    color: '#2563eb',
    icon: '✨',
  },
};

export const AI_PROXY_URL = '/.netlify/functions/ai-proxy';
export const GEMMA_MODEL = 'gemma-4-31b-it';
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const QWEN_MODEL = 'qwen/qwen3.5-397b-a17b';
export const KIMI_MODEL = 'moonshotai/kimi-k2.6';
export const MISTRAL_LARGE_MODEL =
  'mistralai/mistral-large-3-675b-instruct-2512';
export const DEEPSEEK_V4_FLASH_MODEL = 'deepseek-ai/deepseek-v4-flash';
export const LLAMA31_8B_MODEL = 'meta/llama-3.1-8b-instruct';
export const LLAMA33_MODEL = 'meta/llama-3.3-70b-instruct';
export const LLAMA4_MAVERICK_MODEL = 'meta/llama-4-maverick-17b-128e-instruct';
export const MINISTRAL_14B_MODEL = 'mistralai/ministral-14b-instruct-2512';
export const KKU_DEEPSEEK_MODEL = 'deepseek-v4-flash';
export const KKU_MODEL_IDS = {
  kkuDeepseek: 'deepseek-v4-flash',
  kkuClaudeSonnet: 'claude-sonnet-4.6',
  kkuGptMini: 'gpt-5.4-mini',
  kkuGeminiFlash: 'gemini-3.5-flash',
  kkuQwenMax: 'qwen3.7-max',
  kkuSonarPro: 'sonar-pro',
  kkuLlamaMaverick: 'llama-4-maverick',
  kkuDeepseekPro: 'deepseek-v4-pro',
  kkuGrok43: 'grok-4.3',
  kkuGpt54: 'gpt-5.4',
  kkuLlama4Scout: 'llama-4-scout',
  kkuQwenPlus: 'qwen3.7-plus',
  kkuNovaPro: 'nova-pro-v1',
  kkuGeminiPro: 'gemini-3.1-pro-preview',
};

export const TABLE_CONFIG = {
  agricultural_areas: {
    label: 'พื้นที่การเกษตร',
    icon: '🌾',
    group: 'กลุ่มยุทธศาสตร์และสารสนเทศ',
    descTh:
      'ข้อมูลพื้นที่เกษตรรายอำเภอ (ข้าว, พืชไร่, ไม้ผล, ผัก, ไม้ดอก, สมุนไพร)',
  },
  learning_centers: {
    label: 'ศูนย์เรียนรู้ (ศพก.)',
    icon: '🏫',
    group: 'กลุ่มยุทธศาสตร์และสารสนเทศ',
    descTh: 'ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร',
  },
  disasters: {
    label: 'ภัยพิบัติ',
    icon: '⛈️',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'ข้อมูลภัยพิบัติด้านการเกษตร',
  },
  farmer_registry: {
    label: 'ทะเบียนเกษตรกร',
    icon: '📋',
    group: 'กลุ่มยุทธศาสตร์และสารสนเทศ',
    descTh: 'ทะเบียนเกษตรกรรายอำเภอ',
  },
  gis_areas: {
    label: 'พื้นที่ GIS',
    icon: '🗺️',
    group: 'กลุ่มยุทธศาสตร์และสารสนเทศ',
    descTh: 'พื้นที่ GIS และเขตข้อมูลเชิงแผนที่',
  },
  large_plots: {
    label: 'แปลงใหญ่',
    icon: '🌿',
    group: 'กลุ่มส่งเสริมและพัฒนาการผลิต',
    descTh: 'ข้อมูลแปลงใหญ่ (สินค้า, พื้นที่, สมาชิก)',
  },
  certifications: {
    label: 'มาตรฐาน GAP',
    icon: '✅',
    group: 'กลุ่มส่งเสริมและพัฒนาการผลิต',
    descTh: 'ใบรับรองมาตรฐาน GAP (ชื่อฟาร์ม, สินค้า, ประเภท)',
  },
  crop_production: {
    label: 'ผลผลิตพืช',
    icon: '🌽',
    group: 'กลุ่มส่งเสริมและพัฒนาการผลิต',
    descTh: 'ข้อมูลผลผลิตพืชรายอำเภอ',
  },
  production_costs: {
    label: 'ต้นทุนการผลิต',
    icon: '💰',
    group: 'กลุ่มส่งเสริมและพัฒนาการผลิต',
    descTh:
      'ข้อมูลต้นทุนการผลิต ปี 2567 แยกตามพืช มีผลผลิตเฉลี่ย มูลค่าเฉลี่ย ค่าใช้จ่ายย่อย และรวมค่าใช้จ่ายต่อไร่',
  },
  community_enterprises: {
    label: 'วิสาหกิจชุมชน',
    icon: '🏪',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'ข้อมูลวิสาหกิจชุมชน (ชื่อ, ประธาน, สมาชิก, ประเภท)',
  },
  smart_farmers: {
    label: 'เกษตรกรรุ่นใหม่',
    icon: '👨‍🌾',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'ข้อมูล Smart Farmer / Young Smart Farmer',
  },
  smart_farmer_sf: {
    label: 'เกษตรกรปราดเปรื่อง (SF)',
    icon: '🧑‍🌾',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh:
      'ข้อมูลเกษตรกรปราดเปรื่อง Smart Farmer (SF) รายบุคคล แยกปี อำเภอ สถานะ กิจกรรมทางการเกษตร รายได้ อายุ และการศึกษา',
  },
  young_smart_farmer_ysf: {
    label: 'เกษตรกรรุ่นใหม่ (YSF)',
    icon: '🌾',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh:
      'ข้อมูล Young Smart Farmer (YSF) รายบุคคล แยกปี อำเภอ กิจกรรม พื้นที่ รายได้ ช่องทางจำหน่าย และการศึกษา',
  },
  agricultural_career_groups: {
    label: 'กลุ่มส่งเสริมอาชีพการเกษตร',
    icon: '🌿',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh:
      'ข้อมูลกลุ่มส่งเสริมอาชีพการเกษตร แยกปี อำเภอ ตำบล สมาชิก ทุน รายได้ กิจกรรม และระดับศักยภาพ',
  },
  farmer_groups: {
    label: 'กลุ่มแม่บ้าน/ยุวฯ',
    icon: '👩‍🌾',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'กลุ่มแม่บ้านเกษตรกร, ยุวเกษตรกร',
  },
  housewife_farmer_groups: {
    label: 'กลุ่มแม่บ้านเกษตรกร',
    icon: '👩‍🌾',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'กลุ่มแม่บ้านเกษตรกร รายกลุ่ม รายอำเภอ กิจกรรม และศักยภาพ',
  },
  young_farmer_groups: {
    label: 'กลุ่มยุวเกษตรกร',
    icon: '🌱',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'กลุ่มยุวเกษตรกร รายกลุ่ม รายอำเภอ ประธาน และสมาชิก',
  },
  young_farmer_groups_detailed: {
    label: 'กลุ่มยุวเกษตรกร',
    icon: '🌱',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh:
      'ข้อมูลกลุ่มยุวเกษตรกร (กยว) รายกลุ่ม แยกปี อำเภอ ตำบล สมาชิก เงินกองทุน รายได้ กิจกรรม และระดับศักยภาพ',
  },
  farmer_institutes: {
    label: 'สถาบันเกษตรกร',
    icon: '🤝',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'ข้อมูลสถาบันเกษตรกรรายอำเภอ (จำนวนกลุ่ม, อสม., SF, YSF)',
  },
  agri_tourism: {
    label: 'ท่องเที่ยวเกษตร',
    icon: '🏕️',
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    descTh: 'แหล่งท่องเที่ยวเชิงเกษตร',
  },
  forecast_plots: {
    label: 'แปลงพยากรณ์',
    icon: '🔬',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'แปลงพยากรณ์และเตือนการระบาดศัตรูพืช',
  },
  ai_disease_forecasts: {
    label: 'พยากรณ์โรค & แมลง',
    icon: '🤖',
    group: 'กลุ่มอารักขาพืช',
    descTh:
      'พยากรณ์และเตือนภัยระบาดโรคพืช/แมลงศัตรูพืชรายวันล่วงหน้า 7 วันด้วย AI',
  },
  pest_outbreaks: {
    label: 'การระบาดศัตรูพืช',
    icon: '⚠️',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'รายงานการระบาดศัตรูพืช พืชที่กระทบ พื้นที่ และระดับความรุนแรง',
  },
  pest_centers: {
    label: 'ศจช.',
    icon: '🏥',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'ศูนย์จัดการศัตรูพืชชุมชน',
  },
  plant_doctors: {
    label: 'หมอพืช',
    icon: '🩺',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'ทำเนียบหมอพืชชุมชนประจำจังหวัดนครปฐม',
  },
  soil_fertilizer_centers: {
    label: 'ศดปช.',
    icon: '🧪',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'ศูนย์จัดการดินปุ๋ยชุมชน',
  },
  soil_series: {
    label: 'ชุดดิน',
    icon: '🧪',
    group: 'กลุ่มอารักขาพืช',
    descTh:
      'ข้อมูลชุดดินจังหวัดนครปฐมจากกรมพัฒนาที่ดิน แยกอำเภอ กลุ่มชุดดิน เนื้อดิน ความอุดมสมบูรณ์ pH และพื้นที่ไร่',
  },
  biocontrol_stock: {
    label: 'ชีวภัณฑ์',
    icon: '🧪',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'คลังชีวภัณฑ์ แหล่งที่มา ปริมาณ ช่วงเวลา และสถานะ',
  },
  fire_hotspots: {
    label: 'จุดเฝ้าระวัง PM2.5',
    icon: '🔥',
    group: 'กลุ่มอารักขาพืช',
    descTh: 'จุดเฝ้าระวังการเผาและ PM2.5',
  },
  daily_weather: {
    label: 'สภาพอากาศและน้ำฝน',
    icon: '🌧️',
    group: 'กลุ่มยุทธศาสตร์และสารสนเทศ',
    descTh: 'ข้อมูลอุณหภูมิและปริมาณน้ำฝนรายวัน (Meteostat)',
  },
  budgets: {
    label: 'งบประมาณ',
    icon: '💰',
    group: 'บริหาร',
    descTh:
      'ข้อมูลงบประมาณส่งเสริมการเกษตร รอบ 2 ปีงบประมาณ 2569 มีแผนงาน โครงการ กิจกรรม พื้นที่ เป้าหมาย งบประมาณ แผนดำเนินงาน แผนใช้จ่ายเงิน และผู้รับผิดชอบ',
  },
  assets: {
    label: 'พัสดุ/ครุภัณฑ์',
    icon: '🧰',
    group: 'บริหาร',
    descTh:
      'ทะเบียนทรัพย์สินและครุภัณฑ์ ค้นชื่อ ประเภท รหัส สถานที่ สภาพ และรายละเอียดในหมายเหตุ',
  },
  personnel: {
    label: 'บุคลากร',
    icon: '👥',
    group: 'บริหาร',
    descTh: 'ข้อมูลบุคลากรแบบไม่เปิดเผยข้อมูลส่วนตัวในผลค้นหาสาธารณะ',
  },
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
  agricultural_areas: ['area_name', 'area_type', 'district', 'subdistrict'],
  learning_centers: ['center_name', 'district', 'manager', 'main_crop'],
  disasters: ['disaster_type', 'district', 'subdistrict'],
  farmer_registry: ['district', 'main_crop'],
  gis_areas: ['area_name', 'district', 'area_type', 'notes'],
  large_plots: [
    'plot_name',
    'commodity',
    'secondary_commodity',
    'district',
    'subdistrict',
    'agency',
  ],
  certifications: ['farm_name', 'cert_type', 'commodity', 'district', 'status'],
  crop_production: ['crop_name', 'district', 'harvest_period'],
  production_costs: ['crop_name'],
  community_enterprises: [
    'enterprise_name',
    'enterprise_type',
    'product_type',
    'district',
    'subdistrict',
    'level',
  ],
  smart_farmers: ['farmer_type', 'district', 'main_product'],
  smart_farmer_sf: [
    'record_code',
    'district',
    'province',
    'farmer_status',
    'agricultural_activity',
    'production_standard',
  ],
  young_smart_farmer_ysf: [
    'record_code',
    'district',
    'province',
    'farmer_status',
    'agricultural_activity',
    'production_standard',
  ],
  agricultural_career_groups: [
    'record_code',
    'group_name',
    'district',
    'subdistrict',
    'activity',
    'main_activity',
    'potential_level',
  ],
  farmer_groups: ['group_name', 'group_type', 'district', 'chairman', 'notes'],
  housewife_farmer_groups: [
    'group_name',
    'district',
    'subdistrict',
    'chairman',
    'activity',
    'production_standard',
    'potential_level',
    'community_enterprise_registration',
  ],
  young_farmer_groups: ['group_name', 'district', 'chairman', 'notes'],
  young_farmer_groups_detailed: [
    'record_code',
    'group_name',
    'district',
    'subdistrict',
    'activity',
    'potential_level',
  ],
  farmer_institutes: ['name', 'group_name', 'district', 'subdistrict', 'type'],
  agri_tourism: ['spot_name', 'spot_type', 'district', 'description'],
  forecast_plots: [
    'plot_name',
    'crop_type',
    'variety',
    'district',
    'subdistrict',
  ],
  ai_disease_forecasts: ['name', 'description', 'target_crop', 'risk_level'],
  pest_outbreaks: [
    'pest_name',
    'affected_crop',
    'district',
    'severity',
    'report_date',
    'notes',
  ],
  pest_centers: [
    'center_name',
    'district',
    'subdistrict',
    'chairman',
    'main_crop_type',
  ],
  plant_doctors: ['district', 'subdistrict', 'province'],
  soil_fertilizer_centers: [
    'center_name',
    'district',
    'subdistrict',
    'chairman',
    'main_crop_type',
  ],
  soil_series: [
    'soil_series_name',
    'soil_series_code',
    'soil_group',
    'texture',
    'fertility',
    'ph_top',
    'district',
  ],
  biocontrol_stock: ['product_name', 'source', 'period', 'status', 'notes'],
  fire_hotspots: ['spot_name', 'district', 'risk_level'],
  daily_weather: ['date'],
  assets: [
    'name',
    'category',
    'serial_number',
    'location',
    'condition',
    'notes',
  ],
  budgets: ['project_name', 'budget_source', 'status', 'notes'],
  personnel: ['position', 'department', 'district', 'office_type'],
};

export const DISTRICT_COLS = {
  agricultural_areas: 'district',
  learning_centers: 'district',
  disasters: 'district',
  farmer_registry: 'district',
  gis_areas: 'district',
  large_plots: 'district',
  certifications: 'plot_district',
  crop_production: 'district',
  community_enterprises: 'district',
  forecast_plots: 'district',
  smart_farmers: 'district',
  smart_farmer_sf: 'district',
  young_smart_farmer_ysf: 'district',
  agricultural_career_groups: 'district',
  farmer_groups: 'district',
  housewife_farmer_groups: 'district',
  young_farmer_groups: 'district',
  young_farmer_groups_detailed: 'district',
  agri_tourism: 'district',
  pest_outbreaks: 'district',
  pest_centers: 'district',
  plant_doctors: 'district',
  soil_fertilizer_centers: 'district',
  soil_series: 'district',
  fire_hotspots: 'district',
  budgets: 'notes',
  personnel: 'district',
  assets: 'location',
  production_costs: 'crop_name',
};

// Columns that contain numeric data for aggregation
export const NUMERIC_COLS = {
  agricultural_areas: [
    'total_area_rai',
    'agri_crop_area_rai',
    'farmer_households',
    'rice_in_season_rai',
    'rice_off_season_rai',
    'field_crops_rai',
    'horticulture_rai',
    'fruit_trees_rai',
    'vegetables_rai',
    'flowers_rai',
    'herbs_spices_rai',
  ],
  farmer_registry: ['households_count', 'total_members'],
  large_plots: ['total_area_rai', 'member_count'],
  certifications: ['area_rai'],
  crop_production: [
    'planted_area_rai',
    'harvested_area_rai',
    'yield_kg_per_rai',
    'total_production_ton',
  ],
  production_costs: [
    'yield_kg_per_rai',
    'revenue_baht_per_rai',
    'seed_cost_baht',
    'fertilizer_cost_baht',
    'pesticide_cost_baht',
    'service_cost_baht',
    'equipment_cost_baht',
    'fuel_cost_baht',
    'repair_depreciation_cost_baht',
    'packaging_cost_baht',
    'other_cost_baht',
    'total_cost_baht',
  ],
  community_enterprises: ['member_count', 'capital_baht'],
  smart_farmer_sf: ['age', 'annual_agri_income'],
  young_smart_farmer_ysf: ['farm_area_rai', 'annual_agri_income'],
  agricultural_career_groups: ['member_count', 'fund_management', 'income'],
  young_farmer_groups_detailed: [
    'member_count',
    'fund_management',
    'income',
    'activity_count',
  ],
  farmer_institutes: ['group_count', 'sf_count', 'ysf_count'],
  disasters: ['affected_area_rai', 'affected_households', 'damage_baht'],
  soil_series: ['area_rai'],
  fire_hotspots: ['frp', 'bright_ti4', 'bright_ti5'],
  daily_weather: ['tavg', 'tmin', 'tmax', 'prcp', 'wspd', 'pres'],
  budgets: ['budget_amount', 'spent_amount'],
};

// Columns that contain categorical string data for group-by counting
export const CATEGORY_COLS = {
  community_enterprises: ['enterprise_type'],
  large_plots: ['commodity'],
  production_costs: ['data_year', 'crop_name'],
  smart_farmers: ['farmer_type', 'main_product'],
  smart_farmer_sf: [
    'data_year',
    'farmer_status',
    'agricultural_activity',
    'education',
    'district',
  ],
  young_smart_farmer_ysf: [
    'data_year',
    'district',
    'farmer_status',
    'agricultural_activity',
    'education',
    'main_activity_type',
  ],
  agricultural_career_groups: [
    'data_year',
    'district',
    'subdistrict',
    'community_enterprise_registration',
    'potential_level',
    'main_activity',
  ],
  farmer_groups: ['group_type'],
  young_farmer_groups_detailed: [
    'data_year',
    'district',
    'subdistrict',
    'model_group',
    'potential_level',
  ],
  certifications: ['crop_name'],
  agri_tourism: ['spot_type'],
  disasters: ['disaster_type'],
  soil_series: ['soil_series_name', 'soil_group', 'texture', 'fertility'],
  fire_hotspots: ['land_use', 'confidence', 'satellite'],
  budgets: ['budget_source', 'status'],
};

export const SYSTEM_PROMPT = `คุณคือ "น้องข้าวหลาม" 🌾 — AI ผู้ช่วยอัจฉริยะระดับสูงประจำระบบจัดการข้อมูลสำนักงานเกษตรจังหวัดนครปฐม

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
- ข้อมูลครอบคลุม: กลุ่มยุทธศาสตร์และสารสนเทศ, กลุ่มส่งเสริมและพัฒนาการผลิต, กลุ่มส่งเสริมและพัฒนาเกษตรกร, กลุ่มอารักขาพืช`;
