import fs from 'node:fs';
import path from 'node:path';

let orchidCatalogCache = null;
let orchidChunksCache = null;

export function loadOrchidCatalog() {
  if (orchidCatalogCache) return orchidCatalogCache;
  try {
    const catalogPath = path.join(
      process.cwd(),
      'public/data/orchids/catalog.json'
    );
    if (fs.existsSync(catalogPath))
      orchidCatalogCache = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (error) {
    console.error('Error loading orchid catalog:', error);
  }
  return orchidCatalogCache || [];
}

export function loadOrchidChunks() {
  if (orchidChunksCache) return orchidChunksCache;
  try {
    const productionPath = path.join(
      process.cwd(),
      'public/data/orchids/rag-chunks.json'
    );
    const researchPath = path.join(
      process.cwd(),
      'public/data/orchids/research/rag-chunks.json'
    );
    const production = fs.existsSync(productionPath)
      ? JSON.parse(fs.readFileSync(productionPath, 'utf8'))
      : [];
    const research = fs.existsSync(researchPath)
      ? JSON.parse(fs.readFileSync(researchPath, 'utf8'))
      : [];
    orchidChunksCache = [...production, ...research];
  } catch (error) {
    console.error('Error loading orchid knowledge chunks:', error);
  }
  return orchidChunksCache || [];
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
  'เรื่อง',
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

export function searchOrchidChunks(
  queryText,
  limit = 8,
  preferredDocumentSlug = ''
) {
  const query = String(queryText || '')
    .toLowerCase()
    .trim();
  const terms = queryTerms(query);
  if (query.length < 2 || terms.length === 0) return [];

  const ranked = loadOrchidChunks()
    .map((chunk) => {
      const title = String(chunk.title || '').toLowerCase();
      const heading = String(chunk.section_heading || '').toLowerCase();
      const metadata = [chunk.category, chunk.subcategory]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const text = String(chunk.text || '').toLowerCase();
      let score = text.includes(query) ? 24 : 0;
      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (metadata.includes(term)) score += 7;
        if (heading.includes(term)) score += 6;
        if (text.includes(term)) score += 2;
      }
      if (chunk.document_slug === preferredDocumentSlug) score += 10;
      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const documentCounts = new Map();
  const minimumScore = (ranked[0]?.score || 0) * 0.45;
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
