-- Migration: Backfill patients.care_team JSON from patient_care_team table
-- Purpose: Existing patients have stale care_team values ({}, single objects, or null)
--          from before the normalized patient_care_team table was introduced.
--          This syncs the denormalized JSON column to match the source of truth.

-- Step 1: Reset all invalid care_team values to empty array
-- Covers: null, {} (empty object), single objects, and any non-array values
-- Note: care_team is a json column (not jsonb), so use json_typeof and cast accordingly
UPDATE patients
SET care_team = '[]'::json,
    updated_at = now()
WHERE care_team IS NULL
   OR json_typeof(care_team) != 'array';

-- Step 2: Backfill care_team from patient_care_team for patients with active members
-- This builds the CareTeamMemberJSON[] format expected by the frontend
WITH care_team_json AS (
  SELECT
    pct.patient_id,
    json_agg(
      json_build_object(
        'userId', pct.user_id,
        'firstName', COALESCE(u.first_name, ''),
        'lastName', COALESCE(u.last_name, ''),
        'email', COALESCE(u.email, ''),
        'role', pct.role::text,
        'isLead', pct.is_lead
      )
    ) AS care_team_array
  FROM patient_care_team pct
  JOIN users u ON pct.user_id = u.id
  WHERE pct.removed_at IS NULL
  GROUP BY pct.patient_id
)
UPDATE patients p
SET care_team = ctj.care_team_array,
    updated_at = now()
FROM care_team_json ctj
WHERE p.id = ctj.patient_id;
