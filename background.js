import { translate as googleTranslate } from './translators/google.js';
import { translate as deeplTranslate } from './translators/deepl.js';
import { translate as libreTranslate } from './translators/libre.js';
import { translate as openaiTranslate } from './translators/openai.js';
import { DIALECT_DISPLAY_NAMES } from './languages.js';

const translators = {
  google: googleTranslate,
  deepl: deeplTranslate,
  libre: libreTranslate,
  openai: openaiTranslate,
};

// --- LRU Cache -----------------------------------------------------------

class LRUCache {
  constructor(maxSize = 500) {
    this.max = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key, val) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, val);
    if (this.cache.size > this.max) {
      this.cache.delete(this.cache.keys().next().value);
    }
  }
}

const cache = new LRUCache(500);

// --- Debounce / batching state --------------------------------------------

const pendingDebounce = new Map();
const SENTENCE_ENDERS = /[.?!。？！]\s*$/;

// --- Settings helper ------------------------------------------------------

async function getSettings() {
  const defaults = {
    enabled: true,
    backend: 'libre',
    apiKey: '',
    sourceLang: 'fr',
    sourceDialect: '',
    targetLang: 'en',
    targetDialect: '',
    displayMode: 'inline',
    fontSize: 13,
    libreUrl: 'https://libretranslate.com',
    openaiModel: 'gpt-4o-mini',
    openaiBaseUrl: 'https://api.openai.com',
    openaiSystemPrompt: '',
    glossary: [],
    debounceStrategy: 'realtime',
    debounceMs: 5000,
    lastExportFormat: 'txt',
    lastExportContent: 'both',
  };
  const stored = await chrome.storage.sync.get(defaults);
  return { ...defaults, ...stored };
}

// --- Debounce strategy ----------------------------------------------------

function computeDebounceDelay(text, settings) {
  const strategy = settings.debounceStrategy || 'realtime';

  switch (strategy) {
    case 'realtime':
      return 300;

    case 'sentence':
      // If text ends with sentence-terminating punctuation, send quickly.
      // Otherwise wait up to debounceMs for more text.
      return SENTENCE_ENDERS.test(text) ? 400 : (settings.debounceMs || 5000);

    case 'stable':
      // Wait for text to stop changing for 1.5s
      return 1500;

    case 'timed':
      return settings.debounceMs || 5000;

    default:
      return 300;
  }
}

// --- Glossary helpers -----------------------------------------------------

function applyGlossary(text, glossary) {
  if (!glossary?.length) return text;
  let result = text;
  for (const entry of glossary) {
    if (!entry.enabled || !entry.pattern) continue;
    const escaped = entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), entry.replacement);
  }
  return result;
}

function glossaryHash(glossary) {
  if (!glossary?.length) return '0';
  const sig = glossary
    .filter((e) => e.enabled)
    .map((e) => `${e.pattern}>${e.replacement}`)
    .join('|');
  let h = 0;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) - h + sig.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

// --- Translation entry point ----------------------------------------------

