# Contributing

Thank you for helping improve **Lost in Transcription**.

## Repository URL (source link)

The Help → About **GitHub** link reads **`homepage_url`** from [`manifest.json`](manifest.json). Before publishing:

1. Set `"homepage_url"` to your public repository (e.g. `https://github.com/your-org/lost-in-transcription`).
2. Reload the extension.

See also [docs/CHROME_WEB_STORE_LISTING.md](docs/CHROME_WEB_STORE_LISTING.md) for the Chrome Web Store checklist.

## Copyright headers

GPLv3 source files carry a standard copyright line (name + email in headers and [README.md](README.md)). The GPL expects those notices to be preserved. If you prefer a neutral line (e.g. “Lost in Transcription contributors”), update headers and README in one consistent pass.

## Development tooling

- Optional QA helpers live under [`dev_tests/`](dev_tests/) (see [README.md](README.md)).
- Do not commit machine-specific agent files; `CLAUDE.md` / `CLAUDE.local.md` are listed in `.gitignore`.
- The folder **`_dev_docs_/`** is **gitignored** — use it only on your machine for private notes (pre-push audits, etc.). Anything meant for contributors belongs in **`docs/`**.

## Git commits

Prefer **one logical change per commit** so history and `git bisect` stay useful:

- **Conventional-style subject:** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` … plus a short imperative summary.
- **Split large work** into ordered commits (e.g. docs only, then backend, then manifest, then UI + i18n) when changes would otherwise mix unrelated concerns.
- If you already have a mixed working tree, use **`git add -p`** (patch staging) or **`git stash -p`** to stage hunks into separate commits.

## Pull requests

- Keep `manifest.json` version bumps coherent with user-visible changes.
- Update [_locales/en/messages.json](_locales/en/messages.json) and mirrored locales when changing UI strings.
