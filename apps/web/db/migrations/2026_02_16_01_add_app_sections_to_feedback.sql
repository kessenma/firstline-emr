-- Add app_sections column to user_feedback table
-- Stores which parts of the app the feedback relates to (multi-select)
ALTER TABLE "user_feedback" ADD COLUMN IF NOT EXISTS "app_sections" json DEFAULT '[]'::json;
