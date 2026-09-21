#!/usr/bin/env bash
set -euo pipefail

# Sync certs and profiles locally without creating new ones (readonly)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$ROOT_DIR/ios/fastlane/.match.env" ]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/ios/fastlane/.match.env"
else
  echo "Missing ios/fastlane/.match.env. Please create and configure it." >&2
  exit 1
fi

KEYCHAIN_NAME="${KEYCHAIN_NAME:-login.keychain}"
KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-}"
TEAM_ID="${TEAM_ID:-}"
APPLE_ID="${APPLE_ID:-}"
APP_IDENTIFIER="${APP_IDENTIFIER:-}"

if [ -z "$KEYCHAIN_PASSWORD" ] || [ -z "$TEAM_ID" ] || [ -z "$APPLE_ID" ] || [ -z "$APP_IDENTIFIER" ]; then
  echo "Required env vars missing. Ensure KEYCHAIN_PASSWORD, TEAM_ID, APPLE_ID, APP_IDENTIFIER are set in ios/fastlane/.match.env." >&2
  exit 1
fi

echo "Unlocking keychain $KEYCHAIN_NAME"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"

echo "Syncing appstore (readonly)"
BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec fastlane match appstore --readonly --team_id "$TEAM_ID" --username "$APPLE_ID" --app_identifier "$APP_IDENTIFIER" --keychain_name "$KEYCHAIN_NAME" --keychain_password "$KEYCHAIN_PASSWORD"

echo "Syncing development (readonly)"
BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec fastlane match development --readonly --team_id "$TEAM_ID" --username "$APPLE_ID" --app_identifier "$APP_IDENTIFIER" --keychain_name "$KEYCHAIN_NAME" --keychain_password "$KEYCHAIN_PASSWORD"

echo "Readonly sync complete."
