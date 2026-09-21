#!/bin/sh
set -eu

# config.yaml is committed as a template so the repo carries no credentials and
# no environment-specific hostnames.
#
# LiveKit does NOT interpolate ${VARS} inside a config file — it only reads a
# handful of dedicated env vars (LIVEKIT_KEYS, LIVEKIT_CONFIG, ...). Anything
# environment-specific therefore has to be substituted here, before the server
# starts, or it would be parsed as a literal string. webhook.api_key in
# particular must be inline: it selects which key signs call-log webhooks.
#
# LIVEKIT_KEYS ("<key>: <secret>") is read by LiveKit directly and is not
# touched by this script.

: "${LIVEKIT_API_KEY:?LIVEKIT_API_KEY must be set — it signs call-log webhooks}"

# Origin the SFU posts call-log webhooks back to. Defaults to production so an
# unset value cannot silently drop the audit trail; override it per environment
# so a dev SFU does not write into prod's call log.
WEBHOOK_BASE="${LIVEKIT_WEBHOOK_BASE_URL:-https://fajrmission.org}"

# A trailing slash here would render as a double slash in the webhook URLs.
WEBHOOK_BASE="${WEBHOOK_BASE%/}"

RENDERED=/tmp/livekit.yaml

# '|' as the delimiter is safe: the key is base64 (A-Za-z0-9+/=) and the
# webhook base is a plain origin.
sed -e "s|__LIVEKIT_API_KEY__|${LIVEKIT_API_KEY}|g" \
    -e "s|__WEBHOOK_BASE__|${WEBHOOK_BASE}|g" \
  /livekit/config/config.yaml > "$RENDERED"

if grep -q '__LIVEKIT_API_KEY__\|__WEBHOOK_BASE__' "$RENDERED"; then
  echo "entrypoint: failed to render config template" >&2
  exit 1
fi

# TURN realm/domain — must match the hostname clients resolve.
# Anchored to two-space indentation so it only ever rewrites the key inside the
# `turn:` block, not some other top-level `domain:` added later.
if [ -n "${LIVEKIT_TURN_DOMAIN:-}" ]; then
  sed -i "s|^  domain: .*|  domain: ${LIVEKIT_TURN_DOMAIN}|" "$RENDERED"
  echo "🔧 TURN domain set to ${LIVEKIT_TURN_DOMAIN}"
fi

echo "🔔 Webhooks → ${WEBHOOK_BASE}/api/video-call/webhook (patient consults)"
echo "🔔 Webhooks → ${WEBHOOK_BASE}/api/livekit/webhook (staff calls)"

exec /livekit-server --config "$RENDERED" "$@"
