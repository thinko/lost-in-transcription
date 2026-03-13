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
    openaiSystemPrompt: document.getElementById('openaiSystemPrompt'),
    openaiPromptField: document.getElementById('openaiPromptField'),
    resetPromptBtn: document.getElementById('resetPromptBtn'),
    testBtn: document.getElementById('testBtn'),
    testStatus: document.getElementById('testStatus'),
    refreshModelsBtn: document.getElementById('refreshModelsBtn'),
    modelsHint: document.getElementById('modelsHint'),
    debounceStrategy: document.getElementById('debounceStrategy'),
    debounceHint: document.getElementById('debounceHint'),
    debounceMs: document.getElementById('debounceMs'),
    debounceMsVal: document.getElementById('debounceMsVal'),
    debounceMsField: document.getElementById('debounceMsField'),
    sourceLang: document.getElementById('sourceLang'),
    sourceDialect: document.getElementById('sourceDialect'),
    targetLang: document.getElementById('targetLang'),
    targetDialect: document.getElementById('targetDialect'),
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
    sourceDialect: '',
    targetLang: 'en',
    targetDialect: '',
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

  // ── Populate language dropdowns from LANGUAGE_DIALECTS ────────────────

  function populateLanguageSelect(selectEl) {
    const langs = window.LANGUAGE_DIALECTS || {};
    const sorted = Object.entries(langs).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );
    selectEl.innerHTML = '';
    for (const [code, lang] of sorted) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = lang.name;
      selectEl.appendChild(opt);
    }
  }

  populateLanguageSelect(els.sourceLang);
  populateLanguageSelect(els.targetLang);

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
    els.openaiSystemPrompt.value = settings.openaiSystemPrompt;
    els.debounceStrategy.value = settings.debounceStrategy;
    els.debounceMs.value = settings.debounceMs;
    els.debounceMsVal.textContent = (settings.debounceMs / 1000).toFixed(1) + 's';
    updateDebounceFields(settings.debounceStrategy);
    els.sourceLang.value = settings.sourceLang;
    populateDialects(els.sourceDialect, settings.sourceLang, settings.sourceDialect);
    els.targetLang.value = settings.targetLang;
    populateDialects(els.targetDialect, settings.targetLang, settings.targetDialect);
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
    els.openaiPromptField.classList.toggle('hidden', !isOpenai);
  }

  // ── Dialect dropdown population ──────────────────────────────────────

  function populateDialects(selectEl, langCode, currentDialect) {
    const langData = window.LANGUAGE_DIALECTS?.[langCode];
    const dialects = langData?.dialects || [];

    selectEl.innerHTML = '';

    if (dialects.length === 0) {
      selectEl.classList.add('hidden');
      return;
    }

    for (const d of dialects) {
      const opt = document.createElement('option');
      opt.value = d.code;
      opt.textContent = d.label;
      selectEl.appendChild(opt);
    }

    if (currentDialect) selectEl.value = currentDialect;
    selectEl.classList.remove('hidden');
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
    // #region agent log
    fetch('http://127.0.0.1:7823/ingest/ea249d66-29bb-44c3-bcab-c5e5a4a3444e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e115c2'},body:JSON.stringify({sessionId:'e115c2',location:'popup.js:openaiBaseUrl-change',message:'saving openaiBaseUrl',data:{value:els.openaiBaseUrl.value.trim()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    save('openaiBaseUrl', els.openaiBaseUrl.value.trim());
  });

  els.openaiModel.addEventListener('change', () => {
    save('openaiModel', els.openaiModel.value.trim());
  });

  els.openaiSystemPrompt.addEventListener('change', () => {
    save('openaiSystemPrompt', els.openaiSystemPrompt.value);
  });

  els.resetPromptBtn.addEventListener('click', () => {
    const defaultPrompt = [
      'You are a real-time caption translator. Translate the following {{SOURCE_LANG}} text to {{TARGET_LANG}}.',
      'The source is Quebec French (Québécois) — handle colloquialisms, joual expressions, and informal contractions accurately.',
      'Examples: "C\'est tu" = "Is it", "pantoute" = "not at all", "j\'va" = "I\'m going to", "faque" = "so/therefore".',
      'Return ONLY the translated text with no commentary, quotes, or formatting.',
    ].join(' ');
    els.openaiSystemPrompt.value = defaultPrompt;
    save('openaiSystemPrompt', defaultPrompt);
  });

  els.debounceStrategy.addEventListener('change', () => {
    const strategy = els.debounceStrategy.value;
    updateDebounceFields(strategy);
    save('debounceStrategy', strategy);
  });

  els.debounceMs.addEventListener('input', () => {
    const ms = parseInt(els.debounceMs.value, 10);
    els.debounceMsVal.textContent = (ms / 1000).toFixed(1) + 's';
    save('debounceMs', ms);
  });

  function updateDebounceFields(strategy) {
    const showSlider = strategy === 'timed' || strategy === 'sentence';
    els.debounceMsField.classList.toggle('hidden', !showSlider);
    const hints = {
      realtime: 'Sends after each small text change. Best for local/fast models.',
      sentence: 'Waits for sentence-ending punctuation (.?!) or the batch window, whichever comes first.',
      stable: 'Waits for text to stop changing for ~1.5s. Good balance of cost and latency.',
      timed: 'Accumulates text for the batch window before translating. Best for rate-limited APIs.',
    };
    els.debounceHint.textContent = hints[strategy] || '';
  }

  els.sourceLang.addEventListener('change', () => {
    save('sourceLang', els.sourceLang.value);
    populateDialects(els.sourceDialect, els.sourceLang.value, '');
    save('sourceDialect', '');
  });

  els.sourceDialect.addEventListener('change', () => {
    save('sourceDialect', els.sourceDialect.value);
  });

  els.targetLang.addEventListener('change', () => {
    save('targetLang', els.targetLang.value);
    populateDialects(els.targetDialect, els.targetLang.value, '');
    save('targetDialect', '');
  });

  els.targetDialect.addEventListener('change', () => {
    save('targetDialect', els.targetDialect.value);
  });

  els.exportContent.addEventListener('change', () => {
    save('lastExportContent', els.exportContent.value);
  });

  els.exportFormat.addEventListener('change', () => {
    save('lastExportFormat', els.exportFormat.value);
  });

  // ── Test connectivity ──────────────────────────────────────────────────

  els.testBtn.addEventListener('click', () => {
    const backend = els.backend.value;
    const apiKey = els.apiKey.value.trim();
    const options = {
      libreUrl: els.libreUrl.value.trim(),
      openaiBaseUrl: els.openaiBaseUrl.value.trim(),
    };

    els.testBtn.disabled = true;
    els.testStatus.textContent = 'Testing…';
    els.testStatus.className = 'test-status loading';

    chrome.runtime.sendMessage(
      { type: 'test-connectivity', backend, apiKey, options },
      (result) => {
        els.testBtn.disabled = false;
        if (result?.ok) {
          els.testStatus.textContent = result.message;
          els.testStatus.className = 'test-status success';
        } else {
          els.testStatus.textContent = result?.error || 'Connection failed';
          els.testStatus.className = 'test-status error';
        }
      }
    );
  });

  // ── Fetch models from endpoint ────────────────────────────────────────

  els.refreshModelsBtn.addEventListener('click', () => {
    const baseUrl = els.openaiBaseUrl.value.trim();
    const apiKey = els.apiKey.value.trim();

    els.refreshModelsBtn.disabled = true;
    els.refreshModelsBtn.classList.add('spinning');
    els.modelsHint.textContent = 'Fetching models…';
    els.modelsHint.style.color = '#888';

    chrome.runtime.sendMessage(
      { type: 'fetch-models', baseUrl, apiKey },
      (result) => {
        els.refreshModelsBtn.disabled = false;
        els.refreshModelsBtn.classList.remove('spinning');

        if (result?.ok && result.models?.length) {
          const datalist = document.getElementById('openaiModelSuggestions');
          datalist.innerHTML = '';
          for (const model of result.models) {
            const opt = document.createElement('option');
            opt.value = model;
            datalist.appendChild(opt);
          }
          els.modelsHint.textContent = `${result.models.length} models loaded`;
          els.modelsHint.style.color = '#2ea043';

          if (!els.openaiModel.value) {
            els.openaiModel.value = result.models[0];
            save('openaiModel', result.models[0]);
          }
        } else {
          els.modelsHint.textContent = result?.error || 'Failed to fetch models';
          els.modelsHint.style.color = '#e74c3c';
        }
      }
    );
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
