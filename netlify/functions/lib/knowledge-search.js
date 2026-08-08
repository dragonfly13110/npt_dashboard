import fs from 'node:fs';
import path from 'node:path';
import { searchFarmer69Chunks } from './farmer69-search.js';
import { searchOrchidChunks } from './orchid-search.js';
import { searchPesticideChunks } from './pesticide-search.js';

let fertilizerChunksCache = null;
let riceChunksCache = null;
let machineryChunksCache = null;
let stouResearchChunksCache = null;
let frontierAgriResearchChunksCache = null;
let nptResearchChunksCache = null;
let plantCultivationChunksCache = null;

const THAI_WORD_SEGMENTER = new Intl.Segmenter('th', {
  granularity: 'word',
});
const TEXT_TERMS_CACHE = new Map();

const QUERY_STOPWORDS = new Set([
  'อะไร',
  'อย่างไร',
  'อย่างไหน',
  'ยังไง',
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
  'มี',
  'ไหม',
  'ไม่',
  'ได้',
  'จะ',
  'คือ',
  'ใด',
  'ไหน',
  'ขอ',
  'อยาก',
  'บอก',
  'ตอนนี้',
  'ด้วย',
  'ของ',
  'ใน',
  'ที่',
  'จาก',
  'สำหรับ',
  'เกี่ยวกับ',
  'กับ',
  'ให้',
  'ครับ',
  'ค่ะ',
  'คุณ',
]);

function queryTerms(query) {
  return [
    ...new Set(
      [...THAI_WORD_SEGMENTER.segment(query)]
        .filter((part) => part.isWordLike)
        .map((part) => part.segment.toLowerCase().trim())
        .filter((term) => term.length >= 2 && !QUERY_STOPWORDS.has(term))
    ),
  ];
}

function textTerms(text) {
  const normalized = String(text || '').toLowerCase();
  if (TEXT_TERMS_CACHE.has(normalized)) {
    return TEXT_TERMS_CACHE.get(normalized);
  }
  const terms = new Set(
    [...THAI_WORD_SEGMENTER.segment(normalized)]
      .filter((part) => part.isWordLike)
      .map((part) => part.segment.trim())
      .filter(Boolean)
  );
  TEXT_TERMS_CACHE.set(normalized, terms);
  return terms;
}

function splitMarkdown(text) {
  const sections = String(text || '')
    .split(/\n(?=##\s)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.flatMap((section) => {
    if (section.length <= 9000) return [section];

    const paragraphs = section.split(/\n{2,}/g);
    const parts = [];
    let current = '';
    for (const paragraph of paragraphs) {
      if (current && `${current}\n\n${paragraph}`.length > 9000) {
        parts.push(current);
        current = paragraph;
      } else {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      }
    }
    if (current) parts.push(current);
    return parts;
  });
}

