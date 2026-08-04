import { describe, expect, it } from 'vitest';
import { buildKnowledgeBody } from '../../netlify/functions/lib/knowledge-chat.js';
import {
  searchFertilizerChunks,
  searchMachineryChunks,
  searchRiceChunks,
} from '../../netlify/functions/lib/knowledge-search.js';
import { getKnowledgeBotKind } from '../components/LandingChatbot/knowledgeBotKind';

describe('knowledge bots', () => {
  it('routes every public knowledge collection to its own bot kind', () => {
    expect(getKnowledgeBotKind('/public/knowledge-hub')).toBe('hub');
    expect(getKnowledgeBotKind('/public/fertilizers/citrus')).toBe(
      'fertilizer'
    );
    expect(getKnowledgeBotKind('/public/rice/rice-research-01')).toBe('rice');
    expect(getKnowledgeBotKind('/public/machinery/machinery-01-deep')).toBe(
      'machinery'
    );
    expect(getKnowledgeBotKind('/public/orchids')).toBe('orchid');
    expect(getKnowledgeBotKind('/public/farmer-manual')).toBe('farmer');
    expect(getKnowledgeBotKind('/public/pesticides')).toBe('pesticide');
  });

  it('returns evidence linked to the matching fertilizer, rice, and machinery corpus', () => {
    expect(searchFertilizerChunks('ส้ม ปุ๋ย')[0].url).toMatch(
      /^\/public\/fertilizers\//
    );
    expect(searchRiceChunks('โรคข้าว')[0].url).toMatch(/^\/public\/rice\//);
    expect(searchMachineryChunks('รถแทรกเตอร์อัตโนมัติ')[0].url).toMatch(
      /^\/public\/machinery\//
    );
  });

  it('puts collection evidence and source links into the model-owned prompt', () => {
    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.5-flash-lite' },
      'ส้มควรใส่ปุ๋ยอย่างไร',
      [{ role: 'user', parts: [{ text: 'ส้มควรใส่ปุ๋ยอย่างไร' }] }],
      'fertilizer',
      'citrus-fertilizer-recommendation-2566'
    );
    const serialized = JSON.stringify(body);
    expect(body.systemInstruction.parts[0].text).toContain('ข้าวหลามปุ๋ย');
    expect(serialized).toContain('/public/fertilizers/');
    expect(serialized).not.toContain('/public/rice/');
  });
});
