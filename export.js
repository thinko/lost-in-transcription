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

  if (window.__litExportInit) return;
  window.__litExportInit = true;

  // Expose export trigger that content.js calls
  window.__litTriggerExport = function () {
    const history = window.__litTranscriptHistory;
    if (!history || !history.length) {
      console.warn('[Lost in Transcription] No transcript history to export.');
      return;
    }

    chrome.runtime.sendMessage({ type: 'get-settings' }, (settings) => {
      const format = settings?.lastExportFormat || 'txt';
      const contentMode = settings?.lastExportContent || 'both';

      const titleEl = document.querySelector('[data-tid="call-title"]');
      const title = titleEl?.textContent?.trim() || document.title?.replace(/\s*\|\s*Microsoft Teams$/, '').trim() || '';

      chrome.runtime.sendMessage({
        type: 'export-transcript',
        history,
        title,
        format,
        content: contentMode,
      });
    });
  };
})();
