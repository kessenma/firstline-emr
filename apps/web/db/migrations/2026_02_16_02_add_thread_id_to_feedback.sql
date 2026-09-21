-- Add thread_id column to user_feedback table
-- Links feedback to an internal message thread for admin-user follow-up conversations
ALTER TABLE "user_feedback" ADD COLUMN IF NOT EXISTS "thread_id" uuid REFERENCES "internal_message_threads"("id");
