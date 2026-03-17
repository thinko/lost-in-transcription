/* global chrome */

document.addEventListener('DOMContentLoaded', () => {
  const els = {
    enabled: document.getElementById('enabled'),
    disablePrompt: document.getElementById('disablePrompt'),
    disableYes: document.getElementById('disableYes'),
    disableNo: document.getElementById('disableNo'),
    disableRemember: document.getElementById('disableRemember'),
    displayMode: document.getElementById('displayMode'),
    fontSize: document.getElementById('fontSize'),
    fontSizeVal: document.getElementById('fontSizeVal'),
    historyBufferSize: document.getElementById('historyBufferSize'),
    historyBufferSizeVal: document.getElementById('historyBufferSizeVal'),
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
    glossaryList: document.getElementById('glossaryList'),
    glossaryPattern: document.getElementById('glossaryPattern'),
    glossaryReplacement: document.getElementById('glossaryReplacement'),
    glossaryAddBtn: document.getElementById('glossaryAddBtn'),
    glossaryEnabled: document.getElementById('glossaryEnabled'),
    sessionList: document.getElementById('sessionList'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    saveAndNewBtn: document.getElementById('saveAndNewBtn'),
    dashboardSummary: document.getElementById('dashboardSummary'),
    onPanelClose: document.getElementById('onPanelClose'),
    onDisable: document.getElementById('onDisable'),
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
    glossary: [],
    glossaryEnabled: true,
    historyBufferSize: 100,
    onPanelClose: 'ask',
    onDisable: 'ask',
    lastTab: 'tab-dashboard',
  };

  let currentSettings = { ...DEFAULTS };

  // ── Tab switching ────────────────────────────────────────────────────────

  const tabBar = document.querySelector('.tab-bar');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(tabId) {
    tabBar.querySelectorAll('.tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === tabId);
    });
    chrome.storage.sync.set({ lastTab: tabId });
  }

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (btn?.dataset.tab) {
      switchTab(btn.dataset.tab);
    }
  });

  // Click on summary item navigates to tab
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.summary-item');
    if (item?.dataset.target) {
      switchTab(item.dataset.target);
    }
  });

  // ── Populate language dropdowns ───────────────────────────────────────────

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

  // ── Load settings ────────────────────────────────────────────────────────

  function loadAllSettings() {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      currentSettings = settings;
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
      els.sourceLang.value = settings.sourceLang;
      els.targetLang.value = settings.targetLang;
      els.exportContent.value = settings.lastExportContent;
      els.exportFormat.value = settings.lastExportFormat;
      els.onPanelClose.value = settings.onPanelClose || 'ask';
      els.onDisable.value = settings.onDisable || 'ask';
      els.glossaryEnabled.checked = settings.glossaryEnabled !== false;

      const histVal = settings.historyBufferSize;
      els.historyBufferSize.value = histVal === 0 ? 510 : Math.min(Math.max(histVal, 10), 500);
      els.historyBufferSizeVal.textContent = histVal === 0 ? 'Unlimited' : String(histVal);

      updateDebounceFields(settings.debounceStrategy);
      updateBackendFields(settings.backend);
      populateDialects(els.sourceDialect, settings.sourceLang, settings.sourceDialect);
      populateDialects(els.targetDialect, settings.targetLang, settings.targetDialect);

      const tabId = settings.lastTab || 'tab-dashboard';
      if (document.getElementById(tabId)) {
        switchTab(tabId);
      }

      loadGlossary();
      loadSessions();
      updateDashboard(settings);
    });
  }

  loadAllSettings();

  // ── Dashboard summary ────────────────────────────────────────────────────

  function updateDashboard(settings) {
    const s = settings || currentSettings;
    const langs = window.LANGUAGE_DIALECTS || {};
    const getLangLabel = (code, dialect) => {
      const base = langs[code]?.name || code;
      if (dialect) {
        const d = (langs[code]?.dialects || []).find((x) => x.code === dialect);
        return d ? `${base} (${d.label})` : base;
      }
      return base;
    };

    const modeLabels = { inline: 'Inline', sidepanel: 'Side Panel' };
    const backendLabels = {
      libre: 'LibreTranslate',
      google: 'Google',
      deepl: 'DeepL',
      openai: 'OpenAI',
    };
    const strategyLabels = {
      realtime: 'Each update',
      sentence: 'End of sentence',
      stable: 'Stable text',
      timed: 'Timed batch',
    };

    const modeVal = modeLabels[s.displayMode] || s.displayMode;
    let backendVal = backendLabels[s.backend] || s.backend;
    if (s.backend === 'openai' && s.openaiModel) {
      backendVal += ` (${s.openaiModel})`;
    }
    const langVal = `${getLangLabel(s.sourceLang, s.sourceDialect)} → ${getLangLabel(s.targetLang, s.targetDialect)}`;
    const freqVal = strategyLabels[s.debounceStrategy] || s.debounceStrategy;
    const glossaryCount = (s.glossary || []).filter((e) => e.enabled !== false).length;
    const glossaryVal = s.glossaryEnabled !== false && glossaryCount > 0
      ? `${glossaryCount} entries active`
      : 'Disabled';

    els.dashboardSummary.innerHTML = `
      <div class="summary-item" data-target="tab-display">
        <span class="summary-label">Mode</span>
        <span class="summary-value">${esc(modeVal)}</span>
      </div>
      <div class="summary-item" data-target="tab-translation">
        <span class="summary-label">Backend</span>
        <span class="summary-value">${esc(backendVal)}</span>
      </div>
      <div class="summary-item" data-target="tab-translation">
        <span class="summary-label">Languages</span>
        <span class="summary-value">${esc(langVal)}</span>
      </div>
      <div class="summary-item" data-target="tab-translation">
        <span class="summary-label">Frequency</span>
        <span class="summary-value">${esc(freqVal)}</span>
      </div>
      <div class="summary-item" data-target="tab-prompt">
        <span class="summary-label">Glossary</span>
        <span class="summary-value">${esc(glossaryVal)}</span>
      </div>
    `;
  }

  // ── Backend-specific field visibility ─────────────────────────────────────

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

  // ── Dialect dropdown population ──────────────────────────────────────────

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

  // ── Save on change ───────────────────────────────────────────────────────

  function save(key, value) {
    currentSettings[key] = value;
    chrome.storage.sync.set({ [key]: value });
    notifyContentScript({ [key]: value });
    updateDashboard(currentSettings);
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
    if (els.enabled.checked) {
      save('enabled', true);
      els.disablePrompt.classList.add('hidden');
      return;
    }

    const onDisable = currentSettings.onDisable || 'ask';
    if (onDisable === 'ask') {
      els.disablePrompt.classList.remove('hidden');
    } else if (onDisable === 'hide') {
      save('enabled', false);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'display-mode-changed',
            mode: 'none',
          });
        }
      });
    } else {
      save('enabled', false);
    }
  });

  els.disableYes.addEventListener('click', () => {
    save('enabled', false);
    if (els.disableRemember.checked) {
      save('onDisable', 'hide');
    }
    els.disablePrompt.classList.add('hidden');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'display-mode-changed',
          mode: 'none',
        });
      }
    });
  });

  els.disableNo.addEventListener('click', () => {
    save('enabled', false);
    if (els.disableRemember.checked) {
      save('onDisable', 'keep');
    }
    els.disablePrompt.classList.add('hidden');
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

  els.historyBufferSize.addEventListener('input', () => {
    const raw = parseInt(els.historyBufferSize.value, 10);
    const stored = raw >= 510 ? 0 : raw;
    els.historyBufferSizeVal.textContent = stored === 0 ? 'Unlimited' : String(stored);
    save('historyBufferSize', stored);
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

  els.openaiSystemPrompt.addEventListener('input', () => {
    debounceSave('openaiSystemPrompt', () => els.openaiSystemPrompt.value);
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

  els.onPanelClose.addEventListener('change', () => {
    save('onPanelClose', els.onPanelClose.value);
  });

  els.onDisable.addEventListener('change', () => {
    save('onDisable', els.onDisable.value);
  });

  els.glossaryEnabled.addEventListener('change', () => {
    save('glossaryEnabled', els.glossaryEnabled.checked);
  });

  let debounceTimers = {};
  function debounceSave(key, getValue) {
    clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(() => {
      save(key, getValue());
    }, 300);
  }

  // ── Test connectivity ────────────────────────────────────────────────────

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

  // ── Fetch models from endpoint ──────────────────────────────────────────

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

  // ── Glossary ─────────────────────────────────────────────────────────────

  let glossary = [];

  function loadGlossary() {
    chrome.storage.sync.get({ glossary: [], glossaryEnabled: true }, (data) => {
      glossary = data.glossary || [];
      renderGlossary();
    });
  }

  function saveGlossary() {
    chrome.storage.sync.set({ glossary, glossaryEnabled: els.glossaryEnabled.checked });
    notifyContentScript({ glossary, glossaryEnabled: els.glossaryEnabled.checked });
    updateDashboard(currentSettings);
  }

  function renderGlossary() {
    const list = els.glossaryList;
    list.innerHTML = '';

    if (!glossary.length) {
      list.innerHTML = '<p class="glossary-empty">No entries yet</p>';
      return;
    }

    const groups = {};
    glossary.forEach((entry, i) => {
      const rep = entry.replacement || '';
      if (!groups[rep]) groups[rep] = [];
      groups[rep].push({ entry, idx: i });
    });

    const sortedReplacements = Object.keys(groups).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    for (const replacement of sortedReplacements) {
      const items = groups[replacement];
      const groupEl = document.createElement('div');
      groupEl.className = 'glossary-group';

      const patternsEl = document.createElement('div');
      patternsEl.className = 'glossary-patterns';

      for (const { entry, idx } of items) {
        const row = document.createElement('div');
        row.className = 'glossary-entry' + (entry.enabled ? '' : ' disabled');
        row.innerHTML = `
          <span class="glossary-pattern" title="${esc(entry.pattern)}">${esc(entry.pattern)}</span>
          <button class="btn-icon glossary-toggle" data-idx="${idx}" title="${entry.enabled ? 'Disable' : 'Enable'}">${entry.enabled ? '✓' : '○'}</button>
          <button class="btn-icon delete glossary-delete" data-idx="${idx}" title="Delete">×</button>
        `;
        patternsEl.appendChild(row);
      }

      const targetEl = document.createElement('div');
      targetEl.className = 'glossary-target';
      targetEl.textContent = replacement;

      groupEl.appendChild(patternsEl);
      groupEl.appendChild(targetEl);
      list.appendChild(groupEl);
    }

    list.querySelectorAll('.glossary-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        glossary[idx].enabled = !glossary[idx].enabled;
        saveGlossary();
        renderGlossary();
      });
    });

    list.querySelectorAll('.glossary-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        glossary.splice(idx, 1);
        saveGlossary();
        renderGlossary();
      });
    });
  }

  els.glossaryAddBtn.addEventListener('click', addGlossaryEntry);

  function addGlossaryEntry() {
    const pattern = els.glossaryPattern.value.trim();
    const replacement = els.glossaryReplacement.value.trim();
    if (!pattern || !replacement) return;
    glossary.push({ pattern, replacement, enabled: true });
    saveGlossary();
    renderGlossary();
    els.glossaryPattern.value = '';
    els.glossaryReplacement.value = '';
    els.glossaryPattern.focus();
  }

  els.glossaryPattern.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.glossaryReplacement.focus();
  });

  els.glossaryReplacement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addGlossaryEntry();
  });

  // ── Export button ────────────────────────────────────────────────────────

  els.exportBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'trigger-export' });
    });
  });

  // ── Sessions list ────────────────────────────────────────────────────────

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
      item.dataset.sid = s.id;

      const dateStr = new Date(s.startedAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      item.innerHTML = `
        <div class="session-info">
          <div class="session-title" title="${esc(s.title)}">${esc(s.title)}</div>
          <div class="session-meta">${dateStr}</div>
        </div>
        <span class="session-revision-status"></span>
        <div class="session-actions">
          <button class="btn-icon export-session" data-sid="${esc(s.id)}" title="Export">&#8615;</button>
          <button class="btn-icon revise-session" data-sid="${esc(s.id)}" title="Re-apply glossary">&#8635;</button>
          <button class="btn-icon delete delete-session" data-sid="${esc(s.id)}" title="Delete">×</button>
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

    els.sessionList.querySelectorAll('.revise-session').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        const item = els.sessionList.querySelector(`[data-sid="${sid}"]`);
        const statusEl = item?.querySelector('.session-revision-status');
        if (statusEl) statusEl.textContent = '…';

        chrome.runtime.sendMessage({ type: 'revise-session', sessionId: sid }, (res) => {
          if (statusEl) {
            if (res?.ok) {
              statusEl.textContent = res.changed > 0 ? `Updated ${res.changed} of ${res.total}` : 'No changes';
              statusEl.className = 'session-revision-status success';
              setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'session-revision-status'; }, 2000);
            } else {
              statusEl.textContent = 'Error';
              statusEl.className = 'session-revision-status error';
            }
          }
        });
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

  els.saveAndNewBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'save-and-new-session' }, () => {
      loadSessions();
    });
  });

  els.clearAllBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'get-sessions' }, async (sessions) => {
      if (!sessions?.length) return;
      for (const s of sessions) {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'delete-session', sessionId: s.id }, resolve);
        });
      }
      loadSessions();
    });
  });

  // ── Help tab: version ────────────────────────────────────────────────────

  const versionEl = document.getElementById('version');
  if (versionEl) {
    try {
      versionEl.textContent = chrome.runtime.getManifest().version || '—';
    } catch (_) {
      versionEl.textContent = '—';
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
});
