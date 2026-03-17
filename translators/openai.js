import { LANGUAGE_DIALECTS, DIALECT_DISPLAY_NAMES, DIALECT_PROMPT_HINTS } from '../languages.js';

/**
 * Build a dialect-aware default system prompt.
 * Exported so popup.js can call it via message passing for the "Reset" button.
 */
export function buildDefaultPrompt(sourceLang, sourceDialect, targetLang, targetDialect) {
  const sourceName = (sourceDialect && DIALECT_DISPLAY_NAMES[sourceDialect])
    || LANGUAGE_DIALECTS[sourceLang]?.name || sourceLang;
  const targetName = (targetDialect && DIALECT_DISPLAY_NAMES[targetDialect])
    || LANGUAGE_DIALECTS[targetLang]?.name || targetLang;

  const lines = [
    `You are a real-time caption translator. Translate the following {{SOURCE_LANG}} text to {{TARGET_LANG}}.`,
  ];

  const dialectCode = sourceDialect || sourceLang;
  const hint = DIALECT_PROMPT_HINTS[dialectCode];
  if (hint) {
    lines.push(`The source is ${sourceName} — ${hint.note}.`);
    if (hint.examples) {
      lines.push(`Examples: ${hint.examples}.`);
    }
  }

  lines.push('Return ONLY the translated text with no commentary, quotes, or formatting.');
  return lines.join(' ');
}

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

  const fallbackPrompt = buildDefaultPrompt(
    source, options.sourceDialect || '', target, options.targetDialect || ''
  );
  const promptTemplate = options.openaiSystemPrompt || fallbackPrompt;
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
