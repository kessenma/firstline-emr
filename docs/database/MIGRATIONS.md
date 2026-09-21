# Database Migrations with Drizzle

This project uses [Drizzle ORM](https://orm.drizzle.team/) for database schema management and migrations against a PostgreSQL database.

## Quick Reference

All commands run from `apps/web`:

```bash
cd apps/web

# Generate a migration after changing schema files
pnpm db:generate

# Apply pending migrations to the database
pnpm db:migrate

# Push schema directly (dev only — skips migration files)
pnpm db:push
```

## How It Works

### Project Structure

```
apps/web/
├── db/
│   ├── schema/           # Drizzle schema definitions (source of truth)
│   │   ├── index.ts      # Barrel export of all tables
│   │   ├── users.ts
│   │   ├── patients.ts
│   │   ├── adminNotifications.ts
│   │   └── ...
│   ├── migrations/       # Generated SQL migration files
│   │   ├── 0000_tearful_black_knight.sql
│   │   ├── 0001_sloppy_white_queen.sql
│   │   ├── ...
│   │   └── meta/
│   │       ├── _journal.json   # Migration journal (order + metadata)
│   │       ├── 0000_snapshot.json
│   │       └── ...
│   ├── migrate.ts        # Migration runner script
│   └── connection.ts     # Database connection
├── drizzle.config.ts     # Drizzle Kit configuration
└── .env (root)           # DATABASE_URL lives in monorepo root ../../.env
```

### Config

`drizzle.config.ts` points to:
- **Schema**: `./db/schema/index.ts` — all table definitions
- **Output**: `./db/migrations` — where generated SQL + snapshots go
- **Credentials**: `DATABASE_URL` from the root `.env` file

## Standard Workflow: Making Schema Changes

### 1. Edit the schema

Modify or add tables in `apps/web/db/schema/`. Example — adding a column:

```typescript
// db/schema/adminNotifications.ts
export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  // NEW: add this column
  actionUrl: text("action_url"),
});
```

If you create a new schema file, make sure to export it from `db/schema/index.ts`.

### 2. Generate the migration

```bash
pnpm db:generate
```

This diffs your schema files against the latest snapshot and generates:
- A numbered SQL file (e.g., `0030_magical_mongu.sql`)
- An updated snapshot in `meta/`
- An entry in `meta/_journal.json`

**Always review the generated SQL** before applying — Drizzle sometimes generates destructive operations (dropping views, altering constraints) that may not be safe.

### 3. Apply the migration

```bash
pnpm db:migrate
```

This runs `db/migrate.ts`, which:
1. Connects to the database using `DATABASE_URL`
2. Checks the `drizzle.__drizzle_migrations` table for already-applied migrations
3. Runs any pending migration SQL files in order
4. Records each successful migration's hash + timestamp

### 4. Update PowerSync schema (if applicable)

If you changed a table that syncs to mobile via PowerSync, also update:
- `apps/mobile/src/db/powerSyncSchema.ts` — add/remove columns
- `apps/powersync-server/config/sync-rules.yaml` — if using explicit column lists (not `SELECT *`)

## `db:push` vs `db:migrate`

| | `db:push` | `db:migrate` |
|---|---|---|
| **What it does** | Diffs schema against live DB and applies changes directly | Runs generated SQL migration files in order |
| **Tracks history** | No — does NOT record in `__drizzle_migrations` | Yes — records each migration as applied |
| **Use when** | Quick local dev iteration | Production, staging, CI/CD, shared databases |
| **Risk** | Can silently break `db:migrate` later (see below) | Safe and reproducible |

**Important**: Do NOT mix `db:push` and `db:migrate` on the same database. If you use `db:push` to apply changes, those changes won't be tracked in the migration journal, and `db:migrate` will try to re-run them later.

## Troubleshooting

### "enum label already exists"

```
error: enum label "offline_access" already exists
```

**Cause**: A migration uses `ALTER TYPE ... ADD VALUE 'x'` but the value was already added (e.g., by `db:push` or a manual migration).

**Fix**: Edit the migration SQL file to add `IF NOT EXISTS`:

```sql
-- Before (fails if already exists):
ALTER TYPE "public"."feedback_category" ADD VALUE 'offline_access';

-- After (idempotent):
ALTER TYPE "public"."feedback_category" ADD VALUE IF NOT EXISTS 'offline_access';
```

### "cannot alter type of a column used by a view or rule"

```
error: cannot alter type of a column used by a view or rule
detail: rule _RETURN on view user_accessible_patients depends on column "hospital"
```

**Cause**: A migration tries to `ALTER COLUMN ... SET DATA TYPE` on a column that a view depends on. PostgreSQL requires dropping the view first.

**Fix**: Edit the migration SQL to drop and recreate the view around the ALTER:

```sql
-- Drop the dependent view(s) first
DROP VIEW IF EXISTS powersync_views.patients CASCADE;
DROP VIEW IF EXISTS user_accessible_patients CASCADE;

-- Now the ALTER works
ALTER TABLE "patients" ALTER COLUMN "hospital" SET DATA TYPE varchar(255);

-- Recreate the view(s) — copy the original CREATE VIEW definition
CREATE VIEW user_accessible_patients AS ...;
```

Alternatively, if the change was already applied via `db:push`, mark the migration as applied (see next section).

### "cannot drop view because other objects depend on it"

```
error: cannot drop view user_accessible_notes because other objects depend on it
detail: view powersync_views.notes depends on view user_accessible_notes
```

**Cause**: Same as above — Drizzle generates `DROP VIEW` without `CASCADE`, and PowerSync views depend on it.

**Fix**: If you need the view drop, replace `DROP VIEW` with `DROP VIEW ... CASCADE` in the migration SQL. But usually this means the migration was already applied and just needs to be recorded (see below).

### Migrations were applied via `db:push` but `db:migrate` tries to re-run them

This is the most common issue. Symptoms: `db:migrate` fails on statements that were already applied.

**Fix**: Insert the already-applied migrations into the journal table so `db:migrate` skips them.

**Step 1** — Find which migrations are missing from the journal:

```bash
# Check what's recorded in the database
psql $DATABASE_URL -c 'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;'
```

Compare the `created_at` values against `apps/web/db/migrations/meta/_journal.json` to identify which entries are missing.

**Step 2** — Compute the hash for each missing migration file:

```bash
shasum -a 256 db/migrations/0026_mushy_nick_fury.sql | cut -d' ' -f1
```

**Step 3** — Insert the records (use `created_at` from the journal entry's `when` field):

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
  ('<hash_from_step_2>', <when_from_journal>);
```

**Step 4** — Run `pnpm db:migrate` again. It should now skip the already-applied migrations and only run new ones.

### General debugging

Check migration state:

```bash
# What the DB thinks is applied
psql $DATABASE_URL -c 'SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;'

# What the journal expects
cat apps/web/db/migrations/meta/_journal.json | jq '.entries[] | {idx, tag, when}'
```

If counts don't match, some migrations were applied outside of `db:migrate`.

## Best Practices

1. **Always use `db:migrate` for shared databases** — never `db:push`
2. **Review generated SQL** before applying — check for unintended `DROP VIEW`, `DROP TYPE`, or constraint changes
3. **Make enum additions idempotent** — add `IF NOT EXISTS` to `ALTER TYPE ... ADD VALUE` statements in generated SQL
4. **Export new schema files** — if you create a new file in `db/schema/`, add it to `db/schema/index.ts`
5. **Commit migration files** — the SQL files and journal/snapshots in `meta/` should be committed to git
6. **One schema change per PR** — avoid batching unrelated schema changes in one migration to simplify rollbacks
7. **Update PowerSync** — if a table syncs to mobile, update `powerSyncSchema.ts` and sync rules in the same PR
