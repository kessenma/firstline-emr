CREATE TYPE "public"."video_call_status" AS ENUM('pending', 'active', 'completed', 'missed', 'expired');--> statement-breakpoint
CREATE TABLE "video_call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"room_name" varchar(128) NOT NULL,
	"started_by_id" uuid,
	"invite_token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"patient_joined_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"status" "video_call_status" DEFAULT 'pending' NOT NULL,
	"ended_reason" varchar(64),
	"call_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_call_sessions_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD CONSTRAINT "video_call_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD CONSTRAINT "video_call_sessions_started_by_id_users_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_call_sessions_invite_token_idx" ON "video_call_sessions" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "video_call_sessions_patient_id_idx" ON "video_call_sessions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "video_call_sessions_room_name_idx" ON "video_call_sessions" USING btree ("room_name");--> statement-breakpoint
CREATE INDEX "video_call_sessions_status_idx" ON "video_call_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_call_sessions_started_by_id_idx" ON "video_call_sessions" USING btree ("started_by_id");