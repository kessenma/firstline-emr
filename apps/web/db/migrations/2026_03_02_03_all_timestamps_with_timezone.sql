-- Migrate ALL remaining timestamp columns from `timestamp` to `timestamptz`.
-- Existing values are treated as UTC so they are reinterpreted correctly.
-- (notes + note_edits were already migrated in 2026_03_02_02)

-- ============================================================
-- HIGH PRIORITY — Patient-facing UI tables
-- ============================================================

ALTER TABLE patients
  ALTER COLUMN dob               TYPE timestamptz USING dob               AT TIME ZONE 'UTC',
  ALTER COLUMN scheduled_vid_chat TYPE timestamptz USING scheduled_vid_chat AT TIME ZONE 'UTC',
  ALTER COLUMN surgery_date       TYPE timestamptz USING surgery_date       AT TIME ZONE 'UTC',
  ALTER COLUMN created_at         TYPE timestamptz USING created_at         AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at         TYPE timestamptz USING updated_at         AT TIME ZONE 'UTC';

ALTER TABLE rx_orders
  ALTER COLUMN prescribed_date TYPE timestamptz USING prescribed_date AT TIME ZONE 'UTC',
  ALTER COLUMN valid_till      TYPE timestamptz USING valid_till      AT TIME ZONE 'UTC',
  ALTER COLUMN created_at      TYPE timestamptz USING created_at      AT TIME ZONE 'UTC';

ALTER TABLE med_orders
  ALTER COLUMN order_date  TYPE timestamptz USING order_date  AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC';

ALTER TABLE patient_media
  ALTER COLUMN uploaded_at TYPE timestamptz USING uploaded_at AT TIME ZONE 'UTC';

ALTER TABLE visits
  ALTER COLUMN visit_date  TYPE timestamptz USING visit_date  AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC';

-- ============================================================
-- MEDIUM PRIORITY — Messaging & notifications
-- ============================================================

ALTER TABLE internal_message_threads
  ALTER COLUMN last_activity TYPE timestamptz USING last_activity AT TIME ZONE 'UTC',
  ALTER COLUMN created_at    TYPE timestamptz USING created_at    AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at    TYPE timestamptz USING updated_at    AT TIME ZONE 'UTC';

ALTER TABLE internal_message_thread_participants
  ALTER COLUMN last_read_at TYPE timestamptz USING last_read_at AT TIME ZONE 'UTC',
  ALTER COLUMN joined_at    TYPE timestamptz USING joined_at    AT TIME ZONE 'UTC',
  ALTER COLUMN left_at      TYPE timestamptz USING left_at      AT TIME ZONE 'UTC';

ALTER TABLE internal_messages
  ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_at  TYPE timestamptz USING deleted_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC',
  ALTER COLUMN read_at     TYPE timestamptz USING read_at     AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC';

ALTER TABLE telegram_threads
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE telegram_thread_participants
  ALTER COLUMN joined_at TYPE timestamptz USING joined_at AT TIME ZONE 'UTC';

ALTER TABLE telegram_messages
  ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_at  TYPE timestamptz USING deleted_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC';

ALTER TABLE patient_follow_ups
  ALTER COLUMN follow_up_sent_at TYPE timestamptz USING follow_up_sent_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at        TYPE timestamptz USING created_at        AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at        TYPE timestamptz USING updated_at        AT TIME ZONE 'UTC';

ALTER TABLE notifications
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE user_notifications
  ALTER COLUMN read_at      TYPE timestamptz USING read_at      AT TIME ZONE 'UTC',
  ALTER COLUMN dismissed_at TYPE timestamptz USING dismissed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC';

ALTER TABLE notification_recipients
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- ============================================================
-- LOWER PRIORITY — Admin / system tables
-- ============================================================

