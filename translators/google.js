export async function translate(text, apiKey, options = {}) {
  const source = options.sourceLang || 'fr';
  const target = options.targetLang || 'en';

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Translate error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}
