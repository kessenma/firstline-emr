-- Migration: Create push_devices table for managing device tokens
-- Date: 2026-01-11
-- Description: Creates a dedicated table for push notification device tokens,
--              replacing the array-based approach in user_settings.
--              This enables better device management, token rotation, and multi-device support.

-- Create enums for platform and environment
CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android');
CREATE TYPE "public"."device_environment" AS ENUM('dev', 'prod');

-- Create push_devices table
CREATE TABLE IF NOT EXISTS "public"."push_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"platform" "device_platform" NOT NULL,
	"token" text NOT NULL,
	"environment" "device_environment" DEFAULT 'prod' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"device_model" varchar(100),
	"app_version" varchar(50),
	"build_number" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_devices_token_platform_env_unique" UNIQUE("token", "platform", "environment")
);

-- Add foreign key constraint
ALTER TABLE "public"."push_devices"
ADD CONSTRAINT "push_devices_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "push_devices_user_id_active_idx" ON "public"."push_devices" ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "push_devices_token_idx" ON "public"."push_devices" ("token");
CREATE INDEX IF NOT EXISTS "push_devices_last_seen_idx" ON "public"."push_devices" ("last_seen_at");

-- Add comments for documentation
COMMENT ON TABLE "public"."push_devices" IS 'Stores push notification device tokens. Each row represents one device/app installation.';
COMMENT ON COLUMN "public"."push_devices"."user_id" IS 'User who owns this device. Nullable to support pre-login token registration.';
COMMENT ON COLUMN "public"."push_devices"."platform" IS 'Device platform: ios or android';
COMMENT ON COLUMN "public"."push_devices"."token" IS 'APNs or FCM device token';
COMMENT ON COLUMN "public"."push_devices"."environment" IS 'Environment for APNs certificates: dev or prod. Important for iOS.';
COMMENT ON COLUMN "public"."push_devices"."is_active" IS 'Whether this device token is currently active. Set to false on logout or invalid token.';
COMMENT ON COLUMN "public"."push_devices"."last_seen_at" IS 'Last time this device token was registered or used. Useful for cleanup of stale devices.';
COMMENT ON COLUMN "public"."push_devices"."device_id" IS 'Optional vendor device ID or generated install ID for tracking specific devices.';
COMMENT ON COLUMN "public"."push_devices"."device_model" IS 'Device model name (e.g., "iPhone 13 Pro", "Samsung Galaxy S21").';
COMMENT ON COLUMN "public"."push_devices"."app_version" IS 'App version when token was registered (e.g., "1.2.3").';
COMMENT ON COLUMN "public"."push_devices"."build_number" IS 'App build number when token was registered.';
