import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const NORMALIZED_SOURCE_ROOT = path.join(
  REPO_ROOT,
  'frontier_agri_research_knowledge_md'
);
const NORMALIZED_ARTICLES_ROOT = path.join(NORMALIZED_SOURCE_ROOT, 'articles');
const NORMALIZED_METADATA_ROOT = path.join(NORMALIZED_SOURCE_ROOT, 'metadata');
const PUBLIC_ROOT = path.join(
  REPO_ROOT,
  'public',
  'data',
  'frontier-agri-research'
);
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

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(longPath(filePath), text, 'utf8');
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMarkdown(value) {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .trim();
  return text ? `${text}\n` : '';
}

function extractYear(value) {
  const year = String(value || '').match(/(20\d{2})/);
  return year ? Number(year[1]) : null;
}

function extractUrls(text) {
  return [
    ...new Set(
      (String(text).match(/https?:\/\/[^\s)\]}>]+/g) || []).map((url) =>
        url.replace(/[.,;:]+$/g, '')
      )
    ),
  ];
}

function extractReferences(markdown) {
  const lines = String(markdown).split('\n');
  const referenceHeading =
    /^(?:#{1,6})\s*[^\n]*(?:\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07|references|\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07|\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25|\u0e17\u0e35\u0e48\u0e21\u0e32)[^\n]*$/i;
  const headingIndex = lines.findLastIndex((line) =>
    referenceHeading.test(line)
  );
  const fallbackHeadingIndex = lines.findLastIndex((line) =>
    /^#{1,6}\s*12\./i.test(line)
  );
  const resolvedHeadingIndex =
    headingIndex >= 0 ? headingIndex : fallbackHeadingIndex;
  if (resolvedHeadingIndex < 0) return [];

  const references = [];
  let current = null;
  for (const rawLine of lines.slice(resolvedHeadingIndex + 1)) {
    const line = rawLine.trim();
    if (/^#{1,6}\s/.test(line) || /^-{3,}\s*$/.test(line)) break;
    const numbered = line.match(
      /^(?:[-*]\s*)?(?:`?\[(\d+)\]`?|(\d+)[.)])\s+(.+)$/
    );
    if (numbered) {
      current = {
        index: Number(numbered[1] || numbered[2]),
        text: numbered[3],
      };
      references.push(current);
    } else if (current && line) {
      current.text += ` ${line}`;
    }
  }

  return references.map((reference) => {
    const url = extractUrls(reference.text)[0] || null;
    const label = cleanText(
      reference.text
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/[^\s)\]}>]+/g, '')
    );
    return {
      id: String(reference.index),
      index: reference.index,
      label,
      url,
    };
  });
}

function extractSummary(markdown) {
  const section = String(markdown).match(
    /^##\s*1\.[^\n]*\n([\s\S]*?)(?=^##\s|$)/im
  );
  return cleanText(section?.[1] || '').slice(0, 700);
}

