/* global chrome */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────

  let displayMode = 'inline';
  let enabled = true;
  let captionIdCounter = 0;
  let transcriptHistory = [];
  let captionStartTime = Date.now();
  const processedTexts = new Map();

  // ── Session persistence ────────────────────────────────────────────────

  const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const MAX_SESSIONS = 10;
  const SAVE_DEBOUNCE_MS = 3000;
  let sessionId = null;
  let sessionMeetingUrl = null;
  let saveTimer = null;
  let sessionRestored = false;

  function deriveMeetingId() {
    const url = new URL(window.location.href);
    const meetingMatch = url.pathname.match(/\/meet\/([^/?#]+)/) ||
      url.href.match(/meetup-join[/]([^/?#]+)/) ||
      url.href.match(/meeting[/]([^/?#]+)/);
    if (meetingMatch) return meetingMatch[1];
    const threadId = url.searchParams.get('threadId') ||
      url.searchParams.get('meetingId');
    if (threadId) return threadId;
    return url.pathname.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  }

  function getMeetingTitle() {
    const titleEl = document.querySelector('[data-tid="call-title"]');
    if (titleEl) return titleEl.textContent.trim();
    const pageTitle = document.title || '';
    const cleaned = pageTitle.replace(/\s*\|\s*Microsoft Teams$/, '').trim();
    return cleaned || 'Unknown Meeting';
  }

  async function initSession() {
    const meetingId = deriveMeetingId();
    sessionMeetingUrl = window.location.href;

    const data = await chrome.storage.local.get({ ltccSessions: [] });
    const sessions = data.ltccSessions || [];

    const existing = sessions.find((s) => s.meetingId === meetingId);
    if (existing) {
      sessionId = existing.id;
      const entryData = await chrome.storage.local.get({ [`ltccHistory_${sessionId}`]: [] });
      const restored = entryData[`ltccHistory_${sessionId}`] || [];
      if (restored.length > 0) {
        transcriptHistory = restored;
        sessionRestored = true;
        captionStartTime = existing.startedAt || Date.now();
        console.log(`[Live Translate CC] Restored session with ${restored.length} entries`);
      }
    } else {
      sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const meta = {
        id: sessionId,
        meetingId,
        title: getMeetingTitle(),
        url: sessionMeetingUrl,
        startedAt: Date.now(),
        entryCount: 0,
      };
      sessions.unshift(meta);

      while (sessions.length > MAX_SESSIONS) {
        const old = sessions.pop();
        await chrome.storage.local.remove(`ltccHistory_${old.id}`);
      }

      const now = Date.now();
      const pruned = sessions.filter((s) => now - s.startedAt < SESSION_MAX_AGE_MS);
      await chrome.storage.local.set({ ltccSessions: pruned });
    }

    window.__ltccTranscriptHistory = transcriptHistory;
  }

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistSession();
    }, SAVE_DEBOUNCE_MS);
  }

  async function persistSession() {
    if (!sessionId) return;
    try {
      await chrome.storage.local.set({ [`ltccHistory_${sessionId}`]: transcriptHistory });
      const data = await chrome.storage.local.get({ ltccSessions: [] });
      const sessions = data.ltccSessions || [];
      const meta = sessions.find((s) => s.id === sessionId);
      if (meta) {
        meta.entryCount = transcriptHistory.length;
        meta.title = getMeetingTitle();
        meta.lastUpdated = Date.now();
        await chrome.storage.local.set({ ltccSessions: sessions });
      }
    } catch (err) {
      console.error('[Live Translate CC] Failed to persist session:', err);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (sessionId && transcriptHistory.length > 0) {
      persistSession();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && sessionId && transcriptHistory.length > 0) {
      persistSession();
    }
  });

  // ── Bootstrap ────────────────────────────────────────────────────────────

  chrome.runtime.sendMessage({ type: 'get-settings' }, async (settings) => {
    if (settings) {
      displayMode = settings.displayMode || 'inline';
      enabled = settings.enabled !== false;
    }
    await initSession();
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
    if (msg.type === 'get-session-info') {
      // Respond via storage since sendResponse isn't available in onMessage without return true
      chrome.runtime.sendMessage({
        type: 'session-info-response',
        sessionId,
        entryCount: transcriptHistory.length,
        restored: sessionRestored,
      });
    }
    if (msg.type === 'clear-current-session') {
      transcriptHistory.length = 0;
      processedTexts.clear();
      captionIdCounter = 0;
      captionStartTime = Date.now();
      persistSession();
      document.querySelectorAll('.ltcc-inline').forEach((el) => el.remove());
    }
    if (msg.type === 'load-session-history') {
      chrome.storage.local.get({ [`ltccHistory_${msg.sessionId}`]: [] }, (data) => {
        const history = data[`ltccHistory_${msg.sessionId}`] || [];
        chrome.runtime.sendMessage({
          type: 'export-transcript',
          history,
          format: msg.format || 'txt',
          content: msg.content || 'both',
        });
      });
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
      scheduleSave();
      return;
    }

    transcriptHistory.push(entry);
    scheduleSave();
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
