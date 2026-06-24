export const LANDING_CHATBOT_ALLOWED_LINKS = Object.freeze({
  '/': 'หน้าหลัก',
  '/interactive-dashboard': 'ระบบภาพรวมสรุปแบบ Interactive',
  '/smart-map': 'แผนที่อัจฉริยะ',
  '/public/large-plots': 'ข้อมูลแปลงใหญ่',
  '/public/smart-farmers': 'ข้อมูล Smart Farmer รวม',
  '/public/smart-farmer-sf': 'ข้อมูลเกษตรกรปราดเปรื่อง (SF)',
  '/public/young-smart-farmer-ysf': 'ข้อมูลเกษตรกรรุ่นใหม่ (YSF)',
  '/public/community-enterprises': 'ข้อมูลวิสาหกิจชุมชน',
  '/public/agri-tourism': 'ข้อมูลท่องเที่ยวเชิงเกษตร',
  '/public/farmer-institutes': 'ข้อมูลสถาบันเกษตรกร',
  '/public/agricultural-areas': 'ข้อมูลพื้นที่การเกษตร',
  '/public/agricultural-prices': 'ข้อมูลราคาสินค้าเกษตร',
  '/public/disease-forecast': 'ระบบพยากรณ์เตือนภัยโรคและแมลงศัตรูพืช',
  '/public/fire-hotspots': 'พิกัดจุดความร้อน',
});

const LANDING_CHATBOT_LINK_ALIASES = Object.freeze({
  '/dashboard': '/',
  '/dashboard/strategy/agricultural-areas': '/public/agricultural-areas',
  '/dashboard/strategy/agricultural-prices': '/public/agricultural-prices',
  '/dashboard/production/large-plots': '/public/large-plots',
  '/dashboard/development/community-enterprises':
    '/public/community-enterprises',
  '/dashboard/development/smart-farmers': '/public/smart-farmers',
  '/dashboard/development/smart-farmer-sf': '/public/smart-farmer-sf',
  '/dashboard/development/young-smart-farmer-ysf':
    '/public/young-smart-farmer-ysf',
  '/dashboard/development/farmer-institutes': '/public/farmer-institutes',
  '/dashboard/development/agri-tourism': '/public/agri-tourism',
  '/dashboard/protection/disease-forecast': '/public/disease-forecast',
  '/dashboard/protection/fire-hotspots': '/public/fire-hotspots',
});

const allowedPathSet = new Set(Object.keys(LANDING_CHATBOT_ALLOWED_LINKS));

export function normalizeLandingChatbotLink(rawUrl) {
  const trimmedUrl = String(rawUrl || '').trim();
  if (
    !trimmedUrl ||
    trimmedUrl.startsWith('//') ||
    trimmedUrl.startsWith('#')
  ) {
    return null;
  }

  if (!trimmedUrl.startsWith('/')) {
    return null;
  }

  const pathOnly = trimmedUrl.split(/[?#]/, 1)[0];
  const normalizedPath =
    pathOnly.length > 1 ? pathOnly.replace(/\/+$/, '') : pathOnly;
  const aliasedPath =
    LANDING_CHATBOT_LINK_ALIASES[normalizedPath] || normalizedPath;

  return allowedPathSet.has(aliasedPath) ? aliasedPath : null;
}

export const LANDING_CHATBOT_LINK_POLICY_PROMPT = `ข้อกำหนดลิงก์นำทางที่ต้องทำตามอย่างเคร่งครัด:
- ใช้ลิงก์ได้เฉพาะรายการต่อไปนี้เท่านั้น ห้ามสร้าง path เอง ห้ามใช้ URL เต็ม และห้ามลิงก์ออกนอกระบบ
${Object.entries(LANDING_CHATBOT_ALLOWED_LINKS)
  .map(([path, label]) => `- [${label}](${path})`)
  .join('\n')}
- หากไม่พบลิงก์ที่ตรงกับคำถาม ให้แนะนำให้กลับไปที่ [หน้าหลัก](/) แทนการเดา path ใหม่`;