function markdownTitle(content, fallback) {
  const heading = String(content || '')
    .match(/^#\s+(.+)$/m)?.[1]
    ?.trim();
  if (!heading) return fallback;
  return heading.replace(/^\d+\s*\|\s*/, '').trim();
}

function markdownChunks(content, metadata) {
  return splitMarkdown(content).map((text) => ({
    ...metadata,
    section_heading: text.match(/^##\s+(.+)$/m)?.[1]?.trim() || metadata.title,
    text,
  }));
}

function readMarkdownChunks(
  directory,
  createMetadata,
  includeFile = () => true
) {
  try {
    return fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.md') && includeFile(file))
      .flatMap((file) => {
        const content = fs.readFileSync(path.join(directory, file), 'utf8');
        return markdownChunks(content, createMetadata(file, content));
      });
  } catch (error) {
    console.error('Error loading knowledge Markdown:', error);
    return [];
  }
}

function scoreChunk(chunk, query, terms, preferredDocumentSlug = '') {
  const title = String(chunk.title || '').toLowerCase();
  const heading = String(chunk.section_heading || '').toLowerCase();
  const metadata = [
    chunk.category,
    chunk.collection,
    chunk.hubCollection,
    chunk.hubCollectionLabel,
    chunk.topic,
    chunk.plant,
    chunk.handle_id,
    chunk.author,
    chunk.source_pages,
    chunk.source_pdf_pages,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const text = String(chunk.text || '').toLowerCase();
  const titleTerms = textTerms(title);
  const headingTerms = textTerms(heading);
  const metadataTerms = textTerms(metadata);
  const hubLabelTerms = textTerms(String(chunk.hubCollectionLabel || ''));
  let score = terms.length >= 2 && text.includes(query) ? 30 : 0;

  for (const term of terms) {
    if (titleTerms.has(term)) score += 14;
    if (headingTerms.has(term)) score += 10;
    if (metadataTerms.has(term)) score += 8;
    if (hubLabelTerms.has(term)) score += 16;
    if (text.includes(term)) score += 2;
  }

  if (chunk.document_slug === preferredDocumentSlug) score += 12;
  return score;
}

function rankChunks(chunks, queryText, preferredDocumentSlug = '') {
  const query = String(queryText || '')
    .toLowerCase()
    .trim();
  const terms = queryTerms(query);
  if (query.length < 2 || terms.length === 0) return [];

  return chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, query, terms, preferredDocumentSlug),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

function selectRankedChunks(ranked, limit = 10, maxChunksPerDocument = 3) {
  const selected = [];
  const documentCounts = new Map();
  const minimumScore = (ranked[0]?.score || 0) * 0.45;
  for (const { chunk, score } of ranked) {
    if (score < minimumScore) break;
    const count = documentCounts.get(chunk.document_slug) || 0;
    if (count >= maxChunksPerDocument) continue;
    selected.push(chunk);
    documentCounts.set(chunk.document_slug, count + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}

function searchChunks(
  chunks,
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  return selectRankedChunks(
    rankChunks(chunks, queryText, preferredDocumentSlug),
    limit
  );
}

export function loadFertilizerChunks() {
  if (fertilizerChunksCache) return fertilizerChunksCache;
  try {
    const directory = path.join(
      process.cwd(),
      'public/data/fertilizers/articles'
    );
    fertilizerChunksCache = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        const article = JSON.parse(
          fs.readFileSync(path.join(directory, file), 'utf8')
        );
        return markdownChunks(article.content, {
          document_slug: article.slug,
          title: article.title,
          category: article.category,
          plant: article.plant,
          source_year: article.source_year,
          source_pages: article.source_pages,
          last_reviewed: article.last_reviewed,
          collection: 'fertilizers',
          url: `/public/fertilizers/${article.slug}`,
        });
      });
  } catch (error) {
    console.error('Error loading fertilizer knowledge:', error);
    fertilizerChunksCache = [];
  }
  return fertilizerChunksCache;
}

export function searchFertilizerChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  return searchChunks(
    loadFertilizerChunks(),
    queryText,
    limit,
    preferredDocumentSlug
  );
}

function loadRicePestChunks() {
  const filePath = path.join(
    process.cwd(),
    'public/data/rice/pests/rag-chunks.json'
  );
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).map((chunk) => ({
    ...chunk,
    collection: 'pests-control',
    url: `/public/rice/${chunk.document_slug}`,
    text: chunk.text || '',
  }));
}

export function loadRiceChunks() {
  if (riceChunksCache) return riceChunksCache;
  try {
    const directory = path.join(process.cwd(), 'public/data/rice/articles');
    const research = readMarkdownChunks(
      directory,
      (file, content) => {
        const slug = file.replace(/\.md$/, '');
        const collection = /^rice-research-\d{2}$/.test(slug)
          ? 'deep-research'
          : 'overview';
        return {
          document_slug: slug,
          title: markdownTitle(content, slug),
          category:
            collection === 'overview' ? 'ภาพรวมงานวิจัย' : 'งานวิจัยเชิงลึก',
          collection,
          source_year: 2569,
          url: `/public/rice/${slug}`,
        };
      },
      (file) =>
        /^rice-research-\d{2}\.md$/.test(file) ||
        file === 'rice-molecular-research.md' ||
        file === 'rice-research-overview.md'
    );
    const pests = loadRicePestChunks();
    riceChunksCache = pests.length
      ? [...research, ...pests]
      : [
          ...research,
          ...readMarkdownChunks(
            directory,
            (file, content) => {
              const slug = file.replace(/\.md$/, '');
              return {
                document_slug: slug,
                title: markdownTitle(content, slug),
                category: 'ศัตรูข้าวและการป้องกันกำจัด',
                collection: 'pests-control',
                source_year: 2562,
                url: `/public/rice/${slug}`,
              };
            },
            (file) =>
              !file.startsWith('rice-research-') &&
              file !== 'rice-molecular-research.md'
          ),
        ];
  } catch (error) {
    console.error('Error loading rice knowledge:', error);
    riceChunksCache = [];
  }
  return riceChunksCache;
}

export function searchRiceChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  return searchChunks(
    loadRiceChunks(),
    queryText,
    limit,
    preferredDocumentSlug
  );
}

