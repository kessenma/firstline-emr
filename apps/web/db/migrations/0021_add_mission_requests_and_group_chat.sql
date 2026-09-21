-- Migration: Add mission_requests table and group_chat_thread_id to missions
-- Date: 2026-02-14

-- Create mission_requests table
CREATE TABLE IF NOT EXISTS "mission_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mission_id" uuid NOT NULL REFERENCES "missions"("id") ON DELETE CASCADE,
  "status" "request_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "review_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for mission_requests
CREATE INDEX IF NOT EXISTS "mission_requests_user_id_idx" ON "mission_requests" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "mission_requests_mission_id_idx" ON "mission_requests" USING btree ("mission_id");
CREATE INDEX IF NOT EXISTS "mission_requests_status_idx" ON "mission_requests" USING btree ("status");
CREATE INDEX IF NOT EXISTS "mission_requests_user_mission_status_idx" ON "mission_requests" USING btree ("user_id", "mission_id", "status");

-- Add group_chat_thread_id column to missions table
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "group_chat_thread_id" uuid REFERENCES "internal_message_threads"("id");
