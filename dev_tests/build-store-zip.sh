#!/usr/bin/env bash
# Build a Chrome Web Store–ready ZIP from the repo root (no dev_tests, no Jekyll site).
# Usage: from anywhere —  bash dev_tests/build-store-zip.sh
# Output: dist/lost-in-transcription-<version>.zip
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./manifest.json').version" 2>/dev/null || sed -n 's/.*\"version\": \"\\([^\"]*\\)\".*/\\1/p' manifest.json | head -1)"
if [[ -z "${VERSION}" ]]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi

OUT="${ROOT}/dist"
mkdir -p "$OUT"
ZIP="${OUT}/lost-in-transcription-${VERSION}.zip"
rm -f "$ZIP"

zip -qr "$ZIP" \
  manifest.json \
  background.js \
  content.js \
  sidepanel.js \
  export.js \
  glossary-popover.js \
  i18n.js \
  languages.js \
  glossary.js \
  popup.html \
  popup.js \
  popup.css \
  content.css \
  translators \
  icons \
  _locales \
  docs/privacy-policy.html \
  -x '*qps-ploc*' \
  -x '*.DS_Store'

echo "Wrote ${ZIP} ($(du -h "$ZIP" | cut -f1))"
