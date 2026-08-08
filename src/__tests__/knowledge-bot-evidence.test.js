import { describe, expect, it } from 'vitest';
import { buildKnowledgeBody } from '../../netlify/functions/lib/knowledge-chat.js';
import {
  searchFertilizerChunks,
  searchFrontierAgriChunks,
  searchKnowledgeHubChunks,
  searchMachineryChunks,
  searchNptResearchChunks,
  searchPlantCultivationChunks,
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
    expect(getKnowledgeBotKind('/public/npt-research/npt-01-001')).toBe(
      'npt-research'
    );
    expect(getKnowledgeBotKind('/public/plant-cultivation/crop-03-005')).toBe(
      'cultivation'
    );
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
    expect(searchNptResearchChunks('งานวิจัยข้าวนครปฐม')[0].url).toMatch(
      /^\/public\/npt-research\//
    );
    expect(searchPlantCultivationChunks('การจัดการน้ำกล้วยไม้')[0].url).toMatch(
      /^\/public\/plant-cultivation\//
    );
  });

  it('keeps the matching later collection in the shared Knowledge Hub search', () => {
    const cases = [
      ['ข้าว', 'rice'],
      ['มีข้อมูลโรคและแมลงข้าวหรือไม่?', 'rice'],
      ['หุ่นยนต์ภาคสนามใช้ในเกษตรอย่างไร', 'machinery'],
      ['งานวิจัยส่งเสริมการผลิตข้าวมีอะไรบ้าง', 'stou-research'],
      ['CRISPR ข้าวทนแล้ง', 'frontier-agri-research'],
      ['งานวิจัยข้าวนครปฐม', 'npt-research'],
      ['หลักการเพาะปลูกกล้วยไม้', 'plant-cultivation'],
    ];

    for (const [query, collection] of cases) {
      expect(
        searchKnowledgeHubChunks(query, 12).some(
          (chunk) => chunk.hubCollection === collection
        )
      ).toBe(true);
    }

    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.6-flash' },
      'มีข้อมูลโรคและแมลงข้าวหรือไม่?',
      [],
      'hub'
    );
    expect(JSON.stringify(body)).toContain('/public/rice/');
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

  it('grounds the Nakhon Pathom research bot in its local article links', () => {
    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.5-flash-lite' },
      'งานวิจัยข้าวในนครปฐมมีอะไรบ้าง',
      [{ role: 'user', parts: [{ text: 'งานวิจัยข้าวในนครปฐมมีอะไรบ้าง' }] }],
      'npt-research',
      'npt-01-001'
    );
    const serialized = JSON.stringify(body);
    expect(body.systemInstruction.parts[0].text).toContain(
      'ข้าวหลามวิจัยนครปฐม'
    );
    expect(serialized).toContain('/public/npt-research/');
    expect(serialized).not.toContain('/public/frontier-agri-research/');
  });

  it('grounds the key crop cultivation bot in its own article links', () => {
    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.5-flash-lite' },
      'กล้วยไม้ควรจัดการน้ำและโรงเรือนอย่างไร',
      [
        {
          role: 'user',
          parts: [{ text: 'หลักการปลูกกล้วยไม้มีอะไรบ้าง' }],
        },
      ],
      'cultivation',
      'crop-03-005'
    );
    const serialized = JSON.stringify(body);
    expect(body.systemInstruction.parts[0].text).toContain(
      'ข้าวหลามหลักการปลูก'
    );
    expect(serialized).toContain('/public/plant-cultivation/');
    expect(serialized).not.toContain('/public/npt-research/');
  });

  it('keeps an article-scoped frontier bot inside the current article corpus', () => {
    const body = buildKnowledgeBody(
      'gemini',
      { model: 'gemini-3.5-flash-lite' },
      'ข้อมูลเกี่ยวกับปุ๋ยและนวัตกรรมล้ำยุคที่เชื่อมโยงในคลังมีอะไรบ้าง',
      [
        {
          role: 'user',
          parts: [
            {
              text: 'ข้อมูลเกี่ยวกับปุ๋ยและนวัตกรรมล้ำยุคที่เชื่อมโยงในคลังมีอะไรบ้าง',
            },
          ],
        },
      ],
      'frontier-agri',
      'agri-02-012'
    );
    const serialized = JSON.stringify(body);
    expect(serialized).toContain('/public/frontier-agri-research/agri-02-012');
    expect(serialized).not.toContain(
      '/public/frontier-agri-research/agri-08-009'
    );
  });
});
