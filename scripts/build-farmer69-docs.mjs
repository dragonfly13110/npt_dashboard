import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const dataDir = path.join(rootDir, 'public', 'data', 'farmer69');
const outputRoot = path.join(rootDir, 'farmer69_knowledge_md');
const reviewedDate = '2026-08-04';
const sourceDocument = 'คู่มือการขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร ปี 2569';
const sourceOrganization =
  'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร กรมส่งเสริมการเกษตร กระทรวงเกษตรและสหกรณ์';

const categoryDirectories = {
  ข้อมูลเอกสาร: '00_เริ่มต้น',
  บทนำ: '01_บทนำและนิยาม',
  นิยามศัพท์: '01_บทนำและนิยาม',
  หลักเกณฑ์และเงื่อนไข: '02_หลักเกณฑ์และเงื่อนไข',
  ขั้นตอนและวิธีปฏิบัติงาน: '03_ขั้นตอนและการตรวจสอบ',
  การกรอกแบบคำร้อง: '04_การกรอกแบบคำร้อง',
  เอกสารและรายงานจากระบบ: '05_เอกสารและรายงาน',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
  mkdir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function yamlList(values) {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;
}

function frontMatter({
  title,
  slug,
  category,
  subcategory = '',
  status,
  sourcePages,
  sourcePdfPages,
  sectionsCount,
}) {
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `slug: ${slug}`,
    `category: ${JSON.stringify(category)}`,
    `subcategory: ${JSON.stringify(subcategory)}`,
    `status: ${status}`,
    'source_year: 2569',
    `source_pages: ${JSON.stringify(sourcePages || '')}`,
    `source_pdf_pages: ${yamlList(sourcePdfPages || [])}`,
    `sections_count: ${sectionsCount || 0}`,
    `last_reviewed: ${reviewedDate}`,
    `source_document: ${JSON.stringify(sourceDocument)}`,
    `source_organization: ${JSON.stringify(sourceOrganization)}`,
    '---',
  ].join('\n');
}

function categoryDir(category) {
  return (
    categoryDirectories[category] ||
    (category.startsWith('ภาคผนวก') ? '06_ภาคผนวก' : '02_หลักเกณฑ์และเงื่อนไข')
  );
}

function articleMarkdown(article) {
  const body = String(article.body_markdown || '').trim();
  const marker = body.startsWith('<!-- source:')
    ? ''
    : `<!-- source: farmer69-watermark.pdf | PDF page ${(article.source_pdf_pages || []).join(', ') || 'ไม่ระบุ'} | printed page ${(article.source_printed_pages || []).join(', ') || 'ไม่ระบุ'} -->\n\n`;
  return `${marker}${body}`;
}

function articleFile(article) {
  const status = article.review_flags?.length
    ? 'needs_source_check'
    : 'transcribed';
  return `${frontMatter({
    title: article.title,
    slug: article.slug,
    category: article.category,
    subcategory: article.category,
    status,
    sourcePages: (article.source_printed_pages || []).join(', '),
    sourcePdfPages: article.source_pdf_pages,
    sectionsCount: article.sections_count,
  })}\n\n${articleMarkdown(article)}`;
}

function sourcePageFile(page) {
  const printedPage =
    page.printed_page === null || page.printed_page === undefined
      ? 'ไม่ระบุ'
      : page.printed_page;
  const sourceMarker = `<!-- source: farmer69-watermark.pdf | PDF page ${page.pdf_page} | printed page ${printedPage} -->`;
  return `${frontMatter({
    title: `ถอดข้อความต้นฉบับ PDF หน้า ${page.pdf_page}`,
    slug: `farmer69-pdf-page-${String(page.pdf_page).padStart(3, '0')}`,
    category: 'ถอดตามหน้า PDF',
    subcategory: 'ชั้นความเที่ยงตรงต้นฉบับ',
    status: page.status || 'transcribed',
    sourcePages: printedPage,
    sourcePdfPages: [page.pdf_page],
    sectionsCount: 1,
  })}\n\n${sourceMarker}\n\n# PDF page ${page.pdf_page}\n\n## Printed page ${printedPage}\n\n${String(page.text || '').trim()}`;
}

