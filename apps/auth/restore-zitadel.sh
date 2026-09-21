#!/bin/sh
# =============================================================================
# apps/auth/restore-zitadel.sh
# =============================================================================
# Restore a Zitadel identity database from a snapshot made by backup-zitadel.sh.
#
# This DROPS and recreates the `zitadel` database on the target server, then
# loads the dump. It is destructive by design — the target's existing Zitadel
# state (if any) is replaced.
#
# ORDER OF OPERATIONS on a new server:
#   1. Bring up Postgres and the app, but DO NOT start the Zitadel container yet
#      (Zitadel holds connections; you cannot restore its DB while it runs).
#   2. Ensure the SAME ZITADEL_MASTERKEY is set on this host (the script checks
#      the fingerprint against the dump's sidecar and refuses on mismatch).
#   3. Run this script.
#   4. THEN start the Zitadel container. `start-from-init` will detect the
#      restored instance and skip re-seeding a fresh org/admin.
#
# Usage:
#   ./apps/auth/restore-zitadel.sh <path-to-zitadel-*.dump> [--force]
#
#   --force   Skip the masterkey-fingerprint hard stop (use only if you know the
#             key genuinely matches and the sidecar is missing/wrong).
#
# Config is read from the environment; ./.env and ./.env.auth.local are sourced
# if present. Required: DATABASE_URL, ZITADEL_MASTERKEY. Optional: ZITADEL_DOMAIN.
# =============================================================================

set -eu

DUMP_FILE="${1:-}"
FORCE="no"
[ "${2:-}" = "--force" ] && FORCE="yes"

fail() { echo "ERROR: $*" >&2; exit 1; }

[ -n "$DUMP_FILE" ] || fail "Usage: $0 <path-to-zitadel-*.dump> [--force]"
[ -f "$DUMP_FILE" ] || fail "Dump file not found: $DUMP_FILE"

# ── Locate repo root and load env files ──────────────────────────────────────
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)

load_env_file() {
  [ -f "$1" ] || return 0
  echo "Loading env from $1"
  # shellcheck disable=SC1090
  set -a
  . "$1"
  set +a
}

_PRESET_DATABASE_URL="${DATABASE_URL:-}"
_PRESET_MASTERKEY="${ZITADEL_MASTERKEY:-}"
_PRESET_DOMAIN="${ZITADEL_DOMAIN:-}"

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/.env.auth.local"

[ -n "$_PRESET_DATABASE_URL" ] && DATABASE_URL="$_PRESET_DATABASE_URL"
[ -n "$_PRESET_MASTERKEY" ] && ZITADEL_MASTERKEY="$_PRESET_MASTERKEY"
[ -n "$_PRESET_DOMAIN" ] && ZITADEL_DOMAIN="$_PRESET_DOMAIN"

ZITADEL_DOMAIN="${ZITADEL_DOMAIN:-identity.fajrmission.org}"

# ── Preflight: tools + required config ───────────────────────────────────────
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore not found. Install postgresql-client (matching server major version)."
command -v psql >/dev/null 2>&1 || fail "psql not found. Install postgresql-client."
command -v openssl >/dev/null 2>&1 || fail "openssl not found (needed for the masterkey fingerprint)."

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is not set (checked env, ./.env, ./.env.auth.local)."
[ -n "${ZITADEL_MASTERKEY:-}" ] || fail "ZITADEL_MASTERKEY is not set. The restored secrets/passkeys will not work without the matching key."

# ── Parse DATABASE_URL (same logic as apps/auth/entrypoint.sh) ───────────────
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

ZITADEL_DB="zitadel"
export PGPASSWORD="$DB_PASS"

psql_admin() { psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres "$@"; }

echo "Target: host=$DB_HOST port=$DB_PORT user=$DB_USER database=$ZITADEL_DB"

# ── Masterkey fingerprint check against the dump's sidecar ───────────────────
META_FILE="${DUMP_FILE%.dump}.meta.json"
LOCAL_FP=$(printf '%s' "$ZITADEL_MASTERKEY" | openssl dgst -sha256 | awk '{print $NF}')

