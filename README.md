# Lost in Transcription

A Chrome/Edge extension that translates Microsoft Teams® Closed Captions (meeting transcription) in real-time. Supports any source/target language pair with dialect-aware AI prompts, multiple translation backends, and a fully internationalized UI.

## Features

- **Real-time translation** of Teams closed captions as they appear
- **Dual display modes**: inline (below each caption) or side panel (adjacent pane)
- **Multiple translation backends**: LibreTranslate, Google Cloud, DeepL, OpenAI-compatible
- **Dialect-aware AI prompts**: dynamic system prompts adapt to the selected source dialect (Québécois, Rioplatense Spanish, Swiss German, etc.) with tailored examples and instructions
- **Customizable AI prompts**: tweak the system prompt for any AI model, with `{{SOURCE_LANG}}`, `{{TARGET_LANG}}`, and `{{GLOSSARY}}` template variables
- **Configurable send frequency**: real-time, end-of-sentence, stable text, or timed batching
- **Local LLM support**: works with Ollama, LM Studio, vLLM, or any OpenAI-compatible endpoint
- **Technical glossary correction**: user-editable glossary for fixing mangled transcription of technical vocabulary (pre- and post-translation), with Ctrl+Click popover for real-time editing
- **Connectivity testing**: verify your backend connection with one click
- **Model discovery**: auto-fetch available models from any OpenAI-compatible endpoint
- **Session persistence**: transcripts survive page refreshes, browser crashes, and reconnects
- **Session management**: save current session and start a new one; re-apply glossary to saved sessions
- **Transcript export**: download the full caption history as TXT, CSV, or SRT
- **Internationalized UI**: ships with English, French, Spanish, German, and Japanese locales; auto-detects browser language on first startup
- **Hybrid language names**: dropdowns display native script alongside English name (e.g. "Français (French)")
- **Keyboard shortcuts**: `Alt+Shift+T` to toggle display mode, `Alt+Shift+E` to export, `Ctrl+Click` for glossary popover
- **Configurable history buffer**: limit displayed translation history from 10 lines to unlimited
- **Dark/light mode** aware styling

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions` (or `edge://extensions` for Edge)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the project folder
5. The extension icon will appear in the toolbar

## Teams URLs and tenants

The extension’s `manifest.json` matches Microsoft-documented Teams-related origins, including:

- **Commercial:** `teams.microsoft.com`, `*.teams.microsoft.com`, `teams.cloud.microsoft`, `*.teams.cloud.microsoft`
- **Skype / legacy:** `*.skype.com`, `*.lync.com`, `*.partner.lync.cn`
- **US Government / DOD:** `*.gov.teams.microsoft.us`, `gov.teams.microsoft.us`, `*.dod.teams.microsoft.us`, `dod.teams.microsoft.us`, `*.online.dod.skypeforbusiness.us`
- **China:** `teams.microsoftonline.cn`, `*.teams.microsoftonline.cn`

Most meeting links redirect to one of these hosts once the meeting opens. If your organization uses a **custom domain** that never resolves to these patterns, the content scripts will not run—file an issue with the exact browser URL (origin) if that happens.

## Configuration

Click the extension icon to open the settings popup. The UI is organized into five tabs:

### Dashboard

Shows a live summary of current settings (mode, backend, languages, frequency, glossary status). Click any item to jump to its configuration tab.

### Translation

| Backend | API Key Required | Best For |
|---------|-----------------|----------|
| **LibreTranslate** | Optional (free public instances) | Quick start, no account needed |
| **Google Cloud Translation** | Yes | High volume, reliable |
| **DeepL** | Yes (free tier available) | European language quality |
| **OpenAI Compatible** | Optional (not needed for local) | Dialect-aware translation / local LLMs |

- **Source/target language**: 33 languages with dialect support
- **Send frequency**: real-time (~300ms), end-of-sentence, stable text (~1.5s), or timed batch (1–15s)
- Use the **Test Connection** button to verify your backend is reachable

### Display

- **Mode**: inline (below captions) or side panel
- **Font size**: 10–20px
- **History buffer**: 10 lines to unlimited
- **Panel close behavior**: ask, stop translation, continue in background, or turn off
- **Disable behavior**: ask whether to also hide the panel

### Prompt & Glossary

- **System prompt**: customize the AI translation prompt with template variables
- **Reset**: regenerates a dialect-aware default prompt based on the currently selected languages
- **Glossary**: add find/replace entries for fixing mangled transcription of technical terms; toggle individual entries on/off

