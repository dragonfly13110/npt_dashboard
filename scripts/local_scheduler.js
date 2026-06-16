/**
 * Local Scheduler for DOAE Farmer Registry Scraper
 *
 * This script runs continuously, checking the database for the last run timestamp.
 * If the last run was more than 3 days ago, it schedules the next run for today at a random time
 * between 06:00 AM and 08:00 AM ICT. If that time has already passed, it runs immediately (catch up).
 *
 * Usage: node scripts/local_scheduler.js
 */
import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  for (const envPath of [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ]) {
    if (!fs.existsSync(envPath)) continue;
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) return;
      const key = match[1];
      if (process.env[key] !== undefined) return;
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"'))
        value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'"))
        value = value.slice(1, -1);
      process.env[key] = value.trim();
    });
  }
} catch (e) {
  // Ignore env loading errors
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SCRAPER_PATH = path.join(__dirname, 'scrape_farmer_registry.js');

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error(
    'Missing required env: SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN'
  );
  process.exit(1);
}

async function runSQL(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!response.ok) {
    throw new Error(`DB query failed: ${response.statusText}`);
  }
  return response.json();
}

function runScraper() {
  return new Promise((resolve) => {
    console.log(
      `\n🚀 [${new Date().toLocaleString('th-TH')}] Starting scraper child process...`
    );
    const child = fork(SCRAPER_PATH);
    child.on('close', (code) => {
      console.log(`🏁 Scraper finished with exit code ${code}`);
      resolve(code === 0);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAndSchedule() {
  try {
    console.log(
      `\n🔍 [${new Date().toLocaleString('th-TH')}] Checking database status...`
    );
    const result = await runSQL(
      'SELECT MAX(updated_at) as latest_update FROM farmer_registry;'
    );

    let latestUpdate = null;
    if (result && result.length > 0 && result[0].latest_update) {
      latestUpdate = new Date(result[0].latest_update);
    }

    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    if (
      !latestUpdate ||
      now.getTime() - latestUpdate.getTime() >= threeDaysMs
    ) {
      // Need to run! Let's check target time for today (random between 6 AM and 8 AM)
      console.log(
        '📅 Last update was more than 3 days ago (or never). Determining run window...'
      );

      const targetTime = new Date();
      targetTime.setHours(6, 0, 0, 0); // Start at 06:00 AM

      // Add a random delay between 0 and 120 minutes (2 hours)
      const randomDelayMinutes = Math.floor(Math.random() * 121);
      targetTime.setMinutes(targetTime.getMinutes() + randomDelayMinutes);

      console.log(
        `🎯 Target run time for today: ${targetTime.toLocaleTimeString('th-TH')} (Random delay of ${randomDelayMinutes} minutes)`
      );

      if (now.getTime() < targetTime.getTime()) {
        // Target is in the future today
        const waitMs = targetTime.getTime() - now.getTime();
        const waitMinutes = Math.round(waitMs / 60000);
        console.log(
          `⏳ Waiting for ${waitMinutes} minutes until the target run window today...`
        );
        await delay(waitMs);

        // Double check if time hasn't drifted
        await runScraper();
      } else {
        // Target time has already passed today, run immediately to catch up!
        console.log(
          '⚡ Target run time has already passed today. Running scraper immediately to catch up.'
        );
        await runScraper();
      }
    } else {
      // Next run is in the future
      const nextRunDate = new Date(latestUpdate.getTime() + threeDaysMs);

      // Set next run time to 6 AM on that day + random delay
      nextRunDate.setHours(6, 0, 0, 0);
      const randomDelayMinutes = Math.floor(Math.random() * 121);
      nextRunDate.setMinutes(nextRunDate.getMinutes() + randomDelayMinutes);

      const waitMs = nextRunDate.getTime() - now.getTime();
      const waitHours = (waitMs / (1000 * 60 * 60)).toFixed(1);

      console.log(
        `✅ Database is up to date (last updated on ${latestUpdate.toLocaleString('th-TH')})`
      );
      console.log(
        `📅 Next scheduled run: ${nextRunDate.toLocaleString('th-TH')} (in approximately ${waitHours} hours)`
      );

      // Sleep for 1 hour before checking again (safer than sleeping days in case of system time changes or restarts)
      console.log('💤 Sleeping for 1 hour before next status check...');
      await delay(60 * 60 * 1000);
    }
  } catch (error) {
    console.error('❌ Scheduler Error:', error.message);
    console.log('💤 Sleeping for 5 minutes before retrying...');
    await delay(5 * 60 * 1000);
  }
}

async function main() {
  console.log('===================================================');
  console.log('   DOAE Farmer Registry Local Scheduler Daemon');
  console.log('===================================================');

  while (true) {
    await checkAndSchedule();
  }
}

main();
