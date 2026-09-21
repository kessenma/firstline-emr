-- PowerSync Custom Functions for User Context
-- These functions extract user information from JWT tokens for use in sync rules

-- Create publication for PowerSync if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
        CREATE PUBLICATION powersync FOR ALL TABLES;
    END IF;
END
$$;

-- Extract user ID from JWT token
CREATE OR REPLACE FUNCTION token_user_id()
RETURNS UUID AS $$
BEGIN
  -- PowerSync automatically provides token claims in context
  -- The 'sub' (subject) claim contains the user ID
  RETURN NULLIF(current_setting('powersync.token_parameters', true)::json->>'sub', '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Extract user role from JWT token
CREATE OR REPLACE FUNCTION token_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Extract role from token claims
  RETURN NULLIF(current_setting('powersync.token_parameters', true)::json->>'role', '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Extract organization ID from JWT token
CREATE OR REPLACE FUNCTION token_org_id()
RETURNS UUID AS $$
BEGIN
  -- Extract organization ID from token claims
  RETURN NULLIF(current_setting('powersync.token_parameters', true)::json->>'org_id', '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION token_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := token_user_role();
  RETURN user_role = required_role OR user_role = 'Admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get user email from token
CREATE OR REPLACE FUNCTION token_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('powersync.token_parameters', true)::json->>'email', '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments for documentation
COMMENT ON FUNCTION token_user_id() IS 'Extracts the user ID (sub claim) from the JWT token';
COMMENT ON FUNCTION token_user_role() IS 'Extracts the user role from the JWT token';
COMMENT ON FUNCTION token_org_id() IS 'Extracts the organization ID from the JWT token';
COMMENT ON FUNCTION token_has_role(TEXT) IS 'Checks if the user has a specific role or is an Admin';
COMMENT ON FUNCTION token_user_email() IS 'Extracts the user email from the JWT token';

-- VIEW: user_accessible_patients
-- Helper view to resolve lead surgeon + triage user IDs for filtering
CREATE OR REPLACE VIEW user_accessible_patients AS
SELECT
  p.*,
  (SELECT elem->>'userId'
   FROM jsonb_array_elements(COALESCE(p.care_team, '[]')::jsonb) AS elem
   WHERE elem->>'isLead' = 'true' AND elem->>'role' = 'surgeon'
   LIMIT 1
  ) AS doctor_id,
  triage.id AS triaged_by_id
FROM patients p
LEFT JOIN users triage ON p.triaged_by->>'email' = triage.email;

-- VIEW: user_accessible_notes
-- Helper view to join notes with patients and resolve IDs
CREATE OR REPLACE VIEW user_accessible_notes AS
SELECT
  n.*,
  (SELECT elem->>'userId'
   FROM jsonb_array_elements(COALESCE(p.care_team, '[]')::jsonb) AS elem
   WHERE elem->>'isLead' = 'true' AND elem->>'role' = 'surgeon'
   LIMIT 1
  ) AS doctor_id,
  triage.id AS triaged_by_id,
  p.coordinator_id
FROM notes n
JOIN patients p ON n.patient_id = p.id
LEFT JOIN users triage ON p.triaged_by->>'email' = triage.email;

-- SCHEMA: powersync_views
-- Create schema and views to map table names for the client
CREATE SCHEMA IF NOT EXISTS powersync_views;

-- VIEW: powersync_views.patients
-- Maps user_accessible_patients to 'patients' table for client
CREATE OR REPLACE VIEW powersync_views.patients AS
SELECT * FROM user_accessible_patients;

-- VIEW: powersync_views.notes
-- Maps user_accessible_notes to 'notes' table for client
CREATE OR REPLACE VIEW powersync_views.notes AS
SELECT * FROM user_accessible_notes;

-- VIEW: powersync_views.care_team_patients
-- Maps patients to care team members so sync rules can filter by user_id
-- Supplements the existing doctor_id-based patient sync for backward compatibility
CREATE OR REPLACE VIEW powersync_views.care_team_patients AS
SELECT p.*, pct.user_id AS care_team_user_id
FROM patients p
INNER JOIN patient_care_team pct ON p.id = pct.patient_id
WHERE pct.removed_at IS NULL;

-- VIEW: powersync_views.user_care_team_conflicts
-- Denormalizes conflicts with care team membership so sync rules can filter by user_id
-- (sync rules cannot do JOINs in data queries directly)
--
-- MUST be selected as `... AS care_team_conflicts` in sync-rules.yaml. PowerSync
-- derives the client-side table name from the alias, falling back to the
-- unqualified source name (BaseSqlDataQuery.getOutputName / AvailableTable.sqlName).
-- Unaliased, every row here landed in a `user_care_team_conflicts` table the
-- client never declared and was silently discarded, so the in-chart conflict
-- banner never appeared. Views here are named for their purpose; the sync rule
-- supplies the client table name.
CREATE OR REPLACE VIEW powersync_views.user_care_team_conflicts AS
SELECT DISTINCT
  ctc.id,
  ctc.patient_id,
  ctc.conflicting_user_ids,
  ctc.status,
  ctc.resolved_by,
  ctc.resolved_at,
  ctc.resolution_notes,
  ctc.created_at,
  pct.user_id AS team_member_user_id
FROM care_team_conflicts ctc
INNER JOIN patient_care_team pct ON ctc.patient_id = pct.patient_id
WHERE pct.removed_at IS NULL;

-- VIEW: powersync_views.care_team_rx_orders
-- Prescription orders denormalized with care team membership, so medications
-- reach every care team member and not only admins (the 'global' bucket is
-- gated on the admins table).
--
-- Consumed as `FROM powersync_views.care_team_rx_orders AS rx_orders`. The
-- alias is required — see the note on user_care_team_conflicts above.
-- Column list must stay in step with sync-rules.yaml; patient_rx_url,
-- pharmacy_qr_url and pharmacy_qr_code are the patient-facing link and QR
-- that the share sheet sends.
--
-- THIS FILE IS THE BOOTSTRAP, AND IT DRIFTED ONCE ALREADY. The delivery
-- columns below were added by migration 2026_08_12_01 but not here, so a
-- migrated environment worked while a *fresh* one built the old view and then
-- failed the sync rule's `SELECT patient_link_sent_at …` against it. When a
-- migration changes this view, change it here in the same commit.
--
-- COLUMN ORDER IS LOAD-BEARING, and matches the migrations exactly:
-- `CREATE OR REPLACE VIEW` may only *append* to a select list — it cannot
-- insert or reorder, and rejects the statement with "cannot change name of
-- view column". So each migration's new columns land after everything before
-- them, which is why care_team_user_id sits mid-list rather than last. Sync
-- rules select by name, so the ordering costs nothing to read.
CREATE OR REPLACE VIEW powersync_views.care_team_rx_orders AS
SELECT
  rx.id,
  rx.patient_id,
  rx.rx_order_id,
  rx.doctor_specialty,
  rx.prescribing_dr,
  rx.dr_email,
  rx.dr_id,
  rx.prescribed_date,
  rx.valid_till,
  rx.city,
  rx.prescriptions,
  rx.submitted,
  rx.patient_rx_url,
  rx.pharmacy_qr_url,
  rx.pharmacy_qr_code,
  pct.user_id AS care_team_user_id,
  -- Added by 2026_08_12_01 (delivery + access state)
  rx.patient_link_sent_at,
  rx.patient_link_sent_by,
  rx.patient_link_opened_at,
  rx.patient_link_open_count,
  rx.patient_link_failed_count,
  rx.patient_link_last_failed_at,
  rx.patient_link_lock_state,
  rx.pharmacy_link_opened_at,
  -- Added by 2026_08_12_02 (cancellation, plus rx_status which was never synced)
  rx.rx_status,
  rx.cancelled_at,
  rx.cancelled_by_role,
  rx.cancelled_by_user_id,
  rx.cancellation_reason,
  rx.cancellation_reason_code
FROM rx_orders rx
INNER JOIN patient_care_team pct ON rx.patient_id = pct.patient_id
WHERE pct.removed_at IS NULL;

-- VIEW: powersync_views.care_team_med_orders
-- Requests for unavailable medications, scoped and named the same way.
CREATE OR REPLACE VIEW powersync_views.care_team_med_orders AS
SELECT
  mo.id,
  mo.patient_id,
  mo.prescribing_dr,
  mo.order_date,
  mo.medications,
  pct.user_id AS care_team_user_id
FROM med_orders mo
INNER JOIN patient_care_team pct ON mo.patient_id = pct.patient_id
WHERE pct.removed_at IS NULL;

-- VIEW: powersync_views.admin_users
-- Helper view to get admin user IDs without JOIN in parameters
CREATE OR REPLACE VIEW powersync_views.admin_users AS
SELECT user_id as admin_id
FROM admins;

-- VIEW: powersync_views.admin_users_details
-- Helper view to get admin user details with JOIN (for data queries)
CREATE OR REPLACE VIEW powersync_views.admin_users_details AS
SELECT
  a.id,
  a.user_id,
  a.created_at,
  u.first_name,
  u.last_name,
  u.email
FROM admins a
INNER JOIN users u ON a.user_id = u.id;
