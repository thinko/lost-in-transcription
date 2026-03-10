export async function translate(text, apiKey, options = {}) {
  const source = options.sourceLang || 'fr';
  const target = options.targetLang || 'en';
  const host = options.libreUrl || 'https://libretranslate.com';

  const body = {
    q: text,
    source,
    target,
    format: 'text',
  };
  if (apiKey) body.api_key = apiKey;

  const response = await fetch(`${host}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LibreTranslate error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.translatedText;
}
