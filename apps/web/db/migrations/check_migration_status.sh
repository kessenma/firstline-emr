#!/bin/bash

# Push Devices Migration Status Checker
# This script checks the current state of your database migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Push Devices Migration Status Checker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get database URL from argument or environment
DB_URL="${1:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not provided${NC}"
    echo "Usage: $0 [database_url]"
    echo "Or set DATABASE_URL environment variable"
    exit 1
fi

echo -e "${YELLOW}Checking migration status...${NC}"
echo ""

# Check 1: Does push_devices table exist?
echo -e "${BLUE}Check 1: push_devices table${NC}"
PUSH_DEVICES_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_devices');")

if [ "$PUSH_DEVICES_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓ push_devices table exists${NC}"

    # Count devices
    DEVICE_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM push_devices;")
    ACTIVE_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM push_devices WHERE is_active = true;")
    echo -e "  - Total devices: ${DEVICE_COUNT}"
    echo -e "  - Active devices: ${ACTIVE_COUNT}"
else
    echo -e "${RED}✗ push_devices table does NOT exist${NC}"
    echo -e "${YELLOW}  → Action: Run migration 2026_01_11_01_create_push_devices_table.sql${NC}"
fi
echo ""

# Check 2: Does user_settings still have device token columns?
echo -e "${BLUE}Check 2: user_settings device token columns${NC}"
IOS_COL_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'ios_device_token');")
ANDROID_COL_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'android_device_token');")

if [ "$IOS_COL_EXISTS" = "t" ] || [ "$ANDROID_COL_EXISTS" = "t" ]; then
    echo -e "${YELLOW}⚠ Old device token columns still exist:${NC}"
    [ "$IOS_COL_EXISTS" = "t" ] && echo -e "  - ios_device_token: ${YELLOW}EXISTS${NC}"
    [ "$ANDROID_COL_EXISTS" = "t" ] && echo -e "  - android_device_token: ${YELLOW}EXISTS${NC}"

    # Count old tokens if columns exist
    if [ "$IOS_COL_EXISTS" = "t" ]; then
        OLD_IOS_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM (SELECT unnest(ios_device_token) FROM user_settings WHERE ios_device_token IS NOT NULL) AS tokens;")
        echo -e "  - Old iOS tokens count: ${OLD_IOS_COUNT}"
    fi
    if [ "$ANDROID_COL_EXISTS" = "t" ]; then
        OLD_ANDROID_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM (SELECT unnest(android_device_token) FROM user_settings WHERE android_device_token IS NOT NULL) AS tokens;")
        echo -e "  - Old Android tokens count: ${OLD_ANDROID_COUNT}"
    fi

    echo -e "${YELLOW}  → Status: Migration NOT complete${NC}"
else
    echo -e "${GREEN}✓ Old device token columns have been dropped${NC}"
    echo -e "${GREEN}  → Migration is COMPLETE${NC}"
fi
echo ""

# Check 3: Does push_notifications_enabled still exist?
echo -e "${BLUE}Check 3: push_notifications_enabled column${NC}"
PUSH_ENABLED_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'push_notifications_enabled');")

if [ "$PUSH_ENABLED_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓ push_notifications_enabled column exists (should be kept)${NC}"
else
    echo -e "${RED}✗ push_notifications_enabled column missing${NC}"
    echo -e "${RED}  → Problem: This column should NOT be dropped!${NC}"
fi
echo ""

# Summary and recommendations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Migration Status Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$PUSH_DEVICES_EXISTS" = "f" ]; then
    echo -e "${RED}STATUS: NOT STARTED${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: psql \$DATABASE_URL -f 2026_01_11_01_create_push_devices_table.sql"
    echo "2. Run: psql \$DATABASE_URL -f 2026_01_11_02_migrate_device_tokens.sql"
    echo "3. Deploy updated application code"
    echo "4. Test for 48-72 hours"
    echo "5. Run: psql \$DATABASE_URL -f 0006_wealthy_nova.sql (drop old columns)"
elif [ "$IOS_COL_EXISTS" = "t" ] || [ "$ANDROID_COL_EXISTS" = "t" ]; then
    if [ "$DEVICE_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}STATUS: IN PROGRESS (Testing Phase)${NC}"
        echo ""
        echo "✓ New push_devices table created and populated"
        echo "✓ Old columns still exist (safe fallback)"
        echo ""
        echo "Recommendations:"
        echo "1. Deploy updated application code (if not already done)"
        echo "2. Test push notifications thoroughly"
        echo "3. Monitor for 48-72 hours"
        echo "4. If all tests pass, run: npm run db:push (to drop old columns)"
        echo ""
        echo -e "${YELLOW}⚠ DO NOT drop old columns until testing is complete!${NC}"
    else
        echo -e "${YELLOW}STATUS: PARTIALLY COMPLETE${NC}"
        echo ""
        echo "✓ push_devices table exists"
        echo "✗ No devices migrated yet"
        echo ""
        echo "Next steps:"
        echo "1. Run: psql \$DATABASE_URL -f 2026_01_11_02_migrate_device_tokens.sql"
        echo "2. Verify migration with: SELECT COUNT(*) FROM push_devices;"
    fi
else
    echo -e "${GREEN}STATUS: COMPLETE ✓${NC}"
    echo ""
    echo "✓ push_devices table exists with ${ACTIVE_COUNT} active devices"
    echo "✓ Old device token columns dropped"
    echo "✓ push_notifications_enabled column retained"
    echo ""
    echo "Migration successfully completed!"
fi
echo ""

# Additional checks
echo -e "${BLUE}Additional Information:${NC}"
echo ""

# Check for enums
PLATFORM_ENUM=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_platform');")
ENV_ENUM=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_environment');")

echo "Database objects:"
[ "$PLATFORM_ENUM" = "t" ] && echo -e "  ✓ device_platform enum exists" || echo -e "  ✗ device_platform enum missing"
[ "$ENV_ENUM" = "t" ] && echo -e "  ✓ device_environment enum exists" || echo -e "  ✗ device_environment enum missing"

# Check indexes if table exists
if [ "$PUSH_DEVICES_EXISTS" = "t" ]; then
    INDEX_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'push_devices';")
    echo -e "  ✓ push_devices has ${INDEX_COUNT} indexes"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo "For detailed migration guide, see: MIGRATION_STEPS.md"
echo -e "${BLUE}========================================${NC}"
