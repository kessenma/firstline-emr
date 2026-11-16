-- Firstline fresh-install baseline schema. GENERATED: do not edit by hand.
-- Regenerate in the same commit as every new migration:
--   cd apps/web && pnpm db:baseline
-- Applied by scripts/check-migrations.ts --apply on an EMPTY database only.
-- covers-journal-through: 2026_08_12_02_rx_order_cancellation

CREATE TYPE "public"."account_type" AS ENUM('Doctor', 'Triage');
CREATE TYPE "public"."email_type" AS ENUM('follow-up', 'reminder');
CREATE TYPE "public"."gender" AS ENUM('Male', 'Female');
CREATE TYPE "public"."admin_notification_type" AS ENUM('announcement', 'alert', 'reminder');
CREATE TYPE "public"."baseline_ambu" AS ENUM('Not Selected', 'Independent', 'Boot', 'Crutches', 'Walker', 'Non-Ambulatory');
CREATE TYPE "public"."patient_gender" AS ENUM('Male', 'Female');
CREATE TYPE "public"."priority" AS ENUM('Not Selected', 'Routine', 'Moderate', 'Urgent', 'Emergency');
CREATE TYPE "public"."rx_order_status" AS ENUM('not reviewed', 'partially filled', 'declined', 'completed');
CREATE TYPE "public"."status" AS ENUM('Pre-Op / Not Cleared', 'Pre-Op / Cleared', 'Peri-Op / In Surgery', 'Post-Op / In-Patient', 'Post-Op / Discharged');
CREATE TYPE "public"."note_edit_type" AS ENUM('created', 'updated', 'published');
CREATE TYPE "public"."note_type" AS ENUM('procedure', 'subjective', 'blank', 'triage', 'patient_call');
CREATE TYPE "public"."covid_test" AS ENUM('pos', 'neg');
CREATE TYPE "public"."device_environment" AS ENUM('dev', 'prod');
CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android', 'ios_voip');
CREATE TYPE "public"."notification_method" AS ENUM('in-app', 'email');
CREATE TYPE "public"."notification_type" AS ENUM('message', 'alert', 'profile_update_approved', 'profile_update_denied', 'profile_update_request', 'patient_update', 'system_notification', 'new_user_signup', 'specialty_no_doctors', 'missed_call');
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'video', 'file', 'reply', 'forward', 'audio');
CREATE TYPE "public"."thread_status" AS ENUM('active', 'archived');
CREATE TYPE "public"."internal_message_type" AS ENUM('text', 'image', 'video', 'file', 'reply', 'forward', 'audio', 'patient-card', 'lead-request', 'call-summary');
CREATE TYPE "public"."internal_thread_status" AS ENUM('active', 'archived');
CREATE TYPE "public"."intake_mode" AS ENUM('default', 'custom');
CREATE TYPE "public"."admin_approval_field" AS ENUM('doctorSpecialty', 'accountType');
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'denied');
CREATE TYPE "public"."mission_status" AS ENUM('planned', 'active', 'completed');
CREATE TYPE "public"."mission_attachment_type" AS ENUM('admin_document', 'member_photo');
CREATE TYPE "public"."care_team_role" AS ENUM('surgeon', 'assistant', 'consulting', 'triage', 'coordinator');
CREATE TYPE "public"."conflict_status" AS ENUM('unresolved', 'resolved');
CREATE TYPE "public"."feedback_category" AS ENUM('feature_request', 'bug', 'question', 'admin_assistance', 'ui_improvement', 'praise', 'other', 'offline_access');
CREATE TYPE "public"."feedback_platform" AS ENUM('mobile', 'web', 'both');
CREATE TYPE "public"."feedback_status" AS ENUM('open', 'in_review', 'resolved', 'closed');
CREATE TYPE "public"."mobile_platform" AS ENUM('android', 'ios');
CREATE TYPE "public"."pending_link_status" AS ENUM('pending', 'matched', 'expired', 'rejected');
CREATE TYPE "public"."video_call_status" AS ENUM('pending', 'active', 'completed', 'missed', 'expired');
CREATE TYPE "public"."backup_mode" AS ENUM('clinical', 'full_migration');
CREATE TYPE "public"."backup_source" AS ENUM('mobile', 'server');
CREATE TYPE "public"."backup_status" AS ENUM('uploading', 'processing', 'available', 'restoring', 'failed', 'expired');
CREATE TYPE "public"."conflict_strategy" AS ENUM('skip', 'overwrite', 'newer_wins');
CREATE TYPE "public"."restore_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');
CREATE TYPE "public"."call_kind" AS ENUM('audio', 'video');
CREATE TYPE "public"."call_participant_role" AS ENUM('caller', 'callee');
CREATE TYPE "public"."call_participant_status" AS ENUM('ringing', 'accepted', 'declined', 'missed', 'left', 'failed');
CREATE TYPE "public"."call_status" AS ENUM('ringing', 'active', 'completed', 'missed', 'declined', 'canceled', 'failed');
CREATE TABLE "security_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question" varchar(500) NOT NULL,
	"answer" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_follow_up_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_by_admin_id" uuid,
	"sent_by_admin_email" varchar(255),
	"sent_by_admin_name" varchar(255),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_type" "email_type" DEFAULT 'follow-up' NOT NULL
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"password" varchar(255),
	"doctor_specialty" text[],
	"languages" text[],
	"countries" text[],
	"missions" text[],
	"gender" "gender",
	"dob" timestamp with time zone,
	"image" text,
	"medical_license" text,
	"medical_licenses" json,
	"authorized" boolean,
	"approval_date" timestamp with time zone,
	"denial_date" timestamp with time zone,
	"temp_password_reset_code" varchar(255),
	"temp_code_expiry" timestamp with time zone,
	"admin_reset_password_link" text,
	"admin_reset_link_expiry" timestamp with time zone,
	"password_reset_count" integer DEFAULT 0,
	"is_admin_created" boolean DEFAULT false,
	"account_confirmed" boolean DEFAULT true,
	"admin_created_by" json,
	"admin_created_date" timestamp with time zone,
	"email_sent_date" timestamp with time zone,
	"confirmation_token" varchar(255),
	"confirmation_token_expiry" timestamp with time zone,
	"verification_code" varchar(10),
	"verification_code_expiry" timestamp with time zone,
	"token_session_expiry" timestamp with time zone,
	"two_factor_status" varchar(20),
	"two_factor_grace_deadline" timestamp with time zone,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"admin_start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid,
	"message" text NOT NULL,
	"type" "admin_notification_type" DEFAULT 'announcement' NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"description" text,
	"links" json,
	"images" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "patient_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"url" text NOT NULL,
	"content_type" varchar(100),
	"source" varchar(32),
	"video_call_session_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" json,
	"email" varchar(255),
	"telegram_chat_id" varchar(255),
	"telegram_access_hash" varchar(255),
	"bmi" varchar(50),
	"dob" timestamp with time zone,
	"gender" "patient_gender",
	"country" varchar(255),
	"city" varchar(255),
	"language" varchar(100),
	"occupation" varchar(255),
	"chief_complaint" text,
	"diagnosis" text,
	"diagnosis_cat" varchar(255),
	"icd10" varchar(255),
	"hospital" varchar(255),
	"priority" "priority" DEFAULT 'Not Selected',
	"specialties" text[],
	"status" "status" DEFAULT 'Pre-Op / Not Cleared',
	"baseline_ambu" "baseline_ambu",
	"pmhx" text,
	"pshx" text,
	"famhx" text,
	"allergies" text,
	"current_meds" text,
	"prev_meds" text,
	"smoke_count" varchar(100),
	"drink_count" varchar(100),
	"other_drugs" text,
	"coordinator_id" uuid,
	"triaged_by" json,
	"care_team" json DEFAULT '[]'::json,
	"is_patient" boolean,
	"patient_relation" varchar(255),
	"gender_preference" varchar(50),
	"previously_registered" varchar(50),
	"scheduled_vid_chat" timestamp with time zone,
	"surgery_date" timestamp with time zone,
	"mission_id" uuid,
	"dashboard_notes" text,
	"has_submitted_info" boolean DEFAULT false,
	"has_specialty_without_doctors" boolean DEFAULT false,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rx_order_access" (
	"rx_order_id" uuid PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"code_salt" text NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"lifetime_failures" integer DEFAULT 0 NOT NULL,
	"retry_after" timestamp with time zone,
	"pharmacy_failures" integer DEFAULT 0 NOT NULL,
	"pharmacy_retry_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);

