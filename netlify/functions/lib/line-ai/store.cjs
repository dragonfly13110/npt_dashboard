'use strict';

function assertOk(result) {
  if (result.error) throw result.error;
  return result.data;
}

function createLineAiStore(supabase) {
  return {
    async getHistory(userId, now = new Date()) {
      const since = new Date(now.getTime() - 86400000).toISOString();
      const query = await supabase
        .from('line_conversations')
        .select('role,content,source_type,created_at')
        .eq('line_user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(0, 9);
      return (assertOk(query) || []).reverse();
    },

    async appendMessage(userId, role, content, sourceType = null) {
      assertOk(
        await supabase.from('line_conversations').insert({
          line_user_id: userId,
          role,
          content: content.slice(0, 4000),
          source_type: sourceType,
        })
      );
    },

    async claimQuota(userId, kind, limits, keySlot = null) {
      return assertOk(
        await supabase.rpc('claim_line_ai_quota', {
          p_user_id: userId,
          p_kind: kind,
          p_daily_limit: limits.daily,
          p_window_limit: limits.window,
          p_window_seconds: limits.seconds,
          p_key_slot: keySlot,
        })
      );
    },

    async getCache(cacheKey) {
      const result = await supabase
        .from('line_ai_cache')
        .select('response,source_type,model,expires_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      return assertOk(result);
    },

    async putCache(entry) {
      assertOk(await supabase.from('line_ai_cache').upsert(entry));
    },

    async listKeyHealth(configured) {
      const result = await supabase
        .from('line_ai_key_health')
        .select('key_slot,status,cooldown_until,last_used_at')
        .in('key_slot', configured);
      const data = assertOk(result) || [];
      return data.map((row) => ({
        key_slot: row.key_slot,
        last_used_at: row.last_used_at,
        cooldown_until: row.cooldown_until,
        is_disabled: row.status === 'disabled',
      }));
    },

    async markUsed(slot, timestamp) {
      assertOk(
        await supabase.from('line_ai_key_health').upsert({
          key_slot: slot,
          last_used_at: timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
    },

    async markHealthy(slot, timestamp) {
      assertOk(
        await supabase.from('line_ai_key_health').upsert({
          key_slot: slot,
          status: 'active',
          consecutive_failures: 0,
          cooldown_until: null,
          last_error_code: null,
          updated_at: new Date().toISOString(),
        })
      );
    },

    async markFailure(slot, failure) {
      assertOk(
        await supabase.from('line_ai_key_health').upsert({
          key_slot: slot,
          status: failure.disabled ? 'disabled' : 'active',
          cooldown_until: failure.cooldownUntil || null,
          last_error_code: failure.status ? String(failure.status) : 'network',
          updated_at: new Date().toISOString(),
        })
      );
    },
  };
}

module.exports = { createLineAiStore };
