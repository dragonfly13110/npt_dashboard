import { describe, expect, it } from 'vitest';
import {
  searchPesticideArticles,
  searchPesticideChunks,
} from '../../netlify/functions/lib/pesticide-search.js';
import { buildPesticideBody } from '../../netlify/functions/lib/pesticide-chat.js';

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

  it('retrieves chilli worm sections for a natural farmer question', () => {
    const results = searchPesticideChunks('หนอนมันมากินพริก ทำไงดี');

    expect(results[0]).toMatchObject({
      document_slug: 'chilli-insect-mite-pest-management-2568',
      plant: 'พริก',
    });
    expect(
      results.some((result) => result.section_heading.includes('หนอน'))
    ).toBe(true);
  });

  it('uses conversation and current article context for follow-up questions', () => {
    const body = buildPesticideBody(
      'gemini',
      {},
      'แล้วใช้อัตราเท่าไหร่',
      [
        { role: 'user', parts: [{ text: 'หนอนกินพริกทำไง' }] },
        { role: 'model', parts: [{ text: 'กำลังตรวจหลักฐาน' }] },
        { role: 'user', parts: [{ text: 'แล้วใช้อัตราเท่าไหร่' }] },
      ],
      'chilli-insect-mite-pest-management-2568'
    );

    expect(JSON.stringify(body.contents)).toContain(
      '/public/pesticides/chilli-insect-mite-pest-management-2568'
    );
  });
});
