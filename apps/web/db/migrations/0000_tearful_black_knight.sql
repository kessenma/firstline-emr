DO $$ BEGIN
 CREATE TYPE "public"."account_type" AS ENUM('Doctor', 'Triage', 'Evac');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."email_type" AS ENUM('follow-up', 'reminder');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."gender" AS ENUM('Male', 'Female');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."admin_notification_type" AS ENUM('announcement', 'alert', 'reminder');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."baseline_ambu" AS ENUM('Not Selected', 'Independent', 'Boot', 'Crutches', 'Walker', 'Non-Ambulatory');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hospital" AS ENUM('Not Selected', 'PMC', 'PRCS', 'Hugo Chavez');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."patient_gender" AS ENUM('Male', 'Female');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."priority" AS ENUM('Not Selected', 'Routine', 'Moderate', 'Urgent', 'Emergency');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."rx_order_status" AS ENUM('not reviewed', 'partially filled', 'declined', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."status" AS ENUM('Not Selected', 'Not Started', 'Triaged', 'In-Progress', 'Completed', 'Archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."note_type" AS ENUM('procedure', 'subjective', 'blank', 'triage');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."covid_test" AS ENUM('pos', 'neg');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('message', 'alert');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."approval_status" AS ENUM('Pending', 'Approved', 'Rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."audit_action" AS ENUM('created', 'updated', 'draft_saved', 'completed', 'approved', 'rejected', 'field_changed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."cogat_status" AS ENUM('Not Submitted', 'Pending', 'Approved', 'Rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."evacuation_urgency" AS ENUM('Routine', 'Moderate', 'Urgent', 'Critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."gaza_referral_type" AS ENUM('Gaza Referral', 'Egypt Patient');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hospital_acceptance_status" AS ENUM('Not Submitted', 'Pending', 'Accepted', 'Rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hosting_family_status" AS ENUM('Not Assigned', 'Pending', 'Confirmed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ks_classification" AS ENUM('1', '2', '3');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mrsa_status" AS ENUM('Positive', 'Negative', 'Not Tested');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."passport_status" AS ENUM('None', 'Valid', 'Expired', 'In Process');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."treatment_status" AS ENUM('Not Started', 'In Progress', 'Completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."visa_status" AS ENUM('Not Applied', 'In Process', 'Approved', 'Rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'video', 'file', 'reply', 'forward', 'audio');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."thread_status" AS ENUM('active', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."internal_message_type" AS ENUM('text', 'image', 'video', 'file', 'reply', 'forward', 'audio');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."internal_thread_status" AS ENUM('active', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."intake_mode" AS ENUM('default', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question" varchar(500) NOT NULL,
	"answer" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_follow_up_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_by_admin_id" uuid,
	"sent_by_admin_email" varchar(255),
	"sent_by_admin_name" varchar(255),
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"email_type" "email_type" DEFAULT 'follow-up' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"password" varchar(255),
	"doctor_specialty" text[],
	"languages" text[],
	"countries" text[],
	"gender" "gender",
	"dob" timestamp,
	"image" text,
	"medical_license" text,
	"medical_licenses" json,
	"authorized" boolean,
	"approval_date" timestamp,
	"denial_date" timestamp,
	"google_id" varchar(255),
	"google_email" varchar(255),
	"google_image" text,
	"temp_password_reset_code" varchar(255),
	"temp_code_expiry" timestamp,
	"admin_reset_password_link" text,
	"admin_reset_link_expiry" timestamp,
	"password_reset_count" integer DEFAULT 0,
	"is_admin_created" boolean DEFAULT false,
	"account_confirmed" boolean DEFAULT true,
	"admin_created_by" json,
	"admin_created_date" timestamp,
	"email_sent_date" timestamp,
	"confirmation_token" varchar(255),
	"confirmation_token_expiry" timestamp,
	"verification_code" varchar(10),
	"verification_code_expiry" timestamp,
	"token_session_expiry" timestamp,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"admin_start_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid,
	"message" text NOT NULL,
	"type" "admin_notification_type" DEFAULT 'announcement' NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" json,
	"email" varchar(255),
	"telegram_chat_id" varchar(255),
	"telegram_access_hash" varchar(255),
	"bmi" varchar(50),
	"dob" timestamp,
	"gender" "patient_gender",
	"country" varchar(255),
	"city" varchar(255),
	"language" varchar(100),
	"occupation" varchar(255),
	"chief_complaint" text,
	"diagnosis" text,
	"diagnosis_cat" varchar(255),
	"icd10" varchar(255),
	"hospital" "hospital" DEFAULT 'Not Selected',
	"priority" "priority" DEFAULT 'Not Selected',
	"specialties" text[],
	"status" "status" DEFAULT 'Not Started',
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
	"doctor" json,
	"is_patient" boolean,
	"patient_relation" varchar(255),
	"gender_preference" varchar(50),
	"previously_registered" varchar(50),
	"scheduled_vid_chat" timestamp,
	"surgery_date" timestamp,
	"dashboard_notes" text,
	"has_submitted_info" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rx_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"rx_order_id" varchar(255) NOT NULL,
	"doctor_specialty" varchar(255),
	"prescribing_dr" varchar(255) NOT NULL,
	"dr_email" varchar(255) NOT NULL,
	"dr_id" varchar(255) NOT NULL,
	"prescribed_date" timestamp NOT NULL,
	"valid_till" timestamp NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"note_type" "note_type" NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"author_name" varchar(255),
	"author_id" uuid,
	"content" json,
	"draft" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_date" timestamp NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oid" varchar(255),
	"doctor_specialty" varchar(255) NOT NULL,
	"prescribing_dr" varchar(255) NOT NULL,
	"dr_email" varchar(255) NOT NULL,
	"dr_id" uuid NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"patient_name" varchar(255) NOT NULL,
	"patient_phone" varchar(50) NOT NULL,
	"patient_city" varchar(255) NOT NULL,
	"patient_country" varchar(255) NOT NULL,
	"patient_id" uuid NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"medications" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"doctor_specialty" text[],
	"countries" text[],
	"languages" text[],
	"last_view" varchar(500) DEFAULT '/',
	"last_view_saved_at" varchar(255),
	"last_view_session_id" varchar(255),
	"use_infinite_scroll" boolean DEFAULT false,
	"save_last_page" boolean DEFAULT false,
	"theme_mode" varchar(20) DEFAULT 'system',
	"admin_email_notifications" boolean DEFAULT true,
	"specialty_email_notifications" boolean DEFAULT true,
	"triage_email_notifications" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'message' NOT NULL,
	"subject" varchar(500),
	"patient_id" uuid,
	"redirect_to" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_evac_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"med_evac_patient_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"action_description" text,
	"user_id" uuid,
	"user_name" varchar(255),
	"user_email" varchar(255),
	"changed_fields" json,
	"snapshot" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_evac_patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"stabilization_destination" varchar(255),
	"final_destination" varchar(255),
	"arrival_date" timestamp,
	"usa_arrival_date" timestamp,
	"location" varchar(255),
	"hospital_assigned" varchar(255),
	"gaza_treating_hospital" varchar(255),
	"usa_destination_hospital" varchar(255),
	"hospital_name" varchar(255),
	"hospital_acceptance_status" "hospital_acceptance_status" DEFAULT 'Not Submitted',
	"hospital_acceptance_letter" text,
	"hospital_updates_requests" text,
	"us_hospital_submitted" boolean DEFAULT false,
	"treating_physician" varchar(255),
	"responsible_doctor" varchar(255),
	"volunteer_1" varchar(255),
	"volunteer_2" varchar(255),
	"team_lead" varchar(255),
	"patient_file" varchar(255),
	"group_number" varchar(100),
	"gaza_referral_or_egypt_patient" "gaza_referral_type",
	"injury_classification" varchar(255),
	"date_of_injury" timestamp,
	"urgency" "evacuation_urgency" DEFAULT 'Routine',
	"time_critical" boolean DEFAULT false,
	"ks_classification" "ks_classification",
	"medical_record" text,
	"medical_documents" text[],
	"treatment_progress" text,
	"expected_completion_date" timestamp,
	"treatment_status" "treatment_status" DEFAULT 'Not Started',
	"medical_notes_details" text,
	"fit_to_fly" boolean,
	"mrsa_status" "mrsa_status",
	"passport_status" "passport_status",
	"passport_updates_requests" text,
	"valid_passport" boolean,
	"us_visa_status" "visa_status",
	"us_visa_updates_requests" text,
	"cogat_status" "cogat_status",
	"cogat_approval_rejection" text,
	"cogat_details" text,
	"moh_approved" boolean,
	"medical_approval" "approval_status" DEFAULT 'Pending',
	"medical_approval_responsible" varchar(255),
	"logistical_approval" "approval_status" DEFAULT 'Pending',
	"jordan_responsible" varchar(255),
	"flight_booked" boolean DEFAULT false,
	"flight_details" text,
	"hosting_family_status" "hosting_family_status" DEFAULT 'Not Assigned',
	"hosting_family_updates_requests" text,
	"companions" json,
	"number_of_companions" integer DEFAULT 0,
	"turkey" text,
	"south_africa" text,
	"belgium" text,
	"jordan" text,
	"other_countries_submission" text,
	"other_countries_responsible" varchar(255),
	"general_comments" text,
	"action_items" text,
	"is_draft" boolean DEFAULT true,
	"draft_saved_at" timestamp,
	"completed_at" timestamp,
	"form_completed" boolean DEFAULT false,
	"created_by" uuid,
	"created_by_name" varchar(255),
	"created_by_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_by_name" varchar(255),
	"updated_by_email" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"medical_approved_by" uuid,
	"medical_approved_by_name" varchar(255),
	"medical_approved_at" timestamp,
	"logistical_approved_by" uuid,
	"logistical_approved_by_name" varchar(255),
	"logistical_approved_at" timestamp,
	CONSTRAINT "med_evac_patients_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"telegram_thread_id" uuid NOT NULL,
	"message" text DEFAULT '',
	"follow_up_sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_thread_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"patient_id" uuid,
	"participants" text[],
	"unread_count" integer DEFAULT 0 NOT NULL,
	"status" "thread_status" DEFAULT 'active' NOT NULL,
	"messages" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_threads_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internal_message_thread_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"last_read_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internal_message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) DEFAULT '',
	"participants" text[] NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"status" "internal_thread_status" DEFAULT 'active' NOT NULL,
	"messages" json DEFAULT '[]'::json,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"is_group_chat" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_message" text DEFAULT 'Welcome! Please complete your registration:',
	"confirmation_message" text DEFAULT 'Thank you for joining! We''ll guide you through the next steps.',
	"updated_by" uuid,
	"mode" "intake_mode" DEFAULT 'default' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_intake_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"patient_id" uuid NOT NULL,
	"telegram_chat_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"submitted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp,
	CONSTRAINT "telegram_intake_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profile_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"changes" json NOT NULL,
	"is_admin_action" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_messages_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cpt_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "icd10_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_questions" ADD CONSTRAINT "security_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follow_up_emails" ADD CONSTRAINT "user_follow_up_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follow_up_emails" ADD CONSTRAINT "user_follow_up_emails_sent_by_admin_id_users_id_fk" FOREIGN KEY ("sent_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rx_orders" ADD CONSTRAINT "rx_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_orders" ADD CONSTRAINT "med_orders_dr_id_users_id_fk" FOREIGN KEY ("dr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_orders" ADD CONSTRAINT "med_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_audit_log" ADD CONSTRAINT "med_evac_audit_log_med_evac_patient_id_med_evac_patients_id_fk" FOREIGN KEY ("med_evac_patient_id") REFERENCES "public"."med_evac_patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_audit_log" ADD CONSTRAINT "med_evac_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_patients" ADD CONSTRAINT "med_evac_patients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_patients" ADD CONSTRAINT "med_evac_patients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_patients" ADD CONSTRAINT "med_evac_patients_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_patients" ADD CONSTRAINT "med_evac_patients_medical_approved_by_users_id_fk" FOREIGN KEY ("medical_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "med_evac_patients" ADD CONSTRAINT "med_evac_patients_logistical_approved_by_users_id_fk" FOREIGN KEY ("logistical_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_telegram_thread_id_telegram_threads_id_fk" FOREIGN KEY ("telegram_thread_id") REFERENCES "public"."telegram_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_thread_participants" ADD CONSTRAINT "telegram_thread_participants_thread_id_telegram_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."telegram_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_thread_participants" ADD CONSTRAINT "telegram_thread_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_threads" ADD CONSTRAINT "telegram_threads_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "internal_message_thread_participants" ADD CONSTRAINT "internal_message_thread_participants_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "internal_message_thread_participants" ADD CONSTRAINT "internal_message_thread_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "internal_message_threads" ADD CONSTRAINT "internal_message_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_intakes" ADD CONSTRAINT "patient_intakes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_intake_tokens" ADD CONSTRAINT "telegram_intake_tokens_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profile_logs" ADD CONSTRAINT "user_profile_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profile_logs" ADD CONSTRAINT "user_profile_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_questions_user_id_idx" ON "security_questions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follow_up_emails_user_id_idx" ON "user_follow_up_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follow_up_emails_sent_by_admin_id_idx" ON "user_follow_up_emails" USING btree ("sent_by_admin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_account_type_idx" ON "users" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_authorized_idx" ON "users" USING btree ("authorized");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_authorized_approval_date_idx" ON "users" USING btree ("authorized","approval_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admins_user_id_idx" ON "admins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admins_email_idx" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notifications_sender_id_idx" ON "admin_notifications" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notifications_type_idx" ON "admin_notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notifications_created_at_idx" ON "admin_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notifications_email_sent_idx" ON "admin_notifications" USING btree ("email_sent");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_photos_patient_id_idx" ON "patient_photos" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_email_idx" ON "patients" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_status_idx" ON "patients" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_coordinator_id_idx" ON "patients" USING btree ("coordinator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_telegram_chat_id_idx" ON "patients" USING btree ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_status_coordinator_idx" ON "patients" USING btree ("status","coordinator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_created_at_idx" ON "patients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_status_created_at_idx" ON "patients" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rx_orders_patient_id_idx" ON "rx_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rx_orders_rx_order_id_idx" ON "rx_orders" USING btree ("rx_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_patient_id_idx" ON "notes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_email_idx" ON "notes" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_note_type_idx" ON "notes" USING btree ("note_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_author_id_idx" ON "notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_draft_idx" ON "notes" USING btree ("draft");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_patient_id_idx" ON "visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_visit_date_idx" ON "visits" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_orders_patient_id_idx" ON "med_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_orders_dr_id_idx" ON "med_orders" USING btree ("dr_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_orders_validated_idx" ON "med_orders" USING btree ("validated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_orders_order_date_idx" ON "med_orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_settings_email_idx" ON "user_settings" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipients_notification_id_idx" ON "notification_recipients" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipients_user_id_idx" ON "notification_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_source_id_idx" ON "notifications" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_patient_id_idx" ON "notifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notifications_user_id_idx" ON "user_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notifications_notification_id_idx" ON "user_notifications" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notifications_read_idx" ON "user_notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notifications_dismissed_idx" ON "user_notifications" USING btree ("dismissed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notifications_user_read_idx" ON "user_notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_audit_log_patient_id_idx" ON "med_evac_audit_log" USING btree ("med_evac_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_audit_log_user_id_idx" ON "med_evac_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_audit_log_action_idx" ON "med_evac_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_audit_log_created_at_idx" ON "med_evac_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_patient_id_idx" ON "med_evac_patients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_urgency_idx" ON "med_evac_patients" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_treatment_status_idx" ON "med_evac_patients" USING btree ("treatment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_hospital_acceptance_idx" ON "med_evac_patients" USING btree ("hospital_acceptance_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_is_draft_idx" ON "med_evac_patients" USING btree ("is_draft");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_form_completed_idx" ON "med_evac_patients" USING btree ("form_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_created_by_idx" ON "med_evac_patients" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_evac_patients_updated_by_idx" ON "med_evac_patients" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_follow_ups_chat_id_idx" ON "patient_follow_ups" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_follow_ups_telegram_thread_id_idx" ON "patient_follow_ups" USING btree ("telegram_thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_follow_ups_follow_up_sent_at_idx" ON "patient_follow_ups" USING btree ("follow_up_sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_thread_participants_thread_id_idx" ON "telegram_thread_participants" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_thread_participants_user_id_idx" ON "telegram_thread_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_thread_participants_thread_user_idx" ON "telegram_thread_participants" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_threads_chat_id_idx" ON "telegram_threads" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_threads_patient_id_idx" ON "telegram_threads" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_threads_status_idx" ON "telegram_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_threads_participants_idx" ON "telegram_threads" USING btree ("participants");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_thread_participants_thread_id_idx" ON "internal_message_thread_participants" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_thread_participants_user_id_idx" ON "internal_message_thread_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_thread_participants_thread_user_idx" ON "internal_message_thread_participants" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_threads_participants_idx" ON "internal_message_threads" USING btree ("participants");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_threads_status_idx" ON "internal_message_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_threads_last_activity_idx" ON "internal_message_threads" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_message_threads_created_by_idx" ON "internal_message_threads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_intakes_updated_by_idx" ON "patient_intakes" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_intakes_mode_idx" ON "patient_intakes" USING btree ("mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_intake_tokens_token_idx" ON "telegram_intake_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_intake_tokens_patient_id_idx" ON "telegram_intake_tokens" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_intake_tokens_telegram_chat_id_idx" ON "telegram_intake_tokens" USING btree ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_intake_tokens_is_valid_idx" ON "telegram_intake_tokens" USING btree ("is_valid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_intake_tokens_submitted_idx" ON "telegram_intake_tokens" USING btree ("submitted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_intake_tokens_expires_at_idx" ON "telegram_intake_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profile_logs_user_id_idx" ON "user_profile_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profile_logs_changed_by_idx" ON "user_profile_logs" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profile_logs_changed_at_idx" ON "user_profile_logs" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profile_logs_is_admin_action_idx" ON "user_profile_logs" USING btree ("is_admin_action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profile_logs_user_changed_at_idx" ON "user_profile_logs" USING btree ("user_id","changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_messages_user_id_idx" ON "user_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_messages_unread_count_idx" ON "user_messages" USING btree ("unread_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cpt_codes_code_idx" ON "cpt_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cpt_codes_description_idx" ON "cpt_codes" USING btree ("description");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "icd10_codes_code_idx" ON "icd10_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "icd10_codes_description_idx" ON "icd10_codes" USING btree ("description");