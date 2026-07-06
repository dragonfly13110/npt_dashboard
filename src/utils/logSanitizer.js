const REDACTED = '[REDACTED]';
const MAX_DEPTH = 4;

const PRIVATE_KEY_PATTERNS = [
  /authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|password|secret/i,
  /citizen|id_card|national_id/i,
  /phone|mobile|tel|line_id|email|facebook/i,
  /address|address_no|moo|road|soi|house/i,
  /first_name|last_name|full_name|owner_name|farmer_name|contact_person|author_name/i,
];

const PRIVATE_VALUE_PATTERNS = [
  /\b\d{13}\b/g,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\b0\d{8,9}\b/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
];

export function sanitizeLogValue(value, depth = 0, seen = new WeakSet()) {
  if (
    value == null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return PRIVATE_VALUE_PATTERNS.reduce(
      (text, pattern) => text.replace(pattern, REDACTED),
      value
    );
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogValue(value.message, depth + 1, seen),
      stack: sanitizeLogValue(value.stack, depth + 1, seen),
    };
  }

  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[Object]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      PRIVATE_KEY_PATTERNS.some((pattern) => pattern.test(key))
        ? REDACTED
        : sanitizeLogValue(item, depth + 1, seen),
    ])
  );
}

export function sanitizeLogArgs(args) {
  return args.map((arg) => sanitizeLogValue(arg));
}
