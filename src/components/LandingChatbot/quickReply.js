const ANALYTICS_RE =
  /(เทียบ|เปรียบ|สรุป|วิเคราะห์|กี่|เท่าไหร่|มากสุด|น้อยสุด|อันดับ|รายงาน|งบ|จำนวน|พื้นที่|รายได้|ผลผลิต|forecast|predict|compare|summary|analy)/i;

const ROUTES = [
  {
    re: /(โรค|แมลง|พยากรณ์|disease|forecast)/i,
    label: 'ระบบพยากรณ์เตือนภัยโรคและแมลงศัตรูพืช',
    path: '/public/disease-forecast',
  },
  {
    re: /(แผนที่|พิกัด|map|แปลง)/i,
    label: 'แผนที่อัจฉริยะ',
    path: '/smart-map',
  },
  {
    re: /(ราคา|price)/i,
    label: 'ข้อมูลราคาสินค้าเกษตร',
    path: '/public/agricultural-prices',
  },
  {
    re: /(smart farmer|ysf|sf|เกษตรกร)/i,
    label: 'ข้อมูล Smart Farmer รวม',
    path: '/public/smart-farmers',
  },
  {
    re: /(วิสาหกิจ|enterprise)/i,
    label: 'ข้อมูลวิสาหกิจชุมชน',
    path: '/public/community-enterprises',
  },
  {
    re: /(พื้นที่|area)/i,
    label: 'ข้อมูลพื้นที่การเกษตร',
    path: '/public/agricultural-areas',
  },
];

export function getLandingQuickReply(text) {
  const query = String(text || '').trim();
  if (!query) return null;

  if (ANALYTICS_RE.test(query)) {
    return 'คำถามนี้ควรใช้หน้า AI วิเคราะห์ข้อมูลหลักครับ: [คุยกับ AI วิเคราะห์ข้อมูล](/dashboard/chatbot)\n\nหน้านั้นดึงฐานข้อมูลและคำนวณสถิติก่อนตอบ แม่นกว่ากล่องหน้าแรก และช่วยประหยัดโควต้า landing chatbot.';
  }

  const route = ROUTES.find((item) => item.re.test(query));
  if (!route) return null;

  return `ไปหน้านี้ได้เลยครับ: [${route.label}](${route.path})`;
}
