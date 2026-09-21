#!/bin/bash

# PowerSync Preflight Check
# Verifies all requirements before starting PowerSync service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PowerSync Preflight Check           ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Docker
echo -e "${YELLOW}[1/8]${NC} Checking Docker..."
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Docker is installed and running"
    else
        echo -e "  ${RED}✗${NC} Docker is installed but not running"
        echo -e "  ${YELLOW}→${NC} Please start Docker Desktop"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} Docker is not installed"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Docker Compose file
echo -e "${YELLOW}[2/8]${NC} Checking Docker Compose configuration..."
if [ -f "docker-compose.powersync.yml" ]; then
    echo -e "  ${GREEN}✓${NC} docker-compose.powersync.yml exists"

    # Validate YAML
    if docker compose -f docker-compose.powersync.yml config &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} YAML syntax is valid"
    else
        echo -e "  ${RED}✗${NC} YAML syntax errors detected"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} docker-compose.powersync.yml not found"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Environment files
echo -e "${YELLOW}[3/8]${NC} Checking environment files..."
if [ -f ".env" ]; then
    echo -e "  ${GREEN}✓${NC} .env file exists"

    if grep -q "DATABASE_URL" .env; then
        echo -e "  ${GREEN}✓${NC} DATABASE_URL is set"
    else
        echo -e "  ${RED}✗${NC} DATABASE_URL not found in .env"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "JWT_SECRET" .env || grep -q "POWERSYNC_JWT_SECRET" .env; then
        echo -e "  ${GREEN}✓${NC} JWT_SECRET is configured"
    else
        echo -e "  ${YELLOW}⚠${NC} JWT_SECRET not found (may cause auth issues)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} .env file not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f ".env.powersync" ]; then
    echo -e "  ${GREEN}✓${NC} .env.powersync file exists"

    if grep -q "POSTGRES_PASSWORD" .env.powersync; then
        echo -e "  ${GREEN}✓${NC} POSTGRES_PASSWORD is set"
    else
        echo -e "  ${YELLOW}⚠${NC} POSTGRES_PASSWORD not found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} .env.powersync not found (may need to configure password)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 4: PostgreSQL connectivity
echo -e "${YELLOW}[4/8]${NC} Checking PostgreSQL connectivity..."
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    export PGCONNECT_TIMEOUT=5

    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            echo -e "  ${GREEN}✓${NC} PostgreSQL is accessible"
        else
            echo -e "  ${RED}✗${NC} Cannot connect to PostgreSQL"
            echo -e "  ${YELLOW}→${NC} Check connection string and network"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} psql not found (cannot verify connection)"
        echo -e "  ${YELLOW}→${NC} Run: export PATH=\"/opt/homebrew/opt/postgresql@16/bin:\$PATH\""
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 5: WAL level
echo -e "${YELLOW}[5/8]${NC} Checking PostgreSQL WAL level..."
if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    WAL_LEVEL=$(psql "$DATABASE_URL" -tAc "SHOW wal_level;" 2>/dev/null)

    if [ "$WAL_LEVEL" = "logical" ]; then
        echo -e "  ${GREEN}✓${NC} WAL level is 'logical'"
    else
        echo -e "  ${RED}✗${NC} WAL level is '$WAL_LEVEL' (needs 'logical')"
        echo -e "  ${YELLOW}→${NC} See docs/ENABLE_LOGICAL_REPLICATION.md"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 6: Replication slot
echo -e "${YELLOW}[6/8]${NC} Checking replication slot..."
if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    SLOT_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_replication_slots WHERE slot_name = 'powersync_slot';" 2>/dev/null)

    if [ "$SLOT_EXISTS" = "1" ]; then
        echo -e "  ${GREEN}✓${NC} Replication slot 'powersync_slot' exists"

        # Check if active
        IS_ACTIVE=$(psql "$DATABASE_URL" -tAc "SELECT active FROM pg_replication_slots WHERE slot_name = 'powersync_slot';" 2>/dev/null)
        if [ "$IS_ACTIVE" = "t" ]; then
            echo -e "  ${YELLOW}⚠${NC} Slot is already active (another service may be using it)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "  ${RED}✗${NC} Replication slot not found"
        echo -e "  ${YELLOW}→${NC} Run: ./scripts/configure-postgresql-automated.sh"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 7: Publication
echo -e "${YELLOW}[7/8]${NC} Checking publication..."
if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    PUB_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_publication WHERE pubname = 'powersync_publication';" 2>/dev/null)

    if [ "$PUB_EXISTS" = "1" ]; then
        echo -e "  ${GREEN}✓${NC} Publication 'powersync_publication' exists"
    else
        echo -e "  ${RED}✗${NC} Publication not found"
        echo -e "  ${YELLOW}→${NC} Run: ./scripts/configure-postgresql-automated.sh"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 8: PowerSync user
echo -e "${YELLOW}[8/8]${NC} Checking PowerSync user..."
if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    USER_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_user WHERE usename = 'powersync';" 2>/dev/null)

    if [ "$USER_EXISTS" = "1" ]; then
        echo -e "  ${GREEN}✓${NC} User 'powersync' exists"

        # Check REPLICATION privilege
        HAS_REPL=$(psql "$DATABASE_URL" -tAc "SELECT userepl FROM pg_user WHERE usename = 'powersync';" 2>/dev/null)
        if [ "$HAS_REPL" = "t" ]; then
            echo -e "  ${GREEN}✓${NC} User has REPLICATION privilege"
        else
            echo -e "  ${RED}✗${NC} User missing REPLICATION privilege"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "  ${RED}✗${NC} User 'powersync' not found"
        echo -e "  ${YELLOW}→${NC} Run: ./scripts/configure-postgresql-automated.sh"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to start PowerSync.${NC}"
    echo ""
    echo "Start PowerSync with:"
    echo "  docker compose -f docker-compose.powersync.yml up -d"
    echo ""
    echo "Then monitor logs:"
    echo "  docker compose -f docker-compose.powersync.yml logs -f powersync"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "You can proceed, but review the warnings above."
    echo ""
    echo "Start PowerSync with:"
    echo "  docker compose -f docker-compose.powersync.yml up -d"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before starting PowerSync."
    echo ""
    echo "Common fixes:"
    echo "  • Start Docker Desktop"
    echo "  • Run: ./scripts/configure-postgresql-automated.sh"
    echo "  • Check .env file exists and has DATABASE_URL"
    echo "  • Ensure PostgreSQL logical replication is enabled"
    exit 1
fi
