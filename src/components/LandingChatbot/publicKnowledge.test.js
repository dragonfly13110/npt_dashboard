import { describe, expect, it } from 'vitest';
import { LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT } from './publicKnowledge';

describe('LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT', () => {
  it('keeps landing answers on public routes and forbids guessed numbers', () => {
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).toContain(
      '/public/agricultural-areas'
    );
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).toContain('/smart-map');
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).toContain('/manual');
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).toContain(
      '/public/agricultural-career-groups'
    );
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).toContain(
      '/public/young-farmer-groups'
    );
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).toContain('ห้ามแต่งตัวเลข');
    expect(LANDING_CHATBOT_PUBLIC_KNOWLEDGE_PROMPT).not.toContain(
      '/dashboard/chatbot'
    );
  });
});
