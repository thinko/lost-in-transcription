# Chrome Web Store — listing and packaging

Use this as a checklist when submitting **Lost in Transcription**. Revise all bracketed placeholders.

## Privacy

- **Privacy policy URL:** Host [`PRIVACY.md`](PRIVACY.md) at a stable **HTTPS** URL (e.g. GitHub raw on `main`, or GitHub Pages) and paste that URL in the listing.
- In-app copy: [`privacy-policy.html`](privacy-policy.html) (keep in sync with the Markdown file).

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

Summarize by category:

1. **Teams family (`*.teams.microsoft.com`, `teams.cloud.microsoft`, gov/dod/cn/skype/lync patterns):** Required to run content scripts on official Microsoft Teams and related meeting clients so the extension can observe live caption elements and render translations.  
2. **translation.googleapis.com, api.cognitive.microsofttranslator.com, api.deepl.com, api.openai.com, libretranslate.com / libretranslate.de:** Required so the service worker can call the translation backend selected in settings.  
3. **`http://localhost/*` and `http://*/*`:** Optional connectivity to user-operated HTTP endpoints (self-hosted LibreTranslate, LAN LLM). No data is sent except to URLs the user configures.

## ZIP layout (upload package)

Include **only** runtime files needed by `manifest.json`:

| Include | Exclude (examples) |
|--------|----------------------|
| `manifest.json`, `*.js`, `*.css`, `*.html`, `translators/`, `icons/`, `_locales/`, `docs/privacy-policy.html` | `.git/`, `dev_tests/`, `*.md` in repo root (optional in zip), `.cursor/`, `teams-chat-example-*.html`, `_locales/qps-ploc/`, `.env*` |

**Example:**

```bash
cd /path/to/live-translate-cc
zip -r ../lost-in-transcription-store.zip \
  manifest.json background.js content.js sidepanel.js export.js glossary-popover.js \
  i18n.js languages.js glossary.js popup.html popup.js popup.css content.css \
  translators icons _locales docs/privacy-policy.html
```

Adjust if you add/remove files. Do **not** ship `README.md` unless you want it inside the CRX (not required).

## Screenshots

Capture from a **sanitized** meeting or mock UI: no real PII, no internal company names, no API keys visible in the popup.

## Limited Use (Google APIs)

If you use Google Cloud Translation, the listing should reflect adherence to the Chrome Web Store User Data Policy (already referenced in [`PRIVACY.md`](PRIVACY.md)).
