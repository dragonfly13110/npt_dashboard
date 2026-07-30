import { describe, expect, it } from 'vitest';
import { resolveDiseaseKnowledge } from './diseaseKnowledge';

describe('disease knowledge mapping', () => {
  it('uses stable id and safely supports old forecasts by crop and alias', () => {
    expect(resolveDiseaseKnowledge({ disease_id: 'rice-blast' })?.crop).toBe(
      'ข้าว'
    );
    expect(
      resolveDiseaseKnowledge({
        name: 'โรคเน่าดำกล้วยไม้',
        target_crop: 'กล้วยไม้',
      })?.pesticideSlug
    ).toBe('orchid-disease-recommendation-2568');
    expect(
      resolveDiseaseKnowledge({
        name: 'โรคเน่าดำ',
        target_crop: 'ถั่วเขียว',
      })
    ).toBeUndefined();
  });
});
