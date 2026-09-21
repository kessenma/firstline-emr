// scripts/check-migrations.ts
//
// Migration gate. Two modes:
//
//   bun scripts/check-migrations.ts            report drift, exit 1 if behind
//   bun scripts/check-migrations.ts --apply     apply safe pending migrations,
//                                               refuse risky ones, exit 1 on any
//                                               failure
//
// --apply is what the `migrate` service in docker-compose.web.yml runs, so a
// release can never go live against a database missing its columns.
//
// Why this exists: nothing in the deploy path ever touched the database.
// Migrations only ran when someone typed `npm run db:migrate` from a laptop, so
// on 2026-08-05 the video-call release shipped four pending migrations and every
// login broke — the login query selects user_settings.call_transcription_mode,
// which had no column yet. Already-authenticated sessions kept working, which
// made it look like an auth bug rather than schema drift.
//
// Why auto-apply rather than just blocking: compose recreates every service
// before it starts any of them, so by the time this container runs, the old web
// container is already destroyed. A gate that only refuses therefore converts a
// forgotten migration into a full outage rather than a blocked deploy. Applying
// the additive ones — which is all of them, nearly always — keeps the deploy
// moving. Anything that could lose data or break the old code still stops here.
//
// The pending calculation deliberately mirrors drizzle's own migrator
// (drizzle-orm/pg-core/dialect.js `migrate()`): drizzle reads only the single
// most recent row from drizzle.__drizzle_migrations and applies every journal
// entry whose `when` exceeds that row's created_at. It is a timestamp watermark,
// not set membership — a migration authored with a timestamp behind the
// watermark would be skipped by drizzle forever. Matching that logic means this
// gate can never disagree with the tool that does the work.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { config } from "dotenv";

// Local runs read the monorepo-root .env (same file db/migrate.ts uses). In the
// container there is no .env — DATABASE_URL arrives as a real env var — so a
// missing file is not an error.
const rootEnv = path.resolve(process.cwd(), "../..", ".env");
if (fs.existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "db", "migrations");
const JOURNAL = path.join(MIGRATIONS_DIR, "meta", "_journal.json");

const APPLY = process.argv.includes("--apply");

/**
 * Statements that can destroy data, or that break the currently-running release
 * the moment they land. These never auto-apply: they want a backup, a chosen
 * window, and someone watching.
 *
 * Renames are in here for the second reason rather than the first — the old
 * container is still serving during a deploy, and a renamed column 500s it
 * immediately. Those need the expand/contract treatment, not an unattended run.
 *
 * A migration that trips this can still be marked safe deliberately, by putting
 * this anywhere in its .sql file:
 *
 *     -- gate: allow-auto-apply — <why this is safe>
 */
const RISKY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "DROP TABLE", pattern: /\bdrop\s+table\b/i },
  { label: "DROP COLUMN", pattern: /\bdrop\s+column\b/i },
  { label: "DROP SCHEMA", pattern: /\bdrop\s+schema\b/i },
  { label: "DROP DATABASE", pattern: /\bdrop\s+database\b/i },
  { label: "DROP TYPE", pattern: /\bdrop\s+type\b/i },
  { label: "TRUNCATE", pattern: /\btruncate\b/i },
  { label: "DELETE FROM", pattern: /\bdelete\s+from\b/i },
  { label: "UPDATE (data backfill)", pattern: /\bupdate\s+"?[\w.]+"?\s+set\b/i },
  // Type changes rewrite the table and can fail or silently narrow values.
  { label: "column type change", pattern: /\balter\s+column\b[\s\S]*?\btype\b/i },
  { label: "RENAME", pattern: /\brename\b/i },
];

const ALLOW_MARKER = /--\s*gate:\s*allow-auto-apply\b/i;

type JournalEntry = { idx: number; tag: string; when: number };
type Migration = JournalEntry & { hash: string; sql: string };

/** Host only — never let a password reach the logs or a Telegram message. */
function describeTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "<unparseable DATABASE_URL>";
  }
}

