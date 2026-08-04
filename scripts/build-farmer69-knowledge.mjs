import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const dataDir = path.join(rootDir, 'public', 'data', 'farmer69');
const articlesDir = path.join(dataDir, 'articles');
const reviewedDate = '2026-08-04';
const sourcePdfUrl =
  'https://cjjirwqoovypymndhvwt.supabase.co/storage/v1/object/public/farmer69-assets/source/farmer69-watermark.pdf';
const sourceDocument = 'คู่มือการขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร ปี 2569';
const sourceOrganization =
  'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร กรมส่งเสริมการเกษตร กระทรวงเกษตรและสหกรณ์';

function readJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function pageList(article, key) {
  return Array.isArray(article[key]) ? article[key] : [];
}

function sourceMarker(article) {
  const pdfPages =
    pageList(article, 'source_pdf_pages').join(', ') || 'ไม่ระบุ';
  const printedPages =
    pageList(article, 'source_printed_pages').join(', ') || 'ไม่ระบุ';
  return `<!-- source: farmer69-watermark.pdf | PDF page ${pdfPages} | printed page ${printedPages} -->`;
}

function withSourceMarker(article) {
  const body = String(article.body_markdown || '').trim();
  return body.startsWith('<!-- source:')
    ? body
    : `${sourceMarker(article)}\n\n${body}`;
}

function articleStatus(article) {
  return article.review_flags?.length ? 'needs_source_check' : 'transcribed';
}

