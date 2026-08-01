import { searchOrchidChunks } from './orchid-search.js';

export const ORCHID_SYSTEM_PROMPT = `คุณคือ “ข้าวหลามกล้วยไม้” ผู้ช่วยเฉพาะทางด้านการผลิต งานวิจัย และนวัตกรรมกล้วยไม้

กติกาการตอบ:
- ตอบภาษาไทยโดยอ้างอิงเฉพาะ Orchid Knowledge Evidence ที่ระบบส่งให้ ห้ามแต่งข้อมูล ชื่อสาร อัตราใช้ หรือวิธีปฏิบัติที่ไม่มีในหลักฐาน
- แยกให้ชัดระหว่าง “คู่มือการผลิตกล้วยไม้” กับ “งานวิจัยและนวัตกรรมกล้วยไม้” หากเป็นข้อค้นพบจากงานวิจัย อย่าเขียนให้เหมือนเป็นคำแนะนำภาคปฏิบัติที่ยืนยันแล้ว
- สรุปให้ใช้งานได้จริง แยกหัวข้อให้อ่านง่าย และถามต่อเมื่อคำถามยังขาดบริบทสำคัญ
- หากหลักฐานไม่พอ ให้บอกตรง ๆ ว่าไม่พบข้อมูลเพียงพอในคลัง ห้ามเดา
- คู่มือการผลิตเป็นเอกสารปี พ.ศ. 2560 ส่วนงานวิจัยเป็นบทสรุปงานวิจัย ค.ศ. 2020–กลางปี 2026 จึงต้องระบุบริบทของแหล่งข้อมูลตามหลักฐาน
- เรื่องกฎหมาย ทะเบียน อัตราการใช้สารเคมี หรือคำแนะนำที่อาจเปลี่ยนตามเวลา ต้องตรวจสอบฉลาก ทะเบียน และข้อกำหนดปัจจุบันก่อนใช้จริง
- เมื่อมีหลักฐาน ให้ปิดท้ายด้วยหัวข้อ “แหล่งข้อมูล” เป็นรายการ Markdown ระบุชื่อเอกสาร หัวข้อ/หน้า (ถ้ามี) และลิงก์ของเอกสารทุกแหล่งที่ใช้
- ลิงก์แหล่งข้อมูลต้องขึ้นต้นด้วย /public/orchids/ หรือ /public/orchids/research/ เท่านั้น ห้ามเติมโดเมน
- คำถามนอกเรื่องการผลิตกล้วยไม้ ให้แจ้งขอบเขตของข้าวหลามกล้วยไม้และแนะนำให้เลือกคลังองค์ความรู้อื่น`;

function buildEvidence(questionText, preferredDocumentSlug) {
  return searchOrchidChunks(questionText, 10, preferredDocumentSlug).map(
    (chunk) => ({
      collection: chunk.collection || 'production',
      title: chunk.title,
      section: chunk.section_heading,
      category: chunk.category,
      subcategory: chunk.subcategory,
      sourceYear: chunk.source_year,
      sourcePages: chunk.source_pages,
      sourcePdfPages: chunk.source_pdf_pages,
      status: chunk.status,
      url:
        chunk.collection === 'research'
          ? `/public/orchids/research/${chunk.document_slug}`
          : `/public/orchids/${chunk.document_slug}`,
      content: chunk.text,
    })
  );
}

export function buildOrchidBody(
  provider,
  body,
  questionText,
  history,
  preferredDocumentSlug = ''
) {
  const userQuestions =
    provider === 'gemini'
      ? history
          .filter((item) => item?.role === 'user')
          .map((item) =>
            (item.parts || []).map((part) => part?.text || '').join('')
          )
      : (body.messages || [])
          .filter((item) => item?.role === 'user')
          .map((item) => String(item.content || ''));
  const retrievalQuery = [...userQuestions.slice(-2), questionText]
    .filter(Boolean)
    .filter((text, index, values) => index === 0 || text !== values[index - 1])
    .join(' ');
  const evidence = buildEvidence(retrievalQuery, preferredDocumentSlug);
  const evidenceText = evidence.length
    ? `Orchid Knowledge Evidence:\n${JSON.stringify(evidence).slice(0, 30000)}`
    : 'Orchid Knowledge Evidence: ไม่พบหลักฐานที่ตรงกับคำถาม';
  const userText = `${evidenceText}\n\nคำถาม: ${questionText}`;

  if (provider === 'gemini') {
    return {
      model: body.model || 'gemini-3.5-flash-lite',
      contents: [
        ...history.slice(0, -1),
        { role: 'user', parts: [{ text: userText }] },
      ],
      systemInstruction: { parts: [{ text: ORCHID_SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 2800 },
      stream: true,
    };
  }

  const chatHistory = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (message) => message?.role === 'user' || message?.role === 'assistant'
    )
    .slice(-9, -1);
  return {
    ...body,
    messages: [
      { role: 'system', content: ORCHID_SYSTEM_PROMPT },
      ...chatHistory,
      { role: 'user', content: userText },
    ],
    temperature: 0.2,
    max_tokens: 2800,
    stream: true,
  };
}
