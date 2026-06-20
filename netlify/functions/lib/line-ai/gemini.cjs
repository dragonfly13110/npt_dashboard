'use strict';

const PLAN_SCHEMA = {
  type: 'OBJECT',
  required: ['intent', 'searchTerms', 'tools', 'needsGrounding', 'answer'],
  properties: {
    intent: {
      type: 'STRING',
      enum: ['database', 'general', 'current', 'clarify'],
    },
    searchTerms: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 5 },
    tools: {
      type: 'ARRAY',
      items: {
        type: 'STRING',
        enum: ['global_search', 'latest_weather', 'fire_hotspots'],
      },
      maxItems: 3,
    },
    needsGrounding: { type: 'BOOLEAN' },
    answer: { type: 'STRING' },
    clarification: { type: 'STRING' },
  },
};

const modelCache = new Map();

function createGeminiClient({
  fetch = globalThis.fetch,
  model,
  fallbacks = [],
  timeoutMs = 8000,
}) {
  const getFetch = () => fetch;

  async function request(apiKey, path, body = null, method = 'POST') {
    const url = `https://generativelanguage.googleapis.com${path}?key=${apiKey}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await getFetch()(url, options);
    if (res.status < 200 || res.status >= 300) {
      let retryAfterMs = null;
      const retryAfter =
        res.headers?.get?.('retry-after') || res.headers?.['retry-after'];
      if (retryAfter) {
        const secs = Number(retryAfter);
        if (Number.isFinite(secs)) {
          retryAfterMs = secs * 1000;
        } else {
          const date = Date.parse(retryAfter);
          if (!Number.isNaN(date)) {
            retryAfterMs = Math.max(0, date - Date.now());
          }
        }
      }
      const err = new Error(`Gemini request failed: ${res.status}`);
      err.status = res.status;
      err.retryAfterMs = retryAfterMs;
      throw err;
    }
    return res.json();
  }

  async function resolveModel(apiKey) {
    const cacheKey = apiKey;
    const cached = modelCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.modelName;
    }

    const data = await request(apiKey, '/v1beta/models', null, 'GET');
    const available = (data.models || [])
      .filter((m) =>
        m.supportedGenerationMethods?.includes?.('generateContent')
      )
      .map((m) => m.name.replace(/^models\//, ''));

    const requestedClean = model.replace(/^models\//, '');
    let selected = null;
    if (available.includes(requestedClean)) {
      selected = requestedClean;
    } else {
      for (const fb of fallbacks) {
        const fbClean = fb.replace(/^models\//, '');
        if (available.includes(fbClean)) {
          selected = fbClean;
          break;
        }
      }
    }

    if (!selected) {
      throw new Error(`Model not available: ${model}`);
    }

    modelCache.set(cacheKey, {
      modelName: selected,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return selected;
  }

  async function plan(apiKey, modelName, { question, history = [] }) {
    const systemPrompt = `You are Nakhon Pathom Agriculture Smart Portal LINE chatbot orchestrator.
Analyze user request and categorize.
Generate JSON complying with the schema.
- intent: 'database' if we need to search databases (community enterprises, farmer info, weather, hotspots, etc.), 'general' for generic questions, 'current' for daily/real-time info (like today's weather/news), 'clarify' if unclear.
- tools: allowlisted tools ONLY ['global_search', 'latest_weather', 'fire_hotspots'].
- searchTerms: search terms for global_search. Extract ONLY specific commodities (e.g., 'ข้าว', 'กล้วยไม้'), specific districts (e.g., 'เมืองนครปฐม', 'สามพราน'), or specific entity/people names.
  CRITICAL: Never output generic category names ('แปลงใหญ่', 'วิสาหกิจชุมชน', 'กลุ่มเกษตรกร', 'ศูนย์เรียนรู้') or the province name ('นครปฐม', 'จังหวัดนครปฐม') by themselves, as they flood the search results.
- needsGrounding: true ONLY if intent is 'current'.
- answer: direct response if general/clarify.`;

    const contents = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    contents.push({
      role: 'user',
      parts: [{ text: question }],
    });

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    };

    const cleanModel = modelName.replace(/^models\//, '');
    const data = await request(
      apiKey,
      `/v1beta/models/${cleanModel}:generateContent`,
      body
    );
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidate returned from Gemini');

    const text = candidate.content.parts.map((p) => p.text).join('');
    const parsed = JSON.parse(text);

    // Validate and sanitize response
    const allowedIntents = ['database', 'general', 'current', 'clarify'];
    if (!allowedIntents.includes(parsed.intent)) parsed.intent = 'general';

    const allowedTools = ['global_search', 'latest_weather', 'fire_hotspots'];
    parsed.tools = (parsed.tools || [])
      .filter((t) => allowedTools.includes(t))
      .slice(0, 3);
    parsed.searchTerms = (parsed.searchTerms || [])
      .map((t) => String(t).slice(0, 50))
      .slice(0, 5);

    if (parsed.intent !== 'current') {
      parsed.needsGrounding = false;
    } else {
      parsed.needsGrounding = Boolean(parsed.needsGrounding);
    }

    return parsed;
  }

  async function synthesize(
    apiKey,
    modelName,
    { question, history = [], evidence = [], grounding = false }
  ) {
    const systemPrompt = `You are a helpful Thai AI assistant for Nakhon Pathom agricultural portal.
Provide response in Thai. Keep it concise, engaging, and professional.
If evidence/records are provided, answer based strictly on the evidence and cite source names. Do not invent facts.`;

    const contents = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const evidenceStr =
      evidence && evidence.length
        ? `Evidence data:\n${JSON.stringify(evidence)}`
        : '';
    const userPrompt = `${evidenceStr}\nQuestion: ${question}`;
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 700,
      },
    };

    if (grounding) {
      body.tools = [{ google_search: {} }];
    }

    const cleanModel = modelName.replace(/^models\//, '');
    const data = await request(
      apiKey,
      `/v1beta/models/${cleanModel}:generateContent`,
      body
    );
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidate returned from Gemini');

    const text = candidate.content.parts.map((p) => p.text).join('');
    return text.slice(0, 4000);
  }

  return {
    resolveModel,
    plan,
    synthesize,
  };
}

module.exports = { createGeminiClient };
