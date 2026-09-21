#!/bin/sh
# Entrypoint script for Zitadel that parses DATABASE_URL
# This allows using the same DATABASE_URL format as the web app

set -e

echo "Starting Zitadel entrypoint..."

# Parse DATABASE_URL if provided (format: postgresql://user:password@host:port/database)
if [ -n "$DATABASE_URL" ]; then
  echo "Parsing DATABASE_URL for Zitadel configuration..."

  # Clean up the URL - remove any "DATABASE_URL=" prefix if present (Coolify sometimes does this)
  # Loop to handle multiple prefixes just in case
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

  # Remove the protocol prefix
  DB_URL_NO_PROTO="${CLEAN_URL#postgresql://}"
  DB_URL_NO_PROTO="${DB_URL_NO_PROTO#postgres://}"

  # Extract user:password (everything before @)
  USER_PASS="${DB_URL_NO_PROTO%%@*}"
  DB_USER="${USER_PASS%%:*}"
  DB_PASS="${USER_PASS#*:}"

  # Extract host:port/database (everything after @)
  HOST_PORT_DB="${DB_URL_NO_PROTO#*@}"
  HOST_PORT="${HOST_PORT_DB%%/*}"

  # Extract host and port
  DB_HOST="${HOST_PORT%%:*}"
  DB_PORT="${HOST_PORT#*:}"
  # If no port specified, default to 5432
  [ "$DB_PORT" = "$DB_HOST" ] && DB_PORT="5432"

  echo "Parsed values: host=$DB_HOST port=$DB_PORT user=$DB_USER"

  # Set Zitadel environment variables (uses 'zitadel' database, not the app database)
  export ZITADEL_DATABASE_POSTGRES_HOST="$DB_HOST"
  export ZITADEL_DATABASE_POSTGRES_PORT="$DB_PORT"
  export ZITADEL_DATABASE_POSTGRES_DATABASE="zitadel"
  export ZITADEL_DATABASE_POSTGRES_USER_USERNAME="$DB_USER"
  export ZITADEL_DATABASE_POSTGRES_USER_PASSWORD="$DB_PASS"
  export ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE="disable"
  export ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME="$DB_USER"
  export ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD="$DB_PASS"
  export ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE="disable"

  echo "Zitadel database config: host=$DB_HOST port=$DB_PORT user=$DB_USER database=zitadel"
else
  echo "WARNING: DATABASE_URL not set!"
fi

# Set port for Zitadel to listen on (default 8080)
ZITADEL_PORT="${ZITADEL_PORT:-7777}"
export ZITADEL_PORT

# Execute Zitadel
echo "Starting Zitadel server on port $ZITADEL_PORT..."
exec /app/zitadel start-from-init --masterkeyFromEnv --tlsMode external --port "$ZITADEL_PORT"
