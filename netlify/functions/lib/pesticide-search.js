import fs from 'node:fs';
import path from 'node:path';

let pesticideCatalogCache = null;
let pesticideChunksCache = null;
const COMMON_NAME_STOPWORDS = new Set([
  'สูตร',
  'กลุ่ม',
  'ระดับพิษและ LD50',
  'อัตรา',
  'เหยื่อตัวอย่าง',
  'วิธีวาง',
  'ข้อจำกัด',
]);

export function loadPesticideCatalog() {
  if (pesticideCatalogCache) return pesticideCatalogCache;
  try {
    // Netlify functions process.cwd() is the repository root
    const catalogPath = path.join(
      process.cwd(),
      'public/data/pesticides/catalog.json'
    );
    if (fs.existsSync(catalogPath)) {
      pesticideCatalogCache = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading pesticide catalog:', err);
  }
  return pesticideCatalogCache || [];
}

export function loadPesticideChunks() {
  if (pesticideChunksCache) return pesticideChunksCache;

  try {
    const builtPath = path.join(
      process.cwd(),
      'public/data/pesticides/rag-chunks.json'
    );
    if (fs.existsSync(builtPath)) {
      pesticideChunksCache = JSON.parse(fs.readFileSync(builtPath, 'utf8'));
      return pesticideChunksCache;
    }

    // ponytail: source fallback keeps tests/local dev working before the build step.
    const knowledgeRoot = path.join(process.cwd(), 'pesticide_knowledge_md');
    const systemDir = fs
      .readdirSync(knowledgeRoot, { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.startsWith('99_'));
    const sourcePath = systemDir
      ? path.join(
          knowledgeRoot,
          systemDir.name,
          'RAG_EXPORT',
          'rag_chunks.jsonl'
        )
      : '';
    if (sourcePath && fs.existsSync(sourcePath)) {
      pesticideChunksCache = fs
        .readFileSync(sourcePath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }
  } catch (err) {
    console.error('Error loading pesticide RAG chunks:', err);
  }

  return pesticideChunksCache || [];
}

const QUERY_STOPWORDS = new Set([
  'อะไร',
  'อย่างไร',
  'ยังไง',
  'หรือ',
  'และ',
  'เป็น',
  'ใช้',
  'ช่วย',
  'แนะนำ',
  'ข้อมูล',
  'โรค',
  'ยา',
  'สาร',
  'สารเคมี',
  'หน่อย',
  'ครับ',
  'ค่ะ',
]);

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

export function searchPesticideChunks(queryText, limit = 6) {
  const query = String(queryText || '')
    .toLowerCase()
    .trim();
  const terms = queryTerms(query);
  if (query.length < 2 || terms.length === 0) return [];

  const chunks = loadPesticideChunks();
  const plantTerms = terms.filter((term) =>
    chunks.some((chunk) =>
      String(chunk.plant || '')
        .toLowerCase()
        .includes(term)
    )
  );
  const ranked = chunks
    .map((chunk) => {
      const title = String(chunk.title || '').toLowerCase();
      const heading = String(chunk.section_heading || '').toLowerCase();
      const plant = String(chunk.plant || '').toLowerCase();
      const metadata = [chunk.category, chunk.plant, chunk.pest_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const text = String(chunk.text || '').toLowerCase();
      if (
        plantTerms.length > 0 &&
        !plantTerms.some((term) => plant.includes(term) || title.includes(term))
      ) {
        return { chunk, score: 0 };
      }

      let score = text.includes(query) ? 30 : 0;

      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (metadata.includes(term)) score += 7;
        if (heading.includes(term)) score += 5;
        if (text.includes(term)) score += 2;
      }

      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const documentCounts = new Map();
  const minimumScore = (ranked[0]?.score || 0) * 0.5;
  for (const { chunk, score } of ranked) {
    if (score < minimumScore) break;
    const count = documentCounts.get(chunk.document_slug) || 0;
    if (count >= 2) continue;
    selected.push(chunk);
    documentCounts.set(chunk.document_slug, count + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function searchPesticideArticles(queryText) {
  const catalog = loadPesticideCatalog();
  const q = String(queryText || '')
    .toLowerCase()
    .trim();
  if (q.length < 2) return [];

  // Keywords indicating the query is specifically about pests, diseases, or chemicals
  // Avoid using single character 'รา' to prevent matching 'ราคา' (price) or 'ราก' (root)
  const pesticideKeywords = [
    'โรค',
    'เชื้อรา',
    'โรครา',
    'เน่า',
    'ด่าง',
    'ไหม้',
    'หนอน',
    'แมลง',
    'เพลี้ย',
    'ไร',
    'หอย',
    'วัชพืช',
    'ศัตรูพืช',
    'สารเคมี',
    'ยากำจัด',
    'ยาฆ่า',
    'ยาพ่น',
    'พ่นยา',
    'สารกำจัด',
    'สารป้องกัน',
    'ชื่อสามัญ',
    'กลุ่มกลไก',
    'อัตราใช้',
    'วิธีใช้',
  ];

  const isPesticideRelated = pesticideKeywords.some((kw) => q.includes(kw));

  const matches = [];
  for (const entry of catalog) {
    let score = 0;

    // 1. Check if query matches specific chemical name (always allowed, does not require keywords)
    if (Array.isArray(entry.commonNames)) {
      for (const name of entry.commonNames) {
        if (
          name &&
          name.length >= 2 &&
          !COMMON_NAME_STOPWORDS.has(name) &&
          q.includes(name.toLowerCase())
        ) {
          score += 12; // High weight for specific chemical names
        }
      }
    }

    // 2. Only check other metadata if the query is pesticide/pest/disease related
    if (isPesticideRelated) {
      // Check if query matches title
      if (
        q.includes(entry.title.toLowerCase()) ||
        entry.title.toLowerCase().includes(q)
      ) {
        score += 8;
      }

      // Check if query matches category
      if (
        entry.category &&
        (q.includes(entry.category.toLowerCase()) ||
          entry.category.toLowerCase().includes(q))
      ) {
        score += 4;
      }

      // Check plant and pest type combination
      if (entry.plant && q.includes(entry.plant.toLowerCase())) {
        score += 4;
        if (entry.pest_type && q.includes(entry.pest_type.toLowerCase())) {
          score += 6;
        }
      }
    }

    if (score > 0) {
      matches.push({ entry, score });
    }
  }

  // Sort by score descending and take top 2
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 2).map((m) => m.entry);
}

export function loadArticleContent(slug) {
  try {
    const articlePath = path.join(
      process.cwd(),
      `public/data/pesticides/articles/${slug}.json`
    );
    if (fs.existsSync(articlePath)) {
      const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
      return article.content;
    }
  } catch (err) {
    console.error(`Error loading article ${slug}:`, err);
  }
  return null;
}
