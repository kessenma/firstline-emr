#!/bin/sh
# Entrypoint script for PowerSync that parses DATABASE_URL
# This allows using the same DATABASE_URL format as the web app

set -e

echo "Starting PowerSync entrypoint..."

# Parse DATABASE_URL if provided (format: postgresql://user:password@host:port/database?sslmode=disable)
if [ -n "$DATABASE_URL" ]; then
  echo "Parsing DATABASE_URL for PowerSync configuration..."

  # Clean up the URL - remove any "DATABASE_URL=" prefix if present (Coolify sometimes does this)
  CLEAN_URL="$DATABASE_URL"
  while true; do
    case "$CLEAN_URL" in
      DATABASE_URL=*) CLEAN_URL="${CLEAN_URL#DATABASE_URL=}" ;;
      *) break ;;
    esac
  done

  # Debug: show raw and cleaned URL (masked password)
  echo "Raw DATABASE_URL length: ${#DATABASE_URL}"
  echo "Cleaned URL starts with: $(echo "$CLEAN_URL" | cut -c1-15)..."

  # Ensure we have the protocol
  case "$CLEAN_URL" in
    postgresql://*|postgres://*) ;;
    *)
      echo "ERROR: DATABASE_URL must start with postgresql:// or postgres://"
      echo "Got: $(echo "$CLEAN_URL" | cut -c1-20)..."
      exit 1
      ;;
  esac

  # Remove the protocol prefix and any query string for parsing
  DB_URL_NO_PROTO="${CLEAN_URL#postgresql://}"
  DB_URL_NO_PROTO="${DB_URL_NO_PROTO#postgres://}"

  # Extract the main URL (before query string)
  DB_URL_MAIN="${DB_URL_NO_PROTO%%\?*}"

  # Extract query string if exists (for sslmode)
  DB_QUERY_STRING=""
  case "$DB_URL_NO_PROTO" in
    *\?*) DB_QUERY_STRING="${DB_URL_NO_PROTO#*\?}" ;;
  esac

  # Extract user:password (everything before @)
  USER_PASS="${DB_URL_MAIN%%@*}"
  DB_USER="${USER_PASS%%:*}"
  DB_PASS="${USER_PASS#*:}"

  # Extract host:port/database (everything after @)
  HOST_PORT_DB="${DB_URL_MAIN#*@}"
  HOST_PORT="${HOST_PORT_DB%%/*}"
  DB_NAME="${HOST_PORT_DB#*/}"

  # Extract host and port
  DB_HOST="${HOST_PORT%%:*}"
  DB_PORT="${HOST_PORT#*:}"
  # If no port specified, default to 5432
  [ "$DB_PORT" = "$DB_HOST" ] && DB_PORT="5432"

  # Default database name
  [ -z "$DB_NAME" ] && DB_NAME="postgres"

  # Parse SSL mode from query string, default to disable
  DB_SSL_MODE="disable"
  case "$DB_QUERY_STRING" in
    *sslmode=require*) DB_SSL_MODE="require" ;;
    *sslmode=verify-full*) DB_SSL_MODE="verify-full" ;;
    *sslmode=verify-ca*) DB_SSL_MODE="verify-ca" ;;
    *sslmode=prefer*) DB_SSL_MODE="prefer" ;;
    *sslmode=allow*) DB_SSL_MODE="allow" ;;
    *sslmode=disable*) DB_SSL_MODE="disable" ;;
  esac

  echo "Parsed values: host=$DB_HOST port=$DB_PORT user=$DB_USER database=$DB_NAME sslmode=$DB_SSL_MODE"

  # Construct the URI for PowerSync (postgresql:// format)
  POSTGRES_URI="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

else
  echo "WARNING: DATABASE_URL not set! Using fallback environment variables..."
  # Fallback to individual vars if DATABASE_URL not provided
  DB_HOST="${POSTGRES_HOST:-localhost}"
  DB_PORT="${POSTGRES_PORT:-5432}"
  DB_USER="${POSTGRES_USER:-postgres}"
  DB_PASS="${POSTGRES_PASSWORD:-}"
  DB_NAME="${POSTGRES_DB:-postgres}"
  DB_SSL_MODE="${POSTGRES_SSL_MODE:-disable}"
  POSTGRES_URI="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# Get JWT_SECRET for JWKS config
# IMPORTANT: The JWKS 'k' field must be base64url encoded
# The web app uses JWT_SECRET directly as the signing key (UTF-8 string)
# So we need to base64url encode that string for PowerSync's JWKS config
if [ -z "$JWT_SECRET" ]; then
  echo "WARNING: JWT_SECRET not set!"
  JWT_KEY_B64URL=""
else
  # Base64url encode the JWT_SECRET (convert the string to base64url format)
  # This matches how PowerSync expects the JWKS 'k' field for HS256
  JWT_KEY_B64URL=$(echo -n "$JWT_SECRET" | base64 -w0 | tr '+/' '-_' | tr -d '=')
  echo "JWT key encoded for JWKS (length: ${#JWT_KEY_B64URL})"
fi

# Get other config values from environment
POWERSYNC_PORT_VAL="${POWERSYNC_PORT:-6061}"
SYNC_RULES_PATH="${POWERSYNC_SYNC_RULES_PATH:-/config/sync-rules.yaml}"
LOG_LEVEL="${POWERSYNC_LOG_LEVEL:-info}"
SLOT_NAME="${POWERSYNC_SLOT_NAME:-powersync_slot}"
PUBLICATION_NAME="${POWERSYNC_PUBLICATION:-powersync_publication}"

echo "Generating PowerSync configuration..."
echo "Database: ${DB_HOST}:${DB_PORT}/${DB_NAME} (ssl: ${DB_SSL_MODE})"

# Generate the config.yaml dynamically
cat > /config/config.yaml << EOF
# PowerSync Service Configuration
# Auto-generated from DATABASE_URL at container startup

# Replication source configuration
replication:
  connections:
    - type: postgresql
      uri: ${POSTGRES_URI}
      sslmode: ${DB_SSL_MODE}
      slot_name: ${SLOT_NAME}
      publication_name: ${PUBLICATION_NAME}

# Connection settings for sync bucket storage
storage:
  type: postgresql
  uri: ${POSTGRES_URI}
  sslmode: ${DB_SSL_MODE}

# The port which the PowerSync API server will listen on
port: ${POWERSYNC_PORT_VAL}

# Specify sync rules
sync_rules:
  path: ${SYNC_RULES_PATH}

# Settings for client authentication
client_auth:
  supabase: false
  jwks:
    keys:
      - kid: "fajr-emr-key"
        kty: oct
        k: ${JWT_KEY_B64URL}
        alg: HS256
  audience: ["powersync", "powersync-dev"]
  issuer: https://fajrmission.org

# Settings for telemetry reporting
telemetry:
  disable_telemetry_sharing: true

# Diagnostics
diagnostics:
  disable: false

# Logging
# NOTE: the service reads `logging.level` (see service-core configureLogger),
# NOT a top-level `log_level` key — that spelling is silently ignored, which is
# why POWERSYNC_LOG_LEVEL appeared to do nothing. `PS_LOG_LEVEL` in the
# environment overrides this block if set.
logging:
  level: ${LOG_LEVEL}
  format: json
EOF

echo "Configuration generated successfully!"
echo "Config location: /config/config.yaml"

# Start PowerSync using the full path to the entry point
echo "Starting PowerSync server on port ${POWERSYNC_PORT_VAL}..."
cd /app
exec node /app/service/lib/entry.js start -r unified