function splitIntoChunks(text, maxLength = 1800) {
  const paragraphs = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      if (current) chunks.push(current);
      current = '';
      for (let start = 0; start < paragraph.length; start += maxLength) {
        chunks.push(paragraph.slice(start, start + maxLength));
      }
      continue;
    }
    if (!current) {
      current = paragraph;
    } else if (`${current}\n\n${paragraph}`.length <= maxLength) {
      current = `${current}\n\n${paragraph}`;
    } else {
      chunks.push(current);
      current = paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function sectionBlocks(markdown) {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const blocks = [];
  let heading = 'เนื้อหา';
  let body = [];

  const flush = () => {
    const text = body.join('\n').trim();
    if (text) blocks.push({ heading, text });
    body = [];
  };

  for (const line of lines) {
    const match = line.match(/^#{1,4}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return blocks.length ? blocks : [{ heading, text: String(markdown || '') }];
}

function buildArticleCatalog(catalog, articlesBySlug) {
  return catalog.map((entry) => {
    const article = articlesBySlug.get(entry.slug) || {};
    return {
      ...entry,
      source_year: 2569,
      source_pages: pageList(article, 'source_printed_pages').join(', '),
      source_pdf_pages: pageList(article, 'source_pdf_pages'),
      status: articleStatus(article),
      last_reviewed: reviewedDate,
      source_document: sourceDocument,
      source_organization: sourceOrganization,
      sections_count: sectionBlocks(article.body_markdown).length,
    };
  });
}

function buildFaq(catalog, articlesBySlug, seeds) {
  const usedSlugs = new Set();
  const seeded = seeds.map((seed, index) => {
    const article = articlesBySlug.get(seed.slug);
    if (!article)
      throw new Error(`FAQ seed points to missing article: ${seed.slug}`);
    usedSlugs.add(seed.slug);
    return {
      faq_id: `tbk-faq-${String(index + 1).padStart(3, '0')}`,
      question: seed.question,
      aliases: seed.aliases || [],
      answer_markdown: withSourceMarker(article),
      related_article_slug: seed.slug,
      related_article_title: article.title,
      category: article.category,
      source_pdf_pages: pageList(article, 'source_pdf_pages'),
      source_printed_pages: pageList(article, 'source_printed_pages'),
      status: articleStatus(article),
      source_year: 2569,
      last_reviewed: reviewedDate,
      source_document: sourceDocument,
      source_organization: sourceOrganization,
    };
  });

  const generated = catalog
    .filter((entry) => !usedSlugs.has(entry.slug))
    .map((entry, index) => {
      const article = articlesBySlug.get(entry.slug);
      const number = seeded.length + index + 1;
      return {
        faq_id: `tbk-faq-${String(number).padStart(3, '0')}`,
        question: `${article.title} มีหลักเกณฑ์และรายละเอียดอย่างไรในคู่มือปี 2569?`,
        aliases: article.topics || [],
        answer_markdown: withSourceMarker(article),
        related_article_slug: article.slug,
        related_article_title: article.title,
        category: article.category,
        source_pdf_pages: pageList(article, 'source_pdf_pages'),
        source_printed_pages: pageList(article, 'source_printed_pages'),
        status: articleStatus(article),
        source_year: 2569,
        last_reviewed: reviewedDate,
        source_document: sourceDocument,
        source_organization: sourceOrganization,
      };
    });

  return [...seeded, ...generated];
}

function buildRagChunks(catalog, articlesBySlug, faq, sourcePages) {
  const chunks = [];
  let chunkNumber = 1;
  const pushChunks = (parts, metadata) => {
    for (const part of parts) {
      chunks.push({
        chunk_id: `tbk-${String(chunkNumber++).padStart(5, '0')}`,
        ...metadata,
        text: part,
      });
    }
  };

  for (const entry of catalog) {
    const article = articlesBySlug.get(entry.slug);
    if (!article) continue;
    for (const section of sectionBlocks(withSourceMarker(article))) {
      pushChunks(splitIntoChunks(section.text), {
        document_slug: article.slug,
        title: article.title,
        category: article.category,
        section_heading: section.heading,
        source_pdf_pages: pageList(article, 'source_pdf_pages'),
        source_printed_pages: pageList(article, 'source_printed_pages'),
        source_type: 'topic_article',
        source_year: 2569,
        status: articleStatus(article),
        url: `/public/farmer-manual/${article.slug}`,
      });
    }
  }

  for (const item of faq) {
    pushChunks(
      splitIntoChunks(
        `${item.question}\n${(item.aliases || []).join(' | ')}\n\n${item.answer_markdown}`
      ),
      {
        document_slug: item.related_article_slug,
        title: `คำถามที่พบบ่อย: ${item.question}`,
        category: item.category,
        section_heading: 'คำถามที่พบบ่อย',
        faq_id: item.faq_id,
        faq_question: item.question,
        faq_aliases: item.aliases || [],
        source_pdf_pages: item.source_pdf_pages,
        source_printed_pages: item.source_printed_pages,
        source_type: 'faq',
        source_year: 2569,
        status: item.status,
        url: `/public/farmer-manual/${item.related_article_slug}`,
      }
    );
  }

  for (const page of sourcePages) {
    if (!page.text?.trim()) continue;
    pushChunks(splitIntoChunks(page.text), {
      document_slug: 'farmer69-source-document',
      title: sourceDocument,
      category: 'ถอดเนื้อหาตามหน้า PDF',
      section_heading: `PDF page ${page.pdf_page}`,
      source_pdf_pages: [page.pdf_page],
      source_printed_pages:
        page.printed_page === null ? [] : [page.printed_page],
      source_pdf_url: `${sourcePdfUrl}#page=${page.pdf_page}`,
      source_type: 'verbatim_page',
      source_year: 2569,
      status: page.status || 'transcribed',
      url: '/public/farmer-manual/farmer69-source-document-information',
    });
  }

  return chunks;
}

function build() {
  const catalog = readJson(path.join(dataDir, 'catalog.json'));
  const articlesBySlug = new Map();
  for (const entry of catalog) {
    const filePath = path.join(articlesDir, `${entry.slug}.json`);
    const article = readJson(filePath, null);
    if (!article) throw new Error(`Missing article JSON: ${entry.slug}`);
    article.body_markdown = withSourceMarker(article);
    fs.writeFileSync(filePath, `${JSON.stringify(article, null, 2)}\n`, 'utf8');
    articlesBySlug.set(entry.slug, article);
  }

  const seeds = readJson(path.join(dataDir, 'faq-seeds.json'));
  const faq = buildFaq(catalog, articlesBySlug, seeds);
  const sourcePages = readJson(path.join(dataDir, 'source-pages.json')).map(
    (page) => ({
      ...page,
      source_pdf_url: `${sourcePdfUrl}#page=${page.pdf_page}`,
      ...(page.status === 'visual_review_pending'
        ? { review_note: 'ตรวจภาพ PDF ต้นฉบับก่อนยืนยันตัวอักษรในแบบฟอร์ม/ภาพ' }
        : {}),
    })
  );
  const overallStatus = sourcePages.some(
    (page) => page.status === 'visual_review_pending'
  )
    ? 'visual_review_pending'
    : 'transcribed';
  const enhancedCatalog = buildArticleCatalog(catalog, articlesBySlug);
  const ragChunks = buildRagChunks(
    enhancedCatalog,
    articlesBySlug,
    faq,
    sourcePages
  );

  writeJson(path.join(dataDir, 'catalog.json'), enhancedCatalog);
  writeJson(path.join(dataDir, 'faq.json'), faq);
  writeJson(path.join(dataDir, 'rag-chunks.json'), ragChunks);
  writeJson(path.join(dataDir, 'source-pages.json'), sourcePages);
  writeJson(path.join(dataDir, 'metadata.json'), {
    title: 'น้องข้าวหลาม ทบก. — คู่มือขึ้นทะเบียนเกษตรกร 2569',
    slug: 'nong-khaolam-tbk-2569',
    category: 'ทะเบียนเกษตรกร',
    subcategory: 'คู่มือขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร',
    status: overallStatus,
    source_year: 2569,
    source_pages: '1-88',
    source_pdf_pages: '1-90',
    verbatim_source_pages: sourcePages.length,
    sections_count: enhancedCatalog.reduce(
      (total, entry) => total + Number(entry.sections_count || 0),
      0
    ),
    last_reviewed: reviewedDate,
    source_document: sourceDocument,
    source_organization: sourceOrganization,
    articles_count: enhancedCatalog.length,
    faq_count: faq.length,
    rag_chunks_count: ragChunks.length,
  });

  const ragExportDir = path.join(
    rootDir,
    'farmer69_knowledge_md',
    '99_ระบบ',
    'RAG_EXPORT'
  );
  fs.mkdirSync(ragExportDir, { recursive: true });
  fs.writeFileSync(
    path.join(ragExportDir, 'rag_chunks.jsonl'),
    `${ragChunks.map((chunk) => JSON.stringify(chunk)).join('\n')}\n`,
    'utf8'
  );
  writeJson(path.join(ragExportDir, 'rag_export_metadata.json'), {
    source_document: sourceDocument,
    source_pdf_pages: 90,
    verbatim_source_pages: sourcePages.length,
    status: overallStatus,
    articles_count: enhancedCatalog.length,
    faq_count: faq.length,
    rag_chunks_count: ragChunks.length,
    last_reviewed: reviewedDate,
  });

  console.log(
    JSON.stringify(
      {
        articles: enhancedCatalog.length,
        faq: faq.length,
        ragChunks: ragChunks.length,
        sourcePages: sourcePages.length,
      },
      null,
      2
    )
  );
}

build();
