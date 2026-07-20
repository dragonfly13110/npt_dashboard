import fs from 'node:fs';
import path from 'node:path';

let pesticideCatalogCache = null;

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
        if (name && name.length >= 2 && q.includes(name.toLowerCase())) {
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
