/**
 * Shared language + dialect definitions with per-backend code mappings.
 *
 * Loaded as a plain <script> in popup.html (sets window.LANGUAGE_DIALECTS)
 * and imported as an ES module in background.js / translators.
 *
 * Sources:
 *   DeepL       — https://developers.deepl.com/docs/getting-started/supported-languages
 *   Google      — https://docs.cloud.google.com/translate/docs/languages
 *   LibreTranslate — https://docs.libretranslate.com/guides/supported_languages/
 *   Firefox/Bergamot — https://storage.googleapis.com/.../db/models.json (Marian NMT)
 *   ParaCrawl   — https://paracrawl.eu/index.php
 */

const LANGUAGE_DIALECTS = {
  // ── Major world languages ───────────────────────────────────────────────
  ar: {
    name: 'Arabic',
    dialects: [
      { code: '', label: 'Modern Standard' },
      { code: 'ar-SA', label: 'Peninsular / Gulf' },
      { code: 'ar-EG', label: 'Egyptian' },
      { code: 'ar-LB', label: 'Levantine' },
      { code: 'ar-IQ', label: 'Mesopotamian / Iraqi' },
      { code: 'ar-MA', label: 'Maghrebi (Darija)' },
    ],
  },
  bn: { name: 'Bengali', dialects: [] },
  bg: { name: 'Bulgarian', dialects: [] },
  ca: { name: 'Catalan', dialects: [] },
  zh: {
    name: 'Chinese',
    dialects: [
      { code: '', label: 'Simplified (Mandarin)' },
      { code: 'zh-Hant', label: 'Traditional' },
      { code: 'zh-TW', label: 'Taiwanese Mandarin' },
      { code: 'zh-HK', label: 'Hong Kong' },
      { code: 'yue', label: 'Cantonese' },
    ],
  },
  hr: { name: 'Croatian', dialects: [] },
  cs: { name: 'Czech', dialects: [] },
  da: { name: 'Danish', dialects: [] },
  nl: {
    name: 'Dutch',
    dialects: [
      { code: '', label: 'Standard' },
      { code: 'nl-NL', label: 'Hollands' },
      { code: 'nl-BE', label: 'Flemish' },
      { code: 'nl-SR', label: 'Surinamese' },
      { code: 'nl-CW', label: 'Caribbean' },
      { code: 'af', label: 'Afrikaans' },
    ],
  },
  en: {
    name: 'English',
    dialects: [
      { code: '', label: 'Standard' },
      { code: 'en-US', label: 'American' },
      { code: 'en-GB', label: 'British' },
      { code: 'en-SCO', label: 'Highland / Scottish' },
      { code: 'en-IE', label: 'Irish' },
      { code: 'en-CA', label: 'Canadian' },
      { code: 'en-AU', label: 'Australian' },
      { code: 'en-NZ', label: 'New Zealand' },
      { code: 'en-ZA', label: 'South African' },
    ],
  },
  fi: { name: 'Finnish', dialects: [] },
  fr: {
    name: 'French',
    dialects: [
      { code: '', label: 'Standard' },
      { code: 'fr-QC', label: 'Quebec (Québécois)' },
      { code: 'fr-FR', label: 'European' },
      { code: 'fr-CA', label: 'Canadian' },
      { code: 'fr-CH', label: 'Swiss' },
    ],
  },
  de: {
    name: 'German',
    dialects: [
      { code: '', label: 'Standard' },
      { code: 'de-DE', label: 'Bundesdeutsch' },
      { code: 'de-AT', label: 'Austrian' },
      { code: 'de-CH', label: 'Swiss' },
    ],
  },
  el: { name: 'Greek', dialects: [] },
  he: { name: 'Hebrew', dialects: [] },
  hi: { name: 'Hindi', dialects: [] },
  hu: { name: 'Hungarian', dialects: [] },
  id: { name: 'Indonesian', dialects: [] },
  it: { name: 'Italian', dialects: [] },
  ja: { name: 'Japanese', dialects: [] },
  ko: { name: 'Korean', dialects: [] },
  ms: { name: 'Malay', dialects: [] },
  nb: {
    name: 'Norwegian',
    dialects: [
      { code: '', label: 'Bokmål' },
      { code: 'nn', label: 'Nynorsk' },
    ],
  },
  fa: { name: 'Persian', dialects: [] },
  pl: { name: 'Polish', dialects: [] },
  pt: {
    name: 'Portuguese',
    dialects: [
      { code: '', label: 'Standard' },
      { code: 'pt-BR', label: 'Brazilian' },
      { code: 'pt-PT', label: 'European' },
    ],
  },
  ro: { name: 'Romanian', dialects: [] },
  ru: { name: 'Russian', dialects: [] },
  sr: { name: 'Serbian', dialects: [] },
  sk: { name: 'Slovak', dialects: [] },
  es: {
    name: 'Spanish',
    dialects: [
      { code: '', label: 'Standard' },
      { code: 'es-ES', label: 'European / Castilian' },
      { code: 'es-MX', label: 'Mexican' },
      { code: 'es-AR', label: 'Rioplatense' },
      { code: 'es-419', label: 'Latin American' },
      { code: 'es-CO', label: 'Colombian' },
    ],
  },
  sw: { name: 'Swahili', dialects: [] },
  sv: { name: 'Swedish', dialects: [] },
  tl: { name: 'Tagalog', dialects: [] },
  th: { name: 'Thai', dialects: [] },
  tr: { name: 'Turkish', dialects: [] },
  uk: { name: 'Ukrainian', dialects: [] },
  ur: { name: 'Urdu', dialects: [] },
  vi: { name: 'Vietnamese', dialects: [] },
};

