ALTER TABLE "video_call_sessions" ADD COLUMN "transcription_consent" varchar(16);--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD COLUMN "transcription_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD COLUMN "transcription_consent_locale" varchar(16);--> statement-breakpoint
ALTER TABLE "video_call_sessions" ADD COLUMN "transcription_consent_prompt_version" varchar(32);