export async function translate(text, apiKey, options = {}) {
  const source = (options.sourceLang || 'fr').toUpperCase();
  const target = (options.targetLang || 'en').toUpperCase();

  const isFreeKey = apiKey.endsWith(':fx');
  const baseUrl = isFreeKey
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  const response = await fetch(`${baseUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: source,
      target_lang: target === 'EN' ? 'EN-US' : target,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepL error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}
