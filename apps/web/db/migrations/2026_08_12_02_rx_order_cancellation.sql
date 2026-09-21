-- Migration: prescription cancellation
--
-- Purpose:
--   A prescription could be created and sent but never withdrawn. Once a script
--   was out, the patient held a live link and a QR a pharmacy would honour —
--   even if the doctor changed their mind, the pharmacy could not fill it, or
--   the patient had already got it elsewhere. Three parties need to be able to
--   stop one, and each knows something the others do not.
--
-- CANCELLATION IS ITS OWN AXIS, NOT AN rx_status VALUE. rx_status is the
-- pharmacy's fulfilment answer. A pharmacy that partially filled a script which
-- is then cancelled has told us the patient already holds half the medication;
-- folding cancellation into that enum overwrites it. The two are read together
-- through describePrescriptionCancellation() in @fajr/shared/medications.
--
-- This also avoids ALTER TYPE ... ADD VALUE, whose new value cannot be used in
-- the transaction that adds it — and migrations here run in one.
--
-- Additive only — no DROP, TRUNCATE or UPDATE — so this clears the deploy
-- migration gate without a manual allow.

-- ---------------------------------------------------------------------------
-- 1. Cancellation columns on rx_orders (synced)
-- ---------------------------------------------------------------------------

ALTER TABLE "rx_orders"
  ADD COLUMN IF NOT EXISTS "cancelled_at"             timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "cancelled_by_role"        text,
  -- Null when the patient cancelled: patients have no users row.
  ADD COLUMN IF NOT EXISTS "cancelled_by_user_id"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  -- Free text. Required of a pharmacist, optional for a doctor, optional extra
  -- for a patient. Sent verbatim to the patient for the first two.
  ADD COLUMN IF NOT EXISTS "cancellation_reason"      text,
  -- A patient's preset choice. A stable code rather than their words, so the
  -- care team can scan it whatever language the patient answered in.
  ADD COLUMN IF NOT EXISTS "cancellation_reason_code" text;

--> statement-breakpoint
ALTER TABLE "rx_orders"
  DROP CONSTRAINT IF EXISTS "rx_orders_cancelled_by_role_check";

--> statement-breakpoint
ALTER TABLE "rx_orders"
  ADD CONSTRAINT "rx_orders_cancelled_by_role_check"
  CHECK ("cancelled_by_role" IS NULL
         OR "cancelled_by_role" IN ('doctor', 'pharmacist', 'patient'));

--> statement-breakpoint
COMMENT ON COLUMN "rx_orders"."cancelled_at" IS
  'Set once and never cleared — cancellation is terminal. The replacement for a mis-cancelled script is a new prescription, because the patient has already been messaged that this one is dead.';

--> statement-breakpoint
-- Finding the live scripts for a patient is the common read; cancelled ones are
-- the minority and are excluded from the index entirely.
CREATE INDEX IF NOT EXISTS "rx_orders_active_patient_idx"
  ON "rx_orders" ("patient_id")
  WHERE "cancelled_at" IS NULL;

--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 2. Re-create the care-team sync view
-- ---------------------------------------------------------------------------
--
-- COLUMN ORDER IS LOAD-BEARING AND APPEND-ONLY. CREATE OR REPLACE VIEW cannot
-- insert or reorder a select list — it rejects the whole statement with "cannot
-- change name of view column". So everything 2026_08_12_01 added stays where it
-- is (including care_team_user_id sitting mid-list), and the cancellation
-- columns go last. Grouping the rx.* columns together reads better and fails.
--
-- rx_status joins the list here too: it was never synced, so a doctor on mobile
-- could not see 'partially filled' or 'declined' at all — the pharmacy's answer
-- never reached them. Cancelled-vs-fulfilment is only legible on a phone with
-- both present.

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
  rx.pharmacy_link_opened_at,
  -- Appended by this migration.
  rx.rx_status,
  rx.cancelled_at,
  rx.cancelled_by_role,
  rx.cancelled_by_user_id,
  rx.cancellation_reason,
  rx.cancellation_reason_code
FROM rx_orders rx
INNER JOIN patient_care_team pct ON rx.patient_id = pct.patient_id
WHERE pct.removed_at IS NULL;

--> statement-breakpoint
COMMENT ON VIEW powersync_views.care_team_rx_orders IS
  'Prescription orders denormalised with care team membership so sync rules can filter by user_id without a JOIN. Selected AS rx_orders in sync-rules.yaml. Keep the column list in step with sync-rules.yaml AND with custom-functions/user-functions.sql, which bootstraps this view on a fresh database. Access codes and attempt logs are intentionally excluded — they must not reach a device.';
