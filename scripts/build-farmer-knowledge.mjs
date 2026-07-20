import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputJsonl = path.join(
  rootDir,
  'farmer69_knowledge_v1.1',
  '08_ส่งออก',
  'เว็บไซต์',
  'articles.jsonl'
);
const outputDir = path.join(rootDir, 'public', 'data', 'farmer69');
const articlesOutputDir = path.join(outputDir, 'articles');

// Supabase details
const supabaseUrl = 'https://cjjirwqoovypymndhvwt.supabase.co';
const cdnBase = `${supabaseUrl}/storage/v1/object/public/farmer69-assets`;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function buildFarmerKnowledge() {
  console.log('Building farmer69 knowledge base...');

  if (!fs.existsSync(inputJsonl)) {
    console.error(`Input file not found: ${inputJsonl}`);
    return;
  }

  // Clear previous output
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  fs.mkdirSync(articlesOutputDir, { recursive: true });

  const catalog = [];
  const fileStream = fs.createReadStream(inputJsonl);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const doc = JSON.parse(line);
    const slug = doc.document_id || doc.metadata?.slug;
    if (!slug) continue;

    // Process assets to Supabase CDN URLs
    const assets = doc.metadata?.assets || [];
    const cdnAssets = assets.map((assetPath) => {
      const baseName = path.basename(assetPath);
      // Path matching how it is structured in assets/source-images on disk
      const relativePathOnDisk = `${slug}/${baseName}`;
      const hash = md5(relativePathOnDisk);
      return `${cdnBase}/source-images/${hash}.png`;
    });

    // Construct rewritten content: append images gallery to body_markdown if assets exist
    let rewrittenContent = doc.body_markdown || '';

    // Rewrite internal page links: e.g. [some page](01_บทนำ/01_บทนำ.md) to (/public/farmer-manual/slug)
    // In this repo, since we have slugs for all pages, let's keep internal links as they are or we can resolve them.
    // Let's rewrite relative markdown links like [นิยามศัพท์](../01_นิยามศัพท์/01_นิยามศัพท์.md)
    // Actually, in our App.jsx public routes we can resolve these or the component can handle it.
    // Let's see if the static HTML pages had absolute links. The articles.jsonl has standard relative links.
    // Let's replace any links like `[Label](path/to/file.md)` to `/public/farmer-manual/slug` if we know it.
    // Let's build a map first. We can do that by parsing JSONL twice.

    const catalogEntry = {
      slug: slug,
      title: doc.title || doc.metadata?.title || '',
      category: doc.category || doc.metadata?.category || '',
      citation_text: doc.citation_text || '',
      topics: doc.topics || doc.metadata?.topics || [],
      review_flags: doc.review_flags || doc.metadata?.review_flags || [],
      assets: cdnAssets,
      source_pdf_pages:
        doc.source_pdf_pages || doc.metadata?.source_pdf_pages || [],
      source_printed_pages:
        doc.source_printed_pages || doc.metadata?.source_printed_pages || [],
      pdf_url: `${cdnBase}/source/farmer69-watermark.pdf`,
    };

    catalog.push(catalogEntry);

    // Save article details
    const articleDetail = {
      ...catalogEntry,
      body_markdown: rewrittenContent,
    };

    fs.writeFileSync(
      path.join(articlesOutputDir, `${slug}.json`),
      JSON.stringify(articleDetail, null, 2) + '\n',
      'utf8'
    );
  }

  // Save catalog.json
  fs.writeFileSync(
    path.join(outputDir, 'catalog.json'),
    JSON.stringify(catalog, null, 2) + '\n',
    'utf8'
  );

  console.log(
    `Successfully built farmer69 catalog with ${catalog.length} articles!`
  );
}

buildFarmerKnowledge();
