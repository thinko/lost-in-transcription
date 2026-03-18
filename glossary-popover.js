/*
 * (c) 2026, Alex Handy <ahandy@gmail.com>
 *
 * This file is part of Lost in Transcription
 *
 * Lost in Transcription is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Lost in Transcription is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Lost in Transcription.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global chrome */

(function () {
  'use strict';

  if (window.__litGlossaryPopoverInit) return;
  window.__litGlossaryPopoverInit = true;

  const POPOVER_ID = 'lit-glossary-popover';
  const OFFSET_X = 10;
  const OFFSET_Y = 10;
  const MAX_WIDTH = 280;
  const Z_INDEX = 100000;

  const ALLOWED_SELECTORS = [
    '[data-tid="closed-caption-text"]',
    '.lit-inline',
    '#lit-side-panel-host',
  ];

  function isInsideAllowedTarget(el) {
    if (!el) return false;
    return ALLOWED_SELECTORS.some((sel) => el.closest(sel));
  }

  function getSelectedText() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    const text = sel.toString().trim();
    return text;
  }

  function getWordAtPoint(clientX, clientY) {
    let range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(clientX, clientY);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (!pos || !pos.offsetNode) return '';
      range = document.createRange();
      try {
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
      } catch (e) {
        return '';
      }
    } else {
      return '';
    }
    if (!range) return '';
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return '';
    const text = node.textContent || '';
    const offset = range.startOffset;
    const before = text.slice(0, offset);
    const after = text.slice(offset);
    const matchBefore = before.match(/\w*$/);
    const matchAfter = after.match(/^\w*/);
    const wordStart = offset - (matchBefore ? matchBefore[0].length : 0);
    const wordEnd = offset + (matchAfter ? matchAfter[0].length : 0);
    return text.slice(wordStart, wordEnd).trim();
  }

  function getTextForClick(e) {
    const selected = getSelectedText();
    if (selected.length > 0) return selected;
    return getWordAtPoint(e.clientX, e.clientY);
  }

  function loadGlossary() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ glossary: [], glossaryEnabled: true }, (data) => {
        resolve(data);
      });
    });
  }

  function findEntryByPattern(glossary, text) {
    if (!text || !glossary || !glossary.length) return -1;
    const lower = text.toLowerCase();
    return glossary.findIndex(
      (e) => e.pattern && e.pattern.toLowerCase() === lower
    );
  }

  function findEntriesByReplacement(glossary, text) {
    if (!text || !glossary || !glossary.length) return [];
    const lower = text.toLowerCase();
    return glossary
      .map((e, i) => ({ ...e, index: i }))
      .filter((e) => e.replacement && e.replacement.toLowerCase() === lower);
  }

  function applyGlossaryToHistory(glossary) {
    const history = window.__litTranscriptHistory;
    if (!Array.isArray(history) || !glossary) return;
    for (const entry of glossary) {
      if (!entry.pattern || !entry.replacement) continue;
      const escaped = entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      for (const h of history) {
        if (h.original) h.original = h.original.replace(re, entry.replacement);
        if (h.translated) h.translated = h.translated.replace(re, entry.replacement);
      }
    }
  }

  function removeGlossaryFromHistory(pattern) {
    const history = window.__litTranscriptHistory;
    if (!Array.isArray(history) || !pattern) return;
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    for (const h of history) {
      if (h.original) h.original = h.original.replace(re, pattern);
      if (h.translated) h.translated = h.translated.replace(re, pattern);
    }
  }

  function replaceInHistory(oldPattern, newReplacement) {
    const history = window.__litTranscriptHistory;
    if (!Array.isArray(history)) return;
    const escaped = oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    for (const h of history) {
      if (h.original) h.original = h.original.replace(re, newReplacement);
      if (h.translated) h.translated = h.translated.replace(re, newReplacement);
    }
  }

  function saveAndClose(updatedGlossary, closePopover) {
    chrome.storage.sync.set({ glossary: updatedGlossary }, () => {
      chrome.runtime.sendMessage({ type: 'glossary-updated' });
      if (typeof window.__litPersistSession === 'function') {
        window.__litPersistSession();
      }
      closePopover();
    });
  }

  const CSS = `
    :host {
      --lit-bg: #fff;
      --lit-border: #e8e8e8;
      --lit-input-bg: #fafafa;
      --lit-input-border: #d0d0d0;
      --lit-accent: #4a9eff;
      --lit-accent-hover: #3580d0;
      --lit-text: #242424;
      --lit-text-muted: #888;
      --lit-danger: #e74c3c;
      --lit-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --lit-bg: #2d2d2d;
        --lit-border: #444;
        --lit-input-bg: #1e1e1e;
        --lit-input-border: #555;
        --lit-accent: #5aa8ff;
        --lit-accent-hover: #7ab8ff;
        --lit-text: #e8e8e8;
        --lit-text-muted: #aaa;
        --lit-danger: #ff6b6b;
        --lit-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
    }
    .popover {
      position: fixed;
      max-width: ${MAX_WIDTH}px;
      background: var(--lit-bg);
      border: 1px solid var(--lit-border);
      border-radius: 6px;
      box-shadow: var(--lit-shadow);
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      color: var(--lit-text);
      padding: 10px 12px;
      animation: lit-fade-in 0.15s ease;
    }
    @keyframes lit-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .popover-header {
      margin-bottom: 8px;
      font-weight: 500;
      word-break: break-word;
    }
    .popover-header .term {
      color: var(--lit-text-muted);
      font-style: italic;
    }
    .popover-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .popover-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--lit-input-border);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      background: var(--lit-input-bg);
      color: var(--lit-text);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .popover-input:focus {
      border-color: var(--lit-accent);
    }
    .popover-input::placeholder {
      color: var(--lit-text-muted);
    }
    .popover-label {
      font-size: 12px;
      color: var(--lit-text-muted);
      margin-bottom: 4px;
    }
    .popover-list {
      margin: 6px 0;
      padding-left: 16px;
    }
    .popover-list li {
      margin: 2px 0;
      word-break: break-word;
    }
    .btn {
      padding: 5px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-primary {
      background: var(--lit-accent);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--lit-accent-hover);
    }
    .btn-secondary {
      background: var(--lit-input-bg);
      color: var(--lit-text);
      border: 1px solid var(--lit-input-border);
    }
    .btn-secondary:hover {
      border-color: var(--lit-accent);
      color: var(--lit-accent);
    }
    .btn-danger {
      background: transparent;
      color: var(--lit-danger);
      border: 1px solid var(--lit-danger);
    }
    .btn-danger:hover {
      background: var(--lit-danger);
      color: #fff;
    }
    .btn-icon {
      width: 26px;
      height: 26px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border-radius: 4px;
      background: transparent;
      color: var(--lit-text-muted);
      border: 1px solid var(--lit-input-border);
      cursor: pointer;
    }
    .btn-icon:hover {
      background: var(--lit-input-bg);
      color: var(--lit-text);
    }
    .btn-group {
      display: flex;
      gap: 4px;
      align-items: center;
      flex-wrap: wrap;
    }
    .ml-auto { margin-left: auto; }
  `;

  function positionPopover(host, clientX, clientY) {
    const rect = host.getBoundingClientRect();
    let left = clientX + OFFSET_X;
    let top = clientY + OFFSET_Y;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + rect.width > vw - 10) left = vw - rect.width - 10;
    if (left < 10) left = 10;
    if (top + rect.height > vh - 10) top = vh - rect.height - 10;
    if (top < 10) top = 10;
    host.style.left = left + 'px';
    host.style.top = top + 'px';
  }

  function createPopover(text, clientX, clientY) {
    removeExistingPopover();

    const host = document.createElement('div');
    host.id = POPOVER_ID;
    host.style.cssText = `position:fixed;z-index:${Z_INDEX};left:0;top:0;`;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'popover';
    shadow.appendChild(wrap);

    let closePopover = () => {
      document.body.removeChild(host);
      document.removeEventListener('click', outsideClick);
      document.removeEventListener('keydown', escapeKey);
    };

    const outsideClick = (e) => {
      if (!host.contains(e.target) && !shadow.contains(e.target)) {
        closePopover();
      }
    };

    const escapeKey = (e) => {
      if (e.key === 'Escape') closePopover();
    };

    setTimeout(() => {
      document.addEventListener('click', outsideClick);
      document.addEventListener('keydown', escapeKey);
    }, 0);

    positionPopover(host, clientX, clientY);

    function render() {
      loadGlossary().then((data) => {
        const glossary = data.glossary || [];
        const patternIdx = findEntryByPattern(glossary, text);
        const replacementEntries = findEntriesByReplacement(glossary, text);

        wrap.innerHTML = '';

        if (patternIdx >= 0) {
          renderExistingPattern(glossary, patternIdx, wrap, closePopover, render);
        } else if (replacementEntries.length > 0) {
          renderKnownReplacement(glossary, text, replacementEntries, wrap, closePopover, render);
        } else {
          renderNewTerm(text, glossary, wrap, closePopover, render);
        }
        requestAnimationFrame(() => positionPopover(host, clientX, clientY));
      });
    }

    render();
  }

  function renderNewTerm(text, glossary, wrap, closePopover, reRender) {
    const header = document.createElement('div');
    header.className = 'popover-header';
    header.textContent = `"${escapeHtml(text)}"`;
    wrap.appendChild(header);

    const label = document.createElement('div');
    label.className = 'popover-label';
    label.textContent = chrome.i18n.getMessage('popover_replace_with');
    wrap.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'popover-input';
    input.placeholder = chrome.i18n.getMessage('popover_replacement_text');
    input.autocomplete = 'off';
    wrap.appendChild(input);

    const row = document.createElement('div');
    row.className = 'popover-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = chrome.i18n.getMessage('popover_add_to_glossary');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon';
    closeBtn.textContent = '×';
    closeBtn.title = chrome.i18n.getMessage('tooltip_close');
    row.appendChild(addBtn);
    row.appendChild(closeBtn);
    wrap.appendChild(row);

    const doAdd = () => {
      const replacement = input.value.trim();
      if (!replacement) return;
      const updated = [...glossary, { pattern: text, replacement, enabled: true }];
      applyGlossaryToHistory([{ pattern: text, replacement, enabled: true }]);
      saveAndClose(updated, closePopover);
    };

    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doAdd();
    });
    closeBtn.addEventListener('click', closePopover);
    input.focus();
  }

  function renderAddVariant(glossary, replacementText, wrap, closePopover, reRender) {
    const header = document.createElement('div');
    header.className = 'popover-header';
    header.innerHTML = `"${escapeHtml(replacementText)}" ${chrome.i18n.getMessage('popover_add_pattern')}`;
    wrap.appendChild(header);

    const label = document.createElement('div');
    label.className = 'popover-label';
    label.textContent = chrome.i18n.getMessage('popover_pattern_label');
    wrap.appendChild(label);

    const patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.className = 'popover-input';
    patternInput.placeholder = chrome.i18n.getMessage('popover_pattern_hint');
    patternInput.autocomplete = 'off';
    wrap.appendChild(patternInput);

    const replLabel = document.createElement('div');
    replLabel.className = 'popover-label';
    replLabel.textContent = chrome.i18n.getMessage('popover_replacement_label');
    replLabel.style.marginTop = '8px';
    wrap.appendChild(replLabel);

    const replInput = document.createElement('input');
    replInput.type = 'text';
    replInput.className = 'popover-input';
    replInput.value = replacementText;
    replInput.readOnly = true;
    replInput.style.background = 'var(--lit-input-bg)';
    replInput.style.color = 'var(--lit-text-muted)';
    wrap.appendChild(replInput);

    const row = document.createElement('div');
    row.className = 'popover-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = chrome.i18n.getMessage('popover_add_to_glossary');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon';
    closeBtn.textContent = '×';
    closeBtn.title = chrome.i18n.getMessage('tooltip_close');
    row.appendChild(addBtn);
    row.appendChild(closeBtn);
    wrap.appendChild(row);

    const doAdd = () => {
      const pattern = patternInput.value.trim();
      if (!pattern) return;
      const updated = [...glossary, { pattern, replacement: replacementText, enabled: true }];
      applyGlossaryToHistory([{ pattern, replacement: replacementText, enabled: true }]);
      saveAndClose(updated, closePopover);
    };

    addBtn.addEventListener('click', doAdd);
    patternInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doAdd();
    });
    closeBtn.addEventListener('click', closePopover);
    patternInput.focus();
  }

  function renderExistingPattern(glossary, idx, wrap, closePopover, reRender) {
    const entry = glossary[idx];
    const header = document.createElement('div');
    header.className = 'popover-header';
    header.innerHTML = `"${escapeHtml(entry.pattern)}" → <span class="term">${escapeHtml(entry.replacement)}</span>`;
    wrap.appendChild(header);

    const row = document.createElement('div');
    row.className = 'popover-row btn-group';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.textContent = chrome.i18n.getMessage('popover_edit');

    const disableBtn = document.createElement('button');
    disableBtn.className = 'btn btn-secondary';
    disableBtn.textContent = entry.enabled ? chrome.i18n.getMessage('popover_disable') : chrome.i18n.getMessage('popover_enable');

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = chrome.i18n.getMessage('popover_del');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon';
    closeBtn.textContent = '×';
    closeBtn.title = chrome.i18n.getMessage('tooltip_close');

    row.appendChild(editBtn);
    row.appendChild(disableBtn);
    row.appendChild(delBtn);
    row.appendChild(closeBtn);
    wrap.appendChild(row);

    editBtn.addEventListener('click', () => {
      wrap.innerHTML = '';
      const header2 = document.createElement('div');
      header2.className = 'popover-header';
      header2.textContent = `${chrome.i18n.getMessage('popover_edit')} "${escapeHtml(entry.pattern)}"`;
      wrap.appendChild(header2);
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'popover-input';
      input.value = entry.replacement;
      input.placeholder = chrome.i18n.getMessage('popover_replacement');
      wrap.appendChild(input);
      const row2 = document.createElement('div');
      row2.className = 'popover-row btn-group';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = chrome.i18n.getMessage('popover_save');
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = chrome.i18n.getMessage('popover_cancel');
      row2.appendChild(saveBtn);
      row2.appendChild(cancelBtn);
      wrap.appendChild(row2);
      input.focus();

      saveBtn.addEventListener('click', () => {
        const newReplacement = input.value.trim();
        if (!newReplacement) return;
        const updated = [...glossary];
        updated[idx] = { ...entry, replacement: newReplacement };
        replaceInHistory(entry.pattern, newReplacement);
        saveAndClose(updated, closePopover);
      });
      cancelBtn.addEventListener('click', reRender);
    });

    disableBtn.addEventListener('click', () => {
      const updated = [...glossary];
      updated[idx] = { ...entry, enabled: !entry.enabled };
      saveAndClose(updated, closePopover);
    });

    delBtn.addEventListener('click', () => {
      const updated = glossary.filter((_, i) => i !== idx);
      removeGlossaryFromHistory(entry.pattern);
      saveAndClose(updated, closePopover);
    });

    closeBtn.addEventListener('click', closePopover);
  }

  function renderKnownReplacement(glossary, replacementText, entries, wrap, closePopover, reRender) {
    const header = document.createElement('div');
    header.className = 'popover-header';
    header.innerHTML = `"${escapeHtml(replacementText)}" ${chrome.i18n.getMessage('popover_replaces')}`;
    wrap.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'popover-list';
    for (const e of entries) {
      const li = document.createElement('li');
      li.textContent = e.pattern;
      list.appendChild(li);
    }
    wrap.appendChild(list);

    const row = document.createElement('div');
    row.className = 'popover-row btn-group';
    const addVariantBtn = document.createElement('button');
    addVariantBtn.className = 'btn btn-primary';
    addVariantBtn.textContent = chrome.i18n.getMessage('popover_add_variant');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon';
    closeBtn.textContent = '×';
    closeBtn.title = chrome.i18n.getMessage('tooltip_close');
    row.appendChild(addVariantBtn);
    row.appendChild(closeBtn);
    wrap.appendChild(row);

    addVariantBtn.addEventListener('click', () => {
      wrap.innerHTML = '';
      renderAddVariant(glossary, replacementText, wrap, closePopover, reRender);
    });

    closeBtn.addEventListener('click', closePopover);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function removeExistingPopover() {
    const existing = document.getElementById(POPOVER_ID);
    if (existing) existing.remove();
  }

  document.addEventListener('click', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    if (!isInsideAllowedTarget(e.target)) return;

    const text = getTextForClick(e);
    if (!text) return;

    e.preventDefault();
    e.stopPropagation();
    createPopover(text, e.clientX, e.clientY);
  });
})();
