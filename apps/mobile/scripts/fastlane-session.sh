#!/usr/bin/env bash
set -euo pipefail

# Generate and store FASTLANE_SESSION used for Apple login

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load env if present to get APPLE_ID
if [ -f "$ROOT_DIR/ios/fastlane/.match.env" ]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/ios/fastlane/.match.env"
fi

APPLE_ID="${APPLE_ID:-}"
if [ -z "$APPLE_ID" ]; then
  echo "APPLE_ID is not set. Please edit ios/fastlane/.match.env or export APPLE_ID before running this script." >&2
  exit 1
fi

echo "Generating FASTLANE_SESSION for Apple ID: $APPLE_ID"
echo "You'll be prompted for your Apple password and 2FA."
BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec fastlane spaceauth -u "$APPLE_ID"

echo ""
echo "Copy the entire FASTLANE_SESSION block printed above."
echo "If Fastlane copied it to your clipboard, I will try to read it automatically."
echo "Otherwise, paste it below and press Ctrl-D when finished."

# Try to read from clipboard first
TARGET_SESSION_FILE="$ROOT_DIR/ios/fastlane/.fastlane_session"
CLIPBOARD_SAVED=0
if command -v pbpaste >/dev/null 2>&1; then
  CLIP_CONTENT="$(pbpaste)"
  if [ -n "$CLIP_CONTENT" ]; then
    # Strip leading FASTLANE_SESSION=
    if echo "$CLIP_CONTENT" | head -n 1 | grep -q '^FASTLANE_SESSION='; then
      CLIP_CONTENT="${CLIP_CONTENT#FASTLANE_SESSION=}"
    fi
    # If content contains literal \n, convert to real newlines
    if echo "$CLIP_CONTENT" | grep -q '\\n'; then
      printf '%b' "$CLIP_CONTENT" > "$TARGET_SESSION_FILE"
    else
      printf '%s' "$CLIP_CONTENT" > "$TARGET_SESSION_FILE"
    fi
    CLIPBOARD_SAVED=1
  fi
fi

if [ "$CLIPBOARD_SAVED" -eq 0 ]; then
  # Read multi-line input until EOF into a temp file
  TMP_SESSION_FILE="$(mktemp)"
  cat > "$TMP_SESSION_FILE"

  if [ ! -s "$TMP_SESSION_FILE" ]; then
    echo "No session provided. Aborting." >&2
    rm -f "$TMP_SESSION_FILE"
    exit 1
  fi

  # If the first line includes leading 'FASTLANE_SESSION=', strip it
  if head -n 1 "$TMP_SESSION_FILE" | grep -q '^FASTLANE_SESSION='; then
    awk 'NR==1{ sub(/^FASTLANE_SESSION=/,""); } { print }' "$TMP_SESSION_FILE" > "$TARGET_SESSION_FILE"
  else
    cp "$TMP_SESSION_FILE" "$TARGET_SESSION_FILE"
  fi

  rm -f "$TMP_SESSION_FILE"
fi

echo "Saved session to ios/fastlane/.fastlane_session"
echo "Reload your env: source ios/fastlane/.match.env"
