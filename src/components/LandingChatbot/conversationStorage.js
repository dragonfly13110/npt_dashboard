export const LANDING_CHATBOT_HISTORY_STORAGE_KEY =
  'npt_landing_chatbot_messages_v1';
export const LANDING_CHATBOT_MAX_STORED_MESSAGES = 30;
export const LANDING_CHATBOT_CONTEXT_MESSAGE_LIMIT = 4;
export const LANDING_CHATBOT_MAX_MESSAGE_LENGTH = 4000;

const VALID_ROLES = new Set(['assistant', 'user']);

export function normalizeLandingChatbotMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (message) =>
        message &&
        VALID_ROLES.has(message.role) &&
        typeof message.content === 'string' &&
        message.content.trim()
    )
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, LANDING_CHATBOT_MAX_MESSAGE_LENGTH),
    }))
    .slice(-LANDING_CHATBOT_MAX_STORED_MESSAGES);
}

export function loadLandingChatbotMessages(defaultMessages, storage) {
  const fallbackMessages = normalizeLandingChatbotMessages(defaultMessages);
  const storageApi = storage ?? globalThis.localStorage;

  try {
    const stored = storageApi?.getItem(LANDING_CHATBOT_HISTORY_STORAGE_KEY);
    if (!stored) return fallbackMessages;

    const parsed = JSON.parse(stored);
    const messages = normalizeLandingChatbotMessages(parsed);

    return messages.length > 0 ? messages : fallbackMessages;
  } catch (error) {
    console.error('Error reading landing chatbot messages', error);
    return fallbackMessages;
  }
}

export function saveLandingChatbotMessages(messages, storage) {
  const storageApi = storage ?? globalThis.localStorage;
  const normalizedMessages = normalizeLandingChatbotMessages(messages);

  try {
    storageApi?.setItem(
      LANDING_CHATBOT_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizedMessages)
    );
  } catch (error) {
    console.error('Error saving landing chatbot messages', error);
  }
}

export function clearLandingChatbotMessages(storage) {
  const storageApi = storage ?? globalThis.localStorage;

  try {
    storageApi?.removeItem(LANDING_CHATBOT_HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing landing chatbot messages', error);
  }
}
