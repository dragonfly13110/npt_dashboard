import { describe, expect, it } from 'vitest';
import { getLandingQueryContext } from '../../netlify/functions/lib/landing-chat/query-context.js';

describe('getLandingQueryContext', () => {
  it.each([
    ['แปลงใหญ่มะพร้าวในสามพราน', 'global_search', 'large_plots'],
    ['วันนี้อากาศเป็นอย่างไร', 'latest_weather', 'daily_weather'],
    ['มีจุดความร้อนหรือฝุ่นไหม', 'fire_hotspots', 'fire_hotspots'],
    ['โรคพืชในข้าวสัปดาห์นี้', 'disease_forecast', 'ai_disease_forecasts'],
    ['วิสาหกิจชุมชนในกำแพงแสนมีกี่กลุ่ม', 'area_summary', 'community_enterprises'],
  ])('%s', (question, tool, table) => {
    expect(getLandingQueryContext(question)).toMatchObject({
      tools: [tool],
      tables: [table],
    });
  });

  it('extracts district and useful terms', () => {
    expect(getLandingQueryContext('แปลงใหญ่มะพร้าวในสามพราน')).toMatchObject({
      searchTerms: expect.arrayContaining(['มะพร้าว', 'สามพราน']),
      context: { district: 'สามพราน' },
    });
  });

  it('does not route general knowledge', () => {
    expect(getLandingQueryContext('ปลูกมะเขือเทศอย่างไร')).toEqual({
      tools: [],
      tables: [],
      searchTerms: [],
      context: {},
    });
  });
});
