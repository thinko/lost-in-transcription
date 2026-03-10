/* global chrome */

(function () {
  'use strict';

  const PANEL_ID = 'ltcc-side-panel-host';
  const DEFAULT_WIDTH = 400;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 800;

  let panelWidth = DEFAULT_WIDTH;
  let collapsed = false;

  // Restore persisted width
  chrome.storage.sync.get({ sidePanelWidth: DEFAULT_WIDTH }, (v) => {
    panelWidth = v.sidePanelWidth;
  });

  // ── Create the side panel ──────────────────────────────────────────────

  window.__ltccCreateSidePanel = function (existingHistory) {
    if (document.getElementById(PANEL_ID)) return;

    const captionWrapper = document.querySelector(
      '[data-tid="closed-caption-renderer-wrapper"]'
    );
    if (!captionWrapper) return;

    const host = document.createElement('div');
    host.id = PANEL_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>${getSidePanelCSS()}</style>
      <div class="ltcc-panel" id="ltcc-panel">
        <div class="ltcc-resize-handle" id="ltcc-resize"></div>
        <div class="ltcc-collapse-btn" id="ltcc-collapse" title="Toggle panel">◀</div>
        <div class="ltcc-header">
          <span class="ltcc-title">Translation</span>
          <span class="ltcc-count" id="ltcc-count">0</span>
        </div>
        <div class="ltcc-entries" id="ltcc-entries"></div>
      </div>
    `;

    captionWrapper.style.position = 'relative';
    captionWrapper.appendChild(host);

    const panel = shadow.getElementById('ltcc-panel');
    const entries = shadow.getElementById('ltcc-entries');
    const resizeHandle = shadow.getElementById('ltcc-resize');
    const collapseBtn = shadow.getElementById('ltcc-collapse');
    const countBadge = shadow.getElementById('ltcc-count');

    panel.style.width = panelWidth + 'px';

    // Populate existing history
    if (existingHistory?.length) {
      for (const entry of existingHistory) {
        appendEntry(entries, entry, countBadge);
      }
    }

    // ── Update hook (called from content.js) ───────────────────────────

    window.__ltccSidePanelUpdate = function (entry) {
      const existing = entries.querySelector(`[data-caption-id="${entry.captionId}"]`);
      if (existing) {
        existing.querySelector('.ltcc-entry-translated').textContent = entry.translated;
        existing.querySelector('.ltcc-entry-original').textContent = entry.original;
      } else {
        appendEntry(entries, entry, countBadge);
      }
      entries.scrollTop = entries.scrollHeight;
    };

    // ── Resize drag ────────────────────────────────────────────────────

    let dragging = false;
    let startX = 0;
    let startW = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startW = panelWidth;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = startX - e.clientX;
      panelWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + delta));
      panel.style.width = panelWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        chrome.storage.sync.set({ sidePanelWidth: panelWidth });
      }
    });

    // ── Collapse toggle ────────────────────────────────────────────────

    collapseBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      panel.classList.toggle('ltcc-collapsed', collapsed);
      collapseBtn.textContent = collapsed ? '▶' : '◀';
    });

    // ── ResizeObserver to track caption pane movement ──────────────────

    const ro = new ResizeObserver(() => {
      const rect = captionWrapper.getBoundingClientRect();
      host.style.position = 'absolute';
      host.style.top = '0';
      host.style.right = '0';
      host.style.height = rect.height + 'px';
    });
    ro.observe(captionWrapper);
  };

  // ── Append a single entry ──────────────────────────────────────────────

  function appendEntry(container, entry, countBadge) {
    const div = document.createElement('div');
    div.className = 'ltcc-entry';
    if (entry.captionId) div.setAttribute('data-caption-id', entry.captionId);

    const ts = document.createElement('span');
    ts.className = 'ltcc-entry-time';
    ts.textContent = entry.timestamp || '';

    const speaker = document.createElement('span');
    speaker.className = 'ltcc-entry-speaker';
    speaker.textContent = entry.speaker || '';

    const original = document.createElement('div');
    original.className = 'ltcc-entry-original';
    original.textContent = entry.original || '';

    const translated = document.createElement('div');
    translated.className = 'ltcc-entry-translated';
    translated.textContent = entry.translated || '';

    div.appendChild(ts);
    div.appendChild(speaker);
    div.appendChild(original);
    div.appendChild(translated);
    container.appendChild(div);

    if (countBadge) {
      countBadge.textContent = container.children.length;
    }
  }

  // ── Side panel styles ──────────────────────────────────────────────────

  function getSidePanelCSS() {
    return `
      :host {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 10000;
        pointer-events: auto;
      }

      .ltcc-panel {
        position: relative;
        height: 100%;
        background: #ffffff;
        border-left: 2px solid #4a9eff;
        display: flex;
        flex-direction: column;
        font-family: "Segoe UI", -apple-system, sans-serif;
        font-size: 13px;
        color: #242424;
        box-shadow: -2px 0 8px rgba(0,0,0,0.1);
        transition: width 0.15s ease;
        overflow: hidden;
      }

      .ltcc-panel.ltcc-collapsed {
        width: 8px !important;
      }
      .ltcc-panel.ltcc-collapsed .ltcc-header,
      .ltcc-panel.ltcc-collapsed .ltcc-entries {
        display: none;
      }

      .ltcc-resize-handle {
        position: absolute;
        left: 0;
        top: 0;
        width: 4px;
        height: 100%;
        cursor: col-resize;
        z-index: 10;
      }
      .ltcc-resize-handle:hover {
        background: #4a9eff;
      }

      .ltcc-collapse-btn {
        position: absolute;
        left: -20px;
        top: 8px;
        width: 20px;
        height: 28px;
        background: #4a9eff;
        color: #fff;
        border-radius: 4px 0 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 10px;
        z-index: 11;
        user-select: none;
      }
      .ltcc-collapse-btn:hover {
        background: #3580d0;
      }

      .ltcc-header {
        padding: 8px 12px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .ltcc-title {
        font-weight: 600;
        font-size: 13px;
      }

      .ltcc-count {
        background: #4a9eff;
        color: #fff;
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }

      .ltcc-entries {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
      }

      .ltcc-entry {
        padding: 6px 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      .ltcc-entry:hover {
        background: #f5f9ff;
      }

      .ltcc-entry-time {
        font-size: 10px;
        color: #999;
        margin-right: 6px;
      }

      .ltcc-entry-speaker {
        font-size: 11px;
        font-weight: 600;
        color: #4a9eff;
      }

      .ltcc-entry-original {
        font-size: 12px;
        color: #888;
        font-style: italic;
        margin-top: 2px;
        line-height: 1.3;
      }

      .ltcc-entry-translated {
        font-size: 13px;
        color: #242424;
        margin-top: 2px;
        line-height: 1.4;
      }

      /* Dark mode: detect Teams dark theme via media query or host context */
      @media (prefers-color-scheme: dark) {
        .ltcc-panel {
          background: #1f1f1f;
          color: #e0e0e0;
          border-left-color: #4a9eff;
          box-shadow: -2px 0 8px rgba(0,0,0,0.4);
        }
        .ltcc-header {
          border-bottom-color: #333;
        }
        .ltcc-entry {
          border-bottom-color: #2a2a2a;
        }
        .ltcc-entry:hover {
          background: #2a2a2a;
        }
        .ltcc-entry-original {
          color: #999;
        }
        .ltcc-entry-translated {
          color: #e0e0e0;
        }
      }
    `;
  }
})();
