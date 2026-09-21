-- Make `users` the single source of truth for identity/professional fields.
--
-- `user_settings` mirrored name/email/account_type/countries/languages/
-- doctor_specialty from `users`. The session read them from user_settings while
-- the user directory and PowerSync read them from `users`, and several write
-- paths only updated one side. Verified before dropping: 0 rows differed on any
-- of the six columns, and 0 rows held a value only in user_settings — so no
-- backfill is needed and nothing is lost. user_settings is preferences-only now.
--
-- gate: allow-auto-apply — the six DROP COLUMNs are the whole migration and
-- were verified empty-equivalent before writing it (0 rows differed from
-- `users`, 0 rows held a value only here), so there is no data to lose and no
-- backfill to get wrong. Applying it by hand would not make it safer; it would
-- only widen the window described next.
--
-- The window: the previous release still reads these columns, so between this
-- migration committing and the new `web` container taking over, the running site
-- errors on any read of user_settings.name/email/account_type/doctor_specialty/
-- countries/languages. That is inherent to dropping a column a live release
-- reads, and the gate running inside the deploy makes it as short as it can be.
-- Deploy this at a quiet hour rather than mid-clinic.
--
-- NOTE: drizzle-kit also emitted two statements that are ALREADY applied and
-- have been removed by hand, because they would abort this migration:
--   * ALTER TYPE internal_message_type ADD VALUE 'call-summary'  (migration 0043)
--   * ALTER TABLE rx_orders ADD COLUMN updated_at                 (2026_08_11_01)
-- Both were introduced by hand-written migrations, which leave no drizzle
-- snapshot, so the generator re-diffs them as missing every time. The 0045
-- snapshot does describe them correctly, so future generates will be clean.

DROP INDEX "user_settings_email_idx";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "account_type";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "doctor_specialty";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "countries";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "languages";
