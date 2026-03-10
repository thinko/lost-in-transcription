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
    openaiBaseUrl: document.getElementById('openaiBaseUrl'),
    openaiBaseUrlField: document.getElementById('openaiBaseUrlField'),
    openaiModel: document.getElementById('openaiModel'),
    openaiModelField: document.getElementById('openaiModelField'),
    sourceLang: document.getElementById('sourceLang'),
    targetLang: document.getElementById('targetLang'),
    exportContent: document.getElementById('exportContent'),
    exportFormat: document.getElementById('exportFormat'),
    exportBtn: document.getElementById('exportBtn'),
    sessionList: document.getElementById('sessionList'),
    clearAllBtn: document.getElementById('clearAllBtn'),
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
    openaiBaseUrl: 'https://api.openai.com',
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
    els.openaiBaseUrl.value = settings.openaiBaseUrl;
    els.openaiModel.value = settings.openaiModel;
    els.sourceLang.value = settings.sourceLang;
    els.targetLang.value = settings.targetLang;
    els.exportContent.value = settings.lastExportContent;
    els.exportFormat.value = settings.lastExportFormat;
    updateBackendFields(settings.backend);
  });

  // ── Backend-specific field visibility ──────────────────────────────────

  function updateBackendFields(backend) {
    const isLibre = backend === 'libre';
    const isOpenai = backend === 'openai';

    els.apiKeyField.classList.toggle('hidden', false);
    if (isLibre) {
      els.apiKey.placeholder = 'API key (optional for public instances)';
    } else if (isOpenai) {
      els.apiKey.placeholder = 'API key (optional for local endpoints)';
    } else {
      els.apiKey.placeholder = 'Enter API key…';
    }
    els.libreUrlField.classList.toggle('hidden', !isLibre);
    els.openaiBaseUrlField.classList.toggle('hidden', !isOpenai);
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

  els.openaiBaseUrl.addEventListener('change', () => {
    save('openaiBaseUrl', els.openaiBaseUrl.value.trim());
  });

  els.openaiModel.addEventListener('change', () => {
    save('openaiModel', els.openaiModel.value.trim());
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

  // ── Sessions list ───────────────────────────────────────────────────

  function loadSessions() {
    chrome.runtime.sendMessage({ type: 'get-sessions' }, (sessions) => {
      renderSessions(sessions || []);
    });
  }

  function renderSessions(sessions) {
    if (!sessions.length) {
      els.sessionList.innerHTML = '<p class="session-empty">No saved sessions</p>';
      return;
    }

    els.sessionList.innerHTML = '';
    for (const s of sessions) {
      const item = document.createElement('div');
      item.className = 'session-item';

      const dateStr = new Date(s.startedAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      item.innerHTML = `
        <div class="session-info">
          <div class="session-title" title="${esc(s.title)}">${esc(s.title)}</div>
          <div class="session-meta">${dateStr}</div>
        </div>
        <span class="session-badge">${s.entryCount || 0}</span>
        <div class="session-actions">
          <button class="btn-icon export-session" data-sid="${esc(s.id)}" title="Export">&#8615;</button>
          <button class="btn-icon delete delete-session" data-sid="${esc(s.id)}" title="Delete">&times;</button>
        </div>
      `;

      els.sessionList.appendChild(item);
    }

    els.sessionList.querySelectorAll('.export-session').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        const format = els.exportFormat.value;
        const content = els.exportContent.value;
        chrome.runtime.sendMessage({ type: 'export-session', sessionId: sid, format, content });
      });
    });

    els.sessionList.querySelectorAll('.delete-session').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        chrome.runtime.sendMessage({ type: 'delete-session', sessionId: sid }, () => {
          loadSessions();
        });
      });
    });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  els.clearAllBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'get-sessions' }, async (sessions) => {
      if (!sessions?.length) return;
      for (const s of sessions) {
        await chrome.runtime.sendMessage({ type: 'delete-session', sessionId: s.id });
      }
      loadSessions();
    });
  });

  loadSessions();
});
