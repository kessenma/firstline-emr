CREATE TYPE "public"."pending_link_status" AS ENUM('pending', 'matched', 'expired', 'rejected');--> statement-breakpoint
CREATE TABLE "pending_link_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"telegram_chat_id" varchar(255) NOT NULL,
	"status" "pending_link_status" DEFAULT 'pending' NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "telegram_link_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"patient_id" uuid NOT NULL,
	"created_by_id" uuid,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"telegram_chat_id" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_link_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_link_attempts_code_idx" ON "pending_link_attempts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pending_link_attempts_status_idx" ON "pending_link_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pending_link_attempts_telegram_chat_id_idx" ON "pending_link_attempts" USING btree ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX "telegram_link_codes_code_idx" ON "telegram_link_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "telegram_link_codes_patient_id_idx" ON "telegram_link_codes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "telegram_link_codes_is_used_idx" ON "telegram_link_codes" USING btree ("is_used");--> statement-breakpoint
CREATE INDEX "telegram_link_codes_created_by_id_idx" ON "telegram_link_codes" USING btree ("created_by_id");