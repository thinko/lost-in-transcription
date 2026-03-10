const DEFAULT_SYSTEM_PROMPT = [
  'You are a real-time caption translator. Translate the following {{SOURCE_LANG}} text to {{TARGET_LANG}}.',
  'The source is Quebec French (Québécois) — handle colloquialisms, joual expressions, and informal contractions accurately.',
  'Examples: "C\'est tu" = "Is it", "pantoute" = "not at all", "j\'va" = "I\'m going to", "faque" = "so/therefore".',
  'Return ONLY the translated text with no commentary, quotes, or formatting.',
].join(' ');

export { DEFAULT_SYSTEM_PROMPT };

export async function translate(text, apiKey, options = {}) {
  const source = options.sourceLang || 'fr';
  const target = options.targetLang || 'en';
  const model = options.openaiModel || 'gpt-4o-mini';
  const baseUrl = (options.openaiBaseUrl || 'https://api.openai.com').replace(/\/+$/, '');

  const sourceName = langName(source);
  const targetName = langName(target);

  const promptTemplate = options.openaiSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  const systemContent = promptTemplate
    .replace(/\{\{SOURCE_LANG\}\}/g, sourceName)
    .replace(/\{\{TARGET_LANG\}\}/g, targetName);

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    const label = baseUrl.includes('openai.com') ? 'OpenAI' : 'API';
    throw new Error(`${label} error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function langName(code) {
  const names = {
    fr: 'French',
    en: 'English',
    es: 'Spanish',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    nl: 'Dutch',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ar: 'Arabic',
    ru: 'Russian',
  };
  return names[code] || code;
}
