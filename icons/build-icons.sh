#!/usr/bin/env bash

# (c) 2026, Alex Handy <ahandy@gmail.com>
#
# This file is part of Lost in Transcription
#
# Lost in Transcription is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Lost in Transcription is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Lost in Transcription.  If not, see <http://www.gnu.org/licenses/>.

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
