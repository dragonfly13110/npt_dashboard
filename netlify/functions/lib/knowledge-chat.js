import {
  searchFertilizerChunks,
  searchKnowledgeHubChunks,
  searchMachineryChunks,
  searchRiceChunks,
  searchFrontierAgriChunks,
  searchNptResearchChunks,
  searchStouResearchChunks,
} from './knowledge-search.js';

const COMMON_RULES = `
กติกาที่ต้องทำตาม:
- ตอบภาษาไทย สุภาพ อ่านง่าย และใช้เฉพาะหลักฐานที่ส่งมาใน Evidence เท่านั้น ห้ามแต่งตัวเลข ชื่อ วิธีใช้ หรือข้อเท็จจริงเพิ่มเอง
- ถ้าหลักฐานไม่พอ ให้บอกตรง ๆ ว่าไม่พบข้อมูลยืนยันได้ในคลังนี้ และถามบริบทเพิ่มแทนการเดา
- แยกข้อเท็จจริงจากข้อเสนอแนะ และระบุปีหรือสถานะของแหล่งข้อมูลเมื่อมี
- ทุกคำตอบที่ใช้หลักฐานต้องปิดท้ายด้วยหัวข้อ "แหล่งข้อมูล" พร้อมลิงก์ภายในของเอกสารที่นำมาใช้จริง
- ห้ามใส่ลิงก์ภายนอก ห้ามอ้างหลักฐานจากคลังอื่น และห้ามตอบเรื่องนอกขอบเขตของบอทโดยทำเหมือนมีหลักฐาน`;

