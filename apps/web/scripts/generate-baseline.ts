// scripts/generate-baseline.ts
//
// Writes db/baseline/schema.sql: the complete current schema as plain SQL,
// generated from db/schema/*.ts with `drizzle-kit export`.
//
//   bun scripts/generate-baseline.ts           regenerate the file
//   bun scripts/generate-baseline.ts --check   exit 1 if the committed file is stale
//
// Why this exists: the migration history can't build a database from empty.
// Production was bootstrapped during the MongoDB→Postgres move, and several early
// migrations only make sense against that bootstrapped schema (e.g. a column type
// change with no USING clause). So a brand-new install (a self-hosting org, a
// staging box) can't simply replay db/migrations. Instead, the migration gate
// (scripts/check-migrations.ts) installs this baseline on an empty database and
// records every journal migration up to `covers-journal-through` as applied.
//
// RULE: regenerate this file in the same commit as every new migration.
// `--check` enforces that (it runs in CI): the file must equal a fresh export of
// db/schema, and must cover the last journal entry.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const WEB_DIR = process.cwd();
const BASELINE = path.join(WEB_DIR, "db", "baseline", "schema.sql");
const JOURNAL = path.join(WEB_DIR, "db", "migrations", "meta", "_journal.json");

function lastJournalTag(): string {
  const journal = JSON.parse(fs.readFileSync(JOURNAL, "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };
  const sorted = [...journal.entries].sort((a, b) => a.when - b.when);
  const last = sorted.at(-1);
  if (!last) throw new Error("Migration journal is empty");
  return last.tag;
}

function exportSchemaSql(): string {
  // drizzle.config.ts insists on DATABASE_URL, but `export` never connects.
  // A placeholder keeps this runnable on a laptop or in CI without a database.
  const out = execFileSync("npx", ["drizzle-kit", "export", "--sql"], {
    cwd: WEB_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "postgres://baseline-export@localhost:5432/unused",
    },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  // dotenv prints a banner on stdout; everything else is SQL.
  return out
    .split("\n")
    .filter((line) => !line.startsWith("[dotenv"))
    .join("\n")
    .trim();
}

function render(tag: string, sql: string): string {
  return [
    "-- Firstline fresh-install baseline schema. GENERATED: do not edit by hand.",
    "-- Regenerate in the same commit as every new migration:",
    "--   cd apps/web && pnpm db:baseline",
    "-- Applied by scripts/check-migrations.ts --apply on an EMPTY database only.",
    `-- covers-journal-through: ${tag}`,
    "",
    sql,
    "",
  ].join("\n");
}

const tag = lastJournalTag();
const next = render(tag, exportSchemaSql());

if (CHECK) {
  const current = fs.existsSync(BASELINE) ? fs.readFileSync(BASELINE, "utf8") : "";
  if (current !== next) {
    console.error(
      "✖ db/baseline/schema.sql is stale: it doesn't match db/schema or the latest migration.",
    );
    console.error("  Run: cd apps/web && pnpm db:baseline   (and commit the result)");
    process.exit(1);
  }
  console.log(`✔ Baseline is current (covers ${tag}).`);
} else {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, next);
  console.log(`✔ Wrote ${path.relative(WEB_DIR, BASELINE)} (covers ${tag}).`);
}
