import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');

describe('AI model routing', () => {
  it('uses the requested Gemini direct models', () => {
    const directGemini = [
      'netlify/functions/ai-proxy.js',
      'netlify/functions/lib/line-ai/config.js',
      'netlify/functions/forecast-disease-insect.js',
      'src/components/LandingChatbot/LandingChatbot.jsx',
      'src/pages/SituationRoom.jsx',
      'src/utils/chatbotConstants.js',
    ]
      .map(read)
      .join('\n');

    expect(directGemini).not.toContain(['gemini-3.1', 'flash-lite'].join('-'));
    expect(directGemini).toContain('gemini-3.5-flash-lite');
    expect(directGemini).toContain('gemini-3.6-flash');
  });

  it('keeps OKMD Gemini Flash on 3.5', () => {
    expect(read('src/utils/chatbotConstants.js')).toContain(
      "kkuGeminiFlash: 'gemini-3.5-flash'"
    );
    expect(read('netlify/functions/forecast-disease-insect.js')).toContain(
      "FORECAST_KKU_MODEL || 'gemini-3.5-flash'"
    );
  });

  it('routes the landing chatbot to Gemini 3.5 Flash-Lite', () => {
    const landing = read('src/components/LandingChatbot/LandingChatbot.jsx');
    expect(landing).toContain(
      "VITE_LANDING_CHATBOT_MODEL || 'gemini-3.5-flash-lite'"
    );
    expect(landing).toContain("provider: 'gemini'");
  });
});