CREATE TABLE "rx_order_access_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rx_order_id" uuid NOT NULL,
	"gate" text NOT NULL,
	"succeeded" boolean NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rx_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"rx_order_id" varchar(255) NOT NULL,
	"doctor_specialty" varchar(255),
	"prescribing_dr" varchar(255) NOT NULL,
	"dr_email" varchar(255) NOT NULL,
	"dr_id" varchar(255) NOT NULL,
	"prescribed_date" timestamp with time zone NOT NULL,
	"valid_till" timestamp with time zone NOT NULL,
	"city" varchar(255) NOT NULL,
	"prescriptions" json NOT NULL,
	"patient_rx_url" text,
	"pharmacy_qr_code" text,
	"pharmacy_qr_url" text,
	"rx_dispenser_name" varchar(255),
	"rx_dispenser_contact" varchar(255),
	"rx_status" "rx_order_status",
	"submitted" boolean DEFAULT false,
	"partial_rx_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"patient_link_sent_at" timestamp with time zone,
	"patient_link_sent_by" uuid,
	"patient_link_opened_at" timestamp with time zone,
	"patient_link_open_count" integer DEFAULT 0 NOT NULL,
	"patient_link_failed_count" integer DEFAULT 0 NOT NULL,
	"patient_link_last_failed_at" timestamp with time zone,
	"patient_link_lock_state" text DEFAULT 'ok' NOT NULL,
	"pharmacy_link_opened_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_role" text,
	"cancelled_by_user_id" uuid,
	"cancellation_reason" text,
	"cancellation_reason_code" text
);

