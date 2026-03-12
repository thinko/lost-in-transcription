/* global chrome */

(function () {
  'use strict';

  const PANEL_ID = 'lit-side-panel-host';
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

  window.__litCreateSidePanel = function (existingHistory) {
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
      <div class="lit-panel" id="lit-panel">
        <div class="lit-resize-handle" id="lit-resize"></div>
        <div class="lit-collapse-btn" id="lit-collapse" title="Toggle panel">◀</div>
        <div class="lit-header">
          <span class="lit-title">Translation</span>
          <span class="lit-count" id="lit-count">0</span>
        </div>
        <div class="lit-entries" id="lit-entries"></div>
      </div>
    `;

    captionWrapper.style.position = 'relative';
    captionWrapper.appendChild(host);

    const panel = shadow.getElementById('lit-panel');
    const entries = shadow.getElementById('lit-entries');
    const resizeHandle = shadow.getElementById('lit-resize');
    const collapseBtn = shadow.getElementById('lit-collapse');
    const countBadge = shadow.getElementById('lit-count');

    panel.style.width = panelWidth + 'px';

    // Populate existing history
    if (existingHistory?.length) {
      for (const entry of existingHistory) {
        appendEntry(entries, entry, countBadge);
      }
    }

    // ── Update hook (called from content.js) ───────────────────────────

    window.__litSidePanelUpdate = function (entry) {
      const existing = entries.querySelector(`[data-caption-id="${entry.captionId}"]`);
      if (existing) {
        existing.querySelector('.lit-entry-translated').textContent = entry.translated;
        existing.querySelector('.lit-entry-original').textContent = entry.original;
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
      panel.classList.toggle('lit-collapsed', collapsed);
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
    div.className = 'lit-entry';
    if (entry.captionId) div.setAttribute('data-caption-id', entry.captionId);

    const ts = document.createElement('span');
    ts.className = 'lit-entry-time';
    ts.textContent = entry.timestamp || '';

    const speaker = document.createElement('span');
    speaker.className = 'lit-entry-speaker';
    speaker.textContent = entry.speaker || '';

    const original = document.createElement('div');
    original.className = 'lit-entry-original';
    original.textContent = entry.original || '';

    const translated = document.createElement('div');
    translated.className = 'lit-entry-translated';
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

      .lit-panel {
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

      .lit-panel.lit-collapsed {
        width: 8px !important;
      }
      .lit-panel.lit-collapsed .lit-header,
      .lit-panel.lit-collapsed .lit-entries {
        display: none;
      }

      .lit-resize-handle {
        position: absolute;
        left: 0;
        top: 0;
        width: 4px;
        height: 100%;
        cursor: col-resize;
        z-index: 10;
      }
      .lit-resize-handle:hover {
        background: #4a9eff;
      }

      .lit-collapse-btn {
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
      .lit-collapse-btn:hover {
        background: #3580d0;
      }

      .lit-header {
        padding: 8px 12px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .lit-title {
        font-weight: 600;
        font-size: 13px;
      }

      .lit-count {
        background: #4a9eff;
        color: #fff;
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }

      .lit-entries {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
      }

      .lit-entry {
        padding: 6px 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      .lit-entry:hover {
        background: #f5f9ff;
      }

      .lit-entry-time {
        font-size: 10px;
        color: #999;
        margin-right: 6px;
      }

      .lit-entry-speaker {
        font-size: 11px;
        font-weight: 600;
        color: #4a9eff;
      }

      .lit-entry-original {
        font-size: 12px;
        color: #888;
        font-style: italic;
        margin-top: 2px;
        line-height: 1.3;
      }

      .lit-entry-translated {
        font-size: 13px;
        color: #242424;
        margin-top: 2px;
        line-height: 1.4;
      }

      /* Dark mode: detect Teams dark theme via media query or host context */
      @media (prefers-color-scheme: dark) {
        .lit-panel {
          background: #1f1f1f;
          color: #e0e0e0;
          border-left-color: #4a9eff;
          box-shadow: -2px 0 8px rgba(0,0,0,0.4);
        }
        .lit-header {
          border-bottom-color: #333;
        }
        .lit-entry {
          border-bottom-color: #2a2a2a;
        }
        .lit-entry:hover {
          background: #2a2a2a;
        }
        .lit-entry-original {
          color: #999;
        }
        .lit-entry-translated {
          color: #e0e0e0;
        }
      }
    `;
  }
})();
