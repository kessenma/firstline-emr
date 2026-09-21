#!/bin/bash

# Simple PostgreSQL Connection Test
# Tests database connectivity with timeout

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing PostgreSQL Connection${NC}"
echo "======================================"
echo ""

# Load DATABASE_URL from .env
echo "1. Loading environment variables..."
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    echo -e "${GREEN}   ✓ Found .env file${NC}"
else
    echo -e "${RED}   ✗ .env file not found${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}   ✗ DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ DATABASE_URL loaded${NC}"
echo ""

# Parse connection details (basic parsing for display)
echo "2. Connection details:"
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    PARSED_USER="${BASH_REMATCH[1]}"
    PARSED_HOST="${BASH_REMATCH[3]}"
    PARSED_PORT="${BASH_REMATCH[4]}"
    PARSED_DB="${BASH_REMATCH[5]}"
    echo "   Host: $PARSED_HOST"
    echo "   Port: $PARSED_PORT"
    echo "   User: $PARSED_USER"
    echo "   Database: $PARSED_DB"
else
    echo "   (Unable to parse DATABASE_URL)"
fi
echo ""

# Set connection timeout
export PGCONNECT_TIMEOUT=10

# Test 1: Basic connectivity
echo "3. Testing basic connectivity (timeout: 10s)..."
echo "   Running: psql \"\$DATABASE_URL\" -c \"SELECT version();\""
echo ""

START_TIME=$(date +%s)
RESULT=$(psql "$DATABASE_URL" -tAc "SELECT version();" 2>&1)
EXIT_CODE=$?
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}   ✓ Connection successful! (took ${ELAPSED}s)${NC}"
    echo ""
    echo "   PostgreSQL version:"
    echo "   $RESULT"
    echo ""
else
    echo -e "${RED}   ✗ Connection failed! (took ${ELAPSED}s)${NC}"
    echo ""
    echo "   Error message:"
    echo "   $RESULT"
    echo ""
    echo "   Common issues:"
    echo "   • Firewall blocking connection to $PARSED_HOST:$PARSED_PORT"
    echo "   • PostgreSQL not running"
    echo "   • Incorrect credentials"
    echo "   • Database does not exist"
    echo "   • Host not reachable (check VPN if required)"
    echo ""
    exit 1
fi

# Test 2: Check permissions
echo "4. Testing database permissions..."
TABLES=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}   ✓ Can query database (found $TABLES tables in public schema)${NC}"
else
    echo -e "${RED}   ✗ Permission error${NC}"
    echo "   $TABLES"
fi
echo ""

# Test 3: Check if psql supports required features
echo "5. Checking PostgreSQL version and features..."
PG_VERSION=$(psql "$DATABASE_URL" -tAc "SHOW server_version_num;" 2>&1)
if [ $EXIT_CODE -eq 0 ]; then
    echo "   PostgreSQL version number: $PG_VERSION"
    if [ "$PG_VERSION" -ge 100000 ]; then
        echo -e "${GREEN}   ✓ Version is sufficient for logical replication (10+)${NC}"
    else
        echo -e "${YELLOW}   ⚠ Version might be too old for logical replication${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠ Could not determine version${NC}"
fi
echo ""

# Test 4: Check current WAL level
echo "6. Checking WAL level..."
WAL_LEVEL=$(psql "$DATABASE_URL" -tAc "SHOW wal_level;" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "   Current wal_level: $WAL_LEVEL"
    if [ "$WAL_LEVEL" = "logical" ]; then
        echo -e "${GREEN}   ✓ WAL level is 'logical' - ready for PowerSync!${NC}"
    else
        echo -e "${YELLOW}   ⚠ WAL level is '$WAL_LEVEL' (needs 'logical' for PowerSync)${NC}"
    fi
else
    echo -e "${RED}   ✗ Could not check WAL level${NC}"
    echo "   $WAL_LEVEL"
fi
echo ""

echo "======================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All connection tests passed!${NC}"
    echo ""
    echo "You can now run the full configuration script:"
    echo "  ./scripts/configure-postgresql-for-powersync.sh"
else
    echo -e "${YELLOW}⚠ Connection works but some checks failed${NC}"
    echo ""
    echo "Review the issues above before running:"
    echo "  ./scripts/configure-postgresql-for-powersync.sh"
fi
echo ""
