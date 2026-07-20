import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const jsonlPath = path.join(
  rootDir,
  'farmer69_knowledge_v1.1',
  '08_ส่งออก',
  'เว็บไซต์',
  'articles.jsonl'
);
const imagesDir = path.join(
  rootDir,
  'farmer69_knowledge_v1.1',
  '08_ส่งออก',
  'เว็บไซต์',
  'พร้อมใช้งาน',
  'assets',
  'source-images'
);

// Recursively list all files
function getFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursive(res));
    } else {
      files.push(res);
    }
  }
  return files;
}

async function run() {
  const localFiles = getFilesRecursive(imagesDir).map((f) =>
    path.relative(imagesDir, f).replace(/\\/g, '/')
  );
  console.log(`Total images on disk: ${localFiles.length}`);

  const fileStream = fs.createReadStream(jsonlPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const doc = JSON.parse(line);
    const slug = doc.document_id;
    const assets = doc.metadata?.assets || [];

    if (assets.length > 0) {
      console.log(`\nDoc: ${slug}`);
      for (const asset of assets) {
        console.log(`  Asset in metadata: "${asset}"`);
        // Find if any file in localFiles matches this asset name
        const assetName = path.basename(asset);
        const matches = localFiles.filter(
          (f) => path.basename(f) === assetName
        );
        if (matches.length > 0) {
          console.log(`  -> Matches on disk: ${JSON.stringify(matches)}`);
        } else {
          console.log(`  -> ❌ NO MATCH ON DISK FOR "${assetName}"`);
        }
      }
    }
  }
}

run();
