import { LANGUAGE_DIALECTS } from '../languages.js';

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

  const sourceName = options.sourceDialectName || langName(source);
  const targetName = options.targetDialectName || langName(target);

  const glossaryTerms = options.glossaryTerms || [];
  const glossaryBlock = glossaryTerms.length
    ? `\nTECHNICAL GLOSSARY — these terms may appear mangled in the source transcription. Recognize and preserve them exactly: ${glossaryTerms.join(', ')}.`
    : '';

  const promptTemplate = options.openaiSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  let systemContent = promptTemplate
    .replace(/\{\{SOURCE_LANG\}\}/g, sourceName)
    .replace(/\{\{TARGET_LANG\}\}/g, targetName);

  if (systemContent.includes('{{GLOSSARY}}')) {
    systemContent = systemContent.replace(/\{\{GLOSSARY\}\}/g, glossaryBlock.trim());
  } else if (glossaryBlock) {
    systemContent += glossaryBlock;
  }

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
    const isLocal = !baseUrl.includes('openai.com');
    const label = isLocal ? 'API' : 'OpenAI';
    if (isLocal && response.status === 403 && !err.trim()) {
      throw new Error(
        `${label} returned 403 (Forbidden). If using Ollama, set OLLAMA_ORIGINS=* and restart it.`
      );
    }
    throw new Error(`${label} error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function langName(code) {
  return LANGUAGE_DIALECTS[code]?.name || code;
}