export function loadMachineryChunks() {
  if (machineryChunksCache) return machineryChunksCache;
  const directory = path.join(process.cwd(), 'public/data/machinery/articles');
  machineryChunksCache = readMarkdownChunks(directory, (file, content) => {
    const stem = file.replace(/\.md$/, '');
    const slug =
      stem === 'machinery-readme'
        ? stem
        : stem.replace(/-readme$/, '-overview');
    const topic = stem.match(/^machinery-(\d{2})/)?.[1] || 'overview';
    const collection = topic === 'overview' ? 'overview' : 'topics';
    return {
      document_slug: slug,
      title: markdownTitle(content, slug),
      category: collection === 'overview' ? 'เริ่มต้น' : 'เครื่องจักรรายด้าน',
      collection,
      topic,
      source_year: 2569,
      url: `/public/machinery/${slug}`,
    };
  });
  return machineryChunksCache;
}

export function searchMachineryChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  return searchChunks(
    loadMachineryChunks(),
    queryText,
    limit,
    preferredDocumentSlug
  );
}

export function loadStouResearchChunks() {
  if (stouResearchChunksCache) return stouResearchChunksCache;
  try {
    const root = path.join(process.cwd(), 'public/data/stou-research');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(root, 'catalog.json'), 'utf8')
    );
    const articlesByFile = new Map(
      catalog.articles.map((article) => [article.article_file, article])
    );
    stouResearchChunksCache = readMarkdownChunks(
      path.join(root, 'articles'),
      (file) => {
        const article = articlesByFile.get(file);
        if (!article) return { document_slug: file.replace(/\.md$/, '') };
        return {
          document_slug: article.slug,
          title: article.title,
          author: article.author,
          category: article.category,
          collection: 'stou-research',
          handle_id: article.handle_id,
          source_year: article.source_year,
          source_type: article.source_type,
          source_url: article.source_url,
          pdf_url: article.pdf_url,
          url: `/public/stou-research/${article.slug}`,
        };
      }
    );
  } catch (error) {
    console.error('Error loading STOU research knowledge:', error);
    stouResearchChunksCache = [];
  }
  return stouResearchChunksCache;
}

export function searchStouResearchChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  return searchChunks(
    loadStouResearchChunks(),
    queryText,
    limit,
    preferredDocumentSlug
  );
}

export function loadFrontierAgriResearchChunks() {
  if (frontierAgriResearchChunksCache) return frontierAgriResearchChunksCache;
  try {
    const root = path.join(process.cwd(), 'public/data/frontier-agri-research');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(root, 'catalog.json'), 'utf8')
    );
    const articlesByFile = new Map(
      catalog.articles.map((article) => [article.article_file, article])
    );
    const articlesByTopic = new Map(
      catalog.articles.map((article) => [article.topic_id, article])
    );
    frontierAgriResearchChunksCache = readMarkdownChunks(
      path.join(root, 'articles'),
      (file, content) => {
        const article = articlesByFile.get(file);
        if (!article) return { document_slug: file.replace(/\.md$/, '') };
        const relatedDocumentSlugs = [
          ...new Set(
            [...String(content || '').matchAll(/(?<!\d)(\d{2}-\d{3})(?!\d)/g)]
              .map((match) => articlesByTopic.get(match[1])?.slug)
              .filter(Boolean)
          ),
        ];
        return {
          document_slug: article.slug,
          related_document_slugs: relatedDocumentSlugs,
          title: article.title,
          author: article.author,
          category: article.category,
          collection: 'frontier-agri-research',
          topic: article.topic_id,
          source_year: article.source_year,
          updated_at: article.updated_at,
          reference_count: article.reference_count,
          source_urls: article.source_urls,
          url: `/public/frontier-agri-research/${article.slug}`,
        };
      }
    );
  } catch (error) {
    console.error(
      'Error loading frontier agricultural research knowledge:',
      error
    );
    frontierAgriResearchChunksCache = [];
  }
  return frontierAgriResearchChunksCache;
}

