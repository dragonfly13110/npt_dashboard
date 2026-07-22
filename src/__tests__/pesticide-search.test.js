import { describe, expect, it } from 'vitest';
import { searchPesticideArticles } from '../../netlify/functions/lib/pesticide-search.js';

describe('searchPesticideArticles', () => {
  it('does not treat a farmer group question as a pesticide query', () => {
    expect(searchPesticideArticles('กลุ่มไหนปลูกกล้วยบ้าง')).toEqual([]);
  });
});
