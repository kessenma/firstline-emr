#!/bin/sh
# =============================================================================
# apps/auth/backup-zitadel.sh
# =============================================================================
# Dump the Zitadel identity database to a portable, restorable snapshot.
#
# Zitadel keeps ALL of its state — projects, OIDC applications + their client
# secrets, users, passkeys, the Generic-OIDC federation, and branding — in its
# own `zitadel` Postgres database, with every secret encrypted at rest by
# ZITADEL_MASTERKEY. The main app backup/restore tool does NOT touch this
# database, so this script captures it natively with pg_dump. Its companion,
# restore-zitadel.sh, replays the dump on a new server.
#
# CRITICAL for a successful restore on the target server:
#   1. The SAME ZITADEL_MASTERKEY must be present (it decrypts every secret).
#   2. The SAME external domain (ZITADEL_DOMAIN) should be kept — Zitadel bakes
#      it into the token issuer, redirect URIs, and the WebAuthn RP-ID that
#      passkeys are bound to. Change it and passkeys/redirects break.
#   3. The SAME Zitadel version should run on the target.
#
# Usage:
#   ./apps/auth/backup-zitadel.sh [OUTPUT_DIR]
#
# Config is read from the environment. If a ./.env (and optional
# ./.env.auth.local) file exists at the repo root, it is sourced automatically.
# Required: DATABASE_URL, ZITADEL_MASTERKEY.  Optional: ZITADEL_DOMAIN.
# =============================================================================

set -eu

# ── Locate repo root and load env files ──────────────────────────────────────
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)

load_env_file() {
  # Source a dotenv file without clobbering vars already set in the environment.
  [ -f "$1" ] || return 0
  echo "Loading env from $1"
  # shellcheck disable=SC1090
  set -a
  . "$1"
  set +a
}

# Explicit environment wins over the files, so capture anything pre-set.
_PRESET_DATABASE_URL="${DATABASE_URL:-}"
_PRESET_MASTERKEY="${ZITADEL_MASTERKEY:-}"
_PRESET_DOMAIN="${ZITADEL_DOMAIN:-}"

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/.env.auth.local"

[ -n "$_PRESET_DATABASE_URL" ] && DATABASE_URL="$_PRESET_DATABASE_URL"
[ -n "$_PRESET_MASTERKEY" ] && ZITADEL_MASTERKEY="$_PRESET_MASTERKEY"
[ -n "$_PRESET_DOMAIN" ] && ZITADEL_DOMAIN="$_PRESET_DOMAIN"

ZITADEL_DOMAIN="${ZITADEL_DOMAIN:-identity.fajrmission.org}"
ZITADEL_VERSION="${ZITADEL_VERSION:-v2.64.1}"
OUTPUT_DIR="${1:-$REPO_ROOT/zitadel-backups}"

# ── Preflight ────────────────────────────────────────────────────────────────
fail() { echo "ERROR: $*" >&2; exit 1; }

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump not found. Install postgresql-client (matching your server's major version)."
command -v psql >/dev/null 2>&1 || fail "psql not found. Install postgresql-client."
command -v openssl >/dev/null 2>&1 || fail "openssl not found (needed for the masterkey fingerprint)."

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is not set (checked env, ./.env, ./.env.auth.local)."
[ -n "${ZITADEL_MASTERKEY:-}" ] || fail "ZITADEL_MASTERKEY is not set. Without it the dump cannot be restored."

# Zitadel requires the masterkey to be exactly 32 characters.
KEY_LEN=$(printf '%s' "$ZITADEL_MASTERKEY" | wc -c | tr -d ' ')
[ "$KEY_LEN" = "32" ] || echo "WARNING: ZITADEL_MASTERKEY is $KEY_LEN chars, expected 32. Zitadel may reject it."

# ── Parse DATABASE_URL (same logic as apps/auth/entrypoint.sh) ───────────────
# Format: postgresql://user:password@host:port/database
CLEAN_URL="$DATABASE_URL"
while :; do
  case "$CLEAN_URL" in
    DATABASE_URL=*) CLEAN_URL="${CLEAN_URL#DATABASE_URL=}" ;;
    *) break ;;
  esac
