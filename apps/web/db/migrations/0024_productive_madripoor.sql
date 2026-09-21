CREATE TYPE "public"."mission_attachment_type" AS ENUM('admin_document', 'member_photo');--> statement-breakpoint
CREATE TYPE "public"."care_team_role" AS ENUM('surgeon', 'assistant', 'consulting', 'triage', 'coordinator');--> statement-breakpoint
CREATE TYPE "public"."conflict_status" AS ENUM('unresolved', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."feedback_category" AS ENUM('feature_request', 'bug', 'question', 'admin_assistance', 'ui_improvement', 'praise', 'other');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('open', 'in_review', 'resolved', 'closed');--> statement-breakpoint
ALTER TYPE "public"."internal_message_type" ADD VALUE 'lead-request';--> statement-breakpoint
CREATE TABLE "mission_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"file_size" integer,
	"content_type" varchar(100) NOT NULL,
	"upload_type" "mission_attachment_type" DEFAULT 'admin_document' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_team_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"conflicting_user_ids" text[] NOT NULL,
	"status" "conflict_status" DEFAULT 'unresolved' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_care_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "care_team_role" NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "feedback_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"attachments" json DEFAULT '[]'::json,
	"app_sections" json DEFAULT '[]'::json,
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
	"admin_notes" text,
	"thread_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "doctor" TO "care_team";--> statement-breakpoint
ALTER TABLE "internal_message_thread_participants" ADD COLUMN "left_at" timestamp;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "group_chat_thread_id" uuid;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "urls" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "mission_attachments" ADD CONSTRAINT "mission_attachments_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_attachments" ADD CONSTRAINT "mission_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_team_conflicts" ADD CONSTRAINT "care_team_conflicts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_team_conflicts" ADD CONSTRAINT "care_team_conflicts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mission_attachments_mission_id_idx" ON "mission_attachments" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_attachments_uploaded_by_idx" ON "mission_attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "mission_attachments_upload_type_idx" ON "mission_attachments" USING btree ("upload_type");--> statement-breakpoint
CREATE INDEX "mission_requests_user_id_idx" ON "mission_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mission_requests_mission_id_idx" ON "mission_requests" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_requests_status_idx" ON "mission_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mission_requests_user_mission_status_idx" ON "mission_requests" USING btree ("user_id","mission_id","status");--> statement-breakpoint
CREATE INDEX "ctc_patient_id_idx" ON "care_team_conflicts" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "ctc_status_idx" ON "care_team_conflicts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ctc_created_at_idx" ON "care_team_conflicts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pct_patient_id_idx" ON "patient_care_team" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "pct_user_id_idx" ON "patient_care_team" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pct_is_lead_idx" ON "patient_care_team" USING btree ("patient_id","is_lead");--> statement-breakpoint
CREATE INDEX "pct_removed_at_idx" ON "patient_care_team" USING btree ("removed_at");--> statement-breakpoint
CREATE INDEX "uf_user_id_idx" ON "user_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uf_status_idx" ON "user_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uf_category_idx" ON "user_feedback" USING btree ("category");--> statement-breakpoint
CREATE INDEX "uf_created_at_idx" ON "user_feedback" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_group_chat_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("group_chat_thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "admin_email_notifications";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "specialty_email_notifications";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "triage_email_notifications";