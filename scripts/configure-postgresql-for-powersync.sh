#!/bin/bash

# PostgreSQL Configuration Script for PowerSync
# This script helps configure PostgreSQL to support PowerSync logical replication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PostgreSQL PowerSync Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Loading environment variables..."

# Load DATABASE_URL from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
else
    echo -e "${YELLOW}⚠ .env file not found${NC}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found DATABASE_URL${NC}"
echo "Testing connection to PostgreSQL..."
echo ""

# Test connection first with a short timeout
export PGCONNECT_TIMEOUT=10

# Step 1: Check current WAL level
echo -e "${YELLOW}Step 1: Checking current WAL level...${NC}"
echo "Connecting to database (timeout: 10 seconds)..."
WAL_LEVEL=$(psql "$DATABASE_URL" -tAc "SHOW wal_level;" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Could not connect to PostgreSQL${NC}"
    echo "Error: $WAL_LEVEL"
    echo ""
    echo "Please check:"
    echo "  1. PostgreSQL is running at the specified host"
    echo "  2. Credentials are correct"
    echo "  3. Network access is allowed"
    exit 1
fi

echo "Current wal_level: $WAL_LEVEL"

if [ "$WAL_LEVEL" = "logical" ]; then
    echo -e "${GREEN}✓ WAL level is already 'logical' - no change needed${NC}"
else
    echo -e "${YELLOW}⚠ WAL level is '$WAL_LEVEL' but needs to be 'logical'${NC}"
    echo ""
    echo "To fix this, you need to:"
    echo ""
    echo "1. Locate postgresql.conf file:"
    echo "   psql \"$DATABASE_URL\" -c \"SHOW config_file;\""
    echo ""
    echo "2. Edit postgresql.conf and add/update these lines:"
    echo "   wal_level = logical"
    echo "   max_replication_slots = 10"
    echo "   max_wal_senders = 10"
    echo ""
    echo "3. Restart PostgreSQL:"
    echo "   - If using systemd: sudo systemctl restart postgresql"
    echo "   - If using Docker: docker restart <postgres-container>"
    echo "   - If hosted (AWS RDS, Supabase, etc): Use provider's dashboard"
    echo ""
    echo "4. Run this script again to verify"
    echo ""

    # Check if we're on a hosted service
    echo -e "${BLUE}Detected connection: <DB_HOST>:27017${NC}"
    echo "This appears to be a remote/hosted PostgreSQL instance."
    echo ""
    echo "For hosted services:"
    echo "  • AWS RDS: Modify parameter group, set rds.logical_replication=1"
    echo "  • Azure: Enable logical replication in Configuration"
    echo "  • Supabase: Contact support or check Settings > Database"
    echo "  • DigitalOcean: Enable in Settings > Advanced"
    echo ""

    read -p "Do you want to continue with the remaining setup steps? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please configure WAL level first."
        exit 0
    fi
fi

echo ""

# Step 2: Check if powersync user exists and has REPLICATION privilege
echo -e "${YELLOW}Step 2: Checking powersync user...${NC}"

echo "Querying pg_user table..."
USER_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_user WHERE usename = 'powersync';" 2>&1)

if [ "$USER_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ User 'powersync' exists${NC}"

    # Check if user has REPLICATION privilege
    HAS_REPLICATION=$(psql "$DATABASE_URL" -tAc "SELECT userepl FROM pg_user WHERE usename = 'powersync';" 2>&1)

    if [ "$HAS_REPLICATION" = "t" ]; then
        echo -e "${GREEN}✓ User 'powersync' has REPLICATION privilege${NC}"
    else
        echo -e "${YELLOW}⚠ User 'powersync' needs REPLICATION privilege${NC}"
        echo "Running: ALTER USER powersync WITH REPLICATION;"
        psql "$DATABASE_URL" -c "ALTER USER powersync WITH REPLICATION;" 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Granted REPLICATION privilege${NC}"
        else
            echo -e "${RED}✗ Failed to grant REPLICATION privilege${NC}"
            echo "You may need superuser access. Try manually:"
            echo "  psql \"\$DATABASE_URL\" -c \"ALTER USER powersync WITH REPLICATION;\""
        fi
    fi
else
    echo -e "${YELLOW}⚠ User 'powersync' does not exist${NC}"
    echo "Creating user 'powersync'..."

    read -sp "Enter password for new 'powersync' user: " POWERSYNC_PASSWORD
    echo

    psql "$DATABASE_URL" -c "CREATE USER powersync WITH PASSWORD '$POWERSYNC_PASSWORD' REPLICATION;" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created user 'powersync' with REPLICATION privilege${NC}"
        echo ""
        echo "IMPORTANT: Add this to your .env.powersync:"
        echo "POSTGRES_PASSWORD=$POWERSYNC_PASSWORD"
    else
        echo -e "${RED}✗ Failed to create user${NC}"
    fi
fi

echo ""

# Step 3: Grant SELECT permissions
echo -e "${YELLOW}Step 3: Granting SELECT permissions...${NC}"

echo "Granting CONNECT..."
psql "$DATABASE_URL" -c "GRANT CONNECT ON DATABASE postgres TO powersync;" 2>&1 > /dev/null
psql "$DATABASE_URL" -c "GRANT USAGE ON SCHEMA public TO powersync;" 2>&1 > /dev/null
psql "$DATABASE_URL" -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync;" 2>&1 > /dev/null
psql "$DATABASE_URL" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync;" 2>&1 > /dev/null

echo -e "${GREEN}✓ Granted SELECT permissions${NC}"
echo ""

# Step 4: Check replication slot
echo -e "${YELLOW}Step 4: Checking replication slot...${NC}"

echo "Checking pg_replication_slots..."
SLOT_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_replication_slots WHERE slot_name = 'powersync_slot';" 2>&1)

if [ "$SLOT_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ Replication slot 'powersync_slot' already exists${NC}"

    # Show slot details
    psql "$DATABASE_URL" -c "SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots WHERE slot_name = 'powersync_slot';"
else
    echo "Creating replication slot 'powersync_slot'..."

    if [ "$WAL_LEVEL" != "logical" ]; then
        echo -e "${RED}✗ Cannot create logical replication slot - WAL level is not 'logical'${NC}"
        echo "Please fix WAL level first (see Step 1 output above)"
    else
        psql "$DATABASE_URL" -c "SELECT pg_create_logical_replication_slot('powersync_slot', 'pgoutput');" 2>&1

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Created replication slot 'powersync_slot'${NC}"
        else
            echo -e "${RED}✗ Failed to create replication slot${NC}"
            echo "This may require superuser privileges"
        fi
    fi
fi

echo ""

# Step 5: Check publication
echo -e "${YELLOW}Step 5: Checking publication...${NC}"

echo "Checking pg_publication..."
PUB_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_publication WHERE pubname = 'powersync_publication';" 2>&1)

if [ "$PUB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ Publication 'powersync_publication' already exists${NC}"

    # Show publication details
    psql "$DATABASE_URL" -c "SELECT pubname, puballtables FROM pg_publication WHERE pubname = 'powersync_publication';"
else
    echo "Creating publication 'powersync_publication'..."

    psql "$DATABASE_URL" -c "CREATE PUBLICATION powersync_publication FOR ALL TABLES;" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created publication 'powersync_publication'${NC}"
    else
        echo -e "${RED}✗ Failed to create publication${NC}"
        echo "This may require table owner or superuser privileges"
    fi
fi

echo ""

# Step 6: Install custom functions
echo -e "${YELLOW}Step 6: Installing custom functions...${NC}"

if [ -f "powersync/custom-functions/user-functions.sql" ]; then
    psql "$DATABASE_URL" -f "powersync/custom-functions/user-functions.sql" 2>&1 > /dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Installed custom functions${NC}"

        # Verify functions exist
        FUNC_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'token_%';" 2>&1)
        echo "  Installed $FUNC_COUNT token_* functions"
    else
        echo -e "${RED}✗ Failed to install custom functions${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Custom functions file not found${NC}"
    echo "Expected: powersync/custom-functions/user-functions.sql"
fi

echo ""

# Step 7: Verify configuration
echo -e "${YELLOW}Step 7: Verification Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check WAL level
WAL_CHECK=$(psql "$DATABASE_URL" -tAc "SHOW wal_level;")
if [ "$WAL_CHECK" = "logical" ]; then
    echo -e "${GREEN}✓${NC} WAL level: logical"
else
    echo -e "${RED}✗${NC} WAL level: $WAL_CHECK (needs 'logical')"
fi

# Check replication slots
SLOTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_replication_slots;")
echo -e "${GREEN}✓${NC} Replication slots: $SLOTS"

# Check publications
PUBS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_publication;")
echo -e "${GREEN}✓${NC} Publications: $PUBS"

# Check custom functions
FUNCS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'token_%';")
if [ "$FUNCS" -ge 5 ]; then
    echo -e "${GREEN}✓${NC} Custom functions: $FUNCS"
else
    echo -e "${YELLOW}⚠${NC} Custom functions: $FUNCS (expected 5)"
fi

# Check powersync user
POWERSYNC_USER=$(psql "$DATABASE_URL" -tAc "SELECT userepl FROM pg_user WHERE usename = 'powersync';")
if [ "$POWERSYNC_USER" = "t" ]; then
    echo -e "${GREEN}✓${NC} PowerSync user: exists with REPLICATION"
else
    echo -e "${RED}✗${NC} PowerSync user: missing or no REPLICATION privilege"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Final recommendations
if [ "$WAL_CHECK" = "logical" ] && [ "$SLOTS" -gt 0 ] && [ "$PUBS" -gt 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL is ready for PowerSync!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Restart PowerSync: docker compose -f docker-compose.powersync.yml restart powersync"
    echo "2. Check logs: docker compose -f docker-compose.powersync.yml logs -f powersync"
    echo "3. Verify replication: Continue with Phase 0.3 verification"
else
    echo -e "${YELLOW}⚠ PostgreSQL configuration incomplete${NC}"
    echo ""
    echo "Issues to address:"

    if [ "$WAL_CHECK" != "logical" ]; then
        echo "  • WAL level needs to be 'logical' (currently: $WAL_CHECK)"
        echo "    See output from Step 1 above for instructions"
    fi

    if [ "$SLOTS" -eq 0 ]; then
        echo "  • No replication slots created"
        echo "    This requires WAL level = logical first"
    fi

    if [ "$PUBS" -eq 0 ]; then
        echo "  • No publications created"
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
