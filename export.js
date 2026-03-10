/* global chrome */

(function () {
  'use strict';

  // Expose export trigger that content.js calls
  window.__ltccTriggerExport = function () {
    const history = window.__ltccTranscriptHistory;
    if (!history || !history.length) {
      console.warn('[Live Translate CC] No transcript history to export.');
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
