#!/usr/bin/env bash
#
# package.sh — build a Chrome Web Store upload ZIP from extension/.
#
# Reads the version from extension/manifest.json and writes
#   dist/consent-toggle-vX.Y.Z.zip
# containing the *contents* of extension/ (manifest.json at the root of the zip),
# which is the layout the Chrome Web Store dashboard expects.
#
# Usage:
#   bash scripts/package.sh
#
# (Run `chmod +x scripts/package.sh` once if you want to invoke it directly.)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"
OUT_DIR="$ROOT_DIR/dist"
MANIFEST="$EXT_DIR/manifest.json"

if [ ! -f "$MANIFEST" ]; then
  echo "package.sh: $MANIFEST not found." >&2
  exit 1
fi

VERSION=$(
  grep -E '^[[:space:]]*"version"[[:space:]]*:' "$MANIFEST" \
    | head -n1 \
    | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
)

if [ -z "$VERSION" ]; then
  echo "package.sh: could not parse version from manifest.json" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "package.sh: 'zip' command not found. Install it (e.g. apt install zip)." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/consent-toggle-v${VERSION}.zip"
rm -f "$OUT_FILE"

(
  cd "$EXT_DIR"
  zip -r -q "$OUT_FILE" . \
    -x '*.DS_Store' \
    -x 'Thumbs.db' \
    -x '*.swp' \
    -x '*.swo' \
    -x '*~'
)

SIZE=$(du -h "$OUT_FILE" | cut -f1)

echo "Built: ${OUT_FILE#$ROOT_DIR/}"
echo "Size:  $SIZE"
echo
echo "Next: upload this zip at https://chrome.google.com/webstore/devconsole/"