/**
 * Resolve a dialect code to a human-readable name for use in LLM prompts.
 * Falls back to the base language name when no dialect is selected.
 */
const DIALECT_DISPLAY_NAMES = {
  // French
  'fr-QC': 'Quebec French (Québécois)',
  'fr-FR': 'European French (Metropolitan)',
  'fr-CA': 'Canadian French',
  'fr-CH': 'Swiss French',
  // English
  'en-US': 'American English',
  'en-GB': 'British English',
  'en-SCO': 'Highland / Scottish English',
  'en-IE': 'Irish English',
  'en-CA': 'Canadian English',
  'en-AU': 'Australian English',
  'en-NZ': 'New Zealand English',
  'en-ZA': 'South African English',
  // Spanish
  'es-ES': 'European / Castilian Spanish',
  'es-MX': 'Mexican Spanish',
  'es-AR': 'Rioplatense Spanish',
  'es-419': 'Latin American Spanish',
  'es-CO': 'Colombian Spanish',
  // German
  'de-DE': 'Standard German (Bundesdeutsch)',
  'de-AT': 'Austrian German',
  'de-CH': 'Swiss German',
  // Portuguese
  'pt-BR': 'Brazilian Portuguese',
  'pt-PT': 'European Portuguese',
  // Dutch
  'nl-NL': 'Hollands Dutch',
  'nl-BE': 'Flemish (Belgian Dutch)',
  'nl-SR': 'Surinamese Dutch',
  'nl-CW': 'Caribbean Dutch',
  'af': 'Afrikaans',
  // Chinese
  'zh-Hant': 'Traditional Chinese',
  'zh-TW': 'Taiwanese Mandarin (Traditional)',
  'zh-HK': 'Hong Kong Chinese (Traditional)',
  'yue': 'Cantonese',
  // Arabic
  'ar-SA': 'Peninsular / Gulf Arabic',
  'ar-EG': 'Egyptian Arabic',
  'ar-LB': 'Levantine Arabic',
  'ar-IQ': 'Mesopotamian / Iraqi Arabic',
  'ar-MA': 'Maghrebi Arabic (Darija)',
  // Norwegian
  'nn': 'Norwegian Nynorsk',
};

/*
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Per-backend dialect → API code maps                                    │
 * │                                                                         │
 * │  Only entries where the API actually supports a distinct code for the   │
 * │  dialect are listed. Unlisted dialects fall through to the base code.   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/**
 * DeepL API target language codes.
 * Source: https://developers.deepl.com/docs/getting-started/supported-languages
 *
 * DeepL only differentiates regional variants for *target* languages.
 * Source codes use the bare form (EN, ES, PT, ZH).
 *
 * Supported target variants:
 *   EN-US, EN-GB, PT-BR, PT-PT, ZH-HANS, ZH-HANT, ES (Spain), ES-419 (LatAm)
 *   AF (Afrikaans — separate language), YUE (Cantonese — separate language)
 */