ALTER TABLE users
  ALTER COLUMN dob                      TYPE timestamptz USING dob                      AT TIME ZONE 'UTC',
  ALTER COLUMN approval_date            TYPE timestamptz USING approval_date            AT TIME ZONE 'UTC',
  ALTER COLUMN denial_date              TYPE timestamptz USING denial_date              AT TIME ZONE 'UTC',
  ALTER COLUMN temp_code_expiry         TYPE timestamptz USING temp_code_expiry         AT TIME ZONE 'UTC',
  ALTER COLUMN admin_reset_link_expiry  TYPE timestamptz USING admin_reset_link_expiry  AT TIME ZONE 'UTC',
  ALTER COLUMN admin_created_date       TYPE timestamptz USING admin_created_date       AT TIME ZONE 'UTC',
  ALTER COLUMN email_sent_date          TYPE timestamptz USING email_sent_date          AT TIME ZONE 'UTC',
  ALTER COLUMN confirmation_token_expiry TYPE timestamptz USING confirmation_token_expiry AT TIME ZONE 'UTC',
  ALTER COLUMN verification_code_expiry TYPE timestamptz USING verification_code_expiry AT TIME ZONE 'UTC',
  ALTER COLUMN token_session_expiry     TYPE timestamptz USING token_session_expiry     AT TIME ZONE 'UTC',
  ALTER COLUMN last_login               TYPE timestamptz USING last_login               AT TIME ZONE 'UTC',
  ALTER COLUMN created_at               TYPE timestamptz USING created_at               AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at               TYPE timestamptz USING updated_at               AT TIME ZONE 'UTC';

ALTER TABLE security_questions
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE user_follow_up_emails
  ALTER COLUMN sent_at TYPE timestamptz USING sent_at AT TIME ZONE 'UTC';

ALTER TABLE missions
  ALTER COLUMN start_date  TYPE timestamptz USING start_date  AT TIME ZONE 'UTC',
  ALTER COLUMN end_date    TYPE timestamptz USING end_date    AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC';

ALTER TABLE mission_attachments
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE admins
  ALTER COLUMN admin_start_date TYPE timestamptz USING admin_start_date AT TIME ZONE 'UTC',
  ALTER COLUMN created_at       TYPE timestamptz USING created_at       AT TIME ZONE 'UTC';

ALTER TABLE patient_care_team
  ALTER COLUMN assigned_at TYPE timestamptz USING assigned_at AT TIME ZONE 'UTC',
  ALTER COLUMN removed_at  TYPE timestamptz USING removed_at  AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC';

ALTER TABLE care_team_conflicts
  ALTER COLUMN resolved_at TYPE timestamptz USING resolved_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC';

ALTER TABLE user_profile_logs
  ALTER COLUMN changed_at TYPE timestamptz USING changed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE user_feedback
  ALTER COLUMN reviewed_at TYPE timestamptz USING reviewed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC';

ALTER TABLE patient_intakes
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE telegram_intake_tokens
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at   TYPE timestamptz USING expires_at   AT TIME ZONE 'UTC',
  ALTER COLUMN submitted_at TYPE timestamptz USING submitted_at AT TIME ZONE 'UTC';

ALTER TABLE user_settings
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE push_devices
  ALTER COLUMN last_seen_at TYPE timestamptz USING last_seen_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at   TYPE timestamptz USING updated_at   AT TIME ZONE 'UTC';

ALTER TABLE user_messages
  ALTER COLUMN last_read_at TYPE timestamptz USING last_read_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at   TYPE timestamptz USING updated_at   AT TIME ZONE 'UTC';

ALTER TABLE mission_requests
  ALTER COLUMN reviewed_at TYPE timestamptz USING reviewed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC';

ALTER TABLE user_profile_update_requests
  ALTER COLUMN reviewed_at  TYPE timestamptz USING reviewed_at  AT TIME ZONE 'UTC',
  ALTER COLUMN requested_at TYPE timestamptz USING requested_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at   TYPE timestamptz USING updated_at   AT TIME ZONE 'UTC';

ALTER TABLE passkey_credentials
  ALTER COLUMN last_used_at TYPE timestamptz USING last_used_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at   TYPE timestamptz USING updated_at   AT TIME ZONE 'UTC';

ALTER TABLE admin_notifications
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- ============================================================
-- OIDC tables
-- ============================================================

ALTER TABLE oidc_authorization_codes
  ALTER COLUMN expires_at  TYPE timestamptz USING expires_at  AT TIME ZONE 'UTC',
  ALTER COLUMN consumed_at TYPE timestamptz USING consumed_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_access_tokens
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_refresh_tokens
  ALTER COLUMN expires_at  TYPE timestamptz USING expires_at  AT TIME ZONE 'UTC',
  ALTER COLUMN consumed_at TYPE timestamptz USING consumed_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_sessions
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_interactions
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_grants
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_device_codes
  ALTER COLUMN expires_at  TYPE timestamptz USING expires_at  AT TIME ZONE 'UTC',
  ALTER COLUMN consumed_at TYPE timestamptz USING consumed_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_client_credentials
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_pushed_authorization_requests
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_replay_detection
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE oidc_backchannel_auth_requests
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- ============================================================
-- Medical codes tables
-- ============================================================

ALTER TABLE icd10_codes
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE cpt_codes
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
