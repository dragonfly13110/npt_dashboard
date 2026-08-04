import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFarmer69Body } from '../../netlify/functions/lib/farmer69-chat.js';
import { searchFarmer69Chunks } from '../../netlify/functions/lib/farmer69-search.js';

describe('Farmer69 knowledge retrieval', () => {
  it('retrieves source-backed answers and injects evidence into the chatbot body', () => {
    const query = 'ที่ดินไม่มีเอกสารสิทธิ์ ใช้หลักฐานอะไร';
    const results = searchFarmer69Chunks(query, 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source_pdf_pages).toEqual(expect.any(Array));
    expect(results[0].url).toMatch(/^\/public\/farmer-manual\//);
    expect(
      results.some((result) => result.source_type === 'verbatim_page')
    ).toBe(true);

    const body = buildFarmer69Body(
      'gemini',
      { model: 'gemini-3.5-flash', contents: [] },
      query,
      []
    );

    expect(body.systemInstruction.parts[0].text).toContain('น้องข้าวหลาม ทบก.');
    expect(body.contents.at(-1).parts[0].text).toContain(
      'Farmer69 Knowledge Evidence'
    );
    expect(body.contents.at(-1).parts[0].text).toContain(
      '"sourceType":"verbatim_page"'
    );
  });

  it('keeps every curated FAQ seed searchable with source evidence', () => {
    const seeds = JSON.parse(
      fs.readFileSync('public/data/farmer69/faq-seeds.json', 'utf8')
    );

    for (const seed of seeds) {
      const results = searchFarmer69Chunks(seed.question, 5);
      expect(results.length, seed.question).toBeGreaterThan(0);
      expect(
        results.some((result) => result.document_slug === seed.slug),
        seed.question
      ).toBe(true);
      expect(
        results.some((result) => result.source_type === 'verbatim_page'),
        seed.question
      ).toBe(true);
    }
  });

  it('keeps every FAQ alias mapped to at least one intended article', () => {
    const seeds = JSON.parse(
      fs.readFileSync('public/data/farmer69/faq-seeds.json', 'utf8')
    );
    const aliases = new Map();

    for (const seed of seeds) {
      for (const alias of seed.aliases || []) {
        const slugs = aliases.get(alias) || new Set();
        slugs.add(seed.slug);
        aliases.set(alias, slugs);
      }
    }

    for (const [alias, slugs] of aliases) {
      const results = searchFarmer69Chunks(alias, 5);
      expect(results.length, alias).toBeGreaterThan(0);
      expect(
        results.some((result) => slugs.has(result.document_slug)),
        alias
      ).toBe(true);
      expect(
        results.some((result) => result.source_type === 'verbatim_page'),
        alias
      ).toBe(true);
    }
  });
});
