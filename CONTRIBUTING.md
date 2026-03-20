# Contributing

Thank you for helping improve **Lost in Transcription**.

## Repository URL (source link)

The Help → About **GitHub** link reads **`homepage_url`** from [`manifest.json`](manifest.json). Before publishing:

1. Set `"homepage_url"` to your public repository (e.g. `https://github.com/your-org/lost-in-transcription`).
2. Reload the extension.

See also [_dev_docs_/CHROME_WEB_STORE_LISTING.md](_dev_docs_/CHROME_WEB_STORE_LISTING.md) for store checklist.

## Copyright headers

GPLv3 source files carry a standard copyright line. Project policy is documented in [_dev_docs_/COPYRIGHT_AND_ATTRIBUTION.md](_dev_docs_/COPYRIGHT_AND_ATTRIBUTION.md).

## Development tooling

- Optional QA helpers live under [`dev_tests/`](dev_tests/) (see [README.md](README.md)).
- Do not commit machine-specific agent files; `CLAUDE.md` / `CLAUDE.local.md` are listed in `.gitignore`.

## Pull requests

- Keep `manifest.json` version bumps coherent with user-visible changes.
- Update [_locales/en/messages.json](_locales/en/messages.json) and mirrored locales when changing UI strings.
