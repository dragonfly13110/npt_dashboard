import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/line_ai_chatbot.sql', 'utf8');
const usageTable = sql.match(
  /create table if not exists public\.line_ai_usage\s*\((?<body>[\s\S]*?)\);/i
);
const usageBody = usageTable?.groups?.body ?? '';
const quotaFunction = sql.match(
  /create or replace function public\.claim_line_ai_quota[\s\S]*?as\s+\$\$(?<body>[\s\S]*?)\$\$;/i
);
const quotaDefinition = quotaFunction?.[0] ?? '';
const quotaBody = quotaFunction?.groups?.body ?? '';

describe('LINE AI schema', () => {
  it.each([
    'line_conversations',
    'line_ai_usage',
    'line_ai_cache',
    'line_ai_key_health',
  ])('creates private table %s', (table) => {
    expect(sql).toMatch(
      new RegExp(`create table if not exists public\\.${table}`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(
        `revoke all on table public\\.${table} from public, anon, authenticated`,
        'i'
      )
    );
    expect(sql).toMatch(
      new RegExp(`grant all on table public\\.${table} to service_role`, 'i')
    );
  });

  it('restricts recorded AI usage to configured key slots', () => {
    expect(usageTable).not.toBeNull();
    expect(usageBody).toMatch(
      /key_slot\s+smallint\s+check\s*\(\s*key_slot\s+is\s+null\s+or\s+key_slot\s+between\s+1\s+and\s+5\s*\)/i
    );
  });

  it.each(['line_conversations_id_seq', 'line_ai_usage_id_seq'])(
    'keeps identity sequence %s private while allowing service inserts',
    (sequence) => {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on sequence public\\.${sequence}\\s+from public, anon, authenticated`,
          'i'
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant usage, select on sequence public\\.${sequence}\\s+to service_role`,
          'i'
        )
      );
    }
  );

  it('defines a private atomic quota RPC', () => {
    expect(quotaFunction).not.toBeNull();
    expect(quotaDefinition).toMatch(/security definer/i);
    expect(quotaBody).toMatch(/pg_advisory_xact_lock/i);
    expect(quotaBody).toMatch(/Asia\/Bangkok/i);
    expect(quotaBody).toMatch(/jsonb_build_object\s*\(\s*'allowed'/i);
    expect(sql).toMatch(
      /revoke all on function public\.claim_line_ai_quota\([^)]+\) from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.claim_line_ai_quota\([^)]+\) to service_role/i
    );
  });

  it('structurally rejects invalid inputs before serialized quota work', () => {
    const validationPatterns = [
      /if\s+p_user_id\s+is\s+null\s+or\s+btrim\(p_user_id\)\s*=\s*''\s+then/i,
      /if\s+p_kind\s+is\s+null\s+or\s+p_kind\s+not\s+in\s*\(\s*'ai'\s*,\s*'grounding'\s*\)\s+then/i,
      /if\s+p_daily_limit\s+is\s+null\s+or\s+p_daily_limit\s*<=\s*0\s+then/i,
      /if\s+p_window_limit\s+is\s+null\s+or\s+p_window_limit\s*<\s*0\s+then/i,
      /if\s+p_window_limit\s*>\s*0\s+and\s*\(\s*p_window_seconds\s+is\s+null\s+or\s+p_window_seconds\s*<=\s*0\s*\)\s+then/i,
      /if\s+p_key_slot\s+is\s+not\s+null\s+and\s+p_key_slot\s+not\s+between\s+1\s+and\s+5\s+then/i,
    ];
    const lockIndex = quotaBody.search(/pg_advisory_xact_lock/i);

    expect(lockIndex).toBeGreaterThan(-1);
    for (const pattern of validationPatterns) {
      const validationIndex = quotaBody.search(pattern);
      expect(validationIndex).toBeGreaterThan(-1);
      expect(validationIndex).toBeLessThan(lockIndex);
    }
  });

  it('structurally serializes user-kind claims before counts and rejection checks before insert', () => {
    const lockIndex = quotaBody.search(
      /pg_advisory_xact_lock\s*\(\s*hashtext\s*\(\s*p_user_id\s*\|\|\s*':'\s*\|\|\s*p_kind\s*\)\s*\)/i
    );
    const countIndex = quotaBody.search(/select\s+count\s*\(\s*\*\s*\)/i);
    const dailyRejectionIndex = quotaBody.search(
      /if\s+daily_count\s*>=\s*p_daily_limit\s+then/i
    );
    const windowRejectionIndex = quotaBody.search(
      /if\s+p_window_limit\s*>\s*0\s+and\s+window_count\s*>=\s*p_window_limit\s+then/i
    );
    const insertIndex = quotaBody.search(
      /insert\s+into\s+public\.line_ai_usage/i
    );

    expect(lockIndex).toBeGreaterThan(-1);
    expect(countIndex).toBeGreaterThan(lockIndex);
    expect(insertIndex).toBeGreaterThan(countIndex);
    expect(dailyRejectionIndex).toBeGreaterThan(countIndex);
    expect(windowRejectionIndex).toBeGreaterThan(dailyRejectionIndex);
    expect(dailyRejectionIndex).toBeLessThan(insertIndex);
    expect(windowRejectionIndex).toBeLessThan(insertIndex);
  });
});
