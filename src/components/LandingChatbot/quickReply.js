const GREETING_RE = /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi|hey)$/i;
const HELP_RE = /^(ช่วยอะไรได้บ้าง|ทำอะไรได้บ้าง|help)$/i;

export function getLandingQuickReply(text) {
  const query = String(text || '').trim();
  if (!query) return null;

  if (GREETING_RE.test(query) || HELP_RE.test(query)) {
    return 'สวัสดีค่ะ หนูคือน้องข้าวหลาม AI ถามเรื่องข้อมูลเกษตรนครปฐม แผนที่ ราคา พื้นที่เพาะปลูก โรคพืช หรือเมนูในระบบได้เลยค่ะ';
  }

  return null;
}
