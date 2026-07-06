import { describe, expect, it } from 'vitest';
import { sanitizeLogValue } from '../logSanitizer';

describe('logSanitizer', () => {
  it('redacts private keys and common PII values', () => {
    expect(
      sanitizeLogValue({
        email: 'person@example.com',
        phone: '0812345678',
        nested: {
          note: 'call 0899999999 with token Bearer secret-token',
          crop_name: 'มะม่วง',
        },
      })
    ).toEqual({
      email: '[REDACTED]',
      phone: '[REDACTED]',
      nested: {
        note: 'call [REDACTED] with token [REDACTED]',
        crop_name: 'มะม่วง',
      },
    });
  });

  it('keeps error shape but sanitizes message and stack', () => {
    const error = new Error('Failed for farmer@example.com');
    error.stack = 'Error: phone 0812345678';

    expect(sanitizeLogValue(error)).toEqual({
      name: 'Error',
      message: 'Failed for [REDACTED]',
      stack: 'Error: phone [REDACTED]',
    });
  });
});
