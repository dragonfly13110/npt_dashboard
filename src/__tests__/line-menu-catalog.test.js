import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Static import will fail if the file does not exist, which satisfies the failing test step.
import catalog from '../domain/lineMenuCatalog.json';

describe('LINE Menu Catalog Contract', () => {
  it('asserts six unique Rich Menu actions', () => {
    expect(catalog).toBeInstanceOf(Array);
    expect(catalog.length).toBe(6);

    const actions = catalog.map((item) => item.action);
    const uniqueActions = new Set(actions);
    expect(uniqueActions.size).toBe(6);
  });

  it('asserts non-empty Thai labels for each action', () => {
    for (const item of catalog) {
      expect(item.label).toBeDefined();
      expect(typeof item.label).toBe('string');
      expect(item.label.trim().length).toBeGreaterThan(0);

      // Basic check for Thai Unicode range: \u0e00-\u0e7f
      const hasThai = /[\u0e00-\u0e7f]/.test(item.label);
      expect(hasThai).toBe(true);
    }
  });

  it('asserts valid postback|uri|message types', () => {
    const validTypes = ['postback', 'uri', 'message'];
    for (const item of catalog) {
      expect(item.responseKind).toBeDefined();
      expect(validTypes).toContain(item.responseKind);
    }
  });

  it('asserts a handler mapping for every postback in webhook-core', () => {
    // Read webhook-core.js to verify that every postback action is mapped/handled.
    const webhookCorePath = path.resolve(
      __dirname,
      '../../netlify/functions/lib/line-ai/webhook-core.js'
    );
    const webhookCode = fs.readFileSync(webhookCorePath, 'utf8');

    const postbackActions = catalog
      .filter((item) => item.responseKind === 'postback')
      .map((item) => item.action);

    expect(webhookCode).not.toContain('Placeholder handler');
    for (const action of postbackActions) {
      const start = webhookCode.indexOf(`params.action === '${action}'`);
      expect(start).toBeGreaterThan(-1);
      const nextHandler = webhookCode.indexOf('params.action ===', start + 1);
      const handler = webhookCode.slice(
        start,
        nextHandler === -1 ? webhookCode.indexOf('\n}', start) : nextHandler
      );
      expect(handler).toContain('sendLineReply');
    }
  });
});
