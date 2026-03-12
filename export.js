/* global chrome */

(function () {
  'use strict';

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

      chrome.runtime.sendMessage({
        type: 'export-transcript',
        history,
        format,
        content: contentMode,
      });
    });
  };
})();
