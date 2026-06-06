import fs from 'node:fs';
import process from 'node:process';

function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return {};
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return env;
    const index = trimmed.indexOf('=');
    if (index === -1) return env;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
    return env;
  }, {});
}

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    throw new Error('Usage: node scripts/run_sql_file.mjs <path-to-sql>');
  }
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL file not found: ${sqlPath}`);
  }

  const env = { ...loadEnv(), ...process.env };
  const projectRef = env.SUPABASE_PROJECT_REF;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  if (!projectRef || !accessToken) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  }

  const query = fs.readFileSync(sqlPath, 'utf8');
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(text);
  if (!response.ok) {
    throw new Error(`Failed to run ${sqlPath}`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
