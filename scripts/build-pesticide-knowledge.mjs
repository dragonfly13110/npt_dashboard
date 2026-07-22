import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(SCRIPT_PATH), '..');

const inputDir = path.join(rootDir, 'pesticide_knowledge_md');
const outputDir = path.join(rootDir, 'public/data/pesticides');
const articlesOutputDir = path.join(outputDir, 'articles');

function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { metadata: null, content: fileContent };
  }

  const yamlLines = match[1].split(/\r?\n/);
  const metadata = {};
  for (const line of yamlLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      // Remove surrounding quotes if any
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  }
  return { metadata, content: match[2].trim() };
}

function extractTableKeywords(markdownContent) {
  const lines = markdownContent.split(/\r?\n/);
  const keywords = new Set();

  let inTable = false;
  let headers = [];
  let nameColIdx = -1;
  let groupColIdx = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      if (!inTable) {
        headers = cells;
        nameColIdx = cells.findIndex(
          (h) => h.includes('ชื่อสามัญ') || h.includes('ชื่อสาร')
        );
        groupColIdx = cells.findIndex(
          (h) =>
            h.includes('กลุ่ม') ||
            h.includes('FRAC') ||
            h.includes('IRAC') ||
            h.includes('HRAC')
        );
        if (nameColIdx > -1 || groupColIdx > -1) {
          inTable = true;
        }
      } else {
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          continue;
        }

        if (nameColIdx > -1 && nameColIdx < cells.length) {
          const name = cells[nameColIdx];
          if (name && name !== 'ชื่อสามัญ' && name !== 'ชื่อสามัญสาร') {
            const cleanName = name.replace(/\*\*/g, '').trim();
            if (cleanName) {
              keywords.add(cleanName);
              const parenMatch = cleanName.match(/^([^(]+)\s*\(([^)]+)\)$/);
              if (parenMatch) {
                keywords.add(parenMatch[1].trim());
                keywords.add(parenMatch[2].trim());
              }
            }
          }
        }

        if (groupColIdx > -1 && groupColIdx < cells.length) {
          const group = cells[groupColIdx];
          if (group && group !== 'กลุ่ม' && !group.includes('FRAC')) {
            const cleanGroup = group.replace(/\*\*/g, '').trim();
            if (cleanGroup) {
              keywords.add(cleanGroup);
              if (!cleanGroup.startsWith('กลุ่ม')) {
                keywords.add(`กลุ่ม ${cleanGroup}`);
                keywords.add(`กลุ่ม${cleanGroup}`);
              }
            }
          }
        }
      }
    } else {
      inTable = false;
    }
  }

  return Array.from(keywords);
}

function buildPesticideKnowledge() {
  console.log('Starting pesticide knowledge build (Pass 1 - Indexing)...');

  if (!existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    return;
  }

  // Clear previous output to prevent stale files (like draft templates)
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }

  // Ensure output directories exist
  mkdirSync(articlesOutputDir, { recursive: true });

  const catalog = [];
  const slugMap = {}; // Maps relative path (e.g., '01_พื้นฐานก่อนใช้สาร/01_วิธีอ่านเอกสารคำแนะนำ.md') to slug

  // Read all directories in pesticide_knowledge_md
  const items = readdirSync(inputDir, { withFileTypes: true });
  const subDirs = items
    .filter((item) => item.isDirectory() && /^(0[1-9]|1[0-1])_/.test(item.name))
    .map((item) => item.name)
    .sort();

  // --- PASS 1: Build the relative path to slug mapping ---
  for (const dir of subDirs) {
    const dirPath = path.join(inputDir, dir);
    const files = readdirSync(dirPath).filter((file) => file.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const rawContent = readFileSync(filePath, 'utf8');
      const { metadata } = parseFrontmatter(rawContent);

      if (
        metadata &&
        metadata.slug &&
        metadata.title &&
        metadata.status !== 'draft'
      ) {
        const relativeKey = `${dir}/${file}`.replace(/\\/g, '/');
        slugMap[relativeKey] = metadata.slug;
      }
    }
  }

  console.log(
    `Indexed ${Object.keys(slugMap).length} articles for link rewriting.`
  );
  console.log(
    'Starting pesticide knowledge build (Pass 2 - Compilation & Link Rewriting)...'
  );

  // --- PASS 2: Parse and rewrite relative links ---
  for (const dir of subDirs) {
    const dirPath = path.join(inputDir, dir);
    const files = readdirSync(dirPath).filter((file) => file.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const rawContent = readFileSync(filePath, 'utf8');
      const { metadata, content } = parseFrontmatter(rawContent);

      if (
        metadata &&
        metadata.slug &&
        metadata.title &&
        metadata.status !== 'draft'
      ) {
        // Rewrite relative links in the markdown content
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const rewrittenContent = content.replace(
          linkRegex,
          (match, label, targetUrl) => {
            if (/^(https?:|\/\/)/.test(targetUrl)) {
              return match; // Keep external links untouched
            }

            const [urlPath, hash] = targetUrl.split('#');
            const resolvedPath = path
              .normalize(path.join(dir, urlPath))
              .replace(/\\/g, '/');
            const slug = slugMap[resolvedPath];

            if (slug) {
              const hashPart = hash ? `#${hash}` : '';
              return `[${label}](/public/pesticides/${slug}${hashPart})`;
            } else {
              console.warn(
                `Could not resolve relative link: "${targetUrl}" in file: "${dir}/${file}"`
              );
              return match;
            }
          }
        );

        // Build metadata catalog entry
        const entry = {
          slug: metadata.slug,
          title: metadata.title,
          category: metadata.category || '',
          plant: metadata.plant || '',
          pest_type: metadata.pest_type || '',
          source_year: metadata.source_year
            ? Number(metadata.source_year)
            : null,
          source_pages: metadata.source_pages || '',
          last_reviewed: metadata.last_reviewed || '',
          dirName: dir,
          fileName: file,
          commonNames: extractTableKeywords(content),
        };

        catalog.push(entry);

        // Save individual article content with rewritten links to json
        const articlePath = path.join(
          articlesOutputDir,
          `${metadata.slug}.json`
        );
        writeFileSync(
          articlePath,
          JSON.stringify({ ...entry, content: rewrittenContent }, null, 2) +
            '\n',
          'utf8'
        );
      } else {
        console.log(`Skipped non-article file: ${dir}/${file}`);
      }
    }
  }

  // Save catalog.json
  const catalogPath = path.join(outputDir, 'catalog.json');
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  const systemDir = items.find(
    (item) => item.isDirectory() && item.name.startsWith('99_')
  );
  const ragChunksPath = systemDir
    ? path.join(inputDir, systemDir.name, 'RAG_EXPORT', 'rag_chunks.jsonl')
    : '';
  if (ragChunksPath && existsSync(ragChunksPath)) {
    const chunks = readFileSync(ragChunksPath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    writeFileSync(
      path.join(outputDir, 'rag-chunks.json'),
      JSON.stringify(chunks) + '\n',
      'utf8'
    );
  }

  console.log(
    `Pesticide build completed! Generated ${catalog.length} article JSONs and catalog.json`
  );
}

buildPesticideKnowledge();
