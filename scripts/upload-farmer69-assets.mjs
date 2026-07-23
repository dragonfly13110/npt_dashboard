import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Simple .env parser
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration in .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const BUCKET_NAME = 'farmer69-assets';

async function ensureBucketExists() {
  console.log(`Checking if bucket "${BUCKET_NAME}" exists...`);
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) {
    throw listError;
  }

  const exists = buckets.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    console.log(`Bucket "${BUCKET_NAME}" does not exist. Creating...`);
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        allowedMimeTypes: ['image/png', 'application/pdf'],
        fileSizeLimit: 15728640, // 15MB
      }
    );
    if (createError) throw createError;
    console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
  } else {
    console.log(`Bucket "${BUCKET_NAME}" already exists.`);
  }
}

// Recursively get all files in a directory
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

async function uploadFile(filePath, supabasePath, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(supabasePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });
  if (error) {
    console.error(`❌ Failed to upload ${supabasePath}:`, error.message);
  } else {
    console.log(`✅ Uploaded: ${supabasePath}`);
  }
}

async function run() {
  try {
    await ensureBucketExists();

    // 1. Upload PDF
    const pdfPath = path.join(
      rootDir,
      'farmer69_knowledge_v1.1',
      '08_ส่งออก',
      'เว็บไซต์',
      'พร้อมใช้งาน',
      'source',
      'farmer69-watermark.pdf'
    );
    if (fs.existsSync(pdfPath)) {
      console.log('Uploading PDF...');
      await uploadFile(
        pdfPath,
        'source/farmer69-watermark.pdf',
        'application/pdf'
      );
    } else {
      console.warn(`PDF not found at: ${pdfPath}`);
    }

    console.log('🎉 Upload completed!');
  } catch (err) {
    console.error('Fatal error during run:', err);
  }
}

run();
