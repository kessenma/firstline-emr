#!/bin/bash

# PostgreSQL Configuration Script for PowerSync (Non-Interactive)
# This script configures PostgreSQL without requiring user input

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
fi

# Load POSTGRES_PASSWORD from .env.powersync if it exists
if [ -f .env.powersync ]; then
    export $(grep -v '^#' .env.powersync | grep POSTGRES_PASSWORD | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found DATABASE_URL${NC}"
echo ""

# Set connection timeout
export PGCONNECT_TIMEOUT=10

# Generate a secure password if not provided
if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo -e "${YELLOW}Generated new password for powersync user${NC}"
fi

# Step 1: Check current WAL level
echo -e "${YELLOW}Step 1: Checking current WAL level...${NC}"
WAL_LEVEL=$(psql "$DATABASE_URL" -tAc "SHOW wal_level;" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Could not connect to PostgreSQL${NC}"
    echo "Error: $WAL_LEVEL"
    exit 1
fi

echo "Current wal_level: $WAL_LEVEL"

if [ "$WAL_LEVEL" = "logical" ]; then
    echo -e "${GREEN}✓ WAL level is 'logical'${NC}"
else
    echo -e "${RED}✗ WAL level is '$WAL_LEVEL' (needs 'logical')${NC}"
    echo "Please enable logical replication first. See docs/ENABLE_LOGICAL_REPLICATION.md"
    exit 1
fi

echo ""

# Step 2: Check if powersync user exists and has REPLICATION privilege
echo -e "${YELLOW}Step 2: Checking powersync user...${NC}"

USER_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_user WHERE usename = 'powersync';" 2>&1)

if [ "$USER_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ User 'powersync' exists${NC}"

    # Check if user has REPLICATION privilege
    HAS_REPLICATION=$(psql "$DATABASE_URL" -tAc "SELECT userepl FROM pg_user WHERE usename = 'powersync';" 2>&1)

    if [ "$HAS_REPLICATION" = "t" ]; then
        echo -e "${GREEN}✓ User 'powersync' has REPLICATION privilege${NC}"
    else
        echo -e "${YELLOW}⚠ User 'powersync' needs REPLICATION privilege${NC}"
        echo "Granting REPLICATION privilege..."
        psql "$DATABASE_URL" -c "ALTER USER powersync WITH REPLICATION;" 2>&1 > /dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Granted REPLICATION privilege${NC}"
        else
            echo -e "${RED}✗ Failed to grant REPLICATION privilege${NC}"
            echo "You may need superuser access."
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠ User 'powersync' does not exist${NC}"
    echo "Creating user 'powersync'..."

    psql "$DATABASE_URL" -c "CREATE USER powersync WITH PASSWORD '$POSTGRES_PASSWORD' REPLICATION;" 2>&1 > /dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created user 'powersync' with REPLICATION privilege${NC}"

        # Save password to .env.powersync
        if [ -f .env.powersync ]; then
            # Update existing file
            if grep -q "POSTGRES_PASSWORD=" .env.powersync; then
                sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env.powersync
            else
                echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .env.powersync
            fi
        else
            # Create new file
            echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" > .env.powersync
        fi

        echo ""
        echo -e "${GREEN}✓ Password saved to .env.powersync${NC}"
    else
        echo -e "${RED}✗ Failed to create user${NC}"
        exit 1
    fi
fi

echo ""

# Step 3: Grant SELECT permissions
echo -e "${YELLOW}Step 3: Granting SELECT permissions...${NC}"

psql "$DATABASE_URL" -c "GRANT CONNECT ON DATABASE postgres TO powersync;" 2>&1 > /dev/null
psql "$DATABASE_URL" -c "GRANT USAGE ON SCHEMA public TO powersync;" 2>&1 > /dev/null
psql "$DATABASE_URL" -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync;" 2>&1 > /dev/null
psql "$DATABASE_URL" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync;" 2>&1 > /dev/null

echo -e "${GREEN}✓ Granted SELECT permissions${NC}"
echo ""

# Step 4: Check replication slot
echo -e "${YELLOW}Step 4: Checking replication slot...${NC}"

SLOT_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_replication_slots WHERE slot_name = 'powersync_slot';" 2>&1)

if [ "$SLOT_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ Replication slot 'powersync_slot' already exists${NC}"

    # Show slot details
    echo ""
    psql "$DATABASE_URL" -c "SELECT slot_name, plugin, slot_type, active, restart_lsn FROM pg_replication_slots WHERE slot_name = 'powersync_slot';"
else
    echo "Creating replication slot 'powersync_slot'..."

    psql "$DATABASE_URL" -c "SELECT pg_create_logical_replication_slot('powersync_slot', 'pgoutput');" 2>&1 > /dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created replication slot 'powersync_slot'${NC}"
    else
        echo -e "${RED}✗ Failed to create replication slot${NC}"
        echo "This may require superuser privileges"
        exit 1
    fi
fi

echo ""

# Step 5: Check publication
echo -e "${YELLOW}Step 5: Checking publication...${NC}"

PUB_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_publication WHERE pubname = 'powersync_publication';" 2>&1)

if [ "$PUB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ Publication 'powersync_publication' already exists${NC}"

    # Show publication details
    echo ""
    psql "$DATABASE_URL" -c "SELECT pubname, puballtables FROM pg_publication WHERE pubname = 'powersync_publication';"
else
    echo "Creating publication 'powersync_publication'..."

    psql "$DATABASE_URL" -c "CREATE PUBLICATION powersync_publication FOR ALL TABLES;" 2>&1 > /dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created publication 'powersync_publication'${NC}"
    else
        echo -e "${RED}✗ Failed to create publication${NC}"
        echo "This may require table owner or superuser privileges"
        exit 1
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
        echo -e "${YELLOW}⚠ Failed to install custom functions (non-critical)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Custom functions file not found (skipping)${NC}"
fi

echo ""

# Step 7: Verification Summary
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
    echo -e "${YELLOW}⚠${NC} Custom functions: $FUNCS (expected 5, but not critical)"
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
    echo "1. Start Docker Desktop"
    echo "2. Start PowerSync: docker compose -f docker-compose.powersync.yml up -d"
    echo "3. Check logs: docker compose -f docker-compose.powersync.yml logs -f powersync"
    echo "4. Verify replication: Continue with Phase 0.3 verification"
else
    echo -e "${RED}✗ PostgreSQL configuration incomplete${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