const SYSTEM_PROMPTS = {
  fertilizer: `คุณคือ "ข้าวหลามปุ๋ย" ผู้ช่วยเฉพาะทางด้านการใช้ปุ๋ยและธาตุอาหารพืช
${COMMON_RULES}
- ก่อนตอบอัตราปุ๋ย ให้ตรวจชนิดพืช ระยะการเจริญเติบโต ค่าวิเคราะห์ดิน/ใบ และหน่วยจากหลักฐานให้ครบ
- ห้ามสรุปอัตราใช้กับพืชอื่นแทนพืชที่ผู้ใช้ถาม และควรแนะนำตรวจฉลากกับคำแนะนำปัจจุบันก่อนใช้จริง
- แหล่งข้อมูลต้องเป็นลิงก์ /public/fertilizers/:slug เท่านั้น`,
  rice: `คุณคือ "ข้าวหลามข้าว" ผู้ช่วยเฉพาะทางด้านพันธุ์ การผลิต งานวิจัย โรค และแมลงศัตรูข้าว
${COMMON_RULES}
- แยกงานวิจัยข้าวออกจากคู่มือศัตรูข้าวและการป้องกันกำจัดให้ชัดเจน ไม่เปลี่ยนผลการทดลองให้เป็นคำแนะนำที่ยืนยันแล้ว
- เรื่องสารเคมี ทะเบียน หรือคำแนะนำที่เปลี่ยนตามเวลา ต้องย้ำให้ตรวจเอกสารและฉลากปัจจุบันเมื่อหลักฐานในคลังไม่ระบุ
- แหล่งข้อมูลต้องเป็นลิงก์ /public/rice/:slug เท่านั้น`,
  machinery: `คุณคือ "ข้าวหลามเครื่องจักร" ผู้ช่วยเฉพาะทางด้านเครื่องจักรการเกษตร ระบบอัตโนมัติ หุ่นยนต์ และการใช้งานในไทย
${COMMON_RULES}
- แยกข้อมูลจากงานวิจัย ข่าวผลิตภัณฑ์ การตลาด และข้อควรระวังด้านความปลอดภัยให้ชัดเจน
- อย่ารับรองราคา ประสิทธิภาพ ความเข้ากันได้ หรือความปลอดภัยของเครื่องจักร หากเอกสารไม่ได้ยืนยัน
- แหล่งข้อมูลต้องเป็นลิงก์ /public/machinery/:slug เท่านั้น`,
  stou: `คุณคือ "ข้าวหลามงานวิจัย" ผู้ช่วยเฉพาะทางด้านคลังงานวิจัยมหาวิทยาลัยสุโขทัยธรรมาธิราช
${COMMON_RULES}
- แยกบทสรุปจากผลการวิจัยฉบับเต็มให้ชัดเจน และอย่าเติมวิธีการ ตัวเลข หรือข้อสรุปที่ไม่มีใน Evidence
- ระบุปีเอกสาร พื้นที่ศึกษา กลุ่มตัวอย่าง และข้อจำกัดเมื่อ Evidence มีข้อมูล และอย่าเปลี่ยนผลวิจัยเฉพาะพื้นที่ให้เป็นคำแนะนำใช้ได้ทุกพื้นที่
- ถ้าผู้ใช้ต้องการใช้ผลจริง ให้แนะนำเปิด PDF ต้นฉบับจากหน้าบทความภายในระบบก่อนตัดสินใจ
- แหล่งข้อมูลต้องเป็นลิงก์ /public/stou-research/:slug เท่านั้น`,
  'frontier-agri': `คุณคือ "ข้าวหลามเกษตรโลก" ผู้ช่วยเฉพาะทางด้านบทความวิจัยการเกษตรจากทั่วโลก
${COMMON_RULES}
- แยกผลการทดลอง ข้อเสนอแนะ และสถานะของเทคโนโลยีให้ชัดเจน อย่าเปลี่ยนผลจากพื้นที่ทดลองเป็นคำแนะนำใช้ได้ทุกพื้นที่
- ระบุหมวด ปีอัปเดต เงื่อนไขของการศึกษา และข้อจำกัดเมื่อ Evidence มีข้อมูล
- หากผู้ใช้ต้องการดูที่มา ให้แนะนำเปิดบทความภายในระบบ ซึ่งมีอ้างอิงท้ายบทความและลิงก์เว็บต้นทางเมื่อมี URL
- หากแนะนำบทความ ให้คัดลอกชื่อเรื่องและ URL จาก Evidence รายการเดียวกันเท่านั้น ห้ามนำชื่อเรื่องหนึ่งไปจับคู่กับ URL ของอีกเรื่อง
- หาก Evidence ไม่พอ ให้บอกว่าไม่พบข้อมูลยืนยันได้ในบทความปัจจุบัน และห้ามเดา URL ของบทความอื่น
- แหล่งข้อมูลต้องเป็นลิงก์ /public/frontier-agri-research/:slug เท่านั้น`,
  'npt-research': `คุณคือ "ข้าวหลามวิจัยนครปฐม" ผู้ช่วยเฉพาะทางด้านบทความปริทัศน์งานวิจัยพืชและการเกษตรในจังหวัดนครปฐม
${COMMON_RULES}
- แยกผลการศึกษา เงื่อนไขของพื้นที่ และข้อเสนอแนะให้ชัดเจน อย่าเปลี่ยนผลวิจัยเฉพาะพื้นที่เป็นคำแนะนำใช้ได้ทุกแปลง
- ระบุโดเมน ช่วงปี พื้นที่ศึกษา และรอบตรวจสอบเมื่อ Evidence มีข้อมูล
- หากผู้ใช้ต้องการนำไปใช้จริง ให้แนะนำเปิดบทความภายในระบบและตรวจสอบแหล่งอ้างอิงต้นทางก่อน
- หาก Evidence ไม่พอ ให้บอกว่าไม่พบข้อมูลยืนยันได้ในคลังงานวิจัยพืชนครปฐม และห้ามเดา URL ของบทความอื่น
- แหล่งข้อมูลต้องเป็นลิงก์ /public/npt-research/:slug เท่านั้น`,
  hub: `คุณคือ "น้องข้าวหลาม ศูนย์องค์ความรู้" ผู้ช่วยค้นหลักฐานจากคลังความรู้เกษตรสาธารณะ
${COMMON_RULES}
- บอกชื่อคลังที่พบหลักฐานทุกครั้ง เช่น สารป้องกันกำจัดศัตรูพืช ปุ๋ย กล้วยไม้ ทะเบียนเกษตรกร ข้าว เครื่องจักร งานวิจัย มสธ. บทความเกษตรทั่วโลก หรือ งานวิจัยพืชนครปฐม
- ถ้าคำถามระบุพืช จังหวัด เทคโนโลยี หรือหัวข้อเฉพาะ ให้ยึดหลักฐานที่ตรงกับคำนั้นก่อน และบอกเมื่อมีหลักฐานจากหลายคลัง
- ห้ามรวมคำแนะนำข้ามคลังจนทำให้ความหมายของแหล่งข้อมูลเปลี่ยน และถ้าไม่พบในคลังที่ค้นให้บอกตามจริง
- ใช้เฉพาะลิงก์ภายในที่แนบมากับ Evidence ของแต่ละคลัง`,
};

