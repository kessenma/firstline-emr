ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "media_cache_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "media_cache_wifi_only" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "data_sync_wifi_only" boolean DEFAULT false;
