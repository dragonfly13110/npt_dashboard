import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const dbUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integrationEnabled =
  process.env.LINE_AI_DB_INTEGRATION === '1' &&
  Boolean(dbUrl) &&
  Boolean(serviceRoleKey);
const describeIntegration = integrationEnabled ? describe : describe.skip;
const supabase = integrationEnabled
  ? createClient(dbUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
  : null;

// Apply supabase/line_ai_chatbot.sql before opting in. PowerShell example:
// $env:LINE_AI_DB_INTEGRATION='1'; $env:VITE_SUPABASE_URL='https://...';
// $env:SUPABASE_SERVICE_ROLE_KEY='...'; npm test -- --run src/__tests__/line-ai-schema.integration.test.js
describeIntegration(
  'LINE AI schema integration (requires the migration applied and LINE_AI_DB_INTEGRATION=1)',
  () => {
    const runId = randomUUID();
    const users = {
      daily: `line-ai-it-daily-${runId}`,
      invalid: `line-ai-it-invalid-${runId}`,
      rolling: `line-ai-it-rolling-${runId}`,
    };

    const params = (userId, overrides = {}) => ({
      p_user_id: userId,
      p_kind: 'ai',
      p_daily_limit: 100,
      p_window_limit: 0,
      p_window_seconds: null,
      p_key_slot: 1,
      ...overrides,
    });

    afterAll(async () => {
      const { error } = await supabase
        .from('line_ai_usage')
        .delete()
        .in('line_user_id', Object.values(users));

      expect(error).toBeNull();
    });

    it('atomically allows exactly the daily limit under concurrent claims and persists exactly those claims', async () => {
      const dailyLimit = 3;
      const attempts = 8;
      const results = await Promise.all(
        Array.from({ length: attempts }, () =>
          supabase.rpc(
            'claim_line_ai_quota',
            params(users.daily, { p_daily_limit: dailyLimit })
          )
        )
      );

      for (const result of results) {
        expect(result.error).toBeNull();
      }
      expect(results.filter(({ data }) => data.allowed)).toHaveLength(
        dailyLimit
      );

      const { count, error } = await supabase
        .from('line_ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('line_user_id', users.daily)
        .eq('usage_type', 'ai');

      expect(error).toBeNull();
      expect(count).toBe(dailyLimit);

      const next = await supabase.rpc(
        'claim_line_ai_quota',
        params(users.daily, { p_daily_limit: dailyLimit })
      );
      expect(next.error).toBeNull();
      expect(next.data).toMatchObject({
        allowed: false,
        reason: 'daily',
        used: dailyLimit,
      });
    });

    it('denies a claim once the rolling window is full', async () => {
      const rollingLimit = 2;
      const firstClaims = await Promise.all(
        Array.from({ length: rollingLimit }, () =>
          supabase.rpc(
            'claim_line_ai_quota',
            params(users.rolling, {
              p_daily_limit: 10,
              p_window_limit: rollingLimit,
              p_window_seconds: 3600,
            })
          )
        )
      );

      for (const claim of firstClaims) {
        expect(claim.error).toBeNull();
        expect(claim.data.allowed).toBe(true);
      }

      const denied = await supabase.rpc(
        'claim_line_ai_quota',
        params(users.rolling, {
          p_daily_limit: 10,
          p_window_limit: rollingLimit,
          p_window_seconds: 3600,
        })
      );
      expect(denied.error).toBeNull();
      expect(denied.data).toMatchObject({
        allowed: false,
        reason: 'window',
        used: rollingLimit,
      });
    });

    it.each([
      ['blank user', { p_user_id: ' ' }],
      ['null kind', { p_kind: null }],
      ['invalid kind', { p_kind: 'other' }],
      ['null daily limit', { p_daily_limit: null }],
      ['nonpositive daily limit', { p_daily_limit: 0 }],
      ['null window limit', { p_window_limit: null }],
      ['negative window limit', { p_window_limit: -1 }],
      [
        'missing rolling seconds',
        { p_window_limit: 1, p_window_seconds: null },
      ],
      [
        'nonpositive rolling seconds',
        { p_window_limit: 1, p_window_seconds: 0 },
      ],
      ['key slot below range', { p_key_slot: 0 }],
      ['key slot above range', { p_key_slot: 6 }],
    ])('rejects invalid RPC input: %s', async (_label, overrides) => {
      const { error } = await supabase.rpc(
        'claim_line_ai_quota',
        params(users.invalid, overrides)
      );

      expect(error).not.toBeNull();
    });
  }
);
