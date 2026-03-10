/* global chrome */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────

  let displayMode = 'inline';
  let enabled = true;
  let captionIdCounter = 0;
  const transcriptHistory = [];
  const captionStartTime = Date.now();
  const processedTexts = new Map();

  // ── Bootstrap ────────────────────────────────────────────────────────────

  chrome.runtime.sendMessage({ type: 'get-settings' }, (settings) => {
    if (settings) {
      displayMode = settings.displayMode || 'inline';
      enabled = settings.enabled !== false;
    }
    waitForCaptionContainer();
  });

  // ── Listen for messages from background / popup ──────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'translation-result') {
      applyTranslation(msg.captionId, msg.original, msg.translated);
    }
    if (msg.type === 'translation-error') {
      applyTranslationError(msg.captionId, msg.error);
    }
    if (msg.type === 'display-mode-changed') {
      displayMode = msg.mode;
      onDisplayModeChanged();
    }
    if (msg.type === 'settings-changed') {
      if (msg.settings.displayMode) displayMode = msg.settings.displayMode;
      if (msg.settings.enabled !== undefined) enabled = msg.settings.enabled;
      onDisplayModeChanged();
    }
    if (msg.type === 'trigger-export') {
      triggerExport();
    }
  });

  // ── Wait for the caption container to appear ─────────────────────────────

  function waitForCaptionContainer() {
    const existing = findCaptionContainer();
    if (existing) {
      attachCaptionObserver(existing);
      return;
    }

    const bodyObserver = new MutationObserver(() => {
      const container = findCaptionContainer();
      if (container) {
        bodyObserver.disconnect();
        attachCaptionObserver(container);
      }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function findCaptionContainer() {
    return (
      document.querySelector('[data-tid="closed-caption-v2-virtual-list-content"]') ||
      document.querySelector('[data-tid="closed-caption-v2-window-wrapper"]') ||
      document.querySelector('[data-tid="closed-caption-renderer-wrapper"]')
    );
  }

  // ── Observe caption mutations ────────────────────────────────────────────

  function attachCaptionObserver(container) {
    processExistingCaptions(container);

    const observer = new MutationObserver((mutations) => {
      if (!enabled) return;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            const captions = node.querySelectorAll
              ? node.querySelectorAll('[data-tid="closed-caption-text"]')
              : [];
            if (node.matches?.('[data-tid="closed-caption-text"]')) {
              handleCaptionNode(node);
            }
            captions.forEach(handleCaptionNode);
          }
        }
        if (mutation.type === 'characterData') {
          const span = mutation.target.parentElement?.closest?.(
            '[data-tid="closed-caption-text"]'
          );
          if (span) handleCaptionNode(span);
        }
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const reattachObserver = new MutationObserver(() => {
      const newContainer = findCaptionContainer();
      if (newContainer && newContainer !== container) {
        observer.disconnect();
        container = newContainer;
        attachCaptionObserver(container);
        reattachObserver.disconnect();
      }
    });
    reattachObserver.observe(document.body, { childList: true, subtree: true });
  }

  function processExistingCaptions(container) {
    const spans = container.querySelectorAll('[data-tid="closed-caption-text"]');
    spans.forEach(handleCaptionNode);
  }

  // ── Handle individual caption node ───────────────────────────────────────

  function handleCaptionNode(span) {
    if (!enabled) return;

    const text = span.textContent?.trim();
    if (!text) return;

    let captionId = span.getAttribute('data-ltcc-id');
    if (!captionId) {
      captionId = `ltcc-${++captionIdCounter}`;
      span.setAttribute('data-ltcc-id', captionId);
    }

    const prevText = processedTexts.get(captionId);
    if (prevText === text) return;
    processedTexts.set(captionId, text);

    const speaker = extractSpeaker(span);

    chrome.runtime.sendMessage({
      type: 'translate',
      text,
      captionId,
      speaker,
    });
  }

  function extractSpeaker(captionSpan) {
    const messageEl =
      captionSpan.closest('.fui-ChatMessageCompact') ||
      captionSpan.closest('[class*="ChatMessageCompact"]');
    if (!messageEl) return 'Unknown';
    const authorEl = messageEl.querySelector('[data-tid="author"]');
    return authorEl?.textContent?.trim() || 'Unknown';
  }

  // ── Apply translation result ─────────────────────────────────────────────

  function applyTranslation(captionId, original, translated) {
    if (!translated) return;

    const speaker = findSpeakerForCaption(captionId);
    const elapsed = Date.now() - captionStartTime;
    const timestamp = formatElapsed(elapsed);

    addToHistory({ timestamp, speaker, original, translated });

    if (displayMode === 'inline') {
      showInline(captionId, translated);
    }

    if (typeof window.__ltccSidePanelUpdate === 'function') {
      window.__ltccSidePanelUpdate({ captionId, speaker, original, translated, timestamp });
    }
  }

  function applyTranslationError(captionId, error) {
    if (displayMode === 'inline') {
      showInline(captionId, `[Error: ${error}]`, true);
    }
  }

  function findSpeakerForCaption(captionId) {
    const span = document.querySelector(`[data-ltcc-id="${captionId}"]`);
    if (!span) return 'Unknown';
    return extractSpeaker(span);
  }

  // ── Inline display ──────────────────────────────────────────────────────

  function showInline(captionId, text, isError = false) {
    const span = document.querySelector(`[data-ltcc-id="${captionId}"]`);
    if (!span) return;

    const parent = span.parentElement;
    if (!parent) return;

    let el = parent.querySelector(`.ltcc-inline[data-for="${captionId}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'ltcc-inline';
      el.setAttribute('data-for', captionId);
      parent.appendChild(el);
    }

    el.textContent = text;
    el.classList.toggle('ltcc-error', isError);
  }

  // ── Display mode toggling ───────────────────────────────────────────────

  function onDisplayModeChanged() {
    const inlines = document.querySelectorAll('.ltcc-inline');
    const panel = document.getElementById('ltcc-side-panel-host');

    if (displayMode === 'inline') {
      inlines.forEach((el) => (el.style.display = ''));
      if (panel) panel.style.display = 'none';
    } else {
      inlines.forEach((el) => (el.style.display = 'none'));
      if (panel) panel.style.display = '';
      ensureSidePanel();
    }
  }

  function ensureSidePanel() {
    if (document.getElementById('ltcc-side-panel-host')) return;
    if (typeof window.__ltccCreateSidePanel === 'function') {
      window.__ltccCreateSidePanel(transcriptHistory);
    }
  }

  // ── Transcript history ──────────────────────────────────────────────────

  function addToHistory(entry) {
    const lastEntry = transcriptHistory[transcriptHistory.length - 1];
    if (
      lastEntry &&
      lastEntry.speaker === entry.speaker &&
      lastEntry.original === entry.original
    ) {
      lastEntry.translated = entry.translated;
      lastEntry.timestamp = entry.timestamp;
      return;
    }

    transcriptHistory.push(entry);

    if (transcriptHistory.length % 20 === 0) {
      chrome.storage.session?.set?.({ transcriptHistory });
    }
  }

  function formatElapsed(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ── Export ──────────────────────────────────────────────────────────────

  function triggerExport() {
    chrome.runtime.sendMessage({ type: 'get-settings' }, (settings) => {
      chrome.runtime.sendMessage({
        type: 'export-transcript',
        history: transcriptHistory,
        format: settings?.lastExportFormat || 'txt',
        content: settings?.lastExportContent || 'both',
      });
    });
  }

  // Expose for side panel and export modules
  window.__ltccTranscriptHistory = transcriptHistory;
  window.__ltccTriggerExport = triggerExport;
})();