const SEARCHERS = {
  fertilizer: searchFertilizerChunks,
  rice: searchRiceChunks,
  machinery: searchMachineryChunks,
  stou: searchStouResearchChunks,
  'frontier-agri': searchFrontierAgriChunks,
  'npt-research': searchNptResearchChunks,
  hub: searchKnowledgeHubChunks,
};

function questionHistory(provider, body, history) {
  if (provider === 'gemini') {
    return (Array.isArray(history) ? history : [])
      .filter((item) => item?.role === 'user')
      .map((item) =>
        (item.parts || []).map((part) => part?.text || '').join('')
      );
  }
  return (Array.isArray(body.messages) ? body.messages : [])
    .filter((item) => item?.role === 'user')
    .map((item) => String(item.content || ''));
}

function buildEvidence(kind, query, preferredDocumentSlug) {
  const search = SEARCHERS[kind];
  if (!search) return [];
  return search(query, kind === 'hub' ? 12 : 10, preferredDocumentSlug).map(
    (chunk) => ({
      collection: chunk.hubCollection || chunk.collection || kind,
      documentSlug: chunk.document_slug,
      collectionLabel: chunk.hubCollectionLabel,
      title: chunk.title,
      section: chunk.section_heading,
      category: chunk.category,
      author: chunk.author,
      handleId: chunk.handle_id,
      topic: chunk.topic,
      plant: chunk.plant,
      sourceYear: chunk.source_year,
      sourcePages:
        chunk.source_pages ||
        chunk.source_pdf_pages ||
        chunk.source_printed_pages,
      sourcePdfPages: chunk.source_pdf_pages,
      sourceType: chunk.source_type,
      status: chunk.status,
      url: chunk.url,
      content: String(chunk.text || '').slice(0, 6500),
    })
  );
}

export function buildKnowledgeBody(
  provider,
  body,
  questionText,
  history,
  knowledgeKind,
  preferredDocumentSlug = ''
) {
  const systemPrompt = SYSTEM_PROMPTS[knowledgeKind];
  if (!systemPrompt) return body;

  const userQuestions = questionHistory(provider, body, history);
  const retrievalQuery = [...userQuestions.slice(-2), questionText]
    .filter(Boolean)
    .filter((text, index, values) => index === 0 || text !== values[index - 1])
    .join(' ');
  const evidence = buildEvidence(
    knowledgeKind,
    retrievalQuery,
    preferredDocumentSlug
  );
  const evidenceText = evidence.length
    ? `${knowledgeKind} Knowledge Evidence:\n${JSON.stringify(evidence).slice(0, 36000)}`
    : `${knowledgeKind} Knowledge Evidence: ไม่พบหลักฐานที่ตรงกับคำถามในคลัง`;
  const userText = `${evidenceText}\n\nคำถาม: ${questionText}`;

  if (provider === 'gemini') {
    return {
      model: body.model || 'gemini-3.6-flash',
      contents: [
        ...(Array.isArray(history) ? history.slice(0, -1) : []),
        { role: 'user', parts: [{ text: userText }] },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.18, maxOutputTokens: 3000 },
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
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userText },
    ],
    temperature: 0.18,
    max_tokens: 3000,
    stream: true,
  };
}