/** Strip comments so a keyword mentioned in prose can't trip the risk scan. */
function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function readJournal(): Migration[] {
  if (!fs.existsSync(JOURNAL)) {
    throw new Error(`No migration journal at ${JOURNAL}`);
  }
  const journal = JSON.parse(fs.readFileSync(JOURNAL, "utf8")) as {
    entries: JournalEntry[];
  };

  return journal.entries
    .map((entry) => {
      const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) {
        throw new Error(
          `Journal references ${entry.tag}.sql but the file is missing — ` +
            `the migrations folder is incomplete, so drizzle would throw too.`,
        );
      }
      // sha256 over the raw file bytes, exactly as drizzle's readMigrationFiles
      // does. Any reformatting of an applied .sql file changes this.
      const sql = fs.readFileSync(sqlPath, "utf8");
      const hash = crypto.createHash("sha256").update(sql).digest("hex");
      return { ...entry, hash, sql };
    })
    .sort((a, b) => a.when - b.when);
}

function findRisks(migrations: Migration[]): Array<{
  tag: string;
  labels: string[];
}> {
  const risky: Array<{ tag: string; labels: string[] }> = [];
  for (const migration of migrations) {
    if (ALLOW_MARKER.test(migration.sql)) continue;
    const body = stripComments(migration.sql);
    const labels = RISKY_PATTERNS.filter(({ pattern }) =>
      pattern.test(body),
    ).map(({ label }) => label);
    if (labels.length > 0) risky.push({ tag: migration.tag, labels });
  }
  return risky;
}

/**
 * Best-effort ops alert. Silent no-op unless both vars are set, so it can be
 * switched on later by adding env vars — no code change, and no failure mode
 * where a missing token turns a clear report into a crash.
 */
async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_OPS_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(
        `  (Telegram alert failed: ${res.status} ${await res.text()})`,
      );
    }
  } catch (error) {
    // Never let the notifier change the exit code — the verdict is the point,
    // the ping is a courtesy.
    console.error(`  (Telegram alert failed: ${String(error)})`);
  }
}

async function readApplied(pool: Pool) {
  // to_regclass avoids an error on a database that has never been migrated;
  // there, everything is legitimately pending.
  const exists = await pool.query<{ present: boolean }>(
    "select to_regclass('drizzle.__drizzle_migrations') is not null as present",
  );
  if (!exists.rows[0]?.present) return [];
  const { rows } = await pool.query<{ hash: string; created_at: string | null }>(
    "select hash, created_at from drizzle.__drizzle_migrations order by created_at",
  );
  return rows;
}

