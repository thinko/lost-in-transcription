export async function translate(text, apiKey, options = {}) {
  const source = options.sourceLang || 'fr';
  const target = options.targetLang || 'en';
  const model = options.openaiModel || 'gpt-4o-mini';

  const sourceName = langName(source);
  const targetName = langName(target);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: [
            `You are a real-time caption translator. Translate the following ${sourceName} text to ${targetName}.`,
            `The source is Quebec French (Québécois) — handle colloquialisms, joual expressions, and informal contractions accurately.`,
            `Examples: "C'est tu" = "Is it", "pantoute" = "not at all", "j'va" = "I'm going to", "faque" = "so/therefore".`,
            `Return ONLY the translated text with no commentary, quotes, or formatting.`,
          ].join(' '),
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
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
