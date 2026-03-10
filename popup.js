/* global chrome */

document.addEventListener('DOMContentLoaded', () => {
  const els = {
    enabled: document.getElementById('enabled'),
    displayMode: document.getElementById('displayMode'),
    fontSize: document.getElementById('fontSize'),
    fontSizeVal: document.getElementById('fontSizeVal'),
    backend: document.getElementById('backend'),
    apiKey: document.getElementById('apiKey'),
    apiKeyField: document.getElementById('apiKeyField'),
    libreUrl: document.getElementById('libreUrl'),
    libreUrlField: document.getElementById('libreUrlField'),
    openaiModel: document.getElementById('openaiModel'),
    openaiModelField: document.getElementById('openaiModelField'),
    sourceLang: document.getElementById('sourceLang'),
    targetLang: document.getElementById('targetLang'),
    exportContent: document.getElementById('exportContent'),
    exportFormat: document.getElementById('exportFormat'),
    exportBtn: document.getElementById('exportBtn'),
  };

  const DEFAULTS = {
    enabled: true,
    backend: 'libre',
    apiKey: '',
    sourceLang: 'fr',
    targetLang: 'en',
    displayMode: 'inline',
    fontSize: 13,
    libreUrl: 'https://libretranslate.com',
    openaiModel: 'gpt-4o-mini',
    lastExportFormat: 'txt',
    lastExportContent: 'both',
  };

  // ── Load settings ──────────────────────────────────────────────────────

  chrome.storage.sync.get(DEFAULTS, (settings) => {
    els.enabled.checked = settings.enabled;
    els.displayMode.value = settings.displayMode;
    els.fontSize.value = settings.fontSize;
    els.fontSizeVal.textContent = settings.fontSize + 'px';
    els.backend.value = settings.backend;
    els.apiKey.value = settings.apiKey;
    els.libreUrl.value = settings.libreUrl;
    els.openaiModel.value = settings.openaiModel;
    els.sourceLang.value = settings.sourceLang;
    els.targetLang.value = settings.targetLang;
    els.exportContent.value = settings.lastExportContent;
    els.exportFormat.value = settings.lastExportFormat;
    updateBackendFields(settings.backend);
  });

  // ── Backend-specific field visibility ──────────────────────────────────

  function updateBackendFields(backend) {
    const needsKey = backend !== 'libre';
    const isLibre = backend === 'libre';
    const isOpenai = backend === 'openai';

    els.apiKeyField.classList.toggle('hidden', !needsKey && !isLibre);
    if (isLibre) {
      els.apiKeyField.classList.remove('hidden');
      els.apiKey.placeholder = 'API key (optional for public instances)';
    } else {
      els.apiKey.placeholder = 'Enter API key…';
    }
    els.libreUrlField.classList.toggle('hidden', !isLibre);
    els.openaiModelField.classList.toggle('hidden', !isOpenai);
  }

  // ── Save on change ────────────────────────────────────────────────────

  function save(key, value) {
    chrome.storage.sync.set({ [key]: value });
    notifyContentScript({ [key]: value });
  }

  function notifyContentScript(changedSettings) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'settings-changed',
        settings: changedSettings,
      });
    });
  }

  els.enabled.addEventListener('change', () => {
    save('enabled', els.enabled.checked);
  });

  els.displayMode.addEventListener('change', () => {
    const mode = els.displayMode.value;
    save('displayMode', mode);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'display-mode-changed',
        mode,
      });
    });
  });

  els.fontSize.addEventListener('input', () => {
    els.fontSizeVal.textContent = els.fontSize.value + 'px';
    save('fontSize', parseInt(els.fontSize.value, 10));
  });

  els.backend.addEventListener('change', () => {
    const backend = els.backend.value;
    updateBackendFields(backend);
    save('backend', backend);
  });

  els.apiKey.addEventListener('change', () => {
    save('apiKey', els.apiKey.value.trim());
  });

  els.libreUrl.addEventListener('change', () => {
    save('libreUrl', els.libreUrl.value.trim());
  });

  els.openaiModel.addEventListener('change', () => {
    save('openaiModel', els.openaiModel.value);
  });

  els.sourceLang.addEventListener('change', () => {
    save('sourceLang', els.sourceLang.value);
  });

  els.targetLang.addEventListener('change', () => {
    save('targetLang', els.targetLang.value);
  });

  els.exportContent.addEventListener('change', () => {
    save('lastExportContent', els.exportContent.value);
  });

  els.exportFormat.addEventListener('change', () => {
    save('lastExportFormat', els.exportFormat.value);
  });

  // ── Export button ─────────────────────────────────────────────────────

  els.exportBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'trigger-export' });
    });
  });
});
