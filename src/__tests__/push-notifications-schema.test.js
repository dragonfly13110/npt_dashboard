import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/push_notifications.sql', 'utf8');

describe('push notification schema', () => {
  it('protects subscriptions with owner-scoped RLS', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).toContain('to authenticated');
  });

  it('deduplicates source events', () => {
    expect(sql).toContain('event_key text primary key');
  });
});
