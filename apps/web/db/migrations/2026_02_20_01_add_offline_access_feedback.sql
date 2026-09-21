-- Add 'offline_access' to feedback_category enum
ALTER TYPE feedback_category ADD VALUE IF NOT EXISTS 'offline_access';

-- Add sync_diagnostics JSON column for offline access error reports
ALTER TABLE "user_feedback" ADD COLUMN IF NOT EXISTS "sync_diagnostics" json;