CREATE TABLE "note_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"editor_id" uuid,
	"editor_name" varchar(255),
	"editor_account_type" varchar(50),
	"editor_care_team_role" varchar(50),
	"edit_type" "note_edit_type" NOT NULL,
	"content_snapshot" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"note_type" "note_type" NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"author_name" varchar(255),
	"author_id" uuid,
	"attending_physician_id" uuid,
	"attending_physician_name" varchar(255),
	"content" json,
	"draft" boolean DEFAULT true NOT NULL,
	"last_editor_id" uuid,
	"last_editor_name" varchar(255),
	"last_editor_account_type" varchar(50),
	"last_editor_care_team_role" varchar(50),
	"skip_edit_record" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_date" timestamp with time zone NOT NULL,
	"temp" real,
	"blood_pressure" varchar(50),
	"hba1c" real,
	"albumin" real,
	"s_protein" real,
	"crp" real,
	"esr" real,
	"hgb_hct" real,
	"wbc" real,
	"platelets" real,
	"pt" real,
	"ptt" real,
	"inr" real,
	"alk_phos" real,
	"ast" real,
	"alt" real,
	"type_and_screen" varchar(255),
	"covid_test" "covid_test",
	"urinalysis" text,
	"file_upload_urls" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "med_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oid" varchar(255),
	"doctor_specialty" varchar(255) NOT NULL,
	"prescribing_dr" varchar(255) NOT NULL,
	"dr_email" varchar(255) NOT NULL,
	"dr_id" uuid NOT NULL,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"patient_name" varchar(255) NOT NULL,
	"patient_phone" varchar(50) NOT NULL,
	"patient_city" varchar(255) NOT NULL,
	"patient_country" varchar(255) NOT NULL,
	"patient_id" uuid NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"medications" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_view" varchar(500) DEFAULT '/',
	"last_view_saved_at" varchar(255),
	"last_view_session_id" varchar(255),
	"save_last_page" boolean DEFAULT false,
	"theme_mode" varchar(20) DEFAULT 'system',
	"push_notifications_enabled" boolean DEFAULT true,
	"notify_internal_messages" boolean DEFAULT true,
	"notify_patient_messages" boolean DEFAULT true,
	"notify_patient_actions" boolean DEFAULT true,
	"notify_calls" boolean DEFAULT true,
	"quiet_hours_enabled" boolean DEFAULT false,
	"quiet_hours_start" varchar(10),
	"quiet_hours_end" varchar(10),
	"quiet_hours_timezone" varchar(100),
	"media_cache_enabled" boolean DEFAULT true,
	"media_cache_wifi_only" boolean DEFAULT true,
	"data_sync_wifi_only" boolean DEFAULT false,
	"translation_model_wifi_only" boolean DEFAULT true,
	"voice_sensitivity" varchar(20) DEFAULT 'adaptive',
	"call_transcription_mode" varchar(16) DEFAULT 'off',
	"patient_chart_view" varchar(30) DEFAULT 'tabs',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "push_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"platform" "device_platform" NOT NULL,
	"token" text NOT NULL,
	"environment" "device_environment" DEFAULT 'prod' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"device_model" varchar(100),
	"app_version" varchar(50),
	"build_number" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_devices_token_platform_env_unique" UNIQUE("token","platform","environment")
);

CREATE TABLE "notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'message' NOT NULL,
	"subject" varchar(500),
	"patient_id" uuid,
	"redirect_to" varchar(500),
	"category" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "patient_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"telegram_thread_id" uuid NOT NULL,
	"message" text DEFAULT '',
	"follow_up_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "telegram_thread_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "telegram_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"patient_id" uuid,
	"participants" text[],
	"unread_count" integer DEFAULT 0 NOT NULL,
	"status" "thread_status" DEFAULT 'active' NOT NULL,
	"messages" json DEFAULT '[]'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_threads_chat_id_unique" UNIQUE("chat_id")
);

CREATE TABLE "internal_message_thread_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"last_read_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);

CREATE TABLE "internal_message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) DEFAULT '',
	"participants" text[] NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"status" "internal_thread_status" DEFAULT 'active' NOT NULL,
	"messages" json DEFAULT '[]'::json,
	"last_activity" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"is_group_chat" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "internal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sender" text NOT NULL,
	"sender_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "internal_message_type" DEFAULT 'text' NOT NULL,
	"media_url" text DEFAULT '',
	"reply_to" text,
	"forwarded_from" text DEFAULT '',
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "telegram_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sender" text NOT NULL,
	"sender_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"media_url" text DEFAULT '',
	"reply_to" text,
	"forwarded_from" text DEFAULT '',
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"translated_text" text,
	"is_translated" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "patient_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_message" text DEFAULT 'Welcome! Please complete your registration:',
	"confirmation_message" text DEFAULT 'Thank you for joining! We''ll guide you through the next steps.',
	"updated_by" uuid,
	"mode" "intake_mode" DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "telegram_intake_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"patient_id" uuid NOT NULL,
	"telegram_chat_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"submitted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "telegram_intake_tokens_token_unique" UNIQUE("token")
);

CREATE TABLE "user_profile_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changes" json NOT NULL,
	"is_admin_action" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_messages_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "cpt_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "icd10_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_profile_update_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"field_name" "admin_approval_field" NOT NULL,
	"current_value" json,
	"requested_value" json NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_name" varchar(500) NOT NULL,
	"reviewed_by" uuid,
	"reviewed_by_email" varchar(255),
	"reviewed_by_name" varchar(500),
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "passkey_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"credential_device_type" varchar(32),
	"credential_backed_up" boolean DEFAULT false,
	"transports" text[],
	"device_name" varchar(255),
	"aaguid" varchar(36),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkey_credentials_credential_id_unique" UNIQUE("credential_id")
);

