-- Migration: prescription delivery tracking + patient link access control
--
-- Purpose:
--   1. Record whether a prescription link was sent to the patient and whether
--      they ever opened it. Staff previously re-sent blind: nothing on the
--      order said it had already gone out, so patients received the same
--      script repeatedly and nobody could tell whether it had been read.
--   2. Put a 6-digit access code in front of the patient-facing page, and a
--      last-name + date-of-birth check in front of the pharmacy page. Until
--      now the only secret protecting a prescription — full name, DOB, city,
--      diagnosis, medications — was the URL itself.
--
-- THE SPLIT IS LOAD-BEARING. Delivery state and the lock *verdict* live on
-- rx_orders and sync to devices, because both charts render them. The code
-- hash and the raw attempt log live in their own tables which are deliberately
-- absent from sync-rules.yaml: a secret must never reach a device, and an
-- audit log of IPs has no business on a phone.
--
-- Additive only — no DROP, TRUNCATE or UPDATE — so this clears the deploy
-- migration gate without a manual allow.

-- ---------------------------------------------------------------------------
-- 1. Delivery + verdict columns on rx_orders (synced)
-- ---------------------------------------------------------------------------

-- Timestamps rather than booleans throughout: a timestamp answers both "has
-- it?" and "when?", which is what the chart line needs, at the same cost.
ALTER TABLE "rx_orders"
  ADD COLUMN IF NOT EXISTS "patient_link_sent_at"        timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "patient_link_sent_by"        uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "patient_link_opened_at"      timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "patient_link_open_count"     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "patient_link_failed_count"   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "patient_link_last_failed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "patient_link_lock_state"     text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS "pharmacy_link_opened_at"     timestamp with time zone;

--> statement-breakpoint
-- 'ok' | 'throttled' | 'locked'. 'throttled' is a transient cooldown from the
-- backoff ladder; 'locked' is durable and only a staff re-send clears it.
ALTER TABLE "rx_orders"
  DROP CONSTRAINT IF EXISTS "rx_orders_patient_link_lock_state_check";

--> statement-breakpoint
ALTER TABLE "rx_orders"
  ADD CONSTRAINT "rx_orders_patient_link_lock_state_check"
  CHECK ("patient_link_lock_state" IN ('ok', 'throttled', 'locked'));

--> statement-breakpoint
COMMENT ON COLUMN "rx_orders"."patient_link_opened_at" IS
  'First successful unlock. Stamped from the unlock POST only, never from a page GET: messaging apps fetch link previews, and a GET-based stamp marks prescriptions opened that no human ever saw.';

--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 2. The access code (server-only — never added to sync-rules.yaml)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "rx_order_access" (
  "rx_order_id"          uuid PRIMARY KEY REFERENCES "rx_orders"("id") ON DELETE CASCADE,
  -- sha256(salt || code). The plaintext exists in memory and in the patient's
  -- chat, nowhere else, and is never logged.
  "code_hash"            text NOT NULL,
  "code_salt"            text NOT NULL,
  "consecutive_failures" integer NOT NULL DEFAULT 0,
  "lifetime_failures"    integer NOT NULL DEFAULT 0,
  "retry_after"          timestamp with time zone,
  -- Pharmacy counters are separate on purpose: a pharmacist mistyping a date
  -- of birth must never lock a patient out of their own prescription.
  "pharmacy_failures"    integer NOT NULL DEFAULT 0,
  "pharmacy_retry_after" timestamp with time zone,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "rotated_at"           timestamp with time zone,
  "expires_at"           timestamp with time zone
);

--> statement-breakpoint
COMMENT ON TABLE "rx_order_access" IS
  'Access code for the patient-facing prescription link. Server-only: deliberately absent from sync-rules.yaml so the hash never reaches a device.';

--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 3. The attempt log (server-only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "rx_order_access_attempts" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rx_order_id" uuid NOT NULL REFERENCES "rx_orders"("id") ON DELETE CASCADE,
  "gate"        text NOT NULL,
  "succeeded"   boolean NOT NULL,
  -- Hashed, not raw: this is an audit trail for judging whether a burst of
  -- failures was one confused patient or a scan, not a visitor log.
  "ip_hash"     text,
  "user_agent"  text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now()
);

--> statement-breakpoint
ALTER TABLE "rx_order_access_attempts"
  DROP CONSTRAINT IF EXISTS "rx_order_access_attempts_gate_check";

--> statement-breakpoint
ALTER TABLE "rx_order_access_attempts"
  ADD CONSTRAINT "rx_order_access_attempts_gate_check"
  CHECK ("gate" IN ('patient', 'pharmacy'));

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rx_order_access_attempts_order_time_idx"
  ON "rx_order_access_attempts" ("rx_order_id", "created_at" DESC);

--> statement-breakpoint
-- Supports the per-IP limiter, which counts attempts across all orders.
CREATE INDEX IF NOT EXISTS "rx_order_access_attempts_ip_time_idx"
  ON "rx_order_access_attempts" ("ip_hash", "created_at" DESC);

--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 4. Re-create the care-team sync view with the new synced columns
-- ---------------------------------------------------------------------------
--
-- ALIASING IS LOAD-BEARING: PowerSync derives the client table name from the
-- sync rule's alias, so sync-rules.yaml selects this `AS rx_orders`. The column
-- list here must stay in step with that SELECT — a column present in one but
-- not the other is dropped silently, with no error and no log.
--
-- THE NEW COLUMNS GO AT THE END, after care_team_user_id, and must stay there.
-- CREATE OR REPLACE VIEW may only *append* to the select list: it cannot insert
-- or reorder, and rejects the whole statement with "cannot change name of view
-- column" if you try. Grouping the rx.* columns together reads better and fails
-- the migration. Sync rules select by name, so position costs nothing.

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
  rx.patient_link_sent_at,
  rx.patient_link_sent_by,
  rx.patient_link_opened_at,
  rx.patient_link_open_count,
  rx.patient_link_failed_count,
  rx.patient_link_last_failed_at,
  rx.patient_link_lock_state,
  rx.pharmacy_link_opened_at
FROM rx_orders rx
INNER JOIN patient_care_team pct ON rx.patient_id = pct.patient_id
WHERE pct.removed_at IS NULL;

--> statement-breakpoint
COMMENT ON VIEW powersync_views.care_team_rx_orders IS
  'Prescription orders denormalised with care team membership so sync rules can filter by user_id without a JOIN. Selected AS rx_orders in sync-rules.yaml. Keep the column list in step with sync-rules.yaml. Access codes and attempt logs are intentionally excluded — they must not reach a device.';
