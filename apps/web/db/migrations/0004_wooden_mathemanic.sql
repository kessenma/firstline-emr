ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "push_notifications_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "ios_device_token" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "android_device_token" text;