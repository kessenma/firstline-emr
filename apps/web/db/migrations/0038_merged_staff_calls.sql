CREATE TYPE "public"."call_kind" AS ENUM('audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."call_participant_role" AS ENUM('caller', 'callee');--> statement-breakpoint
CREATE TYPE "public"."call_participant_status" AS ENUM('ringing', 'accepted', 'declined', 'missed', 'left', 'failed');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('ringing', 'active', 'completed', 'missed', 'declined', 'canceled', 'failed');--> statement-breakpoint
ALTER TYPE "public"."device_platform" ADD VALUE 'ios_voip';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'missed_call';--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "call_participant_role" NOT NULL,
	"status" "call_participant_status" DEFAULT 'ringing' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"client_platform" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_participants_call_user_unique" UNIQUE("call_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_name" text NOT NULL,
	"kind" "call_kind" DEFAULT 'audio' NOT NULL,
	"status" "call_status" DEFAULT 'ringing' NOT NULL,
	"initiator_id" uuid NOT NULL,
	"is_group_call" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"end_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "notify_calls" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_participants_user_invited_idx" ON "call_participants" USING btree ("user_id","invited_at");--> statement-breakpoint
CREATE INDEX "call_participants_call_idx" ON "call_participants" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "calls_initiator_idx" ON "calls" USING btree ("initiator_id");--> statement-breakpoint
CREATE INDEX "calls_started_at_idx" ON "calls" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "calls_status_started_idx" ON "calls" USING btree ("status","started_at");