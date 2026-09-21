-- Migration: rx_orders.updated_at + care-team-scoped medication sync views
-- Purpose:
--   1. rx_orders gained no updated_at column when it was created, yet both
--      PATCH handlers (app/api/patient/[id]/route.ts and
--      .../medications/rx-order/route.ts) set `updatedAt` on every write.
--      Drizzle cannot map that key to a column, so the pharmacy-fulfilment
--      update path was broken. Add the column so the existing writes are valid.
--   2. Medication orders previously synced only through the `global` bucket,
--      which is gated on membership in `admins`. Care team members could open a
--      patient chart on mobile and see no prescriptions at all. These views
--      denormalise care team membership onto the order rows so the sync rules
--      can filter by user_id — sync rules cannot JOIN in data queries.
--
-- ALIASING IS LOAD-BEARING: PowerSync derives the client-side table name from
-- the alias in the sync rule, falling back to the unqualified source name when
-- there is no alias (BaseSqlDataQuery.getOutputName / AvailableTable.sqlName).
-- sync-rules.yaml therefore selects these as `... AS rx_orders` / `AS med_orders`.
-- Drop the alias and the rows land in a client table that does not exist, and
-- are discarded with no error.

-- ---------------------------------------------------------------------------
-- 1. rx_orders.updated_at
-- ---------------------------------------------------------------------------

ALTER TABLE "rx_orders"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

--> statement-breakpoint
-- Existing rows get created_at as their initial updated_at rather than the
-- migration timestamp, so "last touched" stays meaningful.
UPDATE "rx_orders" SET "updated_at" = "created_at" WHERE "updated_at" > "created_at";

--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 2. Care-team-scoped medication views
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS powersync_views;

--> statement-breakpoint
-- Prescription orders visible to each care team member.
-- Columns are enumerated to match the rx_orders SELECT in sync-rules.yaml.
-- patient_rx_url / pharmacy_qr_url / pharmacy_qr_code are required: they are
-- the patient-facing link and QR that the mobile share sheet sends.
-- care_team_user_id is the filter column; the client schema ignores it.
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
  pct.user_id AS care_team_user_id
FROM rx_orders rx
INNER JOIN patient_care_team pct ON rx.patient_id = pct.patient_id
WHERE pct.removed_at IS NULL;

--> statement-breakpoint
-- Requests for unavailable medications, visible to each care team member.
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

--> statement-breakpoint
COMMENT ON VIEW powersync_views.care_team_rx_orders IS
  'Prescription orders denormalised with care team membership so sync rules can filter by user_id without a JOIN. Selected AS rx_orders in sync-rules.yaml. Keep the column list in step with sync-rules.yaml.';

--> statement-breakpoint
COMMENT ON VIEW powersync_views.care_team_med_orders IS
  'Med orders denormalised with care team membership so sync rules can filter by user_id without a JOIN. Selected AS med_orders in sync-rules.yaml.';

