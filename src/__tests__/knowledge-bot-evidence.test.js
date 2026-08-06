import { describe, expect, it } from 'vitest';
import { buildKnowledgeBody } from '../../netlify/functions/lib/knowledge-chat.js';
import {
  searchFertilizerChunks,
  searchFrontierAgriChunks,
  searchMachineryChunks,
  searchRiceChunks,
  searchStouResearchChunks,
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
    expect(getKnowledgeBotKind('/public/stou-research/stou-14305')).toBe(
      'stou'
    );
    expect(
      getKnowledgeBotKind('/public/frontier-agri-research/agri-01-001')
    ).toBe('frontier-agri');
  });

  it('returns evidence linked to each collection corpus', () => {
    expect(searchFertilizerChunks('ส้ม ปุ๋ย')[0].url).toMatch(
      /^\/public\/fertilizers\//
    );
    expect(searchRiceChunks('โรคข้าว')[0].url).toMatch(/^\/public\/rice\//);
    expect(searchMachineryChunks('รถแทรกเตอร์อัตโนมัติ')[0].url).toMatch(
      /^\/public\/machinery\//
    );
    expect(searchStouResearchChunks('การส่งเสริมการผลิตข้าว')[0].url).toMatch(
      /^\/public\/stou-research\//
    );
    expect(searchFrontierAgriChunks('CRISPR ข้าว')[0].url).toMatch(
      /^\/public\/frontier-agri-research\//
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

  it('grounds the STOU research bot in its own internal article links', () => {
    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.5-flash-lite' },
      'มีงานวิจัยเรื่องการส่งเสริมการผลิตข้าวอะไรบ้าง',
      [{ role: 'user', parts: [{ text: 'มีงานวิจัยเรื่องข้าวอะไรบ้าง' }] }],
      'stou',
      'stou-14305'
    );
    const serialized = JSON.stringify(body);
    expect(body.systemInstruction.parts[0].text).toContain('ข้าวหลามงานวิจัย');
    expect(serialized).toContain('/public/stou-research/');
    expect(serialized).not.toContain('/public/machinery/');
  });

  it('grounds the frontier agriculture bot in its own internal article links', () => {
    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.5-flash-lite' },
      'มีงานวิจัย CRISPR ข้าวทนแล้งอะไรบ้าง',
      [{ role: 'user', parts: [{ text: 'มีงานวิจัย CRISPR ข้าวไหม' }] }],
      'frontier-agri',
      'agri-01-001'
    );
    const serialized = JSON.stringify(body);
    expect(body.systemInstruction.parts[0].text).toContain('ข้าวหลามเกษตรโลก');
    expect(serialized).toContain('/public/frontier-agri-research/');
    expect(serialized).not.toContain('/public/stou-research/');
  });
});