function extractMetadata(markdown, categoryFolder, sourceFile, fallbackIndex) {
  const titleLine = String(markdown).match(/^#\s+(.+)$/m)?.[1] || sourceFile;
  const title = cleanText(
    titleLine.replace(/^\d+(?:-\d+)?\s*\|\s*[^:]+:\s*/i, '')
  );
  const header = String(markdown).split('\n').slice(0, 20).join('\n');
  const topicId = header.match(/\b\d{2}-\d{3}\b/)?.[0] || null;
  const dates = [...header.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g)].map(
    ([date]) => date
  );
  const createdAt = dates[0] || null;
  const updatedAt = dates[1] || createdAt;
  const reviewAt = dates[2] || null;
  const domainCode = categoryFolder.match(/^(\d{2})-/)?.[1] || '00';
  const category = categoryFolder.replace(/^\d{2}-/, '').trim();
  const fallbackId = `${domainCode}-${String(fallbackIndex).padStart(3, '0')}`;
  const resolvedTopicId = topicId || fallbackId;
  const slug = `agri-${resolvedTopicId.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`;
  const references = extractReferences(markdown);
  const sourceUrls = [
    ...new Set(references.map((reference) => reference.url).filter(Boolean)),
  ];

  return {
    slug,
    title,
    author: 'Agricultural Research Knowledge Library',
    source_year: extractYear(updatedAt),
    updated_at: updatedAt,
    created_at: createdAt,
    review_at: reviewAt,
    category,
    domain_code: domainCode,
    topic_id: resolvedTopicId,
    handle_id: resolvedTopicId,
    abstract: extractSummary(markdown),
    source_type: 'Frontier agricultural research article',
    source_url: sourceUrls[0] || null,
    pdf_url: sourceUrls.find((url) => /\.pdf(?:$|[?#])/i.test(url)) || null,
    source_urls: sourceUrls,
    references,
    reference_count: references.length,
    article_file: `${slug}.md`,
    source_file: sourceFile,
  };
}

function walkArticles(root, relativePath = '') {
  const directory = path.join(root, relativePath);
  return fs
    .readdirSync(longPath(directory), { withFileTypes: true })
    .flatMap((entry) => {
      const nextPath = path.join(relativePath, entry.name);
      if (entry.isDirectory()) return walkArticles(root, nextPath);
      if (
        !entry.isFile() ||
        !entry.name.toLowerCase().endsWith('.md') ||
        entry.name.toLowerCase() === 'readme.md'
      ) {
        return [];
      }
      return [{ filePath: path.join(root, nextPath), relativePath: nextPath }];
    });
}

function countBy(entries, selector) {
  return Object.fromEntries(
    [
      ...entries.reduce((counts, entry) => {
        const key = String(selector(entry) ?? 'unknown');
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map()),
    ].sort(([a], [b]) => a.localeCompare(b))
  );
}

function importRawSource(rawSourceRoot) {
  const rawRoot = path.resolve(rawSourceRoot);
  const files = walkArticles(rawRoot)
    .filter(({ relativePath }) => {
      const parts = relativePath.split(/[\\/]/);
      return parts.length > 1 && /^\d{2}-/.test(parts[0]);
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const seenSlugs = new Map();

  fs.rmSync(longPath(NORMALIZED_ARTICLES_ROOT), {
    recursive: true,
    force: true,
  });
  fs.rmSync(longPath(NORMALIZED_METADATA_ROOT), {
    recursive: true,
    force: true,
  });

  const entries = files.map(({ filePath, relativePath }, index) => {
    const markdown = normalizeMarkdown(readText(filePath));
    const categoryFolder = relativePath.split(/[\\/]/)[0];
    const entry = extractMetadata(
      markdown,
      categoryFolder,
      relativePath,
      index + 1
    );
    if (seenSlugs.has(entry.slug)) {
      throw new Error(
        `Duplicate agricultural research slug: ${entry.slug} (${seenSlugs.get(
          entry.slug
        )} and ${entry.source_file})`
      );
    }
    seenSlugs.set(entry.slug, entry.source_file);
    writeText(
      path.join(NORMALIZED_ARTICLES_ROOT, entry.article_file),
      markdown
    );
    writeText(
      path.join(NORMALIZED_METADATA_ROOT, `${entry.slug}.json`),
      `${JSON.stringify(entry, null, 2)}\n`
    );
    return { ...entry, markdown };
  });

  if (!entries.length) {
    throw new Error(`No agricultural research articles found under ${rawRoot}`);
  }

  writeText(
    path.join(NORMALIZED_SOURCE_ROOT, 'manifest.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        source: 'Agricultural Research Knowledge Library',
        source_label: 'Frontier agricultural research from around the world',
        imported_articles: entries.length,
        categories: countBy(entries, (entry) => entry.category),
        imported_at: new Date().toISOString().slice(0, 10),
      },
      null,
      2
    )}\n`
  );
  return entries;
}

function readNormalizedSource() {
  const entries = fs
    .readdirSync(longPath(NORMALIZED_METADATA_ROOT), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((metadataFile) => {
      const metadata = JSON.parse(
        readText(path.join(NORMALIZED_METADATA_ROOT, metadataFile.name))
      );
      return {
        ...metadata,
        markdown: normalizeMarkdown(
          readText(path.join(NORMALIZED_ARTICLES_ROOT, metadata.article_file))
        ),
      };
    });
  if (!entries.length) {
    throw new Error('No normalized agricultural research metadata found');
  }
  return entries;
}

function buildPublicData(entries) {
  fs.rmSync(longPath(PUBLIC_ARTICLES_ROOT), { recursive: true, force: true });
  fs.mkdirSync(longPath(PUBLIC_ARTICLES_ROOT), { recursive: true });
  for (const entry of entries) {
    writeText(
      path.join(PUBLIC_ARTICLES_ROOT, entry.article_file),
      entry.markdown
    );
  }

  const catalogEntries = entries
    .map(({ markdown: _markdown, ...entry }) => entry)
    .sort((a, b) => a.title.localeCompare(b.title));
  const catalog = {
    schema_version: 1,
    collection: 'frontier-agri-research',
    title: 'Global agricultural research articles',
    source: {
      name: 'Agricultural Research Knowledge Library',
      url: null,
      note: 'Imported from Thai Markdown research articles with source links preserved when present.',
    },
    stats: {
      total: catalogEntries.length,
      years: countBy(catalogEntries, (entry) => entry.source_year),
      categories: countBy(catalogEntries, (entry) => entry.category),
      references: catalogEntries.reduce(
        (total, entry) => total + Number(entry.reference_count || 0),
        0
      ),
      linked_articles: catalogEntries.filter(
        (entry) => entry.source_urls?.length
      ).length,
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
    : process.env.FRONTIER_AGRI_SOURCE ||
      'D:\\' +
        '\u0e04\u0e25\u0e31\u0e07\u0e04\u0e27\u0e32\u0e21\u0e23\u0e39\u0e49\\' +
        '\u0e07\u0e32\u0e19\u0e27\u0e34\u0e08\u0e31\u0e22\u0e14\u0e49\u0e32\u0e19\u0e01\u0e32\u0e23\u0e40\u0e01\u0e29\u0e15\u0e23';

const entries = shouldImport
  ? importRawSource(rawSourceRoot)
  : readNormalizedSource();
const catalog = buildPublicData(entries);
console.log(
  `Frontier agricultural research build complete: ${catalog.stats.total} articles, ` +
    `${Object.keys(catalog.stats.categories).length} categories, ` +
    `${catalog.stats.linked_articles} articles with linked references`
);
