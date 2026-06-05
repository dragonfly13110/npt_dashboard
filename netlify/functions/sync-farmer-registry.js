import { schedule } from '@netlify/functions';
import { scrapeFarmerRegistry } from '../../scripts/scrape_farmer_registry.js';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function runSQL(sql) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`DB query failed: ${response.status} ${text}`);
    }

    return response.json();
}

async function shouldRun() {
    if (!PROJECT_REF || !ACCESS_TOKEN) {
        throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
    }

    const rows = await runSQL(`
        SELECT MAX(scraped_at) AS latest_snapshot
        FROM farmer_registry_snapshots;
    `);
    const latestSnapshot = rows?.[0]?.latest_snapshot ? new Date(rows[0].latest_snapshot) : null;
    if (!latestSnapshot) return true;

    const safetyThresholdMs = 2.5 * 24 * 60 * 60 * 1000; // 2.5 days to allow 3-day cron to pass safely
    return Date.now() - latestSnapshot.getTime() >= safetyThresholdMs;
}

async function syncHandler() {
    const due = await shouldRun();
    if (!due) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Latest snapshot is newer than 2.5 days' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    await scrapeFarmerRegistry();
    return new Response(JSON.stringify({ ok: true, skipped: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Runs every 3 days at 00:00 UTC (07:00 AM Thailand time)
export const handler = schedule('0 0 */3 * *', syncHandler);
