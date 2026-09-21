-- Create user_feedback table for user testing feedback submissions

-- Create enums
DO $$ BEGIN
  CREATE TYPE "feedback_category" AS ENUM('feature_request', 'bug', 'question', 'admin_assistance', 'ui_improvement', 'praise', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "feedback_status" AS ENUM('open', 'in_review', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create the user_feedback table
CREATE TABLE IF NOT EXISTS "user_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category" "feedback_category" NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "attachments" json DEFAULT '[]'::json,
  "status" "feedback_status" DEFAULT 'open' NOT NULL,
  "admin_notes" text,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create indexes
CREATE INDEX IF NOT EXISTS "uf_user_id_idx" ON "user_feedback" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uf_status_idx" ON "user_feedback" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uf_category_idx" ON "user_feedback" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uf_created_at_idx" ON "user_feedback" USING btree ("created_at");
