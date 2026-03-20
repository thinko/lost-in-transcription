# Releasing & Chrome Web Store

## Version

1. Bump **`version`** in [`manifest.json`](../manifest.json) (semver, e.g. `1.4.1`).
2. Commit the change on `main`.

## Package locally

From the repository root:

```bash
bash dev_tests/build-store-zip.sh
```

Artifact: **`dist/lost-in-transcription-<version>.zip`** — upload this in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (or attach to a GitHub Release).

## GitHub Release (CI)

1. Create an annotated tag matching the manifest version, with a `v` prefix:
   ```bash
   git tag -a v1.4.0 -m "Release v1.4.0"
   git push origin v1.4.0
   ```
2. The [**Release** workflow](../.github/workflows/release.yml) builds the same ZIP and attaches it to the GitHub release.

## Chrome Web Store checklist

Use [**CHROME_WEB_STORE_LISTING.md**](CHROME_WEB_STORE_LISTING.md) for copy-paste text, permission justifications, and the canonical **privacy policy URL**.

## After publication

- Add the **Chrome Web Store** URL to [`docs/index.html`](index.html) and [`docs/install.html`](install.html) (replace the “coming soon” placeholder).
- Optionally set **Developer website** in the store listing to  
  **https://thinko.github.io/lost-in-transcription/**
