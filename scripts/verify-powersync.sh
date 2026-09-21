#!/bin/bash

# PowerSync Verification Script
# Verifies that PowerSync is properly configured and operational

set -e

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
echo -e "${BLUE}PowerSync Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to print check result
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check Docker container status
echo -e "${YELLOW}Checking Docker container...${NC}"
cd "$PROJECT_ROOT"

if docker compose -f docker-compose.powersync.yml ps | grep -q "powersync.*Up"; then
    check_pass "PowerSync container is running"
else
    check_fail "PowerSync container is not running"
    echo "  Run: docker compose -f docker-compose.powersync.yml up -d"
fi

# 2. Check health endpoint
echo ""
echo -e "${YELLOW}Checking health endpoint...${NC}"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HEALTH_CODE" = "200" ]; then
    check_pass "Health endpoint responding (HTTP $HEALTH_CODE)"
    echo "  Response: $HEALTH_BODY"
else
    check_fail "Health endpoint not responding (HTTP $HEALTH_CODE)"
    echo "  URL: http://localhost:8080/health"
fi

# 3. Check database connection
echo ""
echo -e "${YELLOW}Checking database connection...${NC}"

DB_LOGS=$(docker compose -f docker-compose.powersync.yml logs powersync 2>/dev/null | grep -i "database\|postgres\|connection" | tail -5 || echo "")

if echo "$DB_LOGS" | grep -qi "error\|failed\|cannot connect"; then
    check_fail "Database connection issues detected"
    echo "$DB_LOGS"
else
    check_pass "No database connection errors in logs"
fi

# 4. Check replication slot
echo ""
echo -e "${YELLOW}Checking PostgreSQL replication...${NC}"

REPL_LOGS=$(docker compose -f docker-compose.powersync.yml logs powersync 2>/dev/null | grep -i "replication\|slot" | tail -3 || echo "")

if [ -n "$REPL_LOGS" ]; then
    if echo "$REPL_LOGS" | grep -qi "error\|failed"; then
        check_fail "Replication issues detected"
        echo "$REPL_LOGS"
    else
        check_pass "Replication logs present"
    fi
else
    check_warn "No replication logs found (may not have started yet)"
fi

# 5. Check sync rules file
echo ""
echo -e "${YELLOW}Checking sync rules configuration...${NC}"

if [ -f "$PROJECT_ROOT/powersync/sync-rules.yaml" ]; then
    check_pass "Sync rules file exists"

    # Check file is not empty
    if [ -s "$PROJECT_ROOT/powersync/sync-rules.yaml" ]; then
        check_pass "Sync rules file is not empty"

        # Check for basic structure
        if grep -q "sync_rules:" "$PROJECT_ROOT/powersync/sync-rules.yaml"; then
            check_pass "Sync rules has valid structure"

            # Count rules
            RULE_COUNT=$(grep -c "^  - name:" "$PROJECT_ROOT/powersync/sync-rules.yaml" || echo "0")
            echo "  Found $RULE_COUNT sync rules"
        else
            check_fail "Sync rules missing 'sync_rules:' key"
        fi
    else
        check_fail "Sync rules file is empty"
    fi
else
    check_fail "Sync rules file not found"
fi

# 6. Check custom functions
echo ""
echo -e "${YELLOW}Checking custom functions...${NC}"

if [ -d "$PROJECT_ROOT/powersync/custom-functions" ]; then
    check_pass "Custom functions directory exists"

    FUNC_COUNT=$(find "$PROJECT_ROOT/powersync/custom-functions" -name "*.sql" | wc -l)
    if [ "$FUNC_COUNT" -gt 0 ]; then
        check_pass "Found $FUNC_COUNT SQL function file(s)"
    else
        check_warn "No SQL function files found"
    fi
else
    check_warn "Custom functions directory not found"
fi

# 7. Check environment configuration
echo ""
echo -e "${YELLOW}Checking environment configuration...${NC}"

if [ -f "$PROJECT_ROOT/.env" ]; then
    check_pass ".env file exists"

    # Check required variables
    if grep -q "DATABASE_URL" "$PROJECT_ROOT/.env"; then
        check_pass "DATABASE_URL configured"
    else
        check_fail "DATABASE_URL not found in .env"
    fi

    if grep -q "JWT_SECRET" "$PROJECT_ROOT/.env"; then
        check_pass "JWT_SECRET configured"
    else
        check_fail "JWT_SECRET not found in .env"
    fi
else
    check_fail ".env file not found"
fi

if [ -f "$PROJECT_ROOT/.env.powersync" ]; then
    check_pass ".env.powersync file exists"
else
    check_warn ".env.powersync file not found (optional)"
fi

# 8. Check data directory
echo ""
echo -e "${YELLOW}Checking data directory...${NC}"

if [ -d "$PROJECT_ROOT/data/powersync" ]; then
    check_pass "PowerSync data directory exists"

    # Check if writable
    if [ -w "$PROJECT_ROOT/data/powersync" ]; then
        check_pass "Data directory is writable"
    else
        check_fail "Data directory is not writable"
    fi

    # Check size
    DATA_SIZE=$(du -sh "$PROJECT_ROOT/data/powersync" 2>/dev/null | cut -f1 || echo "unknown")
    echo "  Data directory size: $DATA_SIZE"
else
    check_fail "PowerSync data directory not found"
    echo "  Run: mkdir -p $PROJECT_ROOT/data/powersync"
fi

# 9. Check recent logs for errors
echo ""
echo -e "${YELLOW}Checking recent logs for errors...${NC}"

RECENT_ERRORS=$(docker compose -f docker-compose.powersync.yml logs --tail=50 powersync 2>/dev/null | grep -i "error\|fatal\|panic" || echo "")

if [ -n "$RECENT_ERRORS" ]; then
    check_fail "Errors found in recent logs"
    echo "$RECENT_ERRORS" | head -10
else
    check_pass "No recent errors in logs"
fi

# 10. Check ports
echo ""
echo -e "${YELLOW}Checking network ports...${NC}"

if nc -z localhost 8080 2>/dev/null || curl -s http://localhost:8080 > /dev/null 2>&1; then
    check_pass "Port 8080 is accessible"
else
    check_fail "Port 8080 is not accessible"
fi

if nc -z localhost 8081 2>/dev/null || curl -s http://localhost:8081 > /dev/null 2>&1; then
    check_pass "Admin port 8081 is accessible"
else
    check_warn "Admin port 8081 is not accessible (may be disabled)"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "PowerSync is properly configured and operational."
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "PowerSync is operational but has some warnings to address."
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
fi

echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  • View logs: docker compose -f docker-compose.powersync.yml logs -f powersync"
echo "  • Restart: docker compose -f docker-compose.powersync.yml restart powersync"
echo "  • Check status: docker compose -f docker-compose.powersync.yml ps"
echo "  • Test health: curl http://localhost:8080/health"
echo ""

# Exit with error code if there are errors
if [ $ERRORS -gt 0 ]; then
    exit 1
fi

exit 0
