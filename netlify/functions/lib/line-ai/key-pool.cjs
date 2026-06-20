'use strict';

const DEFAULT_COOLDOWN_SECONDS = 60;
const MAX_SLOT_ATTEMPTS = 2;

function normalizeRecord(record) {
  return {
    keySlot: Number(record.keySlot ?? record.key_slot),
    lastUsedAt: record.lastUsedAt ?? record.last_used_at ?? null,
    cooldownUntil: record.cooldownUntil ?? record.cooldown_until ?? null,
    disabled: Boolean(
      record.disabled ?? record.isDisabled ?? record.is_disabled
    ),
  };
}

function errorStatus(error) {
  return (
    Number(error?.status ?? error?.statusCode ?? error?.response?.status) ||
    null
  );
}

function retryAfterValue(error) {
  const headers = error?.response?.headers;
  if (headers?.get) return headers.get('retry-after');
  return (
    error?.retryAfter ?? headers?.['retry-after'] ?? headers?.['Retry-After']
  );
}

function retryAfterDate(error, currentTime, defaultSeconds) {
  const value = retryAfterValue(error);
  if (value != null && String(value).trim() !== '') {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return new Date(currentTime.getTime() + seconds * 1000);
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(currentTime.getTime() + defaultSeconds * 1000);
}

function isTimeoutOrNetworkError(error) {
  const code = String(error?.code ?? '').toUpperCase();
  return (
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError' ||
    [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'EAI_AGAIN',
      'ENOTFOUND',
      'UND_ERR_CONNECT_TIMEOUT',
    ].includes(code) ||
    (!errorStatus(error) && error instanceof TypeError)
  );
}

function classifyFailure(error, currentTime, defaultCooldownSeconds) {
  const status = errorStatus(error);
  const failure = { status, disabled: false, cooldownUntil: null };
  if (status === 401 || status === 403) {
    failure.disabled = true;
  } else if (status === 429) {
    failure.cooldownUntil = retryAfterDate(
      error,
      currentTime,
      defaultCooldownSeconds
    ).toISOString();
  } else if ((status && status >= 500) || isTimeoutOrNetworkError(error)) {
    failure.cooldownUntil = new Date(
      currentTime.getTime() + defaultCooldownSeconds * 1000
    ).toISOString();
  }
  return failure;
}

function noHealthyKeyError() {
  const error = new Error('No healthy Gemini API key is available');
  error.code = 'NO_HEALTHY_KEY';
  return error;
}

function createKeyPool({
  keys,
  store,
  now = () => new Date(),
  maxAttempts = MAX_SLOT_ATTEMPTS,
  defaultCooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
}) {
  if (!(keys instanceof Map)) throw new TypeError('keys must be a Map');
  if (
    !store?.listKeyHealth ||
    !store?.markUsed ||
    !store?.markHealthy ||
    !store?.markFailure
  ) {
    throw new TypeError('store must implement the key-health interface');
  }

  async function execute(operation) {
    if (typeof operation !== 'function')
      throw new TypeError('operation must be a function');
    const records = await store.listKeyHealth([...keys.keys()]);
    const recordsBySlot = new Map(
      (records ?? []).map((record) => {
        const normalized = normalizeRecord(record);
        return [normalized.keySlot, normalized];
      })
    );
    const selectionTime = now();
    const candidates = [...keys.keys()]
      .map(
        (slot) => recordsBySlot.get(slot) ?? normalizeRecord({ keySlot: slot })
      )
      .filter(
        (record) =>
          !record.disabled &&
          (!record.cooldownUntil ||
            new Date(record.cooldownUntil) <= selectionTime)
      )
      .sort((left, right) => {
        if (!left.lastUsedAt)
          return right.lastUsedAt ? -1 : left.keySlot - right.keySlot;
        if (!right.lastUsedAt) return 1;
        return (
          new Date(left.lastUsedAt) - new Date(right.lastUsedAt) ||
          left.keySlot - right.keySlot
        );
      });

    if (candidates.length === 0) throw noHealthyKeyError();

    const attemptLimit = Math.min(
      MAX_SLOT_ATTEMPTS,
      Math.max(
        1,
        Number.isInteger(maxAttempts) ? maxAttempts : MAX_SLOT_ATTEMPTS
      ),
      candidates.length
    );
    let lastError;
    for (const candidate of candidates.slice(0, attemptLimit)) {
      const attemptTime = now();
      const attemptedAt = attemptTime.toISOString();
      await store.markUsed(candidate.keySlot, attemptedAt);
      try {
        const result = await operation({
          slot: candidate.keySlot,
          apiKey: keys.get(candidate.keySlot),
        });
        await store.markHealthy(candidate.keySlot, attemptedAt);
        return result;
      } catch (error) {
        lastError = error;
        await store.markFailure(
          candidate.keySlot,
          classifyFailure(error, attemptTime, defaultCooldownSeconds)
        );
      }
    }
    throw lastError;
  }

  return { execute };
}

module.exports = {
  MAX_SLOT_ATTEMPTS,
  classifyFailure,
  createKeyPool,
};