if [ -f "$META_FILE" ]; then
  BACKUP_FP=$(sed -n 's/.*"masterkeyFingerprint"[[:space:]]*:[[:space:]]*"\([0-9a-f]*\)".*/\1/p' "$META_FILE")
  BACKUP_DOMAIN=$(sed -n 's/.*"externalDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$META_FILE")

  if [ -n "$BACKUP_FP" ] && [ "$BACKUP_FP" != "$LOCAL_FP" ]; then
    echo "" >&2
    echo "MASTERKEY MISMATCH:" >&2
    echo "  dump was taken with masterkey fingerprint: $BACKUP_FP" >&2
    echo "  this host's ZITADEL_MASTERKEY fingerprint : $LOCAL_FP" >&2
    echo "  The restored database's secrets (client secrets, signing keys) will" >&2
    echo "  be undecryptable. Set the ORIGINAL ZITADEL_MASTERKEY on this host." >&2
    [ "$FORCE" = "yes" ] || fail "Refusing to restore with a mismatched masterkey (use --force to override)."
    echo "  --force given; continuing despite mismatch." >&2
  else
    echo "Masterkey fingerprint matches the dump. Good."
  fi

  if [ -n "$BACKUP_DOMAIN" ] && [ "$BACKUP_DOMAIN" != "$ZITADEL_DOMAIN" ]; then
    echo "WARNING: external domain differs (dump: $BACKUP_DOMAIN, here: $ZITADEL_DOMAIN)." >&2
    echo "         Passkeys (WebAuthn RP-ID) and OIDC redirect URIs are domain-bound;" >&2
    echo "         users will need to re-enroll passkeys unless the domain is preserved." >&2
  fi
else
  echo "WARNING: sidecar $META_FILE not found; cannot verify masterkey fingerprint." >&2
  [ "$FORCE" = "yes" ] || fail "Refusing to restore without fingerprint verification (use --force to override)."
fi

# ── Version check: pg_restore major must be >= server major ──────────────────
CLIENT_MAJOR=$(pg_restore --version | sed -n 's/.*PostgreSQL) \([0-9][0-9]*\).*/\1/p')
SERVER_MAJOR=$(psql_admin -tAc "SHOW server_version;" 2>/dev/null | sed -n 's/^\([0-9][0-9]*\).*/\1/p')
if [ -n "$CLIENT_MAJOR" ] && [ -n "$SERVER_MAJOR" ]; then
  echo "pg_restore major: $CLIENT_MAJOR   server major: $SERVER_MAJOR"
  if [ "$CLIENT_MAJOR" -lt "$SERVER_MAJOR" ]; then
    fail "pg_restore ($CLIENT_MAJOR) is older than the server ($SERVER_MAJOR). Install postgresql-client-$SERVER_MAJOR."
  fi
fi

# ── Refuse if Zitadel is still connected (can't restore a live DB) ───────────
ACTIVE=$(psql_admin -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname='$ZITADEL_DB';" 2>/dev/null | tr -d ' ')
if [ -n "$ACTIVE" ] && [ "$ACTIVE" != "0" ]; then
  echo "WARNING: $ACTIVE active connection(s) to '$ZITADEL_DB' — the Zitadel container is likely running." >&2
  echo "         Stop it before restoring. The script will force-terminate connections next." >&2
fi

# ── Confirm (destructive) ────────────────────────────────────────────────────
echo ""
echo "About to DROP and recreate database '$ZITADEL_DB' on $DB_HOST:$DB_PORT and load:"
echo "  $DUMP_FILE"
printf "Type 'RESTORE' to proceed: "
read -r CONFIRM
[ "$CONFIRM" = "RESTORE" ] || fail "Aborted."

# ── Terminate connections, drop, recreate, restore ───────────────────────────
echo "Terminating existing connections to '$ZITADEL_DB'..."
psql_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$ZITADEL_DB' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

echo "Dropping and recreating '$ZITADEL_DB'..."
psql_admin -c "DROP DATABASE IF EXISTS $ZITADEL_DB;"
psql_admin -c "CREATE DATABASE $ZITADEL_DB;"

echo "Restoring dump into '$ZITADEL_DB'..."
pg_restore --no-owner --no-privileges --exit-on-error \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ZITADEL_DB" \
  "$DUMP_FILE"

unset PGPASSWORD

echo ""
echo "=================================================="
echo "  Zitadel restore complete"
echo "=================================================="
echo "  Next: START the Zitadel container now."
echo "  It will detect the restored instance and skip re-seeding."
echo "  Verify: https://$ZITADEL_DOMAIN/debug/ready"
echo "=================================================="
