# Privacy Policy — Lost in Transcription

**Last updated:** March 19, 2026

**Public copy (Chrome Web Store / browsers):** https://thinko.github.io/lost-in-transcription/privacy-policy.html

## Summary

Lost in Transcription is a browser extension that reads **live closed captions** in **Microsoft Teams** in your browser, optionally adjusts them using settings you provide (including a glossary), and sends caption text to **translation services you choose** (such as LibreTranslate, Google Cloud Translation, DeepL, or an OpenAI-compatible API).

We do **not** operate a central server for this extension. **We do not sell your data, nor do we use it for advertising.** What leaves your device is determined entirely by **your configuration** and the **third-party services** you actively enable. Data is processed solely to provide the extension’s core translation functionality.

## What data the extension processes

- **Caption and meeting text:** Text visible in Teams captions on pages you use with the extension, including speaker labels and timestamps as shown in the UI, may be processed locally and/or sent to backends you enable for translation.
- **Settings:** Stored using the browser’s extension storage APIs (e.g., `chrome.storage`). This includes your backend choice, API keys or URLs you enter, language pairs, glossary entries, and display preferences. This data is **not** sent to the extension authors.

## Caption / session continuity (on-device)

To survive **page refreshes**, **browser restarts**, and **brief disconnects** during the same meeting, the extension can store **caption and translation text** together with minimal session metadata (e.g., meeting identifier derived from the Teams URL, timestamps, optional title text) in **`chrome.storage.local`** on your device.

- **Retention:** That stored transcript data is kept for **at most 48 hours** since the last update to the session. Older sessions are **deleted automatically**.
- **Opt-out:** In the extension popup (**Display → Behavior**), you can turn **“Remember session history”** **off**. When it is off, the extension **does not write** caption/transcript data to disk for continuity; **reloading the meeting or rejoining starts with an empty translation view**, and any previously saved sessions are **removed from this device** when you disable the option.

Live captions you see in Teams are still processed for translation while the meeting page is open; the toggle only affects **whether text is persisted** for later continuity and the saved-session list.

## Where data is sent

Depending on your settings, caption text may be sent to:

- **Microsoft:** Teams runs in your browser on Microsoft-controlled pages; Microsoft’s own privacy terms apply to Teams.
- **Translation / LLM providers:** Endpoints you configure (e.g., Google, DeepL, public or self-hosted LibreTranslate, OpenAI, or compatible local/cloud APIs). Each provider’s privacy policy governs the data they receive.

The extension’s `manifest.json` declares host permissions for common provider endpoints and for local development (`localhost` / `http://*/*`) to allow for self-hosted tools. **Only the specific services you configure receive your text.**

## Security

All communications between the extension and your configured third-party translation providers are transmitted securely using standard web encryption protocols (HTTPS/TLS).

## Storage and sync

Settings are stored locally. If you use Chrome sync for extensions, these settings may be **synced by Google** according to your Google account preferences. The extension authors do not control or access Google’s sync infrastructure.

## User rights & data deletion

Because we do not store your data on our servers, you retain full control over it. You can delete all saved settings, glossary terms, and session history at any time by turning off the session history toggle, uninstalling the extension, or clearing the extension’s local storage within your browser.

## Downloads and exports

If you use the **export** features, files are created on your device via the browser’s download mechanism. You are responsible for how you securely store or share those files.

## Optional debug logging

If you enable **debug logging** in the extension UI, additional diagnostic messages may be written to the **browser’s developer console** on your local machine. This is intended solely for troubleshooting and does not serve as a telemetry pipeline to the authors unless you manually extract and share the logs.

## Children’s privacy

This extension is not directed at children under 13 (or the age required in your jurisdiction). We do not knowingly collect personal information from children.

## Limited use policy

The extension’s use and transfer to any other app of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes

We may update this policy when the extension’s behavior or Web Store requirements change. The “Last updated” date at the top will be revised accordingly.

## Contact

For privacy questions about this open-source project, open an issue at **https://github.com/thinko/lost-in-transcription/issues**.

## Disclaimer

This policy describes the extension’s design and typical behavior. **Third-party services (Microsoft, translation APIs, etc.) have their own terms of service and privacy policies.** Nothing in this document limits your rights under applicable law.
