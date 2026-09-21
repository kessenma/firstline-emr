-- Migration: Migrate existing device tokens from user_settings to push_devices
-- Date: 2026-01-11
-- Description: Transfers all existing iOS and Android device tokens from the
--              user_settings arrays into individual push_devices rows.
--              This is a data-only migration that preserves all existing tokens.

-- Migrate iOS device tokens
-- Unnest the array and create one row per token
INSERT INTO "public"."push_devices" (
    "user_id",
    "platform",
    "token",
    "environment",
    "is_active",
    "last_seen_at",
    "created_at",
    "updated_at"
)
SELECT
    us.user_id,
    'ios'::"device_platform",
    unnest(us.ios_device_token) as token,
    'prod'::"device_environment", -- Default to prod, adjust if you have dev tokens
    true, -- Mark as active
    COALESCE(us.updated_at, us.created_at, now()), -- Use last update time as last_seen
    us.created_at,
    now()
FROM "public"."user_settings" us
WHERE us.ios_device_token IS NOT NULL
  AND array_length(us.ios_device_token, 1) > 0
ON CONFLICT ("token", "platform", "environment") DO NOTHING; -- Skip duplicates

-- Migrate Android device tokens
-- Unnest the array and create one row per token
INSERT INTO "public"."push_devices" (
    "user_id",
    "platform",
    "token",
    "environment",
    "is_active",
    "last_seen_at",
    "created_at",
    "updated_at"
)
SELECT
    us.user_id,
    'android'::"device_platform",
    unnest(us.android_device_token) as token,
    'prod'::"device_environment", -- Android typically only uses prod
    true, -- Mark as active
    COALESCE(us.updated_at, us.created_at, now()), -- Use last update time as last_seen
    us.created_at,
    now()
FROM "public"."user_settings" us
WHERE us.android_device_token IS NOT NULL
  AND array_length(us.android_device_token, 1) > 0
ON CONFLICT ("token", "platform", "environment") DO NOTHING; -- Skip duplicates

-- Log the migration results
DO $$
DECLARE
    ios_count INTEGER;
    android_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ios_count
    FROM "public"."push_devices"
    WHERE platform = 'ios';

    SELECT COUNT(*) INTO android_count
    FROM "public"."push_devices"
    WHERE platform = 'android';

    total_count := ios_count + android_count;

    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '  - iOS devices migrated: %', ios_count;
    RAISE NOTICE '  - Android devices migrated: %', android_count;
    RAISE NOTICE '  - Total devices: %', total_count;
END $$;

-- Add a comment documenting the migration
COMMENT ON TABLE "public"."push_devices" IS
'Stores push notification device tokens. Each row represents one device/app installation. Migrated from user_settings arrays on 2026-01-11.';
