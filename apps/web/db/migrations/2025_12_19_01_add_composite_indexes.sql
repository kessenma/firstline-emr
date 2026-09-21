-- Migration: Add composite indexes for patient dashboard optimization
-- Created: 2025-12-19
-- Phase 1: Database Optimization

-- Add composite index for status + coordinator_id queries (Evac users)
CREATE INDEX IF NOT EXISTS "patients_status_coordinator_idx"
ON "patients" USING btree ("status", "coordinator_id");

-- Add index on created_at for efficient sorting
CREATE INDEX IF NOT EXISTS "patients_created_at_idx"
ON "patients" USING btree ("created_at");

-- Add composite index for status + created_at (dashboard queries)
CREATE INDEX IF NOT EXISTS "patients_status_created_at_idx"
ON "patients" USING btree ("status", "created_at");
