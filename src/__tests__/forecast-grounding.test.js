import { describe, expect, it } from 'vitest';
import {
  extractGroundingMetadata,
  parseForecastJson,
} from '../../netlify/functions/forecast-disease-insect.js';

describe('extractGroundingMetadata', () => {
  it('stores unique source URLs, search queries, and cited text', () => {
    const result = extractGroundingMetadata({
      groundingMetadata: {
        webSearchQueries: ['โรคพืช นครปฐม กรกฎาคม 2569'],
        groundingChunks: [
          { web: { uri: 'https://example.go.th/warning', title: 'คำเตือน' } },
          { web: { uri: 'https://example.go.th/warning', title: 'คำเตือน' } },
        ],
        groundingSupports: [
          {
            segment: { text: 'พบสภาพอากาศเอื้อต่อโรค' },
            groundingChunkIndices: [0, 1],
          },
        ],
      },
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