CREATE TABLE "totp_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_secret" text NOT NULL,
	"encryption_iv" text NOT NULL,
	"encryption_tag" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "oidc_access_tokens" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "oidc_authorization_codes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);

CREATE TABLE "oidc_backchannel_auth_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "oidc_client_credentials" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone
);

CREATE TABLE "oidc_device_codes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_code" varchar(255),
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);

CREATE TABLE "oidc_grants" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "oidc_interactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "oidc_pushed_authorization_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "oidc_refresh_tokens" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);

CREATE TABLE "oidc_replay_detection" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "oidc_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"city" varchar(255),
	"hospitals" json DEFAULT '[]'::json,
	"description" text,
	"status" "mission_status" DEFAULT 'planned' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"default_intake_hospital" varchar(255),
	"is_active_intake" boolean DEFAULT false NOT NULL,
	"group_chat_thread_id" uuid,
	"created_by" uuid,
	"urls" json DEFAULT '[]'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "mission_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "care_team_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"conflicting_user_ids" text[] NOT NULL,
	"status" "conflict_status" DEFAULT 'unresolved' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "patient_care_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "care_team_role" NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "patient_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" json,
	"email" varchar(255),
	"dob" timestamp with time zone,
	"gender" varchar(50),
	"country" varchar(255),
	"city" varchar(255),
	"language" varchar(100),
	"chief_complaint" text,
	"allergies" text,
	"current_meds" text,
	"specialties" text[],
	"hospital" varchar(255),
	"mission_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "feedback_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"attachments" json DEFAULT '[]'::json,
	"app_sections" json DEFAULT '[]'::json,
	"platform" "feedback_platform" NOT NULL,
	"mobile_platform" "mobile_platform",
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
	"sync_diagnostics" json,
	"app_version" varchar(50),
	"admin_notes" text,
	"thread_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "pending_link_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"telegram_chat_id" varchar(255) NOT NULL,
	"status" "pending_link_status" DEFAULT 'pending' NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);

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
	"photo_consent_at" timestamp with time zone,
	"photo_consent_by_id" uuid,
	"photo_consent_denied_at" timestamp with time zone,
	"transcription_consent" varchar(16),
	"transcription_consent_at" timestamp with time zone,
	"transcription_consent_locale" varchar(16),
	"transcription_consent_prompt_version" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_call_sessions_invite_token_unique" UNIQUE("invite_token")
);

CREATE TABLE "backup_restores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_id" uuid NOT NULL,
	"restored_by" uuid NOT NULL,
	"status" "restore_status" DEFAULT 'pending' NOT NULL,
	"conflict_strategy" "conflict_strategy" NOT NULL,
	"tables_restored" json,
	"total_inserted" integer DEFAULT 0,
	"total_updated" integer DEFAULT 0,
	"total_skipped" integer DEFAULT 0,
	"total_failed" integer DEFAULT 0,
	"error_log" json,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" "backup_status" DEFAULT 'uploading' NOT NULL,
	"backup_mode" "backup_mode" DEFAULT 'clinical' NOT NULL,
	"backup_source" "backup_source" DEFAULT 'mobile' NOT NULL,
	"tables" json NOT NULL,
	"total_records" integer NOT NULL,
	"checksum" varchar(64),
	"device_info" json,
	"encrypted" boolean DEFAULT false NOT NULL,
	"includes_auth" boolean DEFAULT false NOT NULL,
	"auth_dump_path" text,
	"auth_meta" json,
	"error_message" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