export function searchFrontierAgriChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  const chunks = loadFrontierAgriResearchChunks();
  if (preferredDocumentSlug) {
    const preferredChunk = chunks.find(
      (chunk) => chunk.document_slug === preferredDocumentSlug
    );
    if (preferredChunk) {
      const scopedSlugs = new Set([
        preferredDocumentSlug,
        ...(preferredChunk.related_document_slugs || []),
      ]);
      return searchChunks(
        chunks.filter((chunk) => scopedSlugs.has(chunk.document_slug)),
        queryText,
        limit,
        preferredDocumentSlug
      );
    }
  }
  return searchChunks(chunks, queryText, limit, preferredDocumentSlug);
}

export function loadNptResearchChunks() {
  if (nptResearchChunksCache) return nptResearchChunksCache;
  try {
    const root = path.join(process.cwd(), 'public/data/npt-research');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(root, 'catalog.json'), 'utf8')
    );
    const articlesByFile = new Map(
      catalog.articles.map((article) => [article.article_file, article])
    );
    const articlesByTopic = new Map(
      catalog.articles.map((article) => [article.topic_id, article])
    );
    nptResearchChunksCache = readMarkdownChunks(
      path.join(root, 'articles'),
      (file, content) => {
        const article = articlesByFile.get(file);
        if (!article) return { document_slug: file.replace(/\.md$/, '') };
        const relatedDocumentSlugs = [
          ...new Set(
            [...String(content || '').matchAll(/(?<!\d)(\d{2}-\d{3})(?!\d)/g)]
              .map((match) => articlesByTopic.get(match[1])?.slug)
              .filter(Boolean)
          ),
        ];
        return {
          document_slug: article.slug,
          related_document_slugs: relatedDocumentSlugs,
          title: article.title,
          author: article.author,
          category: article.category,
          collection: 'npt-research',
          topic: article.topic_id,
          source_year: article.source_year,
          updated_at: article.updated_at,
          review_at: article.review_at,
          reference_count: article.reference_count,
          source_urls: article.source_urls,
          url: `/public/npt-research/${article.slug}`,
        };
      }
    );
  } catch (error) {
    console.error('Error loading Nakhon Pathom research knowledge:', error);
    nptResearchChunksCache = [];
  }
  return nptResearchChunksCache;
}

export function searchNptResearchChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  const chunks = loadNptResearchChunks();
  if (preferredDocumentSlug) {
    const preferredChunk = chunks.find(
      (chunk) => chunk.document_slug === preferredDocumentSlug
    );
    if (preferredChunk) {
      const scopedSlugs = new Set([
        preferredDocumentSlug,
        ...(preferredChunk.related_document_slugs || []),
      ]);
      return searchChunks(
        chunks.filter((chunk) => scopedSlugs.has(chunk.document_slug)),
        queryText,
        limit,
        preferredDocumentSlug
      );
    }
  }
  return searchChunks(chunks, queryText, limit, preferredDocumentSlug);
}

