import { describe, expect, it } from 'vitest';
import {
  searchPesticideArticles,
  searchPesticideChunks,
} from '../../netlify/functions/lib/pesticide-search.js';

describe('searchPesticideArticles', () => {
  it('does not treat a farmer group question as a pesticide query', () => {
    expect(searchPesticideArticles('กลุ่มไหนปลูกกล้วยบ้าง')).toEqual([]);
  });

  it('retrieves cited sections from the pesticide RAG corpus', () => {
    const results = searchPesticideChunks('มะม่วงเป็นโรคแอนแทรคโนส ใช้ยาอะไร');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      document_slug: 'mango-anthracnose-recommendation-2568',
      source_pages: '52',
    });
    expect(results[0].text).toContain('แอนแทรคโนส');
  });
});