### Help & About

- Version info, keyboard shortcuts, quick start guide

## Usage

1. Join a Teams meeting in Chrome/Edge on a supported Teams host (e.g. `teams.microsoft.com` or `teams.cloud.microsoft`)
2. Turn on **Live Captions** in the meeting (or have the organizer enable them)
3. The extension automatically detects caption text and begins translating
4. Use `Alt+Shift+T` to toggle between inline and side panel display
5. Use `Alt+Shift+E` to export the transcript
6. Use `Ctrl+Click` on any word in the captions or translation panel to open the glossary popover

## Backend Setup

### LibreTranslate (easiest)

Works out of the box with public instances. For a private instance:

```
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
```

Set the URL to `http://localhost:5000` in settings.

### Google Cloud Translation

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Cloud Translation API**
3. Create an API key under **Credentials**
4. Paste the key in the extension settings

### DeepL

1. Sign up at [deepl.com/pro](https://www.deepl.com/pro) (free tier available)
2. Go to **Account** > **Authentication Key**
3. Paste the key in the extension settings (free keys end with `:fx`)

### OpenAI Compatible

Works with OpenAI, Ollama, LM Studio, vLLM, or any endpoint implementing the OpenAI chat completions API.

1. Set the **Endpoint URL** (default: `https://api.openai.com`, Ollama: `http://localhost:11434`, LM Studio: `http://localhost:1234`)
2. Enter an **API key** if required (optional for local endpoints)
3. Click the **refresh** button next to the model field to auto-discover available models, or type a model name manually
4. Optionally customize the **System prompt** — the default adapts automatically to the selected source dialect

> **Note**: If using Ollama on a LAN, you may need to set `OLLAMA_ORIGINS=*` and restart Ollama to allow requests from the browser extension.

## Internationalization

The extension UI is fully internationalized using Chrome's native `chrome.i18n` API. Shipped locales:

| Locale | Language |
|--------|----------|
| `en` | English (default) |
| `fr` | Français |
| `es` | Español |
| `de` | Deutsch |
| `ja` | 日本語 |

The UI language follows the browser's language setting. The target translation language also defaults to the browser language on first startup (source defaults to French).

### Adding a new locale

1. Create `_locales/{code}/messages.json` based on `_locales/en/messages.json`
2. Translate all `"message"` values; keep keys, placeholders, and template syntax unchanged
3. Reload the extension

### Development QA

- [`dev_tests/locale-preview.html`](dev_tests/locale-preview.html) — renders the popup at actual width with a locale switcher and overflow detection
- `node dev_tests/generate-pseudo-locale.js` — generates a pseudo-locale (`_locales/qps-ploc/`) with accented, padded strings for stress-testing UI layouts

## Privacy

- **Privacy policy:** [`docs/PRIVACY.md`](docs/PRIVACY.md)
- **In-extension copy** (keep in sync when you change the policy): [`docs/privacy-policy.html`](docs/privacy-policy.html)

For the Chrome Web Store, host the policy at a public HTTPS URL (e.g. GitHub **raw** link to `docs/PRIVACY.md` on `main`, or GitHub Pages) and enter that URL in the listing.

## How It Works

The extension uses a `MutationObserver` to watch for Teams caption DOM nodes identified by `data-tid="closed-caption-text"`. When new captions appear or existing ones update (Teams refines text as speech recognition improves), the text is debounced and sent to the configured translation API via the extension's service worker. Translated text is then displayed inline or in the side panel.

Caption updates for the same speech block are tracked by `captionId` and updated in-place in the transcript history, so exports contain only the final version of each caption — not every intermediate update.

The caption list in Teams is virtualized (old entries are recycled), so the extension maintains its own in-memory transcript history for export. Transcript sessions can be persisted to `chrome.storage.local` (optional via **Display → Behavior → Remember session history**) so they survive page refreshes, browser reconnects, and browser restarts. When enabled, stored caption/translation data for each session is **kept for at most 48 hours** since the last update, then removed automatically. When session history is off, nothing is written for continuity and the translation view starts empty after reload or rejoin.

## Edge Compatibility

This extension works identically in Microsoft Edge — load it via `edge://extensions` with Developer mode enabled.

## License

Copyright (c) 2026 Alex Handy <ahandy@gmail.com>

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full text.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (repository URL in `manifest.json` → `homepage_url`, store checklist under [_dev_docs_/CHROME_WEB_STORE_LISTING.md](_dev_docs_/CHROME_WEB_STORE_LISTING.md)).
