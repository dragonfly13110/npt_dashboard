import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const NORMALIZED_SOURCE_ROOT = path.join(
  REPO_ROOT,
  'stou_research_knowledge_md'
);
const NORMALIZED_ARTICLES_ROOT = path.join(NORMALIZED_SOURCE_ROOT, 'articles');
const NORMALIZED_METADATA_ROOT = path.join(NORMALIZED_SOURCE_ROOT, 'metadata');
const PUBLIC_ROOT = path.join(REPO_ROOT, 'public', 'data', 'stou-research');
const PUBLIC_ARTICLES_ROOT = path.join(PUBLIC_ROOT, 'articles');

function longPath(filePath) {
  const absolutePath = path.resolve(filePath);
  if (process.platform !== 'win32' || absolutePath.startsWith('\\\\?\\')) {
    return absolutePath;
  }
  return `\\\\?\\${absolutePath}`;
}

function readText(filePath) {
  return fs.readFileSync(longPath(filePath), 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readDirectory(directory) {
  return fs.readdirSync(longPath(directory), { withFileTypes: true });
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writeText(filePath, text) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, text, 'utf8');
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMarkdown(value) {
  const text = String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
  return text ? `${text}\n` : '';
}

function categoryFor(article) {
  const title = String(article.title || '').toLowerCase();
  if (
    /เกษตร|เกษตรกร|การส่งเสริม|การผลิต|ปลูก|ข้าว|พืช|ปุ๋ย|ดิน|ศัตรูพืช|สวน|ฟาร์ม|ประมง|ปศุสัตว์|ยางพารา|อ้อย|มันสำปะหลัง|ปาล์ม|ทุเรียน|มะม่วง|มังคุด|ผัก|กาแฟ|หม่อน|ไหม|พริก|ข้าวโพด|agricultur|farmer|crop|rice|durian|cassava|rubber|palm|vegetable|farm|extension|fertilizer|soil|pest|livestock|fishery|coffee|sugarcane/.test(
      title
    )
  ) {
    return 'การส่งเสริมและการผลิต';
  }
  if (
    /สหกรณ์|หนี้|ตลาด|การเงิน|รายได้|ราคา|ธุรกิจ|ส่งออก|เศรษฐ|cooperat|debt|market|finance|revenue|price|business|export|fiscal/.test(
      title
    )
  ) {
    return 'เศรษฐกิจและการจัดการ';
  }
  if (
    /โรงเรียน|การศึกษา|นักเรียน|การสอน|ครู|พยาบาล|ผู้บริหารสถานศึกษา|education|school|student|teacher|nurs/.test(
      title
    )
  ) {
    return 'การศึกษาและการพัฒนาคน';
  }
  if (
    /สุขภาพ|โรค|ผู้สูงอายุ|ความดัน|พยาบาล|สาธารณสุข|ภาพยนตร์|สังคม|health|disease|elderly|nurs|public health|film|social/.test(
      title
    )
  ) {
    return 'สุขภาพและสังคม';
  }
  return 'บริหารและนโยบาย';
}

function sourceYear(metadata, yearDirectoryName) {
  const fromDirectory = Number.parseInt(yearDirectoryName, 10);
  if (Number.isFinite(fromDirectory) && fromDirectory > 0) {
    return fromDirectory;
  }
  const fromMetadata = Number.parseInt(String(metadata.issue_date || ''), 10);
  if (Number.isFinite(fromMetadata) && fromMetadata > 0) return fromMetadata;
  return null;
}

function buildEntry(metadata, markdown, yearDirectoryName) {
  const handleId = cleanText(metadata.handle_id);
  if (!handleId) throw new Error('STOU metadata is missing handle_id');

  const title = cleanText(metadata.title) || `งานวิจัย STOU ${handleId}`;
  const entry = {
    slug: `stou-${handleId}`,
    title,
    author: cleanText(metadata.author),
    source_year: sourceYear(metadata, yearDirectoryName),
    category: categoryFor({
      title,
      abstract: cleanText(metadata.abstract),
    }),
    abstract: cleanText(metadata.abstract),
    handle_id: handleId,
    source_url: cleanText(metadata.url),
    pdf_url: cleanText(metadata.pdf_url),
    pdf_filename: cleanText(metadata.pdf_filename),
    download_status: cleanText(metadata.download_status),
    source_type: 'บทสรุปงานวิจัยจาก STOU Research Library',
    article_file: `stou-${handleId}.md`,
  };

  return { ...entry, markdown: normalizeMarkdown(markdown) };
}

function importRawSource(rawSourceRoot) {
  const rawRoot = path.resolve(rawSourceRoot);
  const years = readDirectory(rawRoot)
    .filter((entry) => entry.isDirectory() && /^\d{4}\s*\(/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const entries = [];
  const seenHandles = new Set();

  for (const yearDirectory of years) {
    const yearRoot = path.join(rawRoot, yearDirectory.name);
    const articleDirectories = readDirectory(yearRoot)
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const articleDirectory of articleDirectories) {
      const articleRoot = path.join(yearRoot, articleDirectory.name);
      const metadataPath = path.join(articleRoot, 'metadata.json');
      if (!fs.existsSync(longPath(metadataPath))) continue;

      const markdownFile = readDirectory(articleRoot).find(
        (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md')
      );
      if (!markdownFile) continue;

      const entry = buildEntry(
        readJson(metadataPath),
        readText(path.join(articleRoot, markdownFile.name)),
        yearDirectory.name
      );
      if (seenHandles.has(entry.handle_id)) {
        throw new Error(`Duplicate STOU handle_id: ${entry.handle_id}`);
      }
      seenHandles.add(entry.handle_id);
      entries.push(entry);
    }
  }

  if (entries.length === 0) {
    throw new Error(`No STOU summaries found under ${rawRoot}`);
  }

  ensureDirectory(NORMALIZED_ARTICLES_ROOT);
  ensureDirectory(NORMALIZED_METADATA_ROOT);
  for (const entry of entries) {
    writeText(
      path.join(NORMALIZED_ARTICLES_ROOT, entry.article_file),
      entry.markdown
    );
    const { markdown: _markdown, ...metadata } = entry;
    writeText(
      path.join(NORMALIZED_METADATA_ROOT, `${entry.slug}.json`),
      `${JSON.stringify(metadata, null, 2)}\n`
    );
  }

  writeText(
    path.join(NORMALIZED_SOURCE_ROOT, 'manifest.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        source: 'STOU Research Library',
        imported_articles: entries.length,
        years: countBy(entries, (entry) => entry.source_year),
      },
      null,
      2
    )}\n`
  );
  return entries;
}

function readNormalizedSource() {
  const metadataFiles = readDirectory(NORMALIZED_METADATA_ROOT)
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const entries = metadataFiles.map((metadataFile) => {
    const metadata = readJson(
      path.join(NORMALIZED_METADATA_ROOT, metadataFile.name)
    );
    const articlePath = path.join(
      NORMALIZED_ARTICLES_ROOT,
      metadata.article_file
    );
    return { ...metadata, markdown: normalizeMarkdown(readText(articlePath)) };
  });
  if (entries.length === 0) {
    throw new Error(
      `No normalized STOU metadata found under ${NORMALIZED_METADATA_ROOT}`
    );
  }
  return entries;
}

function countBy(entries, selector) {
  return Object.fromEntries(
    [
      ...entries.reduce((counts, entry) => {
        const key = String(selector(entry) || 'ไม่ระบุ');
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map()),
    ].sort(([a], [b]) => a.localeCompare(b))
  );
}

function buildPublicData(entries) {
  ensureDirectory(PUBLIC_ARTICLES_ROOT);
  for (const entry of entries) {
    writeText(
      path.join(PUBLIC_ARTICLES_ROOT, entry.article_file),
      entry.markdown
    );
  }

  const catalogEntries = entries
    .map(({ markdown: _markdown, ...entry }) => entry)
    .sort((a, b) =>
      `${a.source_year}-${a.title}`.localeCompare(`${b.source_year}-${b.title}`)
    );
  const catalog = {
    schema_version: 1,
    collection: 'stou-research',
    title: 'คลังงานวิจัยมหาวิทยาลัยสุโขทัยธรรมาธิราช',
    source: {
      name: 'STOU Research Library',
      url: 'https://ir.stou.ac.th/',
      note: 'นำเสนอจากบทสรุปภาษาไทยที่จัดทำไว้ พร้อมลิงก์กลับเอกสารต้นฉบับ',
    },
    stats: {
      total: catalogEntries.length,
      years: countBy(catalogEntries, (entry) => entry.source_year),
      categories: countBy(catalogEntries, (entry) => entry.category),
    },
    articles: catalogEntries,
  };
  writeText(
    path.join(PUBLIC_ROOT, 'catalog.json'),
    `${JSON.stringify(catalog, null, 2)}\n`
  );
  return catalog;
}

const args = process.argv.slice(2);
const shouldImport = args.includes('--import');
const sourceIndex = args.indexOf('--source');
const rawSourceRoot =
  sourceIndex >= 0
    ? args[sourceIndex + 1]
    : process.env.STOU_RAW_SOURCE ||
      'D:\\code\\Knowledge\\STOU_Research_Library';

const entries = shouldImport
  ? importRawSource(rawSourceRoot)
  : readNormalizedSource();
const catalog = buildPublicData(entries);
console.log(
  `STOU research build complete: ${catalog.stats.total} articles, ` +
    `${Object.keys(catalog.stats.years).length} years`
);