async function handleTranslate(text, captionId, settings) {
  if (!text || !text.trim()) return null;

  const glossary = settings.glossary || [];
  const correctedText = applyGlossary(text, glossary);

  const sd = settings.sourceDialect || '';
  const td = settings.targetDialect || '';
  const gh = glossaryHash(glossary);
  const cacheKey = `${settings.backend}:${settings.sourceLang}:${sd}:${settings.targetLang}:${td}:${gh}:${correctedText}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fn = translators[settings.backend];
  if (!fn) throw new Error(`Unknown backend: ${settings.backend}`);

  const sourceDialectName = settings.sourceDialect
    ? (DIALECT_DISPLAY_NAMES[settings.sourceDialect] || settings.sourceDialect)
    : '';
  const targetDialectName = settings.targetDialect
    ? (DIALECT_DISPLAY_NAMES[settings.targetDialect] || settings.targetDialect)
    : '';

  const glossaryTerms = [...new Set(
    glossary.filter((e) => e.enabled).map((e) => e.replacement)
  )];

  const rawTranslated = await fn(correctedText, settings.apiKey, {
    sourceLang: settings.sourceLang,
    sourceDialect: settings.sourceDialect || '',
    sourceDialectName,
    targetLang: settings.targetLang,
    targetDialect: settings.targetDialect || '',
    targetDialectName,
    libreUrl: settings.libreUrl,
    openaiModel: settings.openaiModel,
    openaiBaseUrl: settings.openaiBaseUrl,
    openaiSystemPrompt: settings.openaiSystemPrompt,
    glossaryTerms,
  });

  const translated = applyGlossary(rawTranslated, glossary);

  cache.set(cacheKey, translated);
  return translated;
}

// --- Message listener -----------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'translate') {
    const { text, captionId } = msg;

    (async () => {
      const settings = await getSettings();
      if (!settings.enabled) return;

      const delay = computeDebounceDelay(text, settings);

      if (pendingDebounce.has(captionId)) {
        clearTimeout(pendingDebounce.get(captionId));
      }

      pendingDebounce.set(
        captionId,
        setTimeout(async () => {
          pendingDebounce.delete(captionId);
          try {
            const translated = await handleTranslate(text, captionId, settings);
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'translation-result',
              captionId,
              original: text,
              translated,
            });
          } catch (err) {
            console.error('[Lost in Transcription] Translation error:', err);
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'translation-error',
              captionId,
              error: err.message,
            });
          }
        }, delay)
      );
    })();

    return true;
  }

  if (msg.type === 'get-settings') {
    getSettings().then(sendResponse);
    return true;
  }

  if (msg.type === 'export-transcript') {
    handleExport(msg.history, msg.format, msg.content, msg.title);
    return false;
  }

  if (msg.type === 'get-sessions') {
    chrome.storage.local.get({ litSessions: [] }, (data) => {
      sendResponse(data.litSessions || []);
    });
    return true;
  }

  if (msg.type === 'delete-session') {
    chrome.storage.local.get({ litSessions: [] }, async (data) => {
      const sessions = (data.litSessions || []).filter((s) => s.id !== msg.sessionId);
      await chrome.storage.local.set({ litSessions: sessions });
      await chrome.storage.local.remove(`litHistory_${msg.sessionId}`);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'test-connectivity') {
    testConnectivity(msg.backend, msg.apiKey, msg.options)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'fetch-models') {
    fetchModels(msg.baseUrl, msg.apiKey)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message, models: [] }));
    return true;
  }

  if (msg.type === 'export-session') {
    chrome.storage.local.get({ litSessions: [], [`litHistory_${msg.sessionId}`]: [] }, (data) => {
      const history = data[`litHistory_${msg.sessionId}`] || [];
      const sessions = data.litSessions || [];
      const session = sessions.find((s) => s.id === msg.sessionId);
      if (history.length) {
        handleExport(history, msg.format || 'txt', msg.content || 'both', session?.title);
      }
      sendResponse({ ok: true, count: history.length });
    });
    return true;
  }
});

// --- Keyboard shortcut commands -------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (command === 'toggle-display-mode') {
    const settings = await getSettings();
    const newMode = settings.displayMode === 'inline' ? 'sidepanel' : 'inline';
    await chrome.storage.sync.set({ displayMode: newMode });
    chrome.tabs.sendMessage(tab.id, { type: 'display-mode-changed', mode: newMode });
  }

  if (command === 'export-transcript') {
    chrome.tabs.sendMessage(tab.id, { type: 'trigger-export' });
  }
});

// --- Export handler --------------------------------------------------------

function handleExport(history, format, contentMode, title) {
  if (!history || !history.length) return;

  let output = '';
  let mimeType = 'text/plain';
  let ext = 'txt';

  if (format === 'csv') {
    ext = 'csv';
    mimeType = 'text/csv';
    output = 'Timestamp,Speaker,Original,Translation\n';
    for (const entry of history) {
      const row = [entry.timestamp, entry.speaker, entry.original, entry.translated]
        .map((v) => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',');
      output += row + '\n';
    }
  } else if (format === 'srt') {
    ext = 'srt';
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const startTC = entry.timestamp || formatTimecode(i * 3);
      const endTC = history[i + 1]?.timestamp || formatTimecode((i + 1) * 3);
      output += `${i + 1}\n`;
      output += `${toSrtTime(startTC)} --> ${toSrtTime(endTC)}\n`;
      if (contentMode === 'original') {
        output += `${entry.speaker}: ${entry.original}\n`;
      } else if (contentMode === 'translated') {
        output += `${entry.speaker}: ${entry.translated || entry.original}\n`;
      } else {
        output += `${entry.speaker}: ${entry.original}\n`;
        if (entry.translated) output += `${entry.speaker}: ${entry.translated}\n`;
      }
      output += '\n';
    }
  } else {
    for (const entry of history) {
      const ts = entry.timestamp || '00:00:00';
      if (contentMode === 'original') {
        output += `[${ts}] ${entry.speaker}: ${entry.original}\n`;
      } else if (contentMode === 'translated') {
        output += `[${ts}] ${entry.speaker}: ${entry.translated || entry.original}\n`;
      } else {
        output += `[${ts}] ${entry.speaker}: ${entry.original}\n`;
        if (entry.translated) {
          output += `        ➜ ${entry.translated}\n`;
        }
      }
    }
  }

  const slug = (title || 'transcription')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .toLowerCase() || 'transcription';

  const lastEntry = history[history.length - 1];
  const refDate = lastEntry?.wallTime ? new Date(lastEntry.wallTime) : new Date();
  const dateStr = [
    refDate.getFullYear(),
    String(refDate.getMonth() + 1).padStart(2, '0'),
    String(refDate.getDate()).padStart(2, '0'),
  ].join('-');
  const timeStr = [
    String(refDate.getHours()).padStart(2, '0'),
    String(refDate.getMinutes()).padStart(2, '0'),
  ].join('');

  const base64 = btoa(unescape(encodeURIComponent(output)));
  const url = `data:${mimeType};charset=utf-8;base64,${base64}`;

  chrome.downloads.download({
    url,
    filename: `${slug}-${dateStr}-${timeStr}.${ext}`,
    saveAs: true,
  });
}

// --- Connectivity testing -------------------------------------------------

async function testConnectivity(backend, apiKey, options = {}) {
  const timeout = (ms) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Connection timed out')), ms)
  );

  try {
    switch (backend) {
      case 'libre': {
        const host = (options.libreUrl || 'https://libretranslate.com').replace(/\/+$/, '');
        const res = await Promise.race([fetch(`${host}/languages`), timeout(10000)]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const langs = await res.json();
        return { ok: true, message: `Connected — ${langs.length} languages available` };
      }

      case 'google': {
        const res = await Promise.race([
          fetch(`https://translation.googleapis.com/language/translate/v2/languages?key=${encodeURIComponent(apiKey)}&target=en`),
          timeout(10000),
        ]);
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body.includes('API key') ? 'Invalid API key' : `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { ok: true, message: `Connected — ${data.data.languages.length} languages` };
      }

      case 'deepl': {
        const isFree = apiKey?.endsWith(':fx');
        const base = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
        const res = await Promise.race([
          fetch(`${base}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${apiKey}` } }),
          timeout(10000),
        ]);
        if (!res.ok) throw new Error(res.status === 403 ? 'Invalid API key' : `HTTP ${res.status}`);
        const usage = await res.json();
        const pct = Math.round((usage.character_count / usage.character_limit) * 100);
        return { ok: true, message: `Connected — ${pct}% of quota used` };
      }

      case 'openai': {
        const baseUrl = (options.openaiBaseUrl || 'https://api.openai.com').replace(/\/+$/, '');
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        const res = await Promise.race([
          fetch(`${baseUrl}/v1/models`, { headers }),
          timeout(10000),
        ]);
        if (!res.ok) throw new Error(res.status === 401 ? 'Invalid API key' : `HTTP ${res.status}`);
        const data = await res.json();
        const count = Array.isArray(data.data) ? data.data.length : data.models?.length || 0;
        return { ok: true, message: `Connected — ${count} models available` };
      }

      default:
        throw new Error(`Unknown backend: ${backend}`);
    }
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot reach endpoint — check URL and network');
    }
    throw err;
  }
}

// --- Model list fetching --------------------------------------------------

async function fetchModels(baseUrl, apiKey) {
  const url = (baseUrl || 'https://api.openai.com').replace(/\/+$/, '');
  const headers = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await Promise.race([
    fetch(`${url}/v1/models`, { headers }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), 10000)),
  ]);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const rawModels = Array.isArray(data.data) ? data.data : (data.models || []);
  const models = rawModels
    .map((m) => m.id || m.name || m)
    .filter((id) => typeof id === 'string')
    .sort((a, b) => a.localeCompare(b));

  return { ok: true, models };
}

function formatTimecode(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function toSrtTime(ts) {
  if (!ts) return '00:00:00,000';
  const parts = ts.split(':');
  if (parts.length === 3) return `${ts},000`;
  return '00:00:00,000';
}