ALTER TABLE "security_questions" ADD CONSTRAINT "security_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_follow_up_emails" ADD CONSTRAINT "user_follow_up_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_follow_up_emails" ADD CONSTRAINT "user_follow_up_emails_sent_by_admin_id_users_id_fk" FOREIGN KEY ("sent_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_video_call_session_id_video_call_sessions_id_fk" FOREIGN KEY ("video_call_session_id") REFERENCES "public"."video_call_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "patients" ADD CONSTRAINT "patients_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "patients" ADD CONSTRAINT "patients_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rx_order_access" ADD CONSTRAINT "rx_order_access_rx_order_id_rx_orders_id_fk" FOREIGN KEY ("rx_order_id") REFERENCES "public"."rx_orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rx_order_access_attempts" ADD CONSTRAINT "rx_order_access_attempts_rx_order_id_rx_orders_id_fk" FOREIGN KEY ("rx_order_id") REFERENCES "public"."rx_orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rx_orders" ADD CONSTRAINT "rx_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "note_edits" ADD CONSTRAINT "note_edits_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "note_edits" ADD CONSTRAINT "note_edits_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notes" ADD CONSTRAINT "notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notes" ADD CONSTRAINT "notes_attending_physician_id_users_id_fk" FOREIGN KEY ("attending_physician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "med_orders" ADD CONSTRAINT "med_orders_dr_id_users_id_fk" FOREIGN KEY ("dr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "med_orders" ADD CONSTRAINT "med_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_telegram_thread_id_telegram_threads_id_fk" FOREIGN KEY ("telegram_thread_id") REFERENCES "public"."telegram_threads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_thread_participants" ADD CONSTRAINT "telegram_thread_participants_thread_id_telegram_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."telegram_threads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_thread_participants" ADD CONSTRAINT "telegram_thread_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_threads" ADD CONSTRAINT "telegram_threads_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "internal_message_thread_participants" ADD CONSTRAINT "internal_message_thread_participants_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "internal_message_thread_participants" ADD CONSTRAINT "internal_message_thread_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "internal_message_threads" ADD CONSTRAINT "internal_message_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_thread_id_telegram_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."telegram_threads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patient_intakes" ADD CONSTRAINT "patient_intakes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "telegram_intake_tokens" ADD CONSTRAINT "telegram_intake_tokens_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profile_logs" ADD CONSTRAINT "user_profile_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profile_logs" ADD CONSTRAINT "user_profile_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profile_update_requests" ADD CONSTRAINT "user_profile_update_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profile_update_requests" ADD CONSTRAINT "user_profile_update_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "totp_credentials" ADD CONSTRAINT "totp_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_group_chat_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("group_chat_thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "mission_attachments" ADD CONSTRAINT "mission_attachments_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_attachments" ADD CONSTRAINT "mission_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "care_team_conflicts" ADD CONSTRAINT "care_team_conflicts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "care_team_conflicts" ADD CONSTRAINT "care_team_conflicts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "patient_drafts" ADD CONSTRAINT "patient_drafts_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "patient_drafts" ADD CONSTRAINT "patient_drafts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "video_call_sessions" ADD CONSTRAINT "video_call_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "video_call_sessions" ADD CONSTRAINT "video_call_sessions_started_by_id_users_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "video_call_sessions" ADD CONSTRAINT "video_call_sessions_photo_consent_by_id_users_id_fk" FOREIGN KEY ("photo_consent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_backup_id_backups_id_fk" FOREIGN KEY ("backup_id") REFERENCES "public"."backups"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_restored_by_users_id_fk" FOREIGN KEY ("restored_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "security_questions_user_id_idx" ON "security_questions" USING btree ("user_id");
CREATE INDEX "user_follow_up_emails_user_id_idx" ON "user_follow_up_emails" USING btree ("user_id");
CREATE INDEX "user_follow_up_emails_sent_by_admin_id_idx" ON "user_follow_up_emails" USING btree ("sent_by_admin_id");
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
CREATE INDEX "users_account_type_idx" ON "users" USING btree ("account_type");
CREATE INDEX "users_authorized_idx" ON "users" USING btree ("authorized");
CREATE INDEX "users_authorized_approval_date_idx" ON "users" USING btree ("authorized","approval_date");
CREATE INDEX "admins_user_id_idx" ON "admins" USING btree ("user_id");
CREATE INDEX "admins_email_idx" ON "admins" USING btree ("email");
CREATE INDEX "admin_notifications_sender_id_idx" ON "admin_notifications" USING btree ("sender_id");
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications" USING btree ("type");
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications" USING btree ("created_at");
CREATE INDEX "admin_notifications_email_sent_idx" ON "admin_notifications" USING btree ("email_sent");
CREATE INDEX "patient_media_patient_id_idx" ON "patient_media" USING btree ("patient_id");
CREATE INDEX "patient_media_video_call_session_id_idx" ON "patient_media" USING btree ("video_call_session_id");
CREATE INDEX "patients_email_idx" ON "patients" USING btree ("email");
CREATE INDEX "patients_status_idx" ON "patients" USING btree ("status");
CREATE INDEX "patients_coordinator_id_idx" ON "patients" USING btree ("coordinator_id");
CREATE INDEX "patients_telegram_chat_id_idx" ON "patients" USING btree ("telegram_chat_id");
CREATE INDEX "patients_mission_id_idx" ON "patients" USING btree ("mission_id");
CREATE INDEX "patients_status_coordinator_idx" ON "patients" USING btree ("status","coordinator_id");
CREATE INDEX "patients_created_at_idx" ON "patients" USING btree ("created_at");
CREATE INDEX "patients_status_created_at_idx" ON "patients" USING btree ("status","created_at");
CREATE INDEX "patients_created_by_id_idx" ON "patients" USING btree ("created_by_id");
CREATE INDEX "rx_order_access_attempts_order_time_idx" ON "rx_order_access_attempts" USING btree ("rx_order_id","created_at");
CREATE INDEX "rx_order_access_attempts_ip_time_idx" ON "rx_order_access_attempts" USING btree ("ip_hash","created_at");
CREATE INDEX "rx_orders_patient_id_idx" ON "rx_orders" USING btree ("patient_id");
CREATE INDEX "rx_orders_rx_order_id_idx" ON "rx_orders" USING btree ("rx_order_id");
CREATE INDEX "note_edits_note_id_idx" ON "note_edits" USING btree ("note_id");
CREATE INDEX "note_edits_editor_id_idx" ON "note_edits" USING btree ("editor_id");
CREATE INDEX "note_edits_created_at_idx" ON "note_edits" USING btree ("created_at");
CREATE INDEX "notes_patient_id_idx" ON "notes" USING btree ("patient_id");
CREATE INDEX "notes_email_idx" ON "notes" USING btree ("email");
CREATE INDEX "notes_note_type_idx" ON "notes" USING btree ("note_type");
CREATE INDEX "notes_author_id_idx" ON "notes" USING btree ("author_id");
CREATE INDEX "notes_draft_idx" ON "notes" USING btree ("draft");
CREATE INDEX "visits_patient_id_idx" ON "visits" USING btree ("patient_id");
CREATE INDEX "visits_visit_date_idx" ON "visits" USING btree ("visit_date");
CREATE INDEX "med_orders_patient_id_idx" ON "med_orders" USING btree ("patient_id");
CREATE INDEX "med_orders_dr_id_idx" ON "med_orders" USING btree ("dr_id");
CREATE INDEX "med_orders_validated_idx" ON "med_orders" USING btree ("validated");
CREATE INDEX "med_orders_order_date_idx" ON "med_orders" USING btree ("order_date");
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");
CREATE INDEX "push_devices_user_id_active_idx" ON "push_devices" USING btree ("user_id","is_active");
CREATE INDEX "push_devices_token_idx" ON "push_devices" USING btree ("token");
CREATE INDEX "push_devices_last_seen_idx" ON "push_devices" USING btree ("last_seen_at");
CREATE INDEX "notification_recipients_notification_id_idx" ON "notification_recipients" USING btree ("notification_id");
CREATE INDEX "notification_recipients_user_id_idx" ON "notification_recipients" USING btree ("user_id");
CREATE INDEX "notifications_source_id_idx" ON "notifications" USING btree ("source_id");
CREATE INDEX "notifications_patient_id_idx" ON "notifications" USING btree ("patient_id");
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
CREATE INDEX "user_notifications_user_id_idx" ON "user_notifications" USING btree ("user_id");
CREATE INDEX "user_notifications_notification_id_idx" ON "user_notifications" USING btree ("notification_id");
CREATE INDEX "user_notifications_read_idx" ON "user_notifications" USING btree ("read");
CREATE INDEX "user_notifications_dismissed_idx" ON "user_notifications" USING btree ("dismissed");
CREATE INDEX "user_notifications_user_read_idx" ON "user_notifications" USING btree ("user_id","read");
CREATE INDEX "patient_follow_ups_chat_id_idx" ON "patient_follow_ups" USING btree ("chat_id");
CREATE INDEX "patient_follow_ups_telegram_thread_id_idx" ON "patient_follow_ups" USING btree ("telegram_thread_id");
CREATE INDEX "patient_follow_ups_follow_up_sent_at_idx" ON "patient_follow_ups" USING btree ("follow_up_sent_at");
CREATE INDEX "telegram_thread_participants_thread_id_idx" ON "telegram_thread_participants" USING btree ("thread_id");
CREATE INDEX "telegram_thread_participants_user_id_idx" ON "telegram_thread_participants" USING btree ("user_id");
CREATE INDEX "telegram_thread_participants_thread_user_idx" ON "telegram_thread_participants" USING btree ("thread_id","user_id");
CREATE INDEX "telegram_threads_chat_id_idx" ON "telegram_threads" USING btree ("chat_id");
CREATE INDEX "telegram_threads_patient_id_idx" ON "telegram_threads" USING btree ("patient_id");
CREATE INDEX "telegram_threads_status_idx" ON "telegram_threads" USING btree ("status");
CREATE INDEX "telegram_threads_participants_idx" ON "telegram_threads" USING btree ("participants");
CREATE INDEX "internal_message_thread_participants_thread_id_idx" ON "internal_message_thread_participants" USING btree ("thread_id");
CREATE INDEX "internal_message_thread_participants_user_id_idx" ON "internal_message_thread_participants" USING btree ("user_id");
CREATE INDEX "internal_message_thread_participants_thread_user_idx" ON "internal_message_thread_participants" USING btree ("thread_id","user_id");
CREATE INDEX "internal_message_threads_participants_idx" ON "internal_message_threads" USING btree ("participants");
CREATE INDEX "internal_message_threads_status_idx" ON "internal_message_threads" USING btree ("status");
CREATE INDEX "internal_message_threads_last_activity_idx" ON "internal_message_threads" USING btree ("last_activity");
CREATE INDEX "internal_message_threads_created_by_idx" ON "internal_message_threads" USING btree ("created_by");
CREATE INDEX "internal_messages_thread_id_idx" ON "internal_messages" USING btree ("thread_id");
CREATE INDEX "internal_messages_sender_id_idx" ON "internal_messages" USING btree ("sender_id");
CREATE INDEX "internal_messages_timestamp_idx" ON "internal_messages" USING btree ("timestamp");
CREATE INDEX "internal_messages_thread_timestamp_idx" ON "internal_messages" USING btree ("thread_id","timestamp");
CREATE INDEX "telegram_messages_thread_id_idx" ON "telegram_messages" USING btree ("thread_id");
CREATE INDEX "telegram_messages_sender_id_idx" ON "telegram_messages" USING btree ("sender_id");
CREATE INDEX "telegram_messages_timestamp_idx" ON "telegram_messages" USING btree ("timestamp");
CREATE INDEX "telegram_messages_thread_timestamp_idx" ON "telegram_messages" USING btree ("thread_id","timestamp");
CREATE INDEX "patient_intakes_updated_by_idx" ON "patient_intakes" USING btree ("updated_by");
CREATE INDEX "patient_intakes_mode_idx" ON "patient_intakes" USING btree ("mode");
CREATE INDEX "telegram_intake_tokens_token_idx" ON "telegram_intake_tokens" USING btree ("token");
CREATE INDEX "telegram_intake_tokens_patient_id_idx" ON "telegram_intake_tokens" USING btree ("patient_id");
CREATE INDEX "telegram_intake_tokens_telegram_chat_id_idx" ON "telegram_intake_tokens" USING btree ("telegram_chat_id");
CREATE INDEX "telegram_intake_tokens_is_valid_idx" ON "telegram_intake_tokens" USING btree ("is_valid");
CREATE INDEX "telegram_intake_tokens_submitted_idx" ON "telegram_intake_tokens" USING btree ("submitted");
CREATE INDEX "telegram_intake_tokens_expires_at_idx" ON "telegram_intake_tokens" USING btree ("expires_at");
CREATE INDEX "user_profile_logs_user_id_idx" ON "user_profile_logs" USING btree ("user_id");
CREATE INDEX "user_profile_logs_changed_by_idx" ON "user_profile_logs" USING btree ("changed_by");
CREATE INDEX "user_profile_logs_changed_at_idx" ON "user_profile_logs" USING btree ("changed_at");
CREATE INDEX "user_profile_logs_is_admin_action_idx" ON "user_profile_logs" USING btree ("is_admin_action");
CREATE INDEX "user_profile_logs_user_changed_at_idx" ON "user_profile_logs" USING btree ("user_id","changed_at");
CREATE INDEX "user_messages_user_id_idx" ON "user_messages" USING btree ("user_id");
CREATE INDEX "user_messages_unread_count_idx" ON "user_messages" USING btree ("unread_count");
CREATE INDEX "cpt_codes_code_idx" ON "cpt_codes" USING btree ("code");
CREATE INDEX "cpt_codes_description_idx" ON "cpt_codes" USING btree ("description");
CREATE INDEX "icd10_codes_code_idx" ON "icd10_codes" USING btree ("code");
CREATE INDEX "icd10_codes_description_idx" ON "icd10_codes" USING btree ("description");
CREATE INDEX "profile_update_requests_user_id_idx" ON "user_profile_update_requests" USING btree ("user_id");
CREATE INDEX "profile_update_requests_status_idx" ON "user_profile_update_requests" USING btree ("status");
CREATE INDEX "profile_update_requests_field_name_idx" ON "user_profile_update_requests" USING btree ("field_name");
CREATE INDEX "profile_update_requests_user_id_status_idx" ON "user_profile_update_requests" USING btree ("user_id","status");
CREATE INDEX "passkey_credentials_user_id_active_idx" ON "passkey_credentials" USING btree ("user_id","is_active");
CREATE INDEX "passkey_credentials_credential_id_idx" ON "passkey_credentials" USING btree ("credential_id");
CREATE INDEX "totp_credentials_user_id_active_idx" ON "totp_credentials" USING btree ("user_id","is_active");
CREATE INDEX "oidc_access_tokens_expires_idx" ON "oidc_access_tokens" USING btree ("expires_at");
CREATE INDEX "oidc_access_tokens_grant_id_idx" ON "oidc_access_tokens" USING btree ("grant_id");
CREATE INDEX "oidc_auth_codes_expires_idx" ON "oidc_authorization_codes" USING btree ("expires_at");
CREATE INDEX "oidc_auth_codes_grant_id_idx" ON "oidc_authorization_codes" USING btree ("grant_id");
CREATE INDEX "oidc_backchannel_auth_requests_expires_idx" ON "oidc_backchannel_auth_requests" USING btree ("expires_at");
CREATE INDEX "oidc_client_credentials_expires_idx" ON "oidc_client_credentials" USING btree ("expires_at");
CREATE INDEX "oidc_device_codes_expires_idx" ON "oidc_device_codes" USING btree ("expires_at");
CREATE INDEX "oidc_device_codes_user_code_idx" ON "oidc_device_codes" USING btree ("user_code");
CREATE INDEX "oidc_device_codes_grant_id_idx" ON "oidc_device_codes" USING btree ("grant_id");
CREATE INDEX "oidc_grants_expires_idx" ON "oidc_grants" USING btree ("expires_at");
CREATE INDEX "oidc_interactions_expires_idx" ON "oidc_interactions" USING btree ("expires_at");
CREATE INDEX "oidc_pushed_auth_requests_expires_idx" ON "oidc_pushed_authorization_requests" USING btree ("expires_at");
CREATE INDEX "oidc_refresh_tokens_expires_idx" ON "oidc_refresh_tokens" USING btree ("expires_at");
CREATE INDEX "oidc_refresh_tokens_grant_id_idx" ON "oidc_refresh_tokens" USING btree ("grant_id");
CREATE INDEX "oidc_replay_detection_expires_idx" ON "oidc_replay_detection" USING btree ("expires_at");
CREATE INDEX "oidc_sessions_expires_idx" ON "oidc_sessions" USING btree ("expires_at");
CREATE INDEX "oidc_sessions_grant_id_idx" ON "oidc_sessions" USING btree ("grant_id");
CREATE INDEX "missions_status_idx" ON "missions" USING btree ("status");
CREATE INDEX "missions_active_intake_idx" ON "missions" USING btree ("is_active_intake");
CREATE INDEX "missions_created_at_idx" ON "missions" USING btree ("created_at");
CREATE INDEX "mission_attachments_mission_id_idx" ON "mission_attachments" USING btree ("mission_id");
CREATE INDEX "mission_attachments_uploaded_by_idx" ON "mission_attachments" USING btree ("uploaded_by");
CREATE INDEX "mission_attachments_upload_type_idx" ON "mission_attachments" USING btree ("upload_type");
CREATE INDEX "mission_requests_user_id_idx" ON "mission_requests" USING btree ("user_id");
CREATE INDEX "mission_requests_mission_id_idx" ON "mission_requests" USING btree ("mission_id");
CREATE INDEX "mission_requests_status_idx" ON "mission_requests" USING btree ("status");
CREATE INDEX "mission_requests_user_mission_status_idx" ON "mission_requests" USING btree ("user_id","mission_id","status");
CREATE INDEX "ctc_patient_id_idx" ON "care_team_conflicts" USING btree ("patient_id");
CREATE INDEX "ctc_status_idx" ON "care_team_conflicts" USING btree ("status");
CREATE INDEX "ctc_created_at_idx" ON "care_team_conflicts" USING btree ("created_at");
CREATE INDEX "pct_patient_id_idx" ON "patient_care_team" USING btree ("patient_id");
CREATE INDEX "pct_user_id_idx" ON "patient_care_team" USING btree ("user_id");
CREATE INDEX "pct_is_lead_idx" ON "patient_care_team" USING btree ("patient_id","is_lead");
CREATE INDEX "pct_removed_at_idx" ON "patient_care_team" USING btree ("removed_at");
CREATE INDEX "patient_drafts_created_by_id_idx" ON "patient_drafts" USING btree ("created_by_id");
CREATE INDEX "patient_drafts_updated_at_idx" ON "patient_drafts" USING btree ("updated_at");
CREATE INDEX "uf_user_id_idx" ON "user_feedback" USING btree ("user_id");
CREATE INDEX "uf_status_idx" ON "user_feedback" USING btree ("status");
CREATE INDEX "uf_category_idx" ON "user_feedback" USING btree ("category");
CREATE INDEX "uf_created_at_idx" ON "user_feedback" USING btree ("created_at");
CREATE INDEX "pending_link_attempts_code_idx" ON "pending_link_attempts" USING btree ("code");
CREATE INDEX "pending_link_attempts_status_idx" ON "pending_link_attempts" USING btree ("status");
CREATE INDEX "pending_link_attempts_telegram_chat_id_idx" ON "pending_link_attempts" USING btree ("telegram_chat_id");
CREATE INDEX "telegram_link_codes_code_idx" ON "telegram_link_codes" USING btree ("code");
CREATE INDEX "telegram_link_codes_patient_id_idx" ON "telegram_link_codes" USING btree ("patient_id");
CREATE INDEX "telegram_link_codes_is_used_idx" ON "telegram_link_codes" USING btree ("is_used");
CREATE INDEX "telegram_link_codes_created_by_id_idx" ON "telegram_link_codes" USING btree ("created_by_id");
CREATE INDEX "video_call_sessions_invite_token_idx" ON "video_call_sessions" USING btree ("invite_token");
CREATE INDEX "video_call_sessions_patient_id_idx" ON "video_call_sessions" USING btree ("patient_id");
CREATE INDEX "video_call_sessions_room_name_idx" ON "video_call_sessions" USING btree ("room_name");
CREATE INDEX "video_call_sessions_status_idx" ON "video_call_sessions" USING btree ("status");
CREATE INDEX "video_call_sessions_started_by_id_idx" ON "video_call_sessions" USING btree ("started_by_id");
CREATE INDEX "br_backup_id_idx" ON "backup_restores" USING btree ("backup_id");
CREATE INDEX "br_restored_by_idx" ON "backup_restores" USING btree ("restored_by");
CREATE INDEX "br_status_idx" ON "backup_restores" USING btree ("status");
CREATE INDEX "bk_created_by_idx" ON "backups" USING btree ("created_by");
CREATE INDEX "bk_status_idx" ON "backups" USING btree ("status");
CREATE INDEX "bk_created_at_idx" ON "backups" USING btree ("created_at");
CREATE INDEX "call_participants_user_invited_idx" ON "call_participants" USING btree ("user_id","invited_at");
CREATE INDEX "call_participants_call_idx" ON "call_participants" USING btree ("call_id");
CREATE INDEX "calls_initiator_idx" ON "calls" USING btree ("initiator_id");
CREATE INDEX "calls_started_at_idx" ON "calls" USING btree ("started_at");
CREATE INDEX "calls_status_started_idx" ON "calls" USING btree ("status","started_at");
