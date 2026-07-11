import fs from 'node:fs';
import { createGeminiClient } from '../netlify/functions/lib/line-ai/gemini.js';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
    })
);
const apiKey = env.LINE_AI_GEMINI_API_KEY || env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing Gemini API key');

const questions = [
  'ตอนนี้สำนักงานเกษตรจังหวัดนครปฐมมีบุคลากรทั้งหมดกี่คน แยกตามอำเภอให้ด้วย',
  'ช่วยสรุปภาพรวมงบประมาณและโครงการของสำนักงานเกษตรจังหวัด',
  'จังหวัดนครปฐมมีวิสาหกิจชุมชนกี่แห่ง อำเภอไหนมีมากที่สุด',
  'แปลงใหญ่ในจังหวัดนครปฐมมีอะไรบ้าง และปลูกพืชชนิดใด',
  'ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตรมีที่ไหนบ้าง',
  'แปลงที่ได้รับมาตรฐาน GAP ในจังหวัดมีจำนวนเท่าไรและอยู่ที่อำเภอใด',
  'ปีนี้จังหวัดนครปฐมมีพื้นที่ประสบภัยพิบัติทางการเกษตรเท่าไร',
  'ช่วงนี้มีโรคพืชหรือศัตรูพืชอะไรที่ต้องเฝ้าระวังในจังหวัด',
  'วันนี้สภาพอากาศจังหวัดนครปฐมเป็นอย่างไร เหมาะกับการทำการเกษตรไหม',
  'ช่วยสรุปสถานการณ์การเกษตรจังหวัดนครปฐมแบบภาพรวมให้ผู้บริหาร',
];

const client = createGeminiClient({
  model: env.LINE_AI_MODEL || 'gemini-3.1-flash-lite',
  timeoutMs: 20000,
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (const [index, question] of questions.entries()) {
  if (index) await sleep(8000);
  let plan;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      plan = await client.plan(
        apiKey,
        env.LINE_AI_MODEL || 'gemini-3.1-flash-lite',
        { question }
      );
      break;
    } catch (error) {
      if (error.status !== 429 || attempt === 2) throw error;
      await sleep(30000 * (attempt + 1));
    }
  }
  console.log(
    JSON.stringify({
      question,
      intent: plan.intent,
      tools: plan.tools,
      tables: plan.tables,
      searchTerms: plan.searchTerms,
      answer: plan.answer,
      clarification: plan.clarification,
    })
  );
}
