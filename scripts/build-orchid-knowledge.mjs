import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');
const inputDir = path.join(rootDir, 'orchid_knowledge_md');
const researchInputDir = path.join(rootDir, 'orchid_research_md');
const outputDir = path.join(rootDir, 'public/data/orchids');
const articlesOutputDir = path.join(outputDir, 'articles');
const researchOutputDir = path.join(outputDir, 'research');
const researchArticlesOutputDir = path.join(researchOutputDir, 'articles');
const CHUNK_SIZE = 1800;

function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { metadata: {}, content: fileContent.trim() };

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex < 1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    metadata[key] = value;
  }
  return { metadata, content: match[2].trim() };
}

function readSourceFiles() {
  if (!existsSync(inputDir))
    throw new Error(`Input directory not found: ${inputDir}`);

  return readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
    .flatMap((directory) =>
      readdirSync(path.join(inputDir, directory.name), { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .sort((a, b) => a.name.localeCompare(b.name, 'th'))
        .map((entry) => ({ directory: directory.name, file: entry.name }))
    );
}

function readResearchFiles() {
  if (!existsSync(researchInputDir)) {
    throw new Error(`Research input directory not found: ${researchInputDir}`);
  }

  return readdirSync(researchInputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
    .map((entry) => ({ file: entry.name, key: entry.name.toLowerCase() }));
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toCatalogEntry(metadata, directory, file) {
  return {
    slug: metadata.slug,
    title: metadata.title,
    category: metadata.category || directory.replace(/^\d+_/, ''),
    subcategory: metadata.subcategory || '',
    status: metadata.status || '',
    source_year: toNumber(metadata.source_year),
    source_pages: metadata.source_pages || '',
    source_pdf_pages: metadata.source_pdf_pages || '',
    last_reviewed: metadata.last_reviewed || '',
    dirName: directory,
    fileName: file,
  };
}

function toResearchEntry(file, content) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || file;
  const number = file.match(/^(\d{2})-/)?.[1] || '99';
  return {
    slug: `research-${number}`,
    title,
    category: 'งานวิจัยและนวัตกรรมกล้วยไม้',
    subcategory: 'งานวิจัยกล้วยไม้',
    status: 'สรุปงานวิจัย ค.ศ. 2020–กลางปี 2026',
    source_year: 2569,
    source_pages: '',
    source_pdf_pages: '',
    last_reviewed: '2569-08-01',
    dirName: 'research',
    fileName: file,
  };
}

function rewriteLinks(content, directory, slugMap) {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, target) => {
    if (/^(https?:|\/\/|mailto:)/.test(target)) return match;
    const [urlPath, hash] = target.split('#');
    const resolvedPath = path
      .normalize(path.join(directory, urlPath))
      .replace(/\\/g, '/');
    const slug = slugMap.get(resolvedPath);
    if (!slug) return match;
    return `[${label}](/public/orchids/${slug}${hash ? `#${hash}` : ''})`;
  });
}

function rewriteResearchLinks(content, slugMap) {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, target) => {
    if (/^(https?:|\/\/|mailto:)/.test(target)) return match;
    const [urlPath, hash] = target.split('#');
    const fileName = urlPath.split(/[\\/]/).pop()?.toLowerCase();
    const slug = slugMap.get(fileName);
    if (!slug) return match;
    return `[${label}](/public/orchids/research/${slug}${hash ? `#${hash}` : ''})`;
  });
}

function makeChunks(content, entry, collection) {
  const sections = content
    .split(/(?=^#{2,4}\s+)/m)
    .map((section) => section.trim())
    .filter(Boolean);
  const chunks = [];

  for (const section of sections) {
    const heading = section.match(/^#{2,4}\s+(.+)/)?.[1]?.trim() || entry.title;
    for (let offset = 0; offset < section.length; offset += CHUNK_SIZE) {
      const text = section.slice(offset, offset + CHUNK_SIZE).trim();
      if (!text) continue;
      chunks.push({
        collection,
        document_slug: entry.slug,
        title: entry.title,
        section_heading: heading,
        category: entry.category,
        subcategory: entry.subcategory,
        status: entry.status,
        source_year: entry.source_year,
        source_pages: entry.source_pages,
        source_pdf_pages: entry.source_pdf_pages,
        last_reviewed: entry.last_reviewed,
        text,
      });
    }
  }
  return chunks;
}

function buildOrchidKnowledge() {
  // ponytail: generated files are disposable; rebuild the small static index on every deploy.
  if (existsSync(outputDir))
    rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(articlesOutputDir, { recursive: true });

  const productionFiles = readSourceFiles().map((sourceFile) => {
    const raw = readFileSync(
      path.join(inputDir, sourceFile.directory, sourceFile.file),
      'utf8'
    );
    const parsed = parseFrontmatter(raw);
    if (!parsed.metadata.slug || !parsed.metadata.title) {
      throw new Error(
        `Missing slug/title: ${sourceFile.directory}/${sourceFile.file}`
      );
    }
    return {
      ...sourceFile,
      key: `${sourceFile.directory}/${sourceFile.file}`,
      entry: toCatalogEntry(
        parsed.metadata,
        sourceFile.directory,
        sourceFile.file
      ),
      content: parsed.content,
    };
  });
  const productionSlugMap = new Map(
    productionFiles.map((file) => [file.key, file.entry.slug])
  );
  const productionCatalog = [];
  const productionChunks = [];
  for (const file of productionFiles) {
    const content = rewriteLinks(
      file.content,
      file.directory,
      productionSlugMap
    );
    productionCatalog.push(file.entry);
    productionChunks.push(...makeChunks(content, file.entry, 'production'));
    writeFileSync(
      path.join(articlesOutputDir, `${file.entry.slug}.json`),
      `${JSON.stringify({ ...file.entry, content }, null, 2)}\n`,
      'utf8'
    );
  }

  mkdirSync(researchArticlesOutputDir, { recursive: true });
  const researchFiles = readResearchFiles().map((sourceFile) => {
    const content = readFileSync(
      path.join(researchInputDir, sourceFile.file),
      'utf8'
    ).trim();
    return {
      ...sourceFile,
      entry: toResearchEntry(sourceFile.file, content),
      content,
    };
  });
  const researchSlugMap = new Map(
    researchFiles.map((file) => [file.key, file.entry.slug])
  );
  const researchCatalog = [];
  const researchChunks = [];
  for (const file of researchFiles) {
    const content = rewriteResearchLinks(file.content, researchSlugMap);
    researchCatalog.push(file.entry);
    researchChunks.push(...makeChunks(content, file.entry, 'research'));
    writeFileSync(
      path.join(researchArticlesOutputDir, `${file.entry.slug}.json`),
      `${JSON.stringify({ ...file.entry, content }, null, 2)}\n`,
      'utf8'
    );
  }

  writeFileSync(
    path.join(outputDir, 'catalog.json'),
    `${JSON.stringify(productionCatalog, null, 2)}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(outputDir, 'rag-chunks.json'),
    `${JSON.stringify(productionChunks)}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(researchOutputDir, 'catalog.json'),
    `${JSON.stringify(researchCatalog, null, 2)}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(researchOutputDir, 'rag-chunks.json'),
    `${JSON.stringify(researchChunks)}\n`,
    'utf8'
  );
  console.log(
    `Orchid knowledge build completed: ${productionCatalog.length} production articles, ${researchCatalog.length} research articles, ${productionChunks.length + researchChunks.length} chunks.`
  );
}

buildOrchidKnowledge();
