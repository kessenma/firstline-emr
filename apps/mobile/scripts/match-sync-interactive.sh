#!/usr/bin/env bash
set -euo pipefail

# Interactive Match sync - allows passphrase prompt
# Run this directly in your terminal when you need to sync certificates locally

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔐 Interactive Match Sync"
echo "=========================="
echo ""
echo "This script will sync your certificates and provisioning profiles."
echo "You will be prompted for the Match encryption passphrase."
echo "This passphrase is stored in your team's secure vault (1Password, etc.)"
echo ""

if [ -f "$ROOT_DIR/ios/fastlane/.match.env" ]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/ios/fastlane/.match.env"
else
  echo "❌ Missing ios/fastlane/.match.env. Please create and configure it." >&2
  exit 1
fi

KEYCHAIN_NAME="${KEYCHAIN_NAME:-login.keychain}"
KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-}"
TEAM_ID="${TEAM_ID:-}"
APPLE_ID="${APPLE_ID:-}"
APP_IDENTIFIER="${APP_IDENTIFIER:-}"

if [ -z "$KEYCHAIN_PASSWORD" ] || [ -z "$TEAM_ID" ] || [ -z "$APPLE_ID" ] || [ -z "$APP_IDENTIFIER" ]; then
  echo "❌ Required env vars missing. Ensure KEYCHAIN_PASSWORD, TEAM_ID, APPLE_ID, APP_IDENTIFIER are set in ios/fastlane/.match.env." >&2
  exit 1
fi

echo "📋 Configuration:"
echo "   Apple ID: $APPLE_ID"
echo "   Team ID: $TEAM_ID"
echo "   App ID: $APP_IDENTIFIER"
echo "   Git URL: ${MATCH_GIT_URL:-not set}"
echo ""

echo "🔓 Unlocking keychain $KEYCHAIN_NAME"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME" || {
  echo "❌ Failed to unlock keychain. Is your KEYCHAIN_PASSWORD correct?" >&2
  exit 1
}

echo ""
echo "📦 Syncing appstore certificates (readonly)..."
echo "   You will be prompted for the Match encryption passphrase."
echo ""

cd "$ROOT_DIR"
BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec fastlane match appstore --readonly --team_id "$TEAM_ID" --username "$APPLE_ID" --app_identifier "$APP_IDENTIFIER" --keychain_name "$KEYCHAIN_NAME" --keychain_password "$KEYCHAIN_PASSWORD"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ App Store certificates synced successfully!"
  echo ""
  echo "📦 Syncing development certificates (readonly)..."
  echo ""

  BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec fastlane match development --readonly --team_id "$TEAM_ID" --username "$APPLE_ID" --app_identifier "$APP_IDENTIFIER" --keychain_name "$KEYCHAIN_NAME" --keychain_password "$KEYCHAIN_PASSWORD"

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Development certificates synced successfully!"
    echo ""
    echo "🎉 All done! You can now build and archive your iOS app."
    echo ""
    echo "💡 Next steps:"
    echo "   - Try running: pnpm build:ios:archive-local"
    echo "   - Or open Xcode and build directly"
  else
    echo ""
    echo "⚠️  Development sync failed, but App Store certs are synced."
    echo "   You can still build for release/archive."
  fi
else
  echo ""
  echo "❌ App Store certificate sync failed."
  echo ""
  echo "💡 Troubleshooting:"
  echo "   - Make sure you have access to the Match repository"
  echo "   - Verify the Match encryption passphrase with your team"
  echo "   - Check that MATCH_GIT_URL is correct in .match.env"
  exit 1
fi
