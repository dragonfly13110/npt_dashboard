import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

function splitManual(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let heading = '';
  let body = [];

  const flush = () => {
    const text = body.join('\n').trim();
    if (text) sections.push({ heading, content: text });
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
  return sections;
}

function chunkSection(section) {
  const prefix = section.heading ? `${section.heading}\n` : '';
  const available = Math.max(1, 1600 - prefix.length);
  const chunks = [];
  for (let offset = 0; offset < section.content.length; offset += available) {
    chunks.push({
      heading: section.heading,
      content: `${prefix}${section.content.slice(offset, offset + available)}`.trim(),
    });
  }
  return chunks;
}

export function buildManualIndex(rootDir) {
  const catalog = JSON.parse(
    readFileSync(path.join(rootDir, 'src/domain/datasetCatalog.json'), 'utf8')
  );
  const manualsDir = path.join(rootDir, 'docs/manual');
  const registeredFiles = new Set(catalog.MANUALS.map((manual) => manual.file));
  const availableFiles = new Set(readdirSync(manualsDir));

  for (const file of registeredFiles) {
    if (!availableFiles.has(file)) {
      throw new Error(`Registered manual file is missing: ${file}`);
    }
  }

  return catalog.MANUALS.flatMap((manual) => {
    const content = readFileSync(path.join(manualsDir, manual.file), 'utf8');
    return splitManual(content).flatMap(chunkSection).map((chunk, index) => ({
      id: manual.id,
      title: manual.title,
      route: manual.route,
      minRole: manual.minRole,
      heading: chunk.heading,
      chunkIndex: index,
      content: chunk.content,
    }));
  });
}

if (path.resolve(process.argv[1] || '') === path.resolve(SCRIPT_PATH)) {
  const rootDir = path.resolve(path.dirname(SCRIPT_PATH), '..');
  const outputPath = path.join(
    rootDir,
    'netlify/functions/lib/line-ai/manual-index.json'
  );
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(`${outputPath}`, `${JSON.stringify(buildManualIndex(rootDir), null, 2)}\n`);
}
