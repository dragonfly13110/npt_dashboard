import { searchFarmer69Chunks } from './farmer69-search.js';

export const FARMER69_SYSTEM_PROMPT = `คุณคือ "น้องข้าวหลาม ทบก." ผู้ช่วยเฉพาะทางด้านการขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร ปี 2569 ของศูนย์ข้อมูลการเกษตรนครปฐม

กติกาการตอบ:
- ตอบภาษาไทย สุภาพ ชัดเจน และใช้สรรพนามแทนตัวเองว่า "น้องข้าวหลาม" หรือ "หนู"
- ใช้เฉพาะ Farmer69 Knowledge Evidence ที่ระบบส่งให้เป็นหลัก ห้ามแต่งตัวเลข เกณฑ์ขั้นต่ำ ระยะเวลา เอกสาร รหัสกิจกรรม หรือเงื่อนไขขึ้นเอง
- หลักฐานที่มี sourceType เป็น verbatim_page คือข้อความถอดตามหน้า PDF ให้ยึดเป็นหลักเมื่อมีความขัดแย้งกับคำอธิบายช่วยค้น
- หากหลักฐานมี status เป็น visual_review_pending หรือ needs_source_check ให้แจ้งว่าต้องตรวจเทียบภาพ/ต้นฉบับก่อนยืนยันรายละเอียดนั้น
- ถ้าหลักฐานไม่พอหรือคำถามต้องใช้ดุลพินิจของนายทะเบียน ให้บอกตรง ๆ ว่าไม่พบข้อมูลที่ยืนยันได้จากคลัง และแนะนำให้ตรวจสำนักงานเกษตรอำเภอ/พื้นที่ที่รับผิดชอบ
- แยกให้ชัดระหว่างข้อกำหนดในคู่มือ ระเบียบ พ.ศ. 2567 และข้อมูลที่เป็นขั้นตอนปฏิบัติงานของกรมส่งเสริมการเกษตร
- ตอบคำถามที่มีหลายเงื่อนไขเป็นขั้นตอนหรือหัวข้อย่อย และรักษาตัวเลข หน่วย ชื่อแบบ ทบก. และชื่อเอกสารตามหลักฐาน
- ทุกคำตอบสาระสำคัญต้องปิดท้ายด้วย "แหล่งข้อมูล" ระบุชื่อหัวข้อและ PDF page ที่ใช้ พร้อมลิงก์ภายในรูปแบบ Markdown เช่น [เปิดหัวข้อ](\/public\/farmer-manual\/slug)
- ห้ามเปิดเผยข้อมูลส่วนบุคคลของเกษตรกร และห้ามรับรองว่าสมาชิกจะได้รับสิทธิประโยชน์จากทุกโครงการโดยอัตโนมัติ
- หากถามนอกเรื่องทะเบียนเกษตรกร ให้แจ้งขอบเขตอย่างสุภาพและชวนถามเรื่อง ทบก. 2569 แทน`;

function questionHistory(provider, body, history) {
  if (provider === 'gemini') {
    return history
      .filter((item) => item?.role === 'user')
      .map((item) =>
        (item.parts || []).map((part) => part?.text || '').join('')
      );
  }
  return (body.messages || [])
    .filter((item) => item?.role === 'user')
    .map((item) => String(item.content || ''));
}

function buildEvidence(retrievalQuery, preferredDocumentSlug) {
  return searchFarmer69Chunks(retrievalQuery, 12, preferredDocumentSlug).map(
    (chunk) => ({
      title: chunk.title,
      section: chunk.section_heading,
      category: chunk.category,
      sourcePages: chunk.source_printed_pages,
      sourcePdfPages: chunk.source_pdf_pages,
      sourceYear: chunk.source_year,
      sourceType: chunk.source_type,
      status: chunk.status,
      faqId: chunk.faq_id,
      url: chunk.url,
      content: chunk.text,
    })
  );
}

export function buildFarmer69Body(
  provider,
  body,
  questionText,
  history,
  preferredDocumentSlug = ''
) {
  const userQuestions = questionHistory(provider, body, history);
  const retrievalQuery = [...userQuestions.slice(-2), questionText]
    .filter(Boolean)
    .filter((text, index, values) => index === 0 || text !== values[index - 1])
    .join(' ');
  const evidence = buildEvidence(retrievalQuery, preferredDocumentSlug);
  const evidenceText = evidence.length
    ? `Farmer69 Knowledge Evidence:\n${JSON.stringify(evidence).slice(0, 36000)}`
    : 'Farmer69 Knowledge Evidence: ไม่พบหลักฐานที่ตรงกับคำถามในคลัง';
  const userText = `${evidenceText}\n\nคำถาม: ${questionText}`;

  if (provider === 'gemini') {
    return {
      model: body.model || 'gemini-3.5-flash-lite',
      contents: [
        ...history.slice(0, -1),
        { role: 'user', parts: [{ text: userText }] },
      ],
      systemInstruction: { parts: [{ text: FARMER69_SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.15, maxOutputTokens: 3000 },
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
      { role: 'system', content: FARMER69_SYSTEM_PROMPT },
      ...chatHistory,
      { role: 'user', content: userText },
    ],
    temperature: 0.15,
    max_tokens: 3000,
    stream: true,
  };
}
