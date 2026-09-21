DO $$ BEGIN
  CREATE TYPE "public"."mission_status" AS ENUM('planned', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sender" text NOT NULL,
	"sender_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"media_url" text DEFAULT '',
	"reply_to" text,
	"forwarded_from" text DEFAULT '',
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"translated_text" text,
	"is_translated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"city" varchar(255),
	"mission_hospital" varchar(255),
	"description" text,
	"status" "mission_status" DEFAULT 'planned' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active_intake" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "missions" text[];--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mission_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_thread_id_telegram_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."telegram_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_messages_thread_id_idx" ON "telegram_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_messages_sender_id_idx" ON "telegram_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_messages_timestamp_idx" ON "telegram_messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_messages_thread_timestamp_idx" ON "telegram_messages" USING btree ("thread_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_status_idx" ON "missions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_active_intake_idx" ON "missions" USING btree ("is_active_intake");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_created_at_idx" ON "missions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_mission_id_idx" ON "patients" USING btree ("mission_id");