# LINE AI-Pure Routing Design

## Goal

Route every non-greeting LINE text message through Gemini. Keep local handling only for greetings, menu, and help.

## Behavior

- Local replies: greetings, `เมนู`, `help`, `เริ่ม`, and `เริ่มต้น`.
- All other text: Gemini plans intent, selects allowlisted database/search tools, then answers from returned evidence.
- Remove deterministic topic overrides and legacy command/search routing from the active text flow.
- AI replies in Thai, answer the question immediately, normally within 2–5 lines.
- No unsolicited empathy, encouragement, repeated greeting, or generic farming advice.
- Use bullets only when they improve scanability. Offer more detail only when useful.
- Never invent database facts. When evidence is missing, say that no matching data was found.
- If Gemini fails or times out, reply with one short retry message; do not silently run legacy search.

## Safety and Performance

- Keep existing allowlisted tools and public-table validation.
- Keep LINE signature validation, model key pool, timeout, cache, and evidence-only synthesis.
- Reduce synthesis output budget because LINE answers are short.
- Preserve conversation history and saved crop/district preferences.

## Tests

- Non-greeting text reaches orchestrator before legacy handlers.
- Greeting/menu/help remain local.
- AI failure produces the short retry reply and does not enter legacy search.
- Planner prompt strongly classifies portal-data questions as database requests.
- Synthesis prompt enforces direct, short, non-emotional responses.
