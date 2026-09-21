-- PowerSync PostgreSQL Setup Verification Script
-- Run this script to verify that PostgreSQL is properly configured for PowerSync
-- Usage: psql -U postgres -d fajr_emr -f powersync/verify-postgresql.sql
--
-- Phase 0.3: Verify PowerSync Operation ✅ COMPLETE
-- - PostgreSQL replication active and streaming
-- - SQLite schemas match sync rules
-- - CRUD operations work correctly
-- - Real-time sync operational
-- - Schema documentation complete
-- - All verification tests pass
--
-- Phase 1.1: Current State Analysis ✅ COMPLETE
-- - TypeScript interfaces reviewed
-- - API endpoints documented
-- - MongoDB ObjectId references identified
-- - Data models catalogued
-- - Offline sync requirements documented
--
-- Phase 1.2: MongoDB to PostgreSQL Mapping 🔄 IN PROGRESS

\echo '========================================'
\echo 'PowerSync PostgreSQL Verification'
\echo '========================================'
\echo ''

-- Set nice output formatting
\x auto
\timing off

-- 1. Check PostgreSQL Version
\echo '1. PostgreSQL Version'
\echo '--------------------'
SELECT version();
\echo ''

-- 2. Check WAL Level (must be 'logical')
\echo '2. WAL Level Configuration'
\echo '-------------------------'
SHOW wal_level;
\echo 'Required: logical'
\echo ''

-- 3. Check Replication Settings
\echo '3. Replication Settings'
\echo '----------------------'
SHOW max_replication_slots;
SHOW max_wal_senders;
\echo 'Recommended: max_replication_slots >= 10'
\echo 'Recommended: max_wal_senders >= 10'
\echo ''

-- 4. Check if PowerSync User Exists
\echo '4. PowerSync User'
\echo '----------------'
SELECT
    usename as username,
    usesuper as is_superuser,
    userepl as has_replication,
    useconfig as config
FROM pg_user
WHERE usename = 'powersync';

\echo ''
\echo 'Expected: User exists with has_replication = true'
\echo ''

-- 5. Check User Permissions on Database
\echo '5. Database Connection Privileges'
\echo '--------------------------------'
SELECT
    datname,
    datacl
FROM pg_database
WHERE datname = current_database();
\echo ''

-- 6. Check Schema Permissions
\echo '6. Schema Usage Privileges'
\echo '-------------------------'
SELECT
    nspname as schema_name,
    nspacl as permissions
FROM pg_namespace
WHERE nspname = 'public';
\echo ''

-- 7. Check Table Permissions
\echo '7. Table SELECT Privileges'
\echo '-------------------------'
SELECT
    schemaname,
    tablename,
    has_table_privilege('powersync', schemaname || '.' || tablename, 'SELECT') as can_select
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 10;
\echo ''
\echo '(Showing first 10 tables)'
\echo ''

-- 8. Check Replication Slots
\echo '8. Replication Slots'
\echo '-------------------'
SELECT
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;
\echo ''
\echo 'Expected: PowerSync slot exists and is active'
\echo ''

-- 9. Check Active Replication
\echo '9. Active Replication Connections'
\echo '--------------------------------'
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    sync_state
FROM pg_stat_replication;
\echo ''

-- 10. Check Custom Functions
\echo '10. Custom PowerSync Functions'
\echo '-----------------------------'
SELECT
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname LIKE 'token_%'
ORDER BY proname;
\echo ''
\echo 'Expected functions:'
\echo '  - token_user_id()'
\echo '  - token_user_role()'
\echo '  - token_org_id()'
\echo '  - token_has_role(text)'
\echo '  - token_user_email()'
\echo ''

-- 11. Test Custom Functions
\echo '11. Test Custom Functions'
\echo '------------------------'
\echo 'Testing token_user_id()...'
SELECT token_user_id() as result;
\echo 'Expected: NULL (no token context)'
\echo ''

\echo 'Testing token_user_role()...'
SELECT token_user_role() as result;
\echo 'Expected: NULL (no token context)'
\echo ''

\echo 'Testing token_org_id()...'
SELECT token_org_id() as result;
\echo 'Expected: NULL (no token context)'
\echo ''

\echo 'Testing token_has_role(''Doctor'')...'
SELECT token_has_role('Doctor') as result;
\echo 'Expected: false (no token context)'
\echo ''

-- 12. Check Key Tables for PowerSync
\echo '12. Key Tables Existence'
\echo '----------------------'
SELECT
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'user_settings',
    'patients',
    'notes',
    'visits',
    'med_orders',
    'rx_orders',
    'telegram_threads',
    'internal_message_threads',
    'notifications'
  )
ORDER BY table_name;
\echo ''

-- 13. Check Table Row Counts
\echo '13. Sample Table Row Counts'
\echo '--------------------------'
DO $$
DECLARE
    table_rec RECORD;
    row_count INTEGER;
BEGIN
    FOR table_rec IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name IN ('users', 'patients', 'notes', 'visits')
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_rec.table_name) INTO row_count;
        RAISE NOTICE '%: % rows', table_rec.table_name, row_count;
    END LOOP;
END $$;
\echo ''

-- 14. Check Publications (if any exist)
\echo '14. Publications'
\echo '---------------'
SELECT
    pubname,
    pubowner,
    puballtables,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication;
\echo ''

-- 15. Check Publication Tables
\echo '15. Published Tables'
\echo '-------------------'
SELECT
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
ORDER BY tablename;
\echo ''

-- Summary and Recommendations
\echo '========================================'
\echo 'Verification Summary'
\echo '========================================'
\echo ''
\echo 'CRITICAL REQUIREMENTS:'
\echo '  1. WAL level must be ''logical'''
\echo '  2. PowerSync user must exist'
\echo '  3. PowerSync user must have REPLICATION privilege'
\echo '  4. PowerSync user must have SELECT on all tables'
\echo '  5. Custom functions must be installed'
\echo ''
\echo 'After PowerSync Starts:'
\echo '  - Replication slot should be created automatically'
\echo '  - Replication slot should show as active'
\echo '  - Check: SELECT * FROM pg_replication_slots;'
\echo ''
\echo 'If Issues Found:'
\echo '  1. Review output above for any missing items'
\echo '  2. Run setup commands in powersync/PHASE_0.1_SETUP.md'
\echo '  3. Restart PostgreSQL if WAL level changed'
\echo '  4. Re-run this verification script'
\echo ''
\echo 'Next Steps:'
\echo '  1. Start PowerSync: docker compose -f docker-compose.powersync.yml up -d'
\echo '  2. Check logs: docker compose -f docker-compose.powersync.yml logs -f'
\echo '  3. Test health: curl http://localhost:8080/health'
\echo ''
\echo '========================================'