const DEEPL_DIALECT_MAP = {
  'en-US': 'EN-US',
  'en-GB': 'EN-GB',
  'pt-BR': 'PT-BR',
  'pt-PT': 'PT-PT',
  'zh-Hant': 'ZH-HANT',
  'zh-TW': 'ZH-HANT',
  'zh-HK': 'ZH-HANT',
  'es-419': 'ES-419',
  'es-MX': 'ES-419',
  'es-AR': 'ES-419',
  'es-CO': 'ES-419',
  'af': 'AF',
  'yue': 'YUE',
};

/**
 * Google Cloud Translation language codes.
 * Source: https://docs.cloud.google.com/translate/docs/languages
 *
 * Google's Translation LLM supports many regional BCP-47 codes natively:
 *   English:     en-US, en-GB, en-AU, en-CA, en-NZ, en-PH, en-ZA
 *   French:      fr, fr-FR, fr-CA, fr-CH
 *   Spanish:     es, es-ES, es-MX, es-AR, es-CO, es-419, es-CL, es-PE, ...
 *   Portuguese:  pt, pt-BR, pt-PT
 *   Dutch:       nl, nl-BE
 *   Chinese:     zh / zh-CN, zh-TW, zh-HK, zh-Hans, zh-Hant
 *   Arabic:      ar, ar-SA
 *   Afrikaans:   af  (distinct language code)
 *   Cantonese:   yue (distinct language code)
 *   Scots Gaelic: gd
 */
const GOOGLE_DIALECT_MAP = {
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'en-AU': 'en-AU',
  'en-CA': 'en-CA',
  'en-NZ': 'en-NZ',
  'en-ZA': 'en-ZA',
  'fr-FR': 'fr-FR',
  'fr-CA': 'fr-CA',
  'fr-QC': 'fr-CA',
  'fr-CH': 'fr-CH',
  'es-ES': 'es-ES',
  'es-MX': 'es-MX',
  'es-AR': 'es-AR',
  'es-419': 'es-419',
  'es-CO': 'es-CO',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-PT',
  'nl-BE': 'nl-BE',
  'zh-Hant': 'zh-Hant',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-HK',
  'yue': 'yue',
  'ar-SA': 'ar-SA',
  'af': 'af',
};

/**
 * LibreTranslate language codes.
 * Source: https://docs.libretranslate.com/guides/supported_languages/
 *
 * LibreTranslate uses non-standard codes in a few cases:
 *   Chinese traditional:  zt  (not zh-Hant)
 *   Portuguese (Brazil):  pb  (not pt-BR)
 *
 * No regional variants for English, French, Spanish, Dutch, German, or Arabic.
 * All dialects for those languages fall through to the base code.
 */
const LIBRE_DIALECT_MAP = {
  'zh-Hant': 'zt',
  'zh-TW': 'zt',
  'zh-HK': 'zt',
  'pt-BR': 'pb',
};

/**
 * Firefox / Bergamot (Marian NMT) language codes.
 * Source: https://storage.googleapis.com/.../db/models.json
 *
 * Bergamot uses simple ISO-639 codes. Only one Chinese variant exists:
 *   zh       — Simplified Chinese
 *   zh_hant  — Traditional Chinese  (note: underscore, not hyphen)
 *
 * No regional variants for English, French, Spanish, Portuguese, Dutch,
 * German, or Arabic. 103 language pairs total, all via English hub.
 *
 * Not used as an API backend currently, but codes documented here for
 * potential future integration.
 */
const BERGAMOT_DIALECT_MAP = {
  'zh-Hant': 'zh_hant',
  'zh-TW': 'zh_hant',
  'zh-HK': 'zh_hant',
};

// Support both plain <script> (popup) and ES module (background/translators)
if (typeof window !== 'undefined') {
  window.LANGUAGE_DIALECTS = LANGUAGE_DIALECTS;
  window.DIALECT_DISPLAY_NAMES = DIALECT_DISPLAY_NAMES;
}

export {
  LANGUAGE_DIALECTS,
  DIALECT_DISPLAY_NAMES,
  DEEPL_DIALECT_MAP,
  GOOGLE_DIALECT_MAP,
  LIBRE_DIALECT_MAP,
  BERGAMOT_DIALECT_MAP,
};
