import { describe, expect, it } from 'vitest';
import {
  extractKkuGrounding,
  parseKkuSse,
  parseForecastJson,
} from '../../netlify/functions/forecast-disease-insect.js';

describe('KKU forecast grounding', () => {
  it('collects streamed content and quota metadata', () => {
    const chunk = (value) => `data: ${JSON.stringify(value)}`;
    const result = parseKkuSse(
      [
        chunk({
          choices: [{ delta: { content: '{"summary":' }, finish_reason: null }],
        }),
        chunk({
          choices: [
            {
              delta: { content: '"พร้อม","details":[]}' },
              finish_reason: 'stop',
            },
          ],
          model_quota: { daily_remaining_tokens: 1234 },
        }),
        'data: [DONE]',
      ].join('\r\n')
    );

    expect(result).toEqual({
      text: '{"summary":"พร้อม","details":[]}',
      finishReason: 'stop',
      remainingTokens: 1234,
    });
  });

  it('stores unique source URLs, search queries, and cited text', () => {
    const result = extractKkuGrounding({
      search_queries: ['โรคพืช นครปฐม กรกฎาคม 2569'],
      sources: [
        {
          url: 'https://example.go.th/warning',
          title: 'คำเตือน',
          cited_texts: ['พบสภาพอากาศเอื้อต่อโรค'],
        },
        {
          url: 'https://example.go.th/warning',
          title: 'คำเตือนซ้ำ',
          cited_texts: [],
        },
        { url: 'javascript:alert(1)', title: 'ไม่ปลอดภัย' },
      ],
    });

    expect(result.searchQueries).toEqual(['โรคพืช นครปฐม กรกฎาคม 2569']);
    expect(result.sources).toEqual([
      {
        title: 'คำเตือน',
        url: 'https://example.go.th/warning',
        cited_texts: ['พบสภาพอากาศเอื้อต่อโรค'],
      },
    ]);
  });

  it('accepts an evidence-backed no-risk result', () => {
    expect(
      parseForecastJson('{"summary":"ไม่พบความเสี่ยงสำคัญ","details":[]}')
    ).toEqual({
      summary: 'ไม่พบความเสี่ยงสำคัญ',
      details: [],
    });
  });
});
