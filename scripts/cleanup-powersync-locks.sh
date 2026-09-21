#!/bin/bash
# PowerSync Pre-Deployment Cleanup Script
# This script cleans up stale PostgreSQL connections, replication slots, and locks
# before PowerSync starts to prevent replication lock errors.

set -e

echo "🧹 Starting PowerSync cleanup..."

# Database connection details from environment or defaults
DB_HOST="${POSTGRES_HOST:-uskkog80co4wow0c8c4cosk8}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Check if we have database credentials
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: POSTGRES_PASSWORD environment variable is required"
    exit 1
fi

# Export PGPASSWORD for psql commands
export PGPASSWORD="$DB_PASSWORD"

echo "📊 Checking for PowerSync connections..."

# Function to run SQL commands
run_sql() {
    docker exec uskkog80co4wow0c8c4cosk8 psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null || echo "0"
}

# Count active PowerSync connections
CONNECTIONS=$(run_sql "SELECT COUNT(*) FROM pg_stat_activity WHERE application_name LIKE '%powersync%';")
echo "   Found $CONNECTIONS PowerSync connection(s)"

if [ "$CONNECTIONS" -gt 0 ]; then
    echo "🔌 Terminating PowerSync connections..."
    run_sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name LIKE '%powersync%';"
    echo "   ✅ Connections terminated"

    # Wait a moment for connections to fully close
    sleep 2
fi

# Check for replication slots
SLOTS=$(run_sql "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name LIKE '%powersync%';")
echo "📡 Found $SLOTS replication slot(s)"

if [ "$SLOTS" -gt 0 ]; then
    echo "🗑️  Dropping PowerSync replication slots..."
    # Get slot names and drop them one by one
    SLOT_NAMES=$(run_sql "SELECT slot_name FROM pg_replication_slots WHERE slot_name LIKE '%powersync%';")
    for SLOT in $SLOT_NAMES; do
        if [ ! -z "$SLOT" ] && [ "$SLOT" != "slot_name" ]; then
            echo "   Dropping slot: $SLOT"
            run_sql "SELECT pg_drop_replication_slot('$SLOT');" || echo "   (slot may already be dropped)"
        fi
    done
    echo "   ✅ Replication slots dropped"
fi

# Clear PowerSync locks table
echo "🔓 Clearing PowerSync locks..."
LOCKS=$(run_sql "SELECT COUNT(*) FROM powersync.locks;")
echo "   Found $LOCKS lock(s)"

if [ "$LOCKS" -gt 0 ]; then
    run_sql "DELETE FROM powersync.locks;"
    echo "   ✅ Locks cleared"
fi

# Set active sync rules to STOPPED state
echo "⏸️  Stopping active sync rules..."
ACTIVE_RULES=$(run_sql "SELECT COUNT(*) FROM powersync.sync_rules WHERE state = 'ACTIVE';")
echo "   Found $ACTIVE_RULES active sync rule(s)"

if [ "$ACTIVE_RULES" -gt 0 ]; then
    run_sql "UPDATE powersync.sync_rules SET state = 'STOPPED' WHERE state = 'ACTIVE';"
    echo "   ✅ Sync rules stopped"
fi

# Final verification
echo ""
echo "✅ Cleanup complete! Verification:"
REMAINING_CONN=$(run_sql "SELECT COUNT(*) FROM pg_stat_activity WHERE application_name LIKE '%powersync%';")
REMAINING_SLOTS=$(run_sql "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name LIKE '%powersync%';")
REMAINING_LOCKS=$(run_sql "SELECT COUNT(*) FROM powersync.locks;")

echo "   - PowerSync connections: $REMAINING_CONN"
echo "   - Replication slots: $REMAINING_SLOTS"
echo "   - Locks: $REMAINING_LOCKS"

if [ "$REMAINING_CONN" -eq 0 ] && [ "$REMAINING_SLOTS" -eq 0 ] && [ "$REMAINING_LOCKS" -eq 0 ]; then
    echo ""
    echo "🎉 All clear! PowerSync is ready to start."
    exit 0
else
    echo ""
    echo "⚠️  Warning: Some resources may still be active. Check manually if issues persist."
    exit 0
fi
