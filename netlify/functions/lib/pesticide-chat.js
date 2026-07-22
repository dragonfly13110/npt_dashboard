import { searchPesticideChunks } from './pesticide-search.js';

export const PESTICIDE_SYSTEM_PROMPT = `คุณคือ “ข้าวหลามเคมี” ผู้ช่วยเฉพาะทางด้านสารป้องกันกำจัดศัตรูพืช

กติกาการตอบ:
- ตอบภาษาไทยโดยอ้างอิงเฉพาะ Pesticide Knowledge Evidence ที่ระบบส่งให้ ห้ามแต่งชื่อสาร อัตราใช้ วิธีผสม ระยะเว้นก่อนเก็บเกี่ยว หรือข้อเท็จจริงที่ไม่มีในหลักฐาน
- อ่านหลักฐานหลายส่วนแล้วสังเคราะห์เป็นคำแนะนำที่ใช้งานได้ แยกหัวข้อให้อ่านง่าย และตอบรายละเอียดได้เมื่อหลักฐานเพียงพอ
- หากหลักฐานไม่พอ ให้บอกตรง ๆ ว่าไม่พบข้อมูลเพียงพอในคลัง และถามเพิ่มเรื่องพืช ศัตรูพืช/อาการ หรือชื่อสาร ห้ามตอบจากการคาดเดา
- คำแนะนำต้องเตือนให้ตรวจฉลาก ทะเบียนวัตถุอันตราย สูตรและความเข้มข้น อุปกรณ์ป้องกัน และระยะเว้นก่อนเก็บเกี่ยวก่อนใช้จริง
- ห้ามแนะนำวัตถุอันตรายที่ห้ามใช้ ห้ามรับรองการผสมสารเมื่อหลักฐานไม่ได้ระบุ และให้เสนอการจัดการศัตรูพืชแบบผสมผสานเมื่อเอกสารรองรับ
- เมื่อมีหลักฐาน ให้ปิดท้ายด้วยหัวข้อ “แหล่งข้อมูล” เป็นรายการ Markdown โดยระบุชื่อเอกสาร หัวข้อ/หน้า (ถ้ามี) และลิงก์ /public/pesticides/:slug ทุกแหล่งที่นำมาใช้
- อยู่นอกเรื่องสารป้องกันกำจัดศัตรูพืช ให้แจ้งขอบเขตของข้าวหลามเคมีและแนะนำให้ถามน้องข้าวหลามทั่วไป`;

function buildEvidence(questionText) {
  return searchPesticideChunks(questionText).map((chunk) => ({
    title: chunk.title,
    section: chunk.section_heading,
    sourcePages: chunk.source_pages,
    plant: chunk.plant,
    pestType: chunk.pest_type,
    riskFlags: chunk.risk_flags,
    url: `/public/pesticides/${chunk.document_slug}`,
    content: chunk.text,
  }));
}

export function buildPesticideBody(provider, body, questionText, history) {
  const evidence = buildEvidence(questionText);
  const evidenceText = evidence.length
    ? `Pesticide Knowledge Evidence:\n${JSON.stringify(evidence).slice(0, 18000)}`
    : 'Pesticide Knowledge Evidence: ไม่พบหลักฐานที่ตรงกับคำถาม';
  const userText = `${evidenceText}\n\nคำถาม: ${questionText}`;

  if (provider === 'gemini') {
    return {
      model: body.model || 'gemini-3.5-flash-lite',
      contents: [
        ...history.slice(0, -1),
        { role: 'user', parts: [{ text: userText }] },
      ],
      systemInstruction: { parts: [{ text: PESTICIDE_SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 1400 },
      stream: true,
    };
  }

  const chatHistory = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (message) => message?.role === 'user' || message?.role === 'assistant'
    )
    .slice(-5, -1);
  return {
    ...body,
    messages: [
      { role: 'system', content: PESTICIDE_SYSTEM_PROMPT },
      ...chatHistory,
      { role: 'user', content: userText },
    ],
    temperature: 0.2,
    max_tokens: 1400,
    stream: true,
  };
}