export function loadPlantCultivationChunks() {
  if (plantCultivationChunksCache) return plantCultivationChunksCache;
  try {
    const root = path.join(process.cwd(), 'public/data/plant-cultivation');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(root, 'catalog.json'), 'utf8')
    );
    const articlesByFile = new Map(
      catalog.articles.map((article) => [article.article_file, article])
    );
    const articlesByTopic = new Map(
      catalog.articles.map((article) => [article.topic_id, article])
    );
    plantCultivationChunksCache = readMarkdownChunks(
      path.join(root, 'articles'),
      (file, content) => {
        const article = articlesByFile.get(file);
        if (!article) return { document_slug: file.replace(/\.md$/, '') };
        const relatedDocumentSlugs = [
          ...new Set(
            [...String(content || '').matchAll(/(?<!\d)(\d{2}-\d{3})(?!\d)/g)]
              .map((match) => articlesByTopic.get(match[1])?.slug)
              .filter(Boolean)
          ),
        ];
        return {
          document_slug: article.slug,
          related_document_slugs: relatedDocumentSlugs,
          title: article.title,
          author: article.author,
          category: article.category,
          collection: 'plant-cultivation',
          topic: article.topic_id,
          plant: article.category,
          source_year: article.source_year,
          updated_at: article.updated_at,
          review_at: article.review_at,
          reference_count: article.reference_count,
          source_urls: article.source_urls,
          url: `/public/plant-cultivation/${article.slug}`,
        };
      }
    );
  } catch (error) {
    console.error('Error loading plant cultivation knowledge:', error);
    plantCultivationChunksCache = [];
  }
  return plantCultivationChunksCache;
}

export function searchPlantCultivationChunks(
  queryText,
  limit = 10,
  preferredDocumentSlug = ''
) {
  const chunks = loadPlantCultivationChunks();
  if (preferredDocumentSlug) {
    const preferredChunk = chunks.find(
      (chunk) => chunk.document_slug === preferredDocumentSlug
    );
    if (preferredChunk) {
      const scopedSlugs = new Set([
        preferredDocumentSlug,
        ...(preferredChunk.related_document_slugs || []),
      ]);
      return searchChunks(
        chunks.filter((chunk) => scopedSlugs.has(chunk.document_slug)),
        queryText,
        limit,
        preferredDocumentSlug
      );
    }
  }
  return searchChunks(chunks, queryText, limit, preferredDocumentSlug);
}

export function searchKnowledgeHubChunks(queryText, limit = 12) {
  const sources = [
    {
      collection: 'pesticides',
      label: 'สารป้องกันกำจัดศัตรูพืช',
      search: searchPesticideChunks,
      url: (chunk) => `/public/pesticides/${chunk.document_slug}`,
    },
    {
      collection: 'fertilizers',
      label: 'ปุ๋ยและธาตุอาหาร',
      search: searchFertilizerChunks,
      url: (chunk) => chunk.url,
    },
    {
      collection: 'orchids',
      label: 'กล้วยไม้',
      search: searchOrchidChunks,
      url: (chunk) =>
        chunk.collection === 'research'
          ? `/public/orchids/research/${chunk.document_slug}`
          : `/public/orchids/${chunk.document_slug}`,
    },
    {
      collection: 'farmer69',
      label: 'ทะเบียนเกษตรกร 2569',
      search: searchFarmer69Chunks,
      url: (chunk) =>
        chunk.url || `/public/farmer-manual/${chunk.document_slug}`,
    },
    {
      collection: 'rice',
      label: 'ข้าว',
      search: searchRiceChunks,
      url: (chunk) => chunk.url,
    },
    {
      collection: 'machinery',
      label: 'เครื่องจักรการเกษตร',
      search: searchMachineryChunks,
      url: (chunk) => chunk.url,
    },
    {
      collection: 'stou-research',
      label: 'งานวิจัย มสธ.',
      search: searchStouResearchChunks,
      url: (chunk) => chunk.url,
    },
    {
      collection: 'frontier-agri-research',
      label: 'บทความเกษตรทั่วโลก',
      search: searchFrontierAgriChunks,
      url: (chunk) => chunk.url,
    },
    {
      collection: 'npt-research',
      label: 'งานวิจัยพืชนครปฐม',
      search: searchNptResearchChunks,
      url: (chunk) => chunk.url,
    },
    {
      collection: 'plant-cultivation',
      label: 'หลักการเพาะปลูกพืชที่สำคัญ',
      search: searchPlantCultivationChunks,
      url: (chunk) => chunk.url,
    },
  ];

  const candidateLimit = Math.max(Math.ceil(limit / 3), 4);
  const candidates = sources.flatMap((source) =>
    source.search(queryText, candidateLimit).map((chunk) => ({
      ...chunk,
      hubCollection: source.collection,
      hubCollectionLabel: source.label,
      url: source.url(chunk),
    }))
  );

  return selectRankedChunks(rankChunks(candidates, queryText), limit, 2);
}
