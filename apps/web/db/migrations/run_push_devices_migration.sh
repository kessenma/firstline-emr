#!/bin/bash

# Push Devices Migration Runner
# This script runs the push_devices table migration in the correct order
#
# Usage:
#   ./run_push_devices_migration.sh [database_url]
#
# If database_url is not provided, it will use DATABASE_URL from environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get database URL from argument or environment
DB_URL="${1:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not provided${NC}"
    echo "Usage: $0 [database_url]"
    echo "Or set DATABASE_URL environment variable"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Push Devices Migration Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Migration files
MIGRATION_1="$SCRIPT_DIR/2026_01_11_01_create_push_devices_table.sql"
MIGRATION_2="$SCRIPT_DIR/2026_01_11_02_migrate_device_tokens.sql"
MIGRATION_3="$SCRIPT_DIR/2026_01_11_03_cleanup_old_device_tokens.sql"

# Function to run a migration
run_migration() {
    local file=$1
    local description=$2

    echo -e "${YELLOW}Running: $description${NC}"
    echo "File: $(basename $file)"

    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: Migration file not found: $file${NC}"
        exit 1
    fi

    psql "$DB_URL" -f "$file"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        echo ""
    else
        echo -e "${RED}✗ Failed${NC}"
        exit 1
    fi
}

# Step 1: Create push_devices table
echo -e "${BLUE}Step 1: Create push_devices table${NC}"
run_migration "$MIGRATION_1" "Creating push_devices table, enums, and indexes"

# Step 2: Migrate existing data
echo -e "${BLUE}Step 2: Migrate existing device tokens${NC}"
echo -e "${YELLOW}This will copy all tokens from user_settings arrays to push_devices rows${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_migration "$MIGRATION_2" "Migrating device tokens from user_settings to push_devices"
else
    echo -e "${YELLOW}Skipped data migration${NC}"
    echo ""
fi

# Step 3: Verification
echo -e "${BLUE}Step 3: Verification${NC}"
echo -e "${YELLOW}Running verification queries...${NC}"
echo ""

psql "$DB_URL" <<EOF
-- Count iOS tokens
SELECT
    '📱 iOS Devices' as category,
    COUNT(*) as count
FROM push_devices
WHERE platform = 'ios';

-- Count Android tokens
SELECT
    '📱 Android Devices' as category,
    COUNT(*) as count
FROM push_devices
WHERE platform = 'android';

-- Active vs Inactive
SELECT
    CASE WHEN is_active THEN '✅ Active' ELSE '❌ Inactive' END as status,
    COUNT(*) as count
FROM push_devices
GROUP BY is_active;

-- Devices per platform/environment
SELECT
    platform,
    environment,
    COUNT(*) as device_count
FROM push_devices
WHERE is_active = true
GROUP BY platform, environment
ORDER BY platform, environment;
EOF

echo ""
echo -e "${GREEN}Verification complete!${NC}"
echo ""

# Step 4: Optional cleanup (commented out by default)
echo -e "${BLUE}Step 4: Cleanup old columns (OPTIONAL)${NC}"
echo -e "${YELLOW}⚠️  WARNING: This will drop ios_device_token and android_device_token columns${NC}"
echo -e "${YELLOW}    Only proceed if:${NC}"
echo -e "${YELLOW}    1. Push notifications are working with new table${NC}"
echo -e "${YELLOW}    2. All application code has been updated${NC}"
echo -e "${YELLOW}    3. You've tested thoroughly${NC}"
echo ""
echo -e "${RED}SKIPPING cleanup migration by default${NC}"
echo "To run cleanup later:"
echo "  psql \$DATABASE_URL -f $MIGRATION_3"
echo "  Then uncomment the DROP COLUMN statements in that file"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Migration Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy updated application code (API routes + Go server)"
echo "2. Test push notifications"
echo "3. Monitor logs for any issues"
echo "4. After 1-2 weeks, run cleanup migration if desired"
echo ""
echo "For detailed information, see:"
echo "  $SCRIPT_DIR/PUSH_DEVICES_MIGRATION_GUIDE.md"
echo ""