function systemFile(title, slug, body, status = 'transcribed') {
  return `${frontMatter({
    title,
    slug,
    category: 'ระบบจัดการคลังความรู้',
    subcategory: 'เอกสารระบบ',
    status,
    sourcePages: '1-88',
    sourcePdfPages: Array.from({ length: 90 }, (_, index) => index + 1),
    sectionsCount: body.split(/^#{1,4}\s+/m).length - 1,
  })}\n\n${body}`;
}

function build() {
  const catalog = readJson(path.join(dataDir, 'catalog.json'));
  const articles = catalog.map((entry) =>
    readJson(path.join(dataDir, 'articles', `${entry.slug}.json`))
  );
  const sourcePages = readJson(path.join(dataDir, 'source-pages.json'));
  const faq = readJson(path.join(dataDir, 'faq.json'));
  const ragChunks = readJson(path.join(dataDir, 'rag-chunks.json'));

  mkdir(outputRoot);
  for (const article of articles) {
    write(
      path.join(
        outputRoot,
        categoryDir(article.category),
        `${article.slug}.md`
      ),
      articleFile(article)
    );
  }

  const sourcePageDirectory = path.join(outputRoot, '98_ถอดตามหน้า PDF');
  for (const page of sourcePages) {
    write(
      path.join(
        sourcePageDirectory,
        `page-${String(page.pdf_page).padStart(3, '0')}.md`
      ),
      sourcePageFile(page)
    );
  }
  write(
    path.join(sourcePageDirectory, 'README.md'),
    systemFile(
      'ชั้นถอดข้อความต้นฉบับตามหน้า PDF',
      'farmer69-verbatim-pages-readme',
      `# ชั้นถอดข้อความต้นฉบับตามหน้า PDF\n\nโฟลเดอร์นี้เป็นชั้นความเที่ยงตรงของต้นฉบับ แยกหน้า PDF 1-${sourcePages.length} ตามลำดับการอ่านจริง เพื่อให้ Full Text Search, Vector Database และ AI ตรวจกลับไปยังข้อความต้นฉบับได้โดยตรง\n\nการแยกเป็นรายหน้าในโฟลเดอร์นี้ไม่ได้แทนการแบ่งบทความตามหัวข้อธรรมชาติในโฟลเดอร์อื่น แต่เป็นหลักฐานต้นทางสำหรับตรวจทวนตัวเลข หน่วย สูตร รหัส แบบฟอร์ม ตาราง และข้อความที่อาจอ่านจากภาพได้ไม่ครบ\n\n- PDF page และ printed page แยกไว้ใน YAML และ source marker\n- ไม่ปรับแก้ตัวเลขหรือคำนวณค่าจากต้นฉบับ\n- หน้าที่เป็นภาพ/ตารางควรตรวจเทียบกับ PDF ภาพจริงก่อนนำไปใช้เป็นคำตอบเฉพาะกรณี`
    )
  );
  write(
    path.join(sourcePageDirectory, 'INDEX.md'),
    systemFile(
      'INDEX — ถอดข้อความต้นฉบับเรียงตาม PDF',
      'farmer69-verbatim-pages-index',
      `# ถอดตามลำดับ PDF\n\n${sourcePages
        .map(
          (page) =>
            `- [PDF page ${page.pdf_page}](./page-${String(page.pdf_page).padStart(3, '0')}.md) — printed page ${page.printed_page === null ? 'ไม่ระบุ' : page.printed_page}`
        )
        .join('\n')}`
    )
  );

  const links = articles
    .map(
      (article) =>
        `- [${article.title}](../${categoryDir(article.category)}/${article.slug}.md) — PDF หน้า ${(article.source_pdf_pages || []).join(', ')}`
    )
    .join('\n');
  const faqLinks = faq
    .slice(0, 60)
    .map(
      (item) =>
        `- ${item.question} — [คำตอบ](../${categoryDir(item.category)}/${item.related_article_slug}.md)`
    )
    .join('\n');

  write(
    path.join(outputRoot, '00_เริ่มต้น', 'README.md'),
    systemFile(
      'README — น้องข้าวหลาม ทบก. คู่มือขึ้นทะเบียนเกษตรกร 2569',
      'farmer69-readme',
      `# น้องข้าวหลาม ทบก.\n\nคลังความรู้ภาษาไทยสำหรับการขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร ปี 2569 สร้างจาก ${sourceDocument}\n\n## ขอบเขต\n\n- บทความตามหัวข้อธรรมชาติของเอกสาร ${articles.length} รายการ\n- FAQ ภาษาคน ${faq.length} รายการ พร้อมคำตอบจากบทความที่อ้างอิง\n- ถอดข้อความตามลำดับ PDF ครบ ${sourcePages.length} หน้า\n- RAG chunks สำหรับ Full Text Search และระบบตอบคำถาม\n\n## วิธีใช้งาน\n\nอ่าน [INDEX](./INDEX.md) เพื่อเปิดบทความตามลำดับเอกสาร หรือใช้ public/data/farmer69/faq.json และ public/data/farmer69/rag-chunks.json เป็นข้อมูลนำเข้าเว็บไซต์และ AI\n\n## สถานะ\n\nเอกสารที่ไม่มี review flag ใช้สถานะ transcribed; เอกสารที่มีประเด็นตรวจสอบใช้ needs_source_check ตาม metadata ของต้นฉบับ`
    )
  );
  write(
    path.join(outputRoot, '00_เริ่มต้น', 'INDEX.md'),
    systemFile(
      'INDEX — สารบัญคลังความรู้ ทบก. 2569',
      'farmer69-index',
      `# สารบัญตามลำดับการอ่าน\n\n${links}\n\n## คำถามที่พบบ่อย\n\n${faqLinks}`
    )
  );

  const manifest = `# MANIFEST\n\n- บทความตามหัวข้อธรรมชาติ: ${articles.length}\n- FAQ: ${faq.length}\n- RAG chunks: ${ragChunks.length}\n- ชั้นถอดข้อความต้นฉบับตาม PDF: ${sourcePages.length} หน้า\n- Article directories: ${new Set(articles.map((article) => categoryDir(article.category))).size}\n`;
  const progress = `# PROGRESS\n\n- ถอดข้อความ PDF แล้ว: หน้า 1-${sourcePages.length}\n- จัดหัวข้อบทความแล้ว: ${articles.length} ไฟล์\n- สร้างชั้นถอดต้นฉบับตามหน้าแล้ว: ${sourcePages.length} ไฟล์\n- สร้าง FAQ แล้ว: ${faq.length} รายการ\n- สร้าง RAG export แล้ว: ${ragChunks.length} chunks\n- สถานะงาน: พร้อมใช้งานบนเว็บและรอตรวจทวนแหล่งอ้างอิงที่มี review flag\n`;
  const changelog = `# CHANGELOG\n\n## ${reviewedDate}\n\n- เปลี่ยนคลังเดิมให้เป็นองค์ความรู้ น้องข้าวหลาม ทบก.\n- เพิ่ม source marker, FAQ, source-pages และ RAG export\n- เพิ่ม metadata และสถานะตรวจสอบในทุกบทความ\n`;
  const summary = `# PROJECT SUMMARY\n\n## งานที่ทำแล้ว\n\n- อ่านต้นฉบับ ${sourcePages.length} หน้า และเก็บข้อความแยกตาม PDF page\n- จัดทำชั้นถอดข้อความต้นฉบับแบบ verbatim ${sourcePages.length} หน้า\n- จัดทำบทความ ${articles.length} รายการตามหัวข้อธรรมชาติ\n- จัดทำคำถามที่อาจพบ ${faq.length} รายการ พร้อมคำตอบและลิงก์กลับไปยังแหล่งเนื้อหา\n- สร้าง RAG chunks ${ragChunks.length} รายการสำหรับ retrieval\n- ผูกน้องข้าวหลาม ทบก. เข้ากับ route /public/farmer-manual\n\n## หน้าสุดท้าย\n\nPDF page ${sourcePages.length}\n\n## หน้าถัดไป\n\nไม่มี หน้าต้นฉบับครบแล้ว; งานต่อเนื่องคือทบทวน review flags และ visual verification เมื่อมีผู้ตรวจแหล่งอ้างอิง\n`;
  write(
    path.join(outputRoot, '99_ระบบ', 'MANIFEST.md'),
    systemFile('MANIFEST', 'farmer69-manifest', manifest)
  );
  write(
    path.join(outputRoot, '99_ระบบ', 'PROGRESS.md'),
    systemFile('PROGRESS', 'farmer69-progress', progress)
  );
  write(
    path.join(outputRoot, '99_ระบบ', 'CHANGELOG.md'),
    systemFile('CHANGELOG', 'farmer69-changelog', changelog)
  );
  write(
    path.join(outputRoot, '99_ระบบ', 'PROJECT_SUMMARY.md'),
    systemFile('PROJECT SUMMARY', 'farmer69-project-summary', summary)
  );

  const reviewCounts = new Map();
  for (const article of articles) {
    for (const flag of article.review_flags || []) {
      reviewCounts.set(flag, (reviewCounts.get(flag) || 0) + 1);
    }
  }
  const reviewTable = [...reviewCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([flag, count]) =>
        `| ${flag} | ${count} บทความ | ตรวจทวนตามต้นฉบับก่อนอ้างเป็นคำตอบเฉพาะกรณี |`
    )
    .join('\n');
  const reviewBody = `# REVIEW FLAGS\n\n| Flag | จำนวน | แนวทาง |\n|---|---:|---|\n${reviewTable || '| ไม่มี | 0 | ไม่มีประเด็นที่บันทึกไว้ |'}`;
  const coverageRows = sourcePages
    .map(
      (page) =>
        `| ${page.pdf_page} | ${page.printed_page} | ${page.text?.trim() ? 'มีข้อความ' : 'ว่าง'} | ${page.status} |`
    )
    .join('\n');
  const coverageBody = `# SOURCE COVERAGE\n\n| PDF page | Printed page | ข้อความ | สถานะ |\n|---:|---:|---|---|\n${coverageRows}`;
  const qaBody = `# QUALITY ASSURANCE\n\n- จำนวนบทความที่อ่านได้: ${articles.length}\n- จำนวน FAQ: ${faq.length}\n- จำนวน RAG chunks: ${ragChunks.length}\n- จำนวนหน้า PDF ที่มีใน source-pages.json: ${sourcePages.length}/90\n- ชั้นถอดต้นฉบับตามหน้า PDF: ${sourcePages.length} ไฟล์ Markdown พร้อม YAML และ source marker\n- YAML front matter: สร้างจาก generator เดียวกันทุกไฟล์\n- source marker: มีในบทความและถูกส่งเข้า RAG metadata\n- ลำดับหน้า: source-pages.json เรียง PDF page 1 ถึง 90\n- ตาราง/หัวข้อ: คงไว้ใน Markdown เดิมและ parser ของเว็บไซต์ตรวจตาม block\n- ลิงก์: บทความใช้ route /public/farmer-manual/:slug\n- ข้อความซ้ำ: FAQ อ้างคำตอบจากบทความ ไม่คัดลอกไปแก้แหล่งต้นฉบับ\n- ข้อจำกัด: review flags ที่ต้นฉบับระบุยังคงอยู่ ไม่ถูกลบหรือเดาแทน`;

  write(
    path.join(outputRoot, '99_ระบบ', 'REVIEW_FLAGS.md'),
    systemFile(
      'REVIEW FLAGS',
      'farmer69-review-flags',
      reviewBody,
      'needs_source_check'
    )
  );
  write(
    path.join(outputRoot, '99_ระบบ', 'SOURCE_COVERAGE.md'),
    systemFile('SOURCE COVERAGE', 'farmer69-source-coverage', coverageBody)
  );
  write(
    path.join(outputRoot, '99_ระบบ', 'QUALITY_ASSURANCE.md'),
    systemFile('QUALITY ASSURANCE', 'farmer69-quality-assurance', qaBody)
  );

  write(
    path.join(outputRoot, 'README.md'),
    systemFile(
      'README — น้องข้าวหลาม ทบก.',
      'farmer69-root-readme',
      `# น้องข้าวหลาม ทบก.\n\nคลังความรู้ทะเบียนและปรับปรุงทะเบียนเกษตรกร ปี 2569\n\n- [สารบัญหัวข้อธรรมชาติ](./00_เริ่มต้น/INDEX.md)\n- [ถอดข้อความตามหน้า PDF](./98_ถอดตามหน้า PDF/INDEX.md)\n- [สถานะและ QA](./99_ระบบ/QUALITY_ASSURANCE.md)`
    )
  );
  write(
    path.join(outputRoot, 'INDEX.md'),
    systemFile(
      'INDEX — น้องข้าวหลาม ทบก.',
      'farmer69-root-index',
      `# INDEX\n\nอ่านตามหัวข้อ: [INDEX หัวข้อธรรมชาติ](./00_เริ่มต้น/INDEX.md)\n\nอ่านตรวจเทียบต้นฉบับ: [INDEX ตาม PDF](./98_ถอดตามหน้า PDF/INDEX.md)`
    )
  );
  write(
    path.join(outputRoot, 'MANIFEST.md'),
    systemFile('MANIFEST', 'farmer69-root-manifest', manifest)
  );
  write(
    path.join(outputRoot, 'PROGRESS.md'),
    systemFile('PROGRESS', 'farmer69-root-progress', progress)
  );
  write(
    path.join(outputRoot, 'CHANGELOG.md'),
    systemFile('CHANGELOG', 'farmer69-root-changelog', changelog)
  );
  write(
    path.join(outputRoot, 'PROJECT_SUMMARY.md'),
    systemFile('PROJECT SUMMARY', 'farmer69-root-project-summary', summary)
  );
  write(
    path.join(outputRoot, 'QUALITY_ASSURANCE.md'),
    systemFile('QUALITY ASSURANCE', 'farmer69-root-quality-assurance', qaBody)
  );
  write(
    path.join(outputRoot, 'REVIEW_FLAGS.md'),
    systemFile(
      'REVIEW FLAGS',
      'farmer69-root-review-flags',
      reviewBody,
      'needs_source_check'
    )
  );
  write(
    path.join(outputRoot, 'SOURCE_COVERAGE.md'),
    systemFile('SOURCE COVERAGE', 'farmer69-root-source-coverage', coverageBody)
  );

  const checks = {
    articleCount: articles.length,
    faqCount: faq.length,
    ragChunks: ragChunks.length,
    sourcePages: sourcePages.length,
    sourcePageMarkdownFiles: sourcePages.filter((page) => page.text?.trim())
      .length,
    emptySourcePages: sourcePages.filter((page) => !page.text?.trim()).length,
    duplicateSlugs:
      articles.length - new Set(articles.map((article) => article.slug)).size,
  };
  if (
    checks.sourcePages !== 90 ||
    checks.sourcePageMarkdownFiles !== 90 ||
    checks.emptySourcePages ||
    checks.duplicateSlugs
  ) {
    throw new Error(`Farmer69 QA failed: ${JSON.stringify(checks)}`);
  }
  console.log(JSON.stringify(checks, null, 2));
}

build();
