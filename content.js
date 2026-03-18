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

  // ── Re-injection guard ──────────────────────────────────────────────────
  if (window.__litInitialized) {
    console.debug('[LiT] Content script already active, skipping duplicate init');
    return;
  }
  window.__litInitialized = true;

  // ── Cleanup registry ───────────────────────────────────────────────────
  if (!window.__litCleanupHandlers) window.__litCleanupHandlers = [];

  // ── State ────────────────────────────────────────────────────────────────

  let displayMode = 'inline';
  let enabled = true;
  let captionIdCounter = 0;
  let transcriptHistory = [];
  let captionStartTime = Date.now();
  const processedTexts = new Map();
  let connectionAlive = true;
  let debugMode = false;
  const activeObservers = [];

  function dbg(...args) {
    if (debugMode) console.log('[LiT]', ...args);
  }

  function dbgWarn(...args) {
    if (debugMode) console.warn('[LiT]', ...args);
  }

  // ── Resilient messaging ──────────────────────────────────────────────────
  // Wraps chrome.runtime.sendMessage with error handling for invalidated
  // extension contexts (happens after extension reload / update).

  function safeSend(msg, callback) {
    try {
      if (!chrome.runtime?.id) {
        onConnectionLost();
        return;
      }
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          if (errMsg.includes('Extension context invalidated') ||
              errMsg.includes('message port closed')) {
            onConnectionLost();
            return;
          }
        }
        if (callback) callback(response);
      });
    } catch (err) {
      onConnectionLost();
    }
  }

  function onConnectionLost() {
    if (!connectionAlive) return;
    connectionAlive = false;
    console.warn('[LiT] Extension context lost — translation paused. Use the popup "Restart" button or reload the extension.');
  }

  // Called by background.js after re-injecting scripts into this tab
  window.__litReconnect = function () {
    dbg('Reconnecting…');
    connectionAlive = true;
    safeSend({ type: 'get-settings' }, async (settings) => {
      if (settings) {
        displayMode = settings.displayMode || 'inline';
        enabled = settings.enabled !== false;
        debugMode = !!settings.debugMode;
      }
      waitForCaptionContainer();
      const container = findCaptionContainer();
      if (container) processExistingCaptions(container);
      dbg('Reconnected successfully');
    });
  };

  // ── Connection health heartbeat ─────────────────────────────────────────
  const heartbeatId = setInterval(() => {
    if (!connectionAlive || !enabled) return;
    try {
      if (!chrome.runtime?.id) {
        onConnectionLost();
        return;
      }
      chrome.runtime.sendMessage({ type: 'ping' }, () => {
        if (chrome.runtime.lastError) onConnectionLost();
      });
    } catch {
      onConnectionLost();
    }
  }, 30000);

  // ── Session persistence ────────────────────────────────────────────────

  const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const SESSION_RESUME_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours
  const MAX_SESSIONS = 10;
  const SAVE_DEBOUNCE_MS = 3000;
  let sessionId = null;
  let sessionMeetingUrl = null;
  let saveTimer = null;
  let sessionRestored = false;

  function deriveMeetingId() {
    const url = new URL(window.location.href);

    // 1. /meet/CODE format (direct meeting links)
    const meetPath = url.pathname.match(/\/meet\/([^/?#]+)/);
    if (meetPath) return meetPath[1];

    // 2. /meetup-join/THREAD format (calendar-scheduled meetings)
    const joinMatch = url.href.match(/meetup-join[/]([^/?#]+)/);
    if (joinMatch) return joinMatch[1];

    // 3. /light-meetings/launch — extract meetingCode from coords param
    if (url.pathname.includes('/light-meetings/')) {
      const coords = url.searchParams.get('coords');
      if (coords) {
        try {
          const decoded = JSON.parse(atob(decodeURIComponent(coords)));
          if (decoded.meetingCode) return decoded.meetingCode;
        } catch {}
      }
      const p = url.searchParams.get('p');
      if (p) return 'light_' + p;
    }

    // 4. Query param fallbacks
    const threadId = url.searchParams.get('threadId') ||
      url.searchParams.get('meetingId');
    if (threadId) return threadId;

    // 5. Last resort — include p param if available
    const p = url.searchParams.get('p');
    const base = url.pathname.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    return p ? base + '_' + p : base.slice(0, 80);
  }

  function getMeetingTitle() {
    const titleEl = document.querySelector('[data-tid="call-title"]');
    if (titleEl) return titleEl.textContent.trim();
    const pageTitle = document.title || '';
    const cleaned = pageTitle.replace(/\s*\|\s*Microsoft Teams$/, '').trim();
    return cleaned || chrome.i18n.getMessage('content_unknown_meeting') || 'Unknown Meeting';
  }

  async function initSession() {
    const meetingId = deriveMeetingId();
    sessionMeetingUrl = window.location.href;

    const data = await chrome.storage.local.get({ litSessions: [] });
    const sessions = data.litSessions || [];

    const existing = sessions.find((s) => s.meetingId === meetingId);
    const isStale = existing && (Date.now() - (existing.lastUpdated || existing.startedAt) > SESSION_RESUME_WINDOW_MS);
    if (existing && !isStale) {
      sessionId = existing.id;
      const entryData = await chrome.storage.local.get({ [`litHistory_${sessionId}`]: [] });
      const restored = entryData[`litHistory_${sessionId}`] || [];
      if (restored.length > 0) {
        transcriptHistory = restored;
        sessionRestored = true;
        captionStartTime = existing.startedAt || Date.now();
        dbg(`Restored session with ${restored.length} entries`);
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
        await chrome.storage.local.remove(`litHistory_${old.id}`);
      }

      const now = Date.now();
      const pruned = sessions.filter((s) => now - s.startedAt < SESSION_MAX_AGE_MS);
      await chrome.storage.local.set({ litSessions: pruned });
    }

    window.__litTranscriptHistory = transcriptHistory;
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
      await chrome.storage.local.set({ [`litHistory_${sessionId}`]: transcriptHistory });
      const data = await chrome.storage.local.get({ litSessions: [] });
      const sessions = data.litSessions || [];
      const meta = sessions.find((s) => s.id === sessionId);
      if (meta) {
        meta.entryCount = transcriptHistory.length;
        meta.title = getMeetingTitle();
        meta.lastUpdated = Date.now();
        await chrome.storage.local.set({ litSessions: sessions });
      }
    } catch (err) {
      console.error('[LiT] Failed to persist session:', err);
    }
  }

  const onBeforeUnload = () => {
    if (sessionId && transcriptHistory.length > 0) {
      persistSession();
    }
  };
  window.addEventListener('beforeunload', onBeforeUnload);

  const onVisChange = () => {
    if (document.visibilityState === 'hidden' && sessionId && transcriptHistory.length > 0) {
      persistSession();
    }
  };
  document.addEventListener('visibilitychange', onVisChange);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  safeSend({ type: 'get-settings' }, async (settings) => {
    if (settings) {
      displayMode = settings.displayMode || 'inline';
      enabled = settings.enabled !== false;
      debugMode = !!settings.debugMode;
    }
    await initSession();
    waitForCaptionContainer();
    dbg('Initialized — mode:', displayMode, 'enabled:', enabled);
  });

  // ── Listen for messages from background / popup ──────────────────────────

  const onContentMessage = (msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'translation-result':
        applyTranslation(msg.captionId, msg.original, msg.translated);
        break;
      case 'translation-error':
        applyTranslationError(msg.captionId, msg.error);
        break;
      case 'display-mode-changed':
        displayMode = msg.mode;
        onDisplayModeChanged();
        break;
      case 'settings-changed':
        if (msg.settings.displayMode) displayMode = msg.settings.displayMode;
        if (msg.settings.enabled !== undefined) enabled = msg.settings.enabled;
        if (msg.settings.debugMode !== undefined) debugMode = !!msg.settings.debugMode;
        onDisplayModeChanged();
        break;
      case 'trigger-export':
        triggerExport();
        break;
      case 'get-session-info':
        safeSend({
          type: 'session-info-response',
          sessionId,
          entryCount: transcriptHistory.length,
          restored: sessionRestored,
        });
        break;
      case 'clear-current-session':
        transcriptHistory.length = 0;
        processedTexts.clear();
        captionIdCounter = 0;
        captionStartTime = Date.now();
        persistSession();
        document.querySelectorAll('.lit-inline').forEach((el) => el.remove());
        break;
      case 'load-session-history':
        chrome.storage.local.get({ [`litHistory_${msg.sessionId}`]: [] }, (data) => {
          const history = data[`litHistory_${msg.sessionId}`] || [];
          safeSend({
            type: 'export-transcript',
            history,
            format: msg.format || 'txt',
            content: msg.content || 'both',
          });
        });
        break;
      case 'save-and-new-session':
        (async () => {
          await persistSession();

          sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const meta = {
            id: sessionId,
            meetingId: deriveMeetingId(),
            title: getMeetingTitle(),
            url: window.location.href,
            startedAt: Date.now(),
            entryCount: 0,
          };

          const data = await chrome.storage.local.get({ litSessions: [] });
          const sessions = data.litSessions || [];
          sessions.unshift(meta);
          while (sessions.length > MAX_SESSIONS) {
            const old = sessions.pop();
            await chrome.storage.local.remove(`litHistory_${old.id}`);
          }
          await chrome.storage.local.set({ litSessions: sessions });

          transcriptHistory.length = 0;
          processedTexts.clear();
          captionIdCounter = 0;
          captionStartTime = Date.now();
          sessionRestored = false;

          if (typeof window.__litSidePanelClear === 'function') {
            window.__litSidePanelClear();
          }
          document.querySelectorAll('.lit-inline').forEach(el => el.remove());
          window.__litTranscriptHistory = transcriptHistory;

          sendResponse({ ok: true });
        })();
        return true;
      case 'glossary-updated':
          dbg('Glossary updated, new translations will use updated glossary');
        break;
      case 'reconnect':
        if (typeof window.__litReconnect === 'function') {
          window.__litReconnect();
        }
        sendResponse({ ok: true });
        break;
    }
  };
  chrome.runtime.onMessage.addListener(onContentMessage);

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
    activeObservers.push(bodyObserver);
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
    activeObservers.push(observer);

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
    activeObservers.push(reattachObserver);
  }

  function processExistingCaptions(container) {
    const spans = container.querySelectorAll('[data-tid="closed-caption-text"]');
    spans.forEach(handleCaptionNode);
  }

  // ── Handle individual caption node ───────────────────────────────────────

  function handleCaptionNode(span) {
    if (!enabled || !connectionAlive) return;

    const text = span.textContent?.trim();
    if (!text) return;

    let captionId = span.getAttribute('data-lit-id');
    if (!captionId) {
      captionId = `lit-${++captionIdCounter}`;
      span.setAttribute('data-lit-id', captionId);
    }

    const prevText = processedTexts.get(captionId);
    if (prevText === text) return;
    processedTexts.set(captionId, text);

    const speaker = extractSpeaker(span);

    dbg('Caption', captionId, `[${speaker}]:`, text);

    safeSend({
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
    const fallback = chrome.i18n.getMessage('content_unknown_speaker') || 'Unknown';
    if (!messageEl) return fallback;
    const authorEl = messageEl.querySelector('[data-tid="author"]');
    return authorEl?.textContent?.trim() || fallback;
  }

  // ── Apply translation result ─────────────────────────────────────────────

  function applyTranslation(captionId, original, translated) {
    if (!translated) return;
    dbg('Translation', captionId, '→', translated);

    const speaker = findSpeakerForCaption(captionId);
    const elapsed = Date.now() - captionStartTime;
    const timestamp = formatElapsed(elapsed);

    addToHistory({ captionId, timestamp, speaker, original, translated });

    if (displayMode === 'inline') {
      showInline(captionId, translated);
    }

    if (typeof window.__litSidePanelUpdate === 'function') {
      window.__litSidePanelUpdate({ captionId, speaker, original, translated, timestamp });
    }
  }

  function applyTranslationError(captionId, error) {
    if (displayMode === 'inline') {
      showInline(captionId, `[Error: ${error}]`, true);
    }
  }

  function findSpeakerForCaption(captionId) {
    const span = document.querySelector(`[data-lit-id="${captionId}"]`);
    if (!span) return 'Unknown';
    return extractSpeaker(span);
  }

  // ── Inline display ──────────────────────────────────────────────────────

  function showInline(captionId, text, isError = false) {
    const span = document.querySelector(`[data-lit-id="${captionId}"]`);
    if (!span) return;

    const parent = span.parentElement;
    if (!parent) return;

    let el = parent.querySelector(`.lit-inline[data-for="${captionId}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'lit-inline';
      el.setAttribute('data-for', captionId);
      parent.appendChild(el);
    }

    el.textContent = text;
    el.classList.toggle('lit-error', isError);
  }

  // ── Display mode toggling ───────────────────────────────────────────────

  function onDisplayModeChanged() {
    const inlines = document.querySelectorAll('.lit-inline');
    const panel = document.getElementById('lit-side-panel-host');

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
    if (document.getElementById('lit-side-panel-host')) return;
    if (typeof window.__litCreateSidePanel === 'function') {
      window.__litCreateSidePanel(transcriptHistory);
    }
  }

  // ── Transcript history ──────────────────────────────────────────────────

  function addToHistory(entry) {
    if (entry.captionId) {
      const existing = transcriptHistory.find((h) => h.captionId === entry.captionId);
      if (existing) {
        existing.original = entry.original;
        existing.translated = entry.translated;
        existing.timestamp = entry.timestamp;
        existing.wallTime = Date.now();
        scheduleSave();
        return;
      }
    }

    entry.wallTime = Date.now();
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
    safeSend({ type: 'get-settings' }, (settings) => {
      safeSend({
        type: 'export-transcript',
        history: transcriptHistory,
        title: getMeetingTitle(),
        format: settings?.lastExportFormat || 'txt',
        content: settings?.lastExportContent || 'both',
      });
    });
  }

  // Expose for side panel and export modules
  window.__litTranscriptHistory = transcriptHistory;
  window.__litTriggerExport = triggerExport;
  window.__litPersistSession = persistSession;

  // ── Cleanup registration ──────────────────────────────────────────────
  window.__litCleanupHandlers.push(() => {
    // Persist any unsaved data before teardown
    if (saveTimer) clearTimeout(saveTimer);
    if (sessionId && transcriptHistory.length > 0) persistSession();

    // Stop heartbeat
    clearInterval(heartbeatId);

    // Disconnect all MutationObservers
    for (const obs of activeObservers) obs.disconnect();
    activeObservers.length = 0;

    // Remove message listener
    chrome.runtime.onMessage.removeListener(onContentMessage);

    // Remove event listeners
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('visibilitychange', onVisChange);

    // Remove inline translation elements and data attributes
    document.querySelectorAll('.lit-inline').forEach((el) => el.remove());
    document.querySelectorAll('[data-lit-id]').forEach((el) => el.removeAttribute('data-lit-id'));

    connectionAlive = false;
  });
})();
