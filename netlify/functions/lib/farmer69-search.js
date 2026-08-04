import fs from 'node:fs';
import path from 'node:path';

let catalogCache = null;
let chunksCache = null;

const QUERY_STOPWORDS = new Set([
  'อะไร',
  'อย่างไร',
  'อย่างไหน',
  'หรือไม่',
  'หรือ',
  'และ',
  'เป็น',
  'ได้ไหม',
  'ทำไม',
  'ต้องการ',
  'ช่วย',
  'แนะนำ',
  'ข้อมูล',
  'เรื่อง',
  'หน่อย',
  'ครับ',
  'ค่ะ',
  'คุณ',
  'เกษตรกร',
]);

export function loadFarmer69Catalog() {
  if (catalogCache) return catalogCache;
  try {
    const filePath = path.join(
      process.cwd(),
      'public/data/farmer69/catalog.json'
    );
    catalogCache = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : [];
  } catch (error) {
    console.error('Error loading farmer69 catalog:', error);
    catalogCache = [];
  }
  return catalogCache;
}

export function loadFarmer69Chunks() {
  if (chunksCache) return chunksCache;
  try {
    const builtPath = path.join(
      process.cwd(),
      'public/data/farmer69/rag-chunks.json'
    );
    if (fs.existsSync(builtPath)) {
      chunksCache = JSON.parse(fs.readFileSync(builtPath, 'utf8'));
      return chunksCache;
    }

    // ponytail: article fallback keeps local development usable before the build step.
    const articlesDir = path.join(
      process.cwd(),
      'public/data/farmer69/articles'
    );
    chunksCache = fs
      .readdirSync(articlesDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) =>
        JSON.parse(fs.readFileSync(path.join(articlesDir, file), 'utf8'))
      )
      .map((article) => ({
        document_slug: article.slug,
        title: article.title,
        category: article.category,
        section_heading: article.title,
        source_pdf_pages: article.source_pdf_pages,
        source_printed_pages: article.source_printed_pages,
        source_year: 2569,
        status: article.review_flags?.length
          ? 'needs_source_check'
          : 'transcribed',
        url: `/public/farmer-manual/${article.slug}`,
        text: article.body_markdown,
      }));
  } catch (error) {
    console.error('Error loading farmer69 RAG chunks:', error);
    chunksCache = [];
  }
  return chunksCache;
}

function queryTerms(query) {
  const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
  return [
    ...new Set(
      [...segmenter.segment(query)]
        .filter((part) => part.isWordLike)
        .map((part) => part.segment.toLowerCase().trim())
        .filter((term) => term.length >= 2 && !QUERY_STOPWORDS.has(term))
    ),
  ];
}

export function searchFarmer69Chunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  const query = String(queryText || '')
    .toLowerCase()
    .trim();
  const terms = queryTerms(query);
  if (query.length < 2 || terms.length === 0) return [];

  const ranked = loadFarmer69Chunks()
    .map((chunk) => {
      const title = String(chunk.title || '').toLowerCase();
      const heading = String(chunk.section_heading || '').toLowerCase();
      const metadata = [
        chunk.category,
        chunk.faq_question,
        ...(chunk.faq_aliases || []),
        ...(chunk.source_pdf_pages || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const text = String(chunk.text || '').toLowerCase();
      let score = text.includes(query) ? 28 : 0;
      for (const term of terms) {
        if (title.includes(term)) score += 12;
        if (metadata.includes(term)) score += 8;
        if (heading.includes(term)) score += 7;
        if (text.includes(term)) score += 2;
      }
      if (chunk.source_type === 'verbatim_page') score += 4;
      if (chunk.document_slug === preferredDocumentSlug) score += 10;
      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const documentCounts = new Map();
  const minimumScore = (ranked[0]?.score || 0) * 0.42;
  for (const { chunk, score } of ranked) {
    if (score < minimumScore) break;
    const count = documentCounts.get(chunk.document_slug) || 0;
    if (count >= 3) continue;
    selected.push(chunk);
    documentCounts.set(chunk.document_slug, count + 1);
    if (selected.length >= limit) break;
  }

  const verbatim = ranked.find(
    ({ chunk }) => chunk.source_type === 'verbatim_page'
  );
  if (
    verbatim &&
    !selected.some((chunk) => chunk.source_type === 'verbatim_page')
  ) {
    if (selected.length >= limit)
      selected[selected.length - 1] = verbatim.chunk;
    else selected.push(verbatim.chunk);
  }
  return selected;
}
