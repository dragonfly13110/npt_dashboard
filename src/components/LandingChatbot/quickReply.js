const GREETING_RE = /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi|hey)$/i;
const HELP_RE = /^(ช่วยอะไรได้บ้าง|ทำอะไรได้บ้าง|help)$/i;
const NAVIGATION_REPLIES = [
  [/^(ขอ)?(ดู|เปิด|ไป)?\s*แผนที่(อัจฉริยะ)?$/i, 'ดูได้ที่ [แผนที่อัจฉริยะ](/smart-map) ค่ะ'],
  [/^(ขอ)?(ดู|เปิด|ไป|ไปดู)?\s*ราคาสินค้าเกษตร$/i, 'ดูได้ที่ [ราคาสินค้าเกษตร](/public/agricultural-prices) ค่ะ'],
  [/^(ขอ)?(ดู|เปิด)?\s*พยากรณ์โรค(พืช)?$/i, 'ดูได้ที่ [พยากรณ์โรคและแมลง](/public/disease-forecast) ค่ะ'],
  [/^(ขอ)?(ดู|เปิด)?\s*คู่มือ(การใช้งาน|ใช้งาน)?$/i, 'อ่านได้ที่ [คู่มือการใช้งาน](/manual) ค่ะ'],
];

export function getLandingQuickReply(text) {
  const query = String(text || '').trim();
  if (!query) return null;

  if (GREETING_RE.test(query) || HELP_RE.test(query)) {
    return 'สวัสดีค่ะ หนูคือน้องข้าวหลาม AI ถามเรื่องข้อมูลเกษตรนครปฐม แผนที่ ราคา พื้นที่เพาะปลูก โรคพืช หรือเมนูในระบบได้เลยค่ะ';
  }

  const navigationReply = NAVIGATION_REPLIES.find(([pattern]) =>
    pattern.test(query)
  );
  if (navigationReply) return navigationReply[1];

  return null;
}
