import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/line_ai_chatbot.sql', 'utf8');

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
        `revoke all on table public\\.${table} from anon, authenticated`,
        'i'
      )
    );
    expect(sql).toMatch(
      new RegExp(`grant all on table public\\.${table} to service_role`, 'i')
    );
  });

  it('defines a private atomic quota RPC', () => {
    expect(sql).toMatch(
      /create or replace function public\.claim_line_ai_quota/i
    );
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/pg_advisory_xact_lock/i);
    expect(sql).toMatch(/Asia\/Bangkok/i);
    expect(sql).toMatch(/jsonb_build_object\s*\(\s*'allowed'/i);
    expect(sql).toMatch(
      /revoke all on function public\.claim_line_ai_quota\([^)]+\) from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.claim_line_ai_quota\([^)]+\) to service_role/i
    );
  });
});
