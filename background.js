import { translate as googleTranslate } from './translators/google.js';
import { translate as deeplTranslate } from './translators/deepl.js';
import { translate as libreTranslate } from './translators/libre.js';
import { translate as openaiTranslate } from './translators/openai.js';

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
    targetLang: 'en',
    displayMode: 'inline',
    fontSize: 13,
    libreUrl: 'https://libretranslate.com',
    openaiModel: 'gpt-4o-mini',
    openaiBaseUrl: 'https://api.openai.com',
    openaiSystemPrompt: '',
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

// --- Translation entry point ----------------------------------------------

async function handleTranslate(text, captionId, settings) {
  if (!text || !text.trim()) return null;

  const cacheKey = `${settings.backend}:${settings.sourceLang}:${settings.targetLang}:${text}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fn = translators[settings.backend];
  if (!fn) throw new Error(`Unknown backend: ${settings.backend}`);

  const translated = await fn(text, settings.apiKey, {
    sourceLang: settings.sourceLang,
    targetLang: settings.targetLang,
    libreUrl: settings.libreUrl,
    openaiModel: settings.openaiModel,
    openaiBaseUrl: settings.openaiBaseUrl,
    openaiSystemPrompt: settings.openaiSystemPrompt,
  });

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
            console.error('[Live Translate CC] Translation error:', err);
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
    handleExport(msg.history, msg.format, msg.content);
    return false;
  }

  if (msg.type === 'get-sessions') {
    chrome.storage.local.get({ ltccSessions: [] }, (data) => {
      sendResponse(data.ltccSessions || []);
    });
    return true;
  }

  if (msg.type === 'delete-session') {
    chrome.storage.local.get({ ltccSessions: [] }, async (data) => {
      const sessions = (data.ltccSessions || []).filter((s) => s.id !== msg.sessionId);
      await chrome.storage.local.set({ ltccSessions: sessions });
      await chrome.storage.local.remove(`ltccHistory_${msg.sessionId}`);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'export-session') {
    chrome.storage.local.get({ [`ltccHistory_${msg.sessionId}`]: [] }, (data) => {
      const history = data[`ltccHistory_${msg.sessionId}`] || [];
      if (history.length) {
        handleExport(history, msg.format || 'txt', msg.content || 'both');
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

function handleExport(history, format, contentMode) {
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

  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const timeStr = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');

  const blob = new Blob([output], { type: mimeType });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename: `teams-captions-${dateStr}-${timeStr}.${ext}`,
    saveAs: true,
  });
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
