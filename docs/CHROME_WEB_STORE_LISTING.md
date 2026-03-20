# Chrome Web Store — listing and packaging

Checklist for **Lost in Transcription**. Repository: **https://github.com/thinko/lost-in-transcription**

## Canonical URLs (use in the store dashboard)

| Field | URL |
|--------|-----|
| **Privacy policy** | **https://thinko.github.io/lost-in-transcription/privacy-policy.html** |
| **Homepage / marketing site** | https://thinko.github.io/lost-in-transcription/ |
| **Source code** | https://github.com/thinko/lost-in-transcription |
| **Support / contact** | https://github.com/thinko/lost-in-transcription/issues |

- **Privacy:** Use the **GitHub Pages** `privacy-policy.html` URL above (HTTPS, stable). It matches the copy bundled in the extension under `docs/privacy-policy.html`.
- **Canonical edits:** [`PRIVACY.md`](PRIVACY.md) — keep [`privacy-policy.html`](privacy-policy.html) in sync when you change the policy.

## Package build

```bash
bash dev_tests/build-store-zip.sh
```

Produces **`dist/lost-in-transcription-<version>.zip`**. Same layout is built by [`.github/workflows/release.yml`](../.github/workflows/release.yml) when you push a tag `v*`.

See [**RELEASING.md**](RELEASING.md) for tag → GitHub Release flow.

## Single purpose

**Suggested text:** This extension translates Microsoft Teams live closed captions in real time using backends the user configures (LibreTranslate, Google Cloud Translation, DeepL, or OpenAI-compatible APIs). It does not serve unrelated purposes.

## Short description (132 chars max)

**Suggested:** Real-time translation of Microsoft Teams® closed captions — multiple backends, glossary, export, offline-friendly options.

## Detailed description (draft)

Lost in Transcription adds real-time translation on top of **Microsoft Teams** live captions in the browser.

**Features**

- Inline or side-panel translation next to captions  
- LibreTranslate, Google Cloud Translation, DeepL, and OpenAI-compatible backends (including local LLMs)  
- Dialect-aware prompts and a technical **glossary**  
- Export transcript (TXT, CSV, SRT)  
- Optional **session history** on-device (48-hour retention; can be disabled)  
- UI in English, French, Spanish, German, Japanese  

**Permissions (high level)**

- **Teams / Skype / Lync hosts:** Read caption DOM on Microsoft-documented meeting pages only.  
- **Translation hosts:** Call only the APIs you enable in settings.  
- **Broad HTTP / localhost:** Lets advanced users point to self-hosted LibreTranslate or local LLMs.  

**Disclaimer:** Microsoft and Teams are trademarks of Microsoft. This project is not affiliated with Microsoft.

## Host permission justification (paste into Store form)

1. **Teams family (`*.teams.microsoft.com`, `teams.cloud.microsoft`, gov/dod/cn/skype/lync patterns):** Required to run content scripts on official Microsoft Teams and related meeting clients so the extension can observe live caption elements and render translations.  
2. **translation.googleapis.com, api.cognitive.microsofttranslator.com, api.deepl.com, api.openai.com, libretranslate.com / libretranslate.de:** Required so the service worker can call the translation backend selected in settings.  
3. **`http://localhost/*` and `http://*/*`:** Optional connectivity to user-operated HTTP endpoints (self-hosted LibreTranslate, LAN LLM). No data is sent except to URLs the user configures.

## ZIP contents (sanity check)

The build script includes only runtime files: `manifest.json`, content/background/popup scripts and CSS, `translators/`, `icons/`, `_locales/` (excluding dev pseudo-locale `qps-ploc`), and `docs/privacy-policy.html`.

**Excluded:** `dev_tests/`, `.github/`, Jekyll site files under `docs/` except `privacy-policy.html`, `.git`, etc.

## Screenshots

Capture from a **sanitized** meeting or mock UI: no real PII, no internal company names, no API keys visible in the popup.

## Limited Use (Google APIs)

If you use Google Cloud Translation, the listing should reflect adherence to the Chrome Web Store User Data Policy (see [`PRIVACY.md`](PRIVACY.md) — Limited Use Policy section).
