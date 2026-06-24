import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/api_rate_limits.sql', 'utf8');
const claimFunction = sql.match(
  /create or replace function public\.claim_api_rate_limit[\s\S]*?as\s+\$\$(?<body>[\s\S]*?)\$\$;/i
);
const claimDefinition = claimFunction?.[0] ?? '';
const claimBody = claimFunction?.groups?.body ?? '';

describe('API rate-limit schema', () => {
  it('keeps rate-limit rows private', () => {
    expect(sql).toMatch(/create schema if not exists private/i);
    expect(sql).toMatch(/create table if not exists private\.api_rate_limits/i);
    expect(sql).toMatch(
      /alter table private\.api_rate_limits enable row level security/i
    );
    expect(sql).toMatch(
      /revoke all on table private\.api_rate_limits from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /grant select, insert, update, delete on table private\.api_rate_limits to service_role/i
    );
  });

  it('defines a service-role-only invoker RPC', () => {
    expect(claimFunction).not.toBeNull();
    expect(claimDefinition).toMatch(/security invoker/i);
    expect(claimDefinition).toMatch(/set search_path\s*=\s*''/i);
    expect(sql).toMatch(
      /revoke all on function public\.claim_api_rate_limit\(text, integer, integer\) from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.claim_api_rate_limit\(text, integer, integer\) to service_role/i
    );
  });

  it('validates inputs before atomically claiming a window', () => {
    const lockIndex = claimBody.search(/pg_advisory_xact_lock/i);
    expect(claimBody).toMatch(/btrim\(p_rate_key\)\s*=\s*''/i);
    expect(claimBody).toMatch(/p_limit\s+is null\s+or\s+p_limit\s*<=\s*0/i);
    expect(claimBody).toMatch(
      /p_window_seconds\s+is null\s+or\s+p_window_seconds\s*<=\s*0/i
    );
    expect(lockIndex).toBeGreaterThan(-1);
    expect(claimBody.search(/btrim\(p_rate_key\)/i)).toBeLessThan(lockIndex);
    expect(claimBody).toMatch(/private\.api_rate_limits/i);
    expect(claimBody).toMatch(/jsonb_build_object\s*\(/i);
  });

  it('does not shadow PostgreSQL current_time', () => {
    expect(claimBody).toMatch(
      /v_now\s+timestamptz\s*:=\s*clock_timestamp\(\)/i
    );
    expect(claimBody).not.toMatch(/\bcurrent_time\b/i);
  });
});
