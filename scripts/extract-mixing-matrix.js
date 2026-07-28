import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const htmlPath = path.join(projectRoot, 'ผสมสาร', 'preview.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract PAIRS array from preview.html
const pairsMatch = htmlContent.match(/const PAIRS=\[(\{[\s\S]*?\})\];/);
if (!pairsMatch) {
  console.error('Failed to find PAIRS in preview.html');
  process.exit(1);
}

const pairsJsonStr = '[' + pairsMatch[1] + ']';
const pairs = JSON.parse(pairsJsonStr);

const chemicals = [
  // สารกำจัดแมลง (22)
  { name: 'อะมิทราซ', englishName: 'amitraz', type: 'insecticide' },
  {
    name: 'เบตาไซฟลูทริน, ไซฟลูทริน',
    englishName: 'beta-cyfluthrin, cyfluthrin',
    type: 'insecticide',
  },
  { name: 'ไบเฟนทริน', englishName: 'bifenthrin', type: 'insecticide' },
  { name: 'คาร์บาริล', englishName: 'carbaryl', type: 'insecticide' },
  {
    name: 'คลอร์ฟลูอาซูรอน, ไดฟลูเบนซูรอน, ฟลูเฟนนอกซูรอน, ไตรฟลูมูรอน',
    englishName: 'chlorfluazuron, diflubenzuron, flufenoxuron, triflumuron',
    type: 'insecticide',
  },
  {
    name: 'คลอร์ไพริฟอส [คอลัมน์เดิมที่ชื่อไม่แสดงในหน้าปี 2568]',
    englishName: 'chlorpyrifos',
    type: 'insecticide',
    unlistedNote: 'ชื่อไม่แสดงในหน้าปี 2568 แต่ตำแหน่งคอลัมน์ยังอยู่',
  },
  {
    name: 'ไซเพอร์เมทริน, เพอร์เมทริน',
    englishName: 'cypermethrin, permethrin',
    type: 'insecticide',
  },
  {
    name: 'ไดอะซินอน, เมทิดาไทออน',
    englishName: 'diazinon, methidathion',
    type: 'insecticide',
  },
  {
    name: 'ไดโคโฟล, คลอร์โรเบนซิเลท',
    englishName: 'dicofol, chlorobenzilate',
    type: 'insecticide',
  },
  {
    name: 'ไดเมโทเอต, ไดคลอร์วอส',
    englishName: 'dimethoate, dichlorvos',
    type: 'insecticide',
  },
  { name: 'เดลทาเมทริน', englishName: 'deltamethrin', type: 'insecticide' },
  { name: 'เฟนิโทรไทออน', englishName: 'fenitrothion', type: 'insecticide' },
  { name: 'อิมิดาโคลพริด', englishName: 'imidacloprid', type: 'insecticide' },
  {
    name: 'แลมบ์ดาไซฮาโลทริน',
    englishName: 'lambda-cyhalothrin',
    type: 'insecticide',
  },
  { name: 'มาลาไทออน', englishName: 'malathion', type: 'insecticide' },
  {
    name: 'เมโทมิล [คอลัมน์เดิมที่ชื่อไม่แสดงในหน้าปี 2568]',
    englishName: 'methomyl',
    type: 'insecticide',
    unlistedNote: 'ชื่อไม่แสดงในหน้าปี 2568 แต่ตำแหน่งคอลัมน์ยังอยู่',
  },
  { name: 'ไทโอดิคาร์บ', englishName: 'thiodicarb', type: 'insecticide' },
  {
    name: 'ปิโตรเลียมสเปรย์ออยล์',
    englishName: 'petroleum spray oil',
    type: 'insecticide',
  },
  {
    name: 'พิริมิฟอส-เมทิล',
    englishName: 'pirimiphos-methyl',
    type: 'insecticide',
  },
  { name: 'โพรพาไกต์', englishName: 'propargite', type: 'insecticide' },
  { name: 'โพรพีโนฟอส', englishName: 'profenofos', type: 'insecticide' },
  { name: 'ไตรอะโซฟอส', englishName: 'triazophos', type: 'insecticide' },

  // สารป้องกันกำจัดโรคพืช (11)
  { name: 'เบโนมิล', englishName: 'benomyl', type: 'fungicide' },
  {
    name: 'แคปแทน, แคปทาโฟล',
    englishName: 'captan, captafol',
    type: 'fungicide',
  },
  { name: 'คลอโรทาโลนิล', englishName: 'chlorothalonil', type: 'fungicide' },
  {
    name: 'คอปเปอร์ออกซีคลอไรด์',
    englishName: 'copper oxychloride',
    type: 'fungicide',
  },
  { name: 'ไอโพรไดโอน', englishName: 'iprodione', type: 'fungicide' },
  { name: 'เมทาแลกซิล', englishName: 'metalaxyl', type: 'fungicide' },
  {
    name: 'แมนโคเซบ, ไทแรม',
    englishName: 'mancozeb, thiram',
    type: 'fungicide',
  },
  { name: 'คาร์เบนดาซิม', englishName: 'carbendazim', type: 'fungicide' },
  {
    name: 'บอร์โดมิกเจอร์',
    englishName: 'Bordeaux mixture',
    type: 'fungicide',
  },
  { name: 'ไตรอะดิมีฟอน', englishName: 'triadimefon', type: 'fungicide' },
  { name: 'ซัลเฟอร์ (ผง)', englishName: 'sulfur (dust)', type: 'fungicide' },
];

const specificNotes = {
  1: {
    id: 1,
    title: 'หมายเหตุ 1',
    text: 'อะมิทราซผสมกับซีเนบ มาเนบ และแมนโคเซบได้ แต่ผสมกับไทแรมไม่ได้',
    pairs: ['แมนโคเซบ, ไทแรม + อะมิทราซ'],
  },
  2: {
    id: 2,
    title: 'หมายเหตุ 2',
    text: 'คาร์บาริลร่วมกับไดเมโทเอตอาจเป็นอันตรายต่อถั่วเหลืองและมะเขือเทศ และคาร์บาริลร่วมกับไดเมโทเอตหรือมาลาไทออนอาจเป็นอันตรายต่อฝ้าย',
    pairs: ['ไดเมโทเอต, ไดคลอร์วอส + คาร์บาริล', 'มาลาไทออน + คาร์บาริล'],
  },
  3: {
    id: 3,
    title: 'หมายเหตุ 3',
    text: 'คาร์บาริลร่วมกับปิโตรเลียมสเปรย์ออยล์อาจเป็นอันตรายต่อแอปเปิล',
    pairs: ['ปิโตรเลียมสเปรย์ออยล์ + คาร์บาริล'],
  },
  4: {
    id: 4,
    title: 'หมายเหตุ 4',
    text: 'คาร์บาริลร่วมกับแคปทาโฟลอาจทำให้ผลมะเขือเทศอ่อนเป็นจุดในฤดูร้อนหรือเมื่อขาดน้ำ',
    pairs: ['แคปแทน, แคปทาโฟล + คาร์บาริล'],
  },
  5: {
    id: 5,
    title: 'หมายเหตุ 5',
    text: 'หลังพ่นซัลเฟอร์ชนิดผง ให้เว้น 2 สัปดาห์ก่อนพ่นไดโคโฟล',
    pairs: ['ซัลเฟอร์ (ผง) + ไดโคโฟล, คลอร์โรเบนซิเลท'],
  },
  6: {
    id: 6,
    title: 'หมายเหตุ 6',
    text: 'ไดโคโฟลผสมกับแคปแทนได้เฉพาะรูปผง',
    pairs: ['แคปแทน, แคปทาโฟล + ไดโคโฟล, คลอร์โรเบนซิเลท'],
  },
  7: {
    id: 7,
    title: 'หมายเหตุ 7',
    text: 'อย่าผสมไดเมโทเอตกับปิโตรเลียมสเปรย์ออยล์เพื่อพ่นบนไม้ประดับ',
    pairs: ['ปิโตรเลียมสเปรย์ออยล์ + ไดเมโทเอต, ไดคลอร์วอส'],
  },
  8: {
    id: 8,
    title: 'หมายเหตุ 8',
    text: 'มาลาไทออนผสมกับแคปแทนได้เฉพาะรูปผง',
    pairs: ['แคปแทน, แคปทาโฟล + มาลาไทออน'],
  },
  9: {
    id: 9,
    title: 'หมายเหตุ 9',
    text: 'มาลาไทออนร่วมกับไอโพรไดโอน ต้องผสมในเครื่องพ่นที่มีระบบกวนและรีบพ่นทันที',
    pairs: ['ไอโพรไดโอน + มาลาไทออน'],
  },
  10: {
    id: 10,
    title: 'หมายเหตุ 10',
    text: 'อย่าผสมเบโนมิลกับแคปแทนเพื่อพ่นส้ม',
    pairs: ['แคปแทน, แคปทาโฟล + เบโนมิล'],
  },
  11: {
    id: 11,
    title: 'หมายเหตุ 11',
    text: 'เบโนมิลผสมกับมาเนบและแมนโคเซบได้ แต่ไม่มีความจำเป็นต้องผสมกับไทแรม',
    pairs: ['แมนโคเซบ, ไทแรม + เบโนมิล'],
  },
  12: {
    id: 12,
    title: 'หมายเหตุ 12',
    text: 'ต้องผสมสารจับใบตามที่ฉลากระบุ',
    pairs: [
      'คลอโรทาโลนิล + คลอร์ไพริฟอส',
      'คลอโรทาโลนิล + ไซเพอร์เมทริน, เพอร์เมทริน',
    ],
  },
  13: {
    id: 13,
    title: 'หมายเหตุ 13',
    text: 'ผสมกันได้ แต่ต้องใช้ให้หมดภายใน 6 ชั่วโมง',
    pairs: ['ไทโอดิคาร์บ + อะมิทราซ', 'คอปเปอร์ออกซีคลอไรด์ + ไทโอดิคาร์บ'],
  },
  14: {
    id: 14,
    title: 'หมายเหตุ 14',
    text: 'ผสมกันได้ แต่ต้องรีบใช้ทันที',
    pairs: ['บอร์โดมิกเจอร์ + เฟนิโทรไทออน'],
  },
  15: {
    id: 15,
    title: 'หมายเหตุ 15',
    text: 'อย่าผสมไอโพรไดโอนสูตรน้ำกับคอปเปอร์ออกซีคลอไรด์เพื่อพ่นบนมันฝรั่ง',
    pairs: ['ไอโพรไดโอน + คอปเปอร์ออกซีคลอไรด์'],
  },
  16: {
    id: 16,
    title: 'หมายเหตุ 16',
    text: 'อย่าผสมสารที่มีส่วนประกอบของทองแดงหรือคอปเปอร์กับไทแรม',
    pairs: ['แมนโคเซบ, ไทแรม + คอปเปอร์ออกซีคลอไรด์'],
  },
};

const generalNotes = [
  {
    id: 17,
    title: '17. สารฮอร์โมนพืช',
    text: 'สารควบคุมการเจริญเติบโตของพืชที่เป็นสารประกอบแนฟทาลีนแอซิติก แนฟทาลีนแอซิตาไมด์ และกลุ่ม phenoxy เช่น NAA ส่วนใหญ่เข้ากับสารกำจัดแมลงและสารป้องกันโรคพืชได้ ยกเว้นสารที่มีฤทธิ์เป็นด่างมาก หากจำเป็นให้แยกพ่นทีละชนิด หรือปฏิบัติตามคำแนะนำของผู้ผลิต',
  },
  {
    id: 18,
    title: '18. สารปฏิชีวนะ',
    text: 'ให้ผลดีที่สุดเมื่อไม่ผสมกับสารอื่น สเตรปโตมัยซิน แอกริ-สเตรป และแอกริมัยซิน สามารถผสมกับไดเมโทเอต แคปแทน และซัลเฟอร์ชนิดผงได้ ห้ามผสมกับบอร์โดมิกเจอร์ หรือสารที่มีฤทธิ์เป็นด่างมาก',
  },
  {
    id: 19,
    title: '19. ไวรัส NPV',
    text: 'NPV สามารถผสมกับสารกำจัดแมลงได้ทุกชนิด โดยเฉพาะสารที่มีประสิทธิภาพทำลายไข่ เช่น คลอร์ไดมีฟอร์มและเมโทมิล ตามข้อความในต้นฉบับ',
  },
  {
    id: 20,
    title: '20. แบคทีเรีย BT',
    text: 'BT (Bacillus thuringiensis) โดยทั่วไปเข้ากับสารกำจัดแมลงและสารป้องกันโรคพืชได้ แต่ต้องผสมแล้วพ่นทันที ยกเว้น: อะมิทราซ, อะซินฟอสเมทิล, แคปทาโฟล, ไดเมโทเอต, ไดโนแคป, ไอโซโพรคาร์บ, เฟนโทเอต, โฟซาโลน, บอร์โดมิกเจอร์',
  },
  {
    id: 21,
    title: '21. หลีกเลี่ยงสภาพด่างจัด',
    text: 'อย่าผสมสารป้องกันกำจัดศัตรูพืชในสภาพด่างจัด รวมถึงการผสมกับปุ๋ยบางชนิดที่เมื่อละลายแล้วมีสภาพเป็นด่าง',
  },
  {
    id: 22,
    title: '22. ชื่อที่ใช้ในผัง',
    text: 'ชื่อสารในผังเป็นชื่อสามัญทั้งหมด ไม่ใช่ชื่อการค้า',
  },
  {
    id: 23,
    title: '23. สถานะของผัง',
    text: 'ผังนี้เป็นเอกสารรวบรวมข้อมูล ไม่ได้เป็นคำแนะนำให้ใช้โดยตรง การผสมบางคู่สามารถก่ออันตรายต่อมนุษย์ สัตว์ หรือพืชได้',
  },
];

const legend = [
  {
    status: '+',
    color: '#4e8e63',
    label: 'ผสมกันได้ตามผัง',
    desc: 'ยังต้องตรวจฉลากและสูตรผลิตภัณฑ์ก่อนใช้งาน',
  },
  {
    status: '+!',
    color: '#4f7ca6',
    label: 'ผสมได้ แต่ต้องระวัง',
    desc: 'มีเงื่อนไขหรือความเสี่ยงเพิ่ม',
  },
  {
    status: '?',
    color: '#4b8f73',
    label: 'รอคำรับรองผู้ผลิต',
    desc: 'อย่าผสมโดยสรุปเองจนกว่าได้รับคำยืนยัน',
  },
  {
    status: '*n',
    color: '#7454a4',
    label: 'มีหมายเหตุเฉพาะ',
    desc: 'ต้องอ่านรายละเอียดหมายเลขนั้น',
  },
  {
    status: '0',
    color: '#8f7117',
    label: 'ไม่มีความจำเป็นต้องผสม',
    desc: 'ออกฤทธิ์ซ้ำซ้อนหรือไร้ประโยชน์เพิ่มเติม',
  },
  {
    status: '-',
    color: '#bf4b4b',
    label: 'ผสมกันไม่ได้',
    desc: 'ทำให้เกิดพิษหรือลดประสิทธิภาพ',
  },
  {
    status: 'NA',
    color: '#69736f',
    label: 'ข้อมูลไม่ปรากฏ',
    desc: 'ช่องคู่ผสมไม่อยู่ในภาพผังปี 2568',
  },
];

const outputData = {
  metadata: {
    source:
      'คำแนะนำการใช้สารป้องกันกำจัดศัตรูพืชจากงานวิจัย ปี 2568 กรมวิชาการเกษตร (ปรับปรุง ส.ค. 2564)',
    totalChemicals: chemicals.length,
    totalPairs: pairs.length,
    readablePairs: 508,
    unlistedPairs: 20,
  },
  chemicals,
  pairs,
  specificNotes,
  generalNotes,
  legend,
};

const outputPath = path.join(
  projectRoot,
  'public',
  'data',
  'pesticides',
  'mixing_matrix.json'
);
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
console.log(
  `Successfully generated ${outputPath} with ${pairs.length} pairs and ${chemicals.length} chemicals.`
);
