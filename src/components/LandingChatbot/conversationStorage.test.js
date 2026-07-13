import { describe, expect, it, vi } from 'vitest';
import {
  LANDING_CHATBOT_CONTEXT_MESSAGE_LIMIT,
  LANDING_CHATBOT_HISTORY_STORAGE_KEY,
  LANDING_CHATBOT_MAX_MESSAGE_LENGTH,
  LANDING_CHATBOT_MAX_STORED_MESSAGES,
  loadLandingChatbotMessages,
  normalizeLandingChatbotMessages,
  saveLandingChatbotMessages,
} from './conversationStorage';

function createStorage(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) {
    values.set(LANDING_CHATBOT_HISTORY_STORAGE_KEY, initialValue);
  }

  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  };
}

describe('Landing chatbot conversation storage', () => {
  it('loads stored user and assistant messages instead of resetting on remount', () => {
    const storedMessages = [
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'จำเรื่องนี้ไว้นะ' },
    ];
    const storage = createStorage(JSON.stringify(storedMessages));

    expect(
      loadLandingChatbotMessages(
        [{ role: 'assistant', content: 'default' }],
        storage
      )
    ).toEqual(storedMessages);
  });

  it('falls back to default messages when stored data is invalid', () => {
    const fallbackMessages = [{ role: 'assistant', content: 'default' }];

    expect(
      loadLandingChatbotMessages(fallbackMessages, createStorage('{'))
    ).toEqual(fallbackMessages);
  });

  it('removes invalid roles and keeps only the latest bounded history', () => {
    const messages = Array.from(
      { length: LANDING_CHATBOT_MAX_STORED_MESSAGES + 5 },
      (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `${index}`,
      })
    );

    const normalized = normalizeLandingChatbotMessages([
      { role: 'system', content: 'secret' },
      { role: 'assistant', content: '' },
      ...messages,
    ]);

    expect(normalized).toHaveLength(LANDING_CHATBOT_MAX_STORED_MESSAGES);
    expect(normalized[0].content).toBe('5');
  });

  it('trims very long messages before saving', () => {
    const storage = createStorage();
    saveLandingChatbotMessages(
      [
        {
          role: 'user',
          content: 'x'.repeat(LANDING_CHATBOT_MAX_MESSAGE_LENGTH + 10),
        },
      ],
      storage
    );

    const saved = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(saved[0].content).toHaveLength(LANDING_CHATBOT_MAX_MESSAGE_LENGTH);
  });

  it('documents the model context limit separately from saved browser history', () => {
    expect(LANDING_CHATBOT_CONTEXT_MESSAGE_LIMIT).toBe(4);
    expect(LANDING_CHATBOT_CONTEXT_MESSAGE_LIMIT).toBeLessThan(
      LANDING_CHATBOT_MAX_STORED_MESSAGES
    );
  });
});