async function main(): Promise<number> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("✖ DATABASE_URL is not set — cannot check migration state.");
    return 1;
  }

  const target = describeTarget(connectionString);
  const entries = readJournal();
  console.log(
    `Checking ${entries.length} journal migrations against ${target}` +
      (APPLY ? " (apply mode)" : " (check only)"),
  );

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 15_000 });

  try {
    const applied = await readApplied(pool);
    const watermark = applied.reduce(
      (max, row) => Math.max(max, Number(row.created_at ?? 0)),
      0,
    );
    const appliedHashes = new Set(applied.map((row) => row.hash));
    const pending = entries.filter((entry) => entry.when > watermark);

    // Journal entries at or below the watermark that the database has no hash
    // for: either an applied .sql file was edited after the fact, or a migration
    // was authored behind the watermark and so will never be applied.
    //
    // ADVISORY ONLY, on purpose. This database predates parts of its own
    // journal — 0000-0009 and 0018 have no row in drizzle.__drizzle_migrations
    // at all (the schema was bootstrapped during the MongoDB→Postgres move
    // rather than migrated up from empty), and several applied files were edited
    // afterwards. Failing on that would block every deploy forever. Pending is
    // the condition that actually breaks production, so pending alone is fatal.
    const inconsistent = entries.filter(
      (entry) => entry.when <= watermark && !appliedHashes.has(entry.hash),
    );
    if (inconsistent.length > 0) {
      console.warn(
        `⚠ ${inconsistent.length} applied migration(s) do not hash-match the ` +
          `committed .sql files (historical; not blocking): ` +
          inconsistent.map((entry) => entry.tag).join(", "),
      );
    }

    if (pending.length === 0) {
      console.log(
        `✔ Database is up to date (${applied.length} migrations applied).`,
      );
      return 0;
    }

    console.log(`${pending.length} pending migration(s):`);
    for (const entry of pending) console.log(`  · ${entry.tag}`);

    if (!APPLY) {
      console.error("");
      console.error("✖ Database is behind. Run with --apply, or npm run db:migrate.");
      return 1;
    }

    // Risky pending migrations are never applied unattended, and their presence
    // fails the deploy rather than letting the safe ones through — applying half
    // a release's migrations is worse than applying none.
    const risky = findRisks(pending);
    if (risky.length > 0) {
      console.error("");
      console.error("✖ REFUSING TO AUTO-APPLY — pending migrations need review.");
      console.error(`  Target: ${target}`);
      for (const { tag, labels } of risky) {
        console.error(`    · ${tag} — ${labels.join(", ")}`);
      }
      console.error("");
      console.error("  These can lose data or break the running release, so they");
      console.error("  are applied by hand, with a backup:");
      console.error("");
      console.error("    pg_dump $DATABASE_URL > backup.sql");
      console.error("    cd apps/web && npm run db:migrate");
      console.error("");
      console.error("  If one is genuinely safe, add this to its .sql file:");
      console.error("    -- gate: allow-auto-apply — <why>");
      console.error("");

      await notifyTelegram(
        [
          "🛑 <b>Deploy blocked — migration needs review</b>",
          `Target: <code>${target}</code>`,
          "",
          ...risky.map(
            ({ tag, labels }) => `· <code>${tag}</code> — ${labels.join(", ")}`,
          ),
          "",
          "Back up, then apply by hand:",
          "<code>cd apps/web && npm run db:migrate</code>",
        ].join("\n"),
      );
      return 1;
    }

    console.log("");
    console.log("No risky statements found — applying…");

    try {
      // drizzle wraps every pending migration in a single transaction, so a
      // failure part-way leaves the schema exactly as it was.
      await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
    } catch (error) {
      console.error("");
      console.error("✖ MIGRATION FAILED — deploy must not proceed.");
      console.error(`  Target: ${target}`);
      console.error(`  ${String(error)}`);
      console.error("");
      console.error("  drizzle applies all pending migrations in one");
      console.error("  transaction, so the schema was rolled back unchanged.");
      console.error("");

      await notifyTelegram(
        [
          "🔥 <b>Deploy failed — migration error</b>",
          `Target: <code>${target}</code>`,
          "",
          ...pending.map((entry) => `· <code>${entry.tag}</code>`),
          "",
          `<pre>${String(error).slice(0, 600)}</pre>`,
          "",
          "Schema was rolled back — nothing was applied.",
        ].join("\n"),
      );
      return 1;
    }

    // Trust the result, don't assume it: re-read the ledger and confirm the
    // watermark actually moved past everything we set out to apply.
    const after = await readApplied(pool);
    const newWatermark = after.reduce(
      (max, row) => Math.max(max, Number(row.created_at ?? 0)),
      0,
    );
    const stillPending = entries.filter((entry) => entry.when > newWatermark);
    if (stillPending.length > 0) {
      console.error("");
      console.error(
        `✖ Applied without error, but ${stillPending.length} migration(s) are ` +
          `still pending: ${stillPending.map((e) => e.tag).join(", ")}`,
      );
      await notifyTelegram(
        [
          "🔥 <b>Deploy failed — migrations still pending after apply</b>",
          `Target: <code>${target}</code>`,
          ...stillPending.map((entry) => `· <code>${entry.tag}</code>`),
        ].join("\n"),
      );
      return 1;
    }

    console.log(
      `✔ Applied ${pending.length} migration(s) — database is up to date.`,
    );

    // Worth a ping even on success: the schema of a production database just
    // changed without anyone watching.
    await notifyTelegram(
      [
        "✅ <b>Migrations applied on deploy</b>",
        `Target: <code>${target}</code>`,
        ...pending.map((entry) => `· <code>${entry.tag}</code>`),
      ].join("\n"),
    );
    return 0;
  } finally {
    await pool.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    // A gate that cannot determine the answer must not wave the deploy through.
    console.error("✖ Migration check failed to run:", error);
    process.exit(1);
  });
