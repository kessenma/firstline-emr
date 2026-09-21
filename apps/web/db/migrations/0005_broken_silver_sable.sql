DO $$ BEGIN
 CREATE TYPE "public"."device_environment" AS ENUM('dev', 'prod');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_devices" (
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
	CONSTRAINT "push_devices_token_platform_env_unique" UNIQUE("token","platform","environment")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "ios_device_token" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "android_device_token" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "save_last_page" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_devices_user_id_active_idx" ON "push_devices" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_devices_token_idx" ON "push_devices" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_devices_last_seen_idx" ON "push_devices" USING btree ("last_seen_at");