done

case "$CLEAN_URL" in
  postgresql://*|postgres://*) ;;
  *) fail "DATABASE_URL must start with postgresql:// or postgres://" ;;
esac

DB_URL_NO_PROTO="${CLEAN_URL#postgresql://}"
DB_URL_NO_PROTO="${DB_URL_NO_PROTO#postgres://}"

USER_PASS="${DB_URL_NO_PROTO%%@*}"
DB_USER="${USER_PASS%%:*}"
DB_PASS="${USER_PASS#*:}"

HOST_PORT_DB="${DB_URL_NO_PROTO#*@}"
HOST_PORT="${HOST_PORT_DB%%/*}"
DB_HOST="${HOST_PORT%%:*}"
DB_PORT="${HOST_PORT#*:}"
[ "$DB_PORT" = "$DB_HOST" ] && DB_PORT="5432"

# Zitadel always lives in its own `zitadel` database, not the app database.
ZITADEL_DB="zitadel"

echo "Zitadel DB target: host=$DB_HOST port=$DB_PORT user=$DB_USER database=$ZITADEL_DB"

export PGPASSWORD="$DB_PASS"

# ── Version check: pg_dump major must be >= server major ─────────────────────
# A dump taken with an older client cannot reliably load a newer server.
client_major() { pg_dump --version | sed -n 's/.*PostgreSQL) \([0-9][0-9]*\).*/\1/p'; }
server_major() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ZITADEL_DB" -tAc "SHOW server_version;" 2>/dev/null \
    | sed -n 's/^\([0-9][0-9]*\).*/\1/p'
}

CLIENT_MAJOR=$(client_major || echo "")
SERVER_MAJOR=$(server_major || echo "")

if [ -n "$CLIENT_MAJOR" ] && [ -n "$SERVER_MAJOR" ]; then
  echo "pg_dump major: $CLIENT_MAJOR   server major: $SERVER_MAJOR"
  if [ "$CLIENT_MAJOR" -lt "$SERVER_MAJOR" ]; then
    fail "pg_dump ($CLIENT_MAJOR) is older than the server ($SERVER_MAJOR). Install postgresql-client-$SERVER_MAJOR."
  fi
else
  echo "WARNING: could not determine client/server Postgres versions; continuing."
fi

# ── Dump ─────────────────────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DUMP_FILE="$OUTPUT_DIR/zitadel-$STAMP.dump"
META_FILE="$OUTPUT_DIR/zitadel-$STAMP.meta.json"

echo "Dumping $ZITADEL_DB → $DUMP_FILE ..."
pg_dump -Fc --no-owner --no-privileges \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ZITADEL_DB" \
  -f "$DUMP_FILE"

# ── Sidecar metadata ─────────────────────────────────────────────────────────
# Fingerprint (NOT the key) so restore-zitadel.sh can verify the target server
# carries the matching ZITADEL_MASTERKEY before overwriting anything.
# openssl prints "(stdin)= <64-hex>"; take the last field.
FINGERPRINT=$(printf '%s' "$ZITADEL_MASTERKEY" | openssl dgst -sha256 | awk '{print $NF}')
DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')

cat > "$META_FILE" <<EOF
{
  "zitadelVersion": "$ZITADEL_VERSION",
  "externalDomain": "$ZITADEL_DOMAIN",
  "masterkeyFingerprint": "$FINGERPRINT",
  "pgServerVersion": "${SERVER_MAJOR:-unknown}",
  "database": "$ZITADEL_DB",
  "dumpFormat": "pg_dump -Fc",
  "dumpSize": $DUMP_SIZE,
  "createdAt": "$STAMP"
}
EOF

unset PGPASSWORD

echo ""
echo "=================================================="
echo "  Zitadel backup complete"
echo "=================================================="
echo "  Dump : $DUMP_FILE ($DUMP_SIZE bytes)"
echo "  Meta : $META_FILE"
echo ""
echo "  To restore on the NEW server (with the SAME ZITADEL_MASTERKEY set):"
echo "    ./apps/auth/restore-zitadel.sh \"$DUMP_FILE\""
echo "=================================================="
