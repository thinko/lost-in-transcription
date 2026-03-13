#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SVG="$SCRIPT_DIR/icon.svg"

if ! command -v inkscape &>/dev/null; then
  echo "Error: inkscape is required but not found in PATH" >&2
  exit 1
fi

for size in 16 48 128; do
  out="$SCRIPT_DIR/icon${size}.png"
  inkscape "$SVG" -w "$size" -h "$size" -o "$out" 2>/dev/null
  echo "  ${size}x${size} -> $(basename "$out")"
done

echo "Done."
