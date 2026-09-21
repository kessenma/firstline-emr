ALTER TABLE "patient_media" ADD COLUMN "source" varchar(32);--> statement-breakpoint
ALTER TABLE "patient_media" ADD COLUMN "video_call_session_id" uuid;--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD COLUMN "photo_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD COLUMN "photo_consent_by_id" uuid;--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD COLUMN "photo_consent_denied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_video_call_session_id_video_call_sessions_id_fk" FOREIGN KEY ("video_call_session_id") REFERENCES "public"."video_call_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD CONSTRAINT "video_call_sessions_photo_consent_by_id_users_id_fk" FOREIGN KEY ("photo_consent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_media_video_call_session_id_idx" ON "patient_media" USING btree ("video_call_session_id");