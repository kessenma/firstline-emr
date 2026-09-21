-- Migration: Cleanup old device token columns from user_settings (OPTIONAL)
-- Date: 2026-01-11
-- Description: Removes the deprecated ios_device_token and android_device_token
--              array columns from user_settings after migration to push_devices table.
--
--              ⚠️ WARNING: Only run this migration AFTER:
--              1. Running 2026_01_11_01_create_push_devices_table.sql
--              2. Running 2026_01_11_02_migrate_device_tokens.sql
--              3. Verifying all tokens are properly migrated
--              4. Testing push notifications work with new table
--              5. Updating all application code to use push_devices
--
--              You can verify migration success by comparing counts:
--              SELECT COUNT(*) FROM push_devices WHERE platform = 'ios';
--              SELECT COUNT(*) FROM (SELECT unnest(ios_device_token) FROM user_settings WHERE ios_device_token IS NOT NULL) AS tokens;

-- First, let's add a backup comment in case we need to reference the old data
COMMENT ON COLUMN "public"."user_settings"."ios_device_token" IS
'DEPRECATED: Migrated to push_devices table on 2026-01-11. Safe to drop after verification.';

COMMENT ON COLUMN "public"."user_settings"."android_device_token" IS
'DEPRECATED: Migrated to push_devices table on 2026-01-11. Safe to drop after verification.';

-- Drop the deprecated columns
-- Uncomment these lines ONLY after verifying migration success:

-- ALTER TABLE "public"."user_settings" DROP COLUMN IF EXISTS "ios_device_token";
-- ALTER TABLE "public"."user_settings" DROP COLUMN IF EXISTS "android_device_token";

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '⚠️  Cleanup migration prepared but NOT executed.';
    RAISE NOTICE '    The deprecated device token columns are marked but not yet dropped.';
    RAISE NOTICE '    To complete cleanup:';
    RAISE NOTICE '    1. Verify push notifications work with new push_devices table';
    RAISE NOTICE '    2. Uncomment the ALTER TABLE DROP COLUMN statements';
    RAISE NOTICE '    3. Re-run this migration';
END $$;
