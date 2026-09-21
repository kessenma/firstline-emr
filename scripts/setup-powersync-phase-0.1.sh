#!/bin/bash

# PowerSync Phase 0.1 Setup Script
# This script helps set up PowerSync infrastructure according to the migration guide

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PowerSync Phase 0.1 Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check Docker Compose
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Please create .env file with DATABASE_URL and JWT_SECRET"
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL" "$PROJECT_ROOT/.env"; then
    echo -e "${RED}✗ DATABASE_URL not found in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✓ DATABASE_URL is configured${NC}"

# Check if JWT_SECRET is set
if ! grep -q "JWT_SECRET" "$PROJECT_ROOT/.env"; then
    echo -e "${YELLOW}⚠ JWT_SECRET not found in .env${NC}"
    echo "PowerSync requires JWT_SECRET for authentication"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ JWT_SECRET is configured${NC}"
fi

echo ""

# Step 2: Create PowerSync environment file
echo -e "${YELLOW}Step 2: Setting up PowerSync environment...${NC}"

if [ -f "$PROJECT_ROOT/.env.powersync" ]; then
    echo -e "${YELLOW}⚠ .env.powersync already exists${NC}"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env.powersync creation"
    else
        echo -e "${GREEN}✓ Using existing .env.powersync${NC}"
    fi
else
    echo -e "${GREEN}✓ .env.powersync created${NC}"
    echo "Please review and update .env.powersync with your settings"
fi

echo ""

# Step 3: Create data directory
echo -e "${YELLOW}Step 3: Creating PowerSync data directory...${NC}"

mkdir -p "$PROJECT_ROOT/data/powersync"
echo -e "${GREEN}✓ Created data/powersync directory${NC}"

echo ""

# Step 4: Check PostgreSQL configuration
echo -e "${YELLOW}Step 4: Checking PostgreSQL configuration...${NC}"

# Extract DATABASE_URL
DATABASE_URL=$(grep "DATABASE_URL" "$PROJECT_ROOT/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ Could not extract DATABASE_URL${NC}"
    exit 1
fi

echo "Checking PostgreSQL logical replication..."
echo ""
echo -e "${BLUE}Please run the following SQL commands on your PostgreSQL database:${NC}"
echo ""
echo -e "${YELLOW}-- 1. Check WAL level (should be 'logical')${NC}"
echo "SHOW wal_level;"
echo ""
echo -e "${YELLOW}-- 2. If not 'logical', update postgresql.conf and restart:${NC}"
echo "# wal_level = logical"
echo "# max_replication_slots = 10"
echo "# max_wal_senders = 10"
echo ""
echo -e "${YELLOW}-- 3. Create PowerSync database user:${NC}"
echo "CREATE USER powersync WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
echo "GRANT CONNECT ON DATABASE fajr_emr TO powersync;"
echo "GRANT USAGE ON SCHEMA public TO powersync;"
echo "GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync;"
echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync;"
echo "ALTER USER powersync WITH REPLICATION;"
echo ""
echo -e "${YELLOW}-- 4. Install custom functions:${NC}"
echo "Execute: $PROJECT_ROOT/powersync/custom-functions/user-functions.sql"
echo ""

read -p "Have you completed these PostgreSQL setup steps? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please complete PostgreSQL setup before continuing${NC}"
    echo "You can run this script again after completing the setup"
    exit 0
fi

echo -e "${GREEN}✓ PostgreSQL configuration confirmed${NC}"
echo ""

# Step 5: Validate sync rules
echo -e "${YELLOW}Step 5: Validating sync rules configuration...${NC}"

if [ ! -f "$PROJECT_ROOT/powersync/sync-rules.yaml" ]; then
    echo -e "${RED}✗ sync-rules.yaml not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ sync-rules.yaml exists${NC}"

# Check if sync rules have basic structure
if grep -q "sync_rules:" "$PROJECT_ROOT/powersync/sync-rules.yaml"; then
    echo -e "${GREEN}✓ sync-rules.yaml has valid structure${NC}"
else
    echo -e "${RED}✗ sync-rules.yaml appears to be invalid${NC}"
    exit 1
fi

echo ""

# Step 6: Start PowerSync
echo -e "${YELLOW}Step 6: Starting PowerSync service...${NC}"

cd "$PROJECT_ROOT"

# Check if PowerSync is already running
if docker compose -f docker-compose.powersync.yml ps | grep -q "powersync.*Up"; then
    echo -e "${YELLOW}⚠ PowerSync is already running${NC}"
    read -p "Restart PowerSync? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping PowerSync..."
        docker compose -f docker-compose.powersync.yml down
        echo "Starting PowerSync..."
        docker compose -f docker-compose.powersync.yml up -d
    fi
else
    echo "Starting PowerSync..."
    docker compose -f docker-compose.powersync.yml up -d
fi

echo ""
echo -e "${BLUE}Waiting for PowerSync to be ready...${NC}"
sleep 5

# Step 7: Verify PowerSync operation
echo -e "${YELLOW}Step 7: Verifying PowerSync operation...${NC}"

# Check if container is running
if ! docker compose -f docker-compose.powersync.yml ps | grep -q "powersync.*Up"; then
    echo -e "${RED}✗ PowerSync container is not running${NC}"
    echo "Checking logs..."
    docker compose -f docker-compose.powersync.yml logs --tail=50 powersync
    exit 1
fi

echo -e "${GREEN}✓ PowerSync container is running${NC}"

# Check health endpoint
HEALTH_CHECK_URL="http://localhost:8080/health"
echo "Checking health endpoint: $HEALTH_CHECK_URL"

for i in {1..10}; do
    if curl -s -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PowerSync health check passed${NC}"
        HEALTH_OK=true
        break
    fi
    echo "Waiting for PowerSync to be ready... ($i/10)"
    sleep 3
done

if [ "$HEALTH_OK" != "true" ]; then
    echo -e "${RED}✗ PowerSync health check failed${NC}"
    echo "Checking logs..."
    docker compose -f docker-compose.powersync.yml logs --tail=50 powersync
    exit 1
fi

echo ""

# Step 8: Display summary and next steps
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Phase 0.1 Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}PowerSync Status:${NC}"
echo "  • Service: Running"
echo "  • Port: 8080"
echo "  • Health: http://localhost:8080/health"
echo "  • Admin: http://localhost:8081 (if enabled)"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  • View logs: docker compose -f docker-compose.powersync.yml logs -f powersync"
echo "  • Stop: docker compose -f docker-compose.powersync.yml down"
echo "  • Restart: docker compose -f docker-compose.powersync.yml restart powersync"
echo "  • Health check: curl http://localhost:8080/health"
echo ""
echo -e "${BLUE}Next Steps (Phase 0.2):${NC}"
echo "  1. Review sync rules in: powersync/sync-rules.yaml"
echo "  2. Test sync rules with a test JWT token"
echo "  3. Configure mobile app to connect to PowerSync"
echo "  4. See: apps/mobile/docs/SQL_MOBILE_TRANSITION.md"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  • Update .env.powersync with production values before deploying"
echo "  • Set strong passwords for admin interfaces"
echo "  • Enable TLS for production use"
echo "  • Monitor PowerSync logs during initial sync"
echo ""

# Optional: Show logs
read -p "View PowerSync logs now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose -f docker-compose.powersync.yml logs -f powersync
fi
