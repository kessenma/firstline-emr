# PowerSync Offline-First Architecture

## Overview

PowerSync provides offline-first data sync between PostgreSQL (web backend) and SQLite (mobile). All mobile reads come from local SQLite — never from API calls. Writes go to local DB first, then upload to server via PowerSync's CRUD queue.

## Two-Token JWT Auth

| Token | Lifetime | Purpose | Storage |
|-------|----------|---------|---------|
| Auth token | 30 days | API calls | `TokenStorage.setAuthToken()` (MMKV) |
| PowerSync token | 24 hours | WebSocket sync | `TokenStorage.setPowerSyncToken()` (MMKV) |

- PowerSync token **must** include `kid: "fajr-emr-key"` in JWT header (auth token lacks this → causes PSYNC_S2101)
- Refresh endpoint: `POST /api/auth/refresh-powersync` (uses auth token as Bearer)
- Proactive refresh: 4 hours before expiry (`TokenStorage.needsPowerSyncRefresh()`)
- JWT config: `apps/web/lib/jwt-config.ts` — audience `["powersync", "powersync-dev"]`, issuer `https://fajrmission.org`

## Initialization Flow

```
AuthContext.login()
  → PowerSyncService.getInstance().initialize()
    → Creates encrypted SQLite DB (SQLCipher via op-sqlite)
    → Tests server liveness (/probes/liveness)
    → Connects with fetchCredentials + uploadData callbacks
    → db.waitForReady() (waits for initial sync)
  → SyncNetworkController.start() (WiFi-only preference)
  → OfflineAccountSwitcher processes queued changes
```

**Guards**: `isInitialized`, `isConnecting`, `syncInitPromiseRef` prevent duplicate init from multiple callers (AuthContext, DatabaseContext, usePowerSync hook).

## Sync Rules (`apps/powersync-server/config/sync-rules.yaml`)

| Bucket | Priority | Who gets it | What's in it |
|--------|----------|-------------|-------------|
| `user_data` | 1 | Every authenticated user | Own profile, settings, care team memberships, assigned patients, unresolved conflicts |
| `staff_directory` | 2 | Every authenticated user | Authorized users, for the Contacts tab of staff calling |
| `user_internal_messaging` | 2 | Per-thread membership | Threads + participants + messages where user is active participant |
| `user_telegram_messaging` | 2 | Per-thread membership | Telegram threads + participants + messages |
| `reference_data` | 3 (default) | Every authenticated user | Missions, mission attachments, all patients, all notes, note edits |
| `global` | 3 (default) | Admins only (`FROM admins WHERE user_id = request.user_id()`) | All users, patients, notes, meds, rx, media, messages, missions, care team, feedback |

**Priorities are 0–3, lower syncs first; unset means 3.** The load-bearing split is `user_data` (1) ahead of `reference_data` (3): `user_data` already carries the user's own patients and orders, so a clinician gets a working chart for their own caseload before the full corpus lands. Keep priority 1 small — `AuthContext` gates login on the first sync.

Changing any bucket definition makes PowerSync recreate buckets from scratch, and `docker-compose.powersync.yml` additionally STOPs the sync rules and drops the replication slots on every deploy — so **every powersync deploy already forces a full re-download on every device**. Schedule accordingly. `sync-rules.yaml` is baked into the image at build time, so changes need a rebuild, not a restart.

**Constraints**: No JOINs, no ORDER BY/LIMIT, single-table SELECTs only. Use `powersync_views` schema for complex queries (e.g., `care_team_patients`, `user_care_team_conflicts`).

## Schema (`apps/mobile/src/db/powerSyncSchema.ts`)

**Synced tables** (27): users, patients, notes, note_edits, med_orders, rx_orders, patient_media, patient_care_team, care_team_conflicts, missions, mission_attachments, internal_message_threads, internal_message_thread_participants, internal_messages, telegram_threads, telegram_messages, telegram_thread_participants, user_messages, patient_follow_ups, notifications, notification_recipients, admins, user_settings, admin_notifications, user_profile_logs, user_feedback, user_profile_update_requests

**Local-only tables** (5): ui_state, offline_queue, media_cache, sync_metadata, patient_drafts

All columns are `column.text` or `column.integer` (SQLite types). JSON fields stored as text, parsed in mappers. Booleans as 0/1 integers.

## Writing Data (Upload Pipeline)

```
Local write (PowerSyncService.insert/update/delete)
  → PowerSync queues in ps_crud table
  → uploadData() callback triggered
  → Groups changes by table for error isolation
  → Per-table: processes records sequentially
  → Per-record: converts snake_case → camelCase, calls API
  → Special handlers: notes (needs patientId in URL), care_team (dedicated endpoint)
  → Completes batch if ≥1 table succeeded
```

**Error isolation**: Skip failed records, continue rest. Fail table only if >50% fail. Fail batch only if ALL tables fail.

**Special write handlers**:
- **Notes**: API requires `/patient/{patientId}/notes/doctor-notes` — fetches patientId from local DB
- **Care team**: Uses `/patient/care-team` endpoint with conflict detection
- **Standard tables**: Auto-mapped to `/api/{endpoint}/{id}`

## Querying Data

```typescript
// Reactive query — re-runs when underlying tables change
const { data, loading, error, refetch } = usePowerSyncQuery<RowType>(
  'SELECT * FROM patients WHERE status != ? ORDER BY created_at DESC',
  ['Post-Op / Discharged']
);

// Transform rows to typed objects
const patients = useMemo(() => data?.map(mapRowToPatient) ?? [], [data]);
```

**Hooks** (`hooks/powersync/`):
- `usePowerSyncQuery<T>(sql, params)` — reactive query with auto-rerun on table changes
- `usePowerSyncQueryById(table, id)` — single record
- `usePowerSyncQueryMany(table, filters)` — filtered list with LIKE support
- `usePowerSyncQueryPaginated(table, filters, { limit, offset })`
- `usePowerSyncQueryCount(table, filters)` — COUNT(*)

All use `db.watch()` (callback-based, not async iterables — Hermes compatible).

## Sync Status & Diagnostics

- `useSyncStatus()` — isConnected, isDownloading, isUploading, connectionTimedOut (30s), lastSyncTime, syncErrors, connectionQuality, plus `downloadProgress`, `hasSynced`, `priorityStatusEntries`
  - **Event-driven, not polled.** Subscribes via `service.subscribeToSyncStatus(cb)`. The `pollInterval` option still type-checks but is ignored.
  - Do **not** use `service.addEventListener('onSyncStatusChange', ...)` for new consumers — that registry is a single-slot map that overwrites, and `removeEventListener` clears it for everyone. Use `subscribeToSyncStatus()`, which is a real subscriber set.
  - Do **not** bind `db.registerListener()` directly either: `resetDatabase()` swaps in a new `PowerSyncDatabase` without changing `isInitialized`, so such a listener silently goes dead. The service re-attaches its fan-out on reset.
  - `downloadProgress.downloadedFraction` reaches 1.0 slightly *before* `downloadProgress` clears — the SDK is applying changes locally in that window. Render "Applying changes…", not a stalled 100%.
- `useSyncDataSummary()` — row counts per table (UNION ALL query), for doctors to verify data parity
- `SyncStatusSheet.tsx` — user-facing bottom sheet with status, counts, reconnect button, reset button (60s cooldown)
- `getPendingChangesCount()` — queries PowerSync's internal `ps_crud` table

## Network-Aware Sync (`SyncNetworkController.ts`)

- Monitors WiFi vs cellular via `@react-native-community/netinfo`
- `data_sync_wifi_only` preference from `user_settings` table
- WiFi-only enabled + cellular → `disconnectSync()` (pauses sync)
- WiFi returns → `reconnect()` (resumes sync)
- Preference stored in MMKV (not PowerSync DB, to avoid chicken-and-egg)
- 500ms debounce on network changes

## Database Encryption

- SQLCipher via `@powersync/op-sqlite` (OPSqliteOpenFactory)
- DB file: `fajr-emr-enc.db` (Documents directory)
- Key managed by `EncryptionKeyManager` (stored separately)
- Auto-migration from unencrypted `fajr-emr.db` on first run
- Recovery if key lost: delete DB + generate new key + resync from server

## Server Deployment

- Docker: `docker-compose.powersync.yml` (port 6061, Caddy reverse proxy at `sync.fajrmission.org`)
- `entrypoint.sh`: parses `DATABASE_URL`, base64url-encodes `JWT_SECRET`, generates config at runtime
- Health: `/probes/liveness` endpoint
- Replication: `powersync_slot` + `powersync_publication` on PostgreSQL

## Adding a New Synced Table

1. Add Drizzle schema in `apps/web/db/schema/`
2. Run migration (`pnpm db:migrate`)
3. Add table to `apps/mobile/src/db/powerSyncSchema.ts` with matching columns
4. Add to `TABLES` constant in same file
5. Add SELECT to appropriate bucket in `sync-rules.yaml` (user_data, global, or reference_data)
6. Add to PostgreSQL publication: `ALTER PUBLICATION powersync_publication ADD TABLE new_table;`
7. Create mapper function (e.g., `mapRowToNewEntity()`) for JSON field parsing
8. Create `usePowerSyncQuery` hook or use inline queries

## Common Gotchas

- **Hermes**: No `AbortSignal.timeout()`, no `TypedArray.prototype.buffer`, no async iterables without polyfill
- **PowerSync token**: Must have `kid` header — auth token won't work for sync
- **Multiple init callers**: Singleton must check both `isInitialized` AND `isConnecting`
- **Sync rules**: No JOINs, no ORDER BY/LIMIT — use views for complex queries
- **care_team_conflicts**: Server-written only, mobile reads for awareness, admins resolve via API
- **JSON fields**: Stored as text in SQLite, must parse in mapper (phone, care_team, triaged_by, specialties, prescriptions)
- **Booleans**: Stored as 0/1 integers in SQLite, convert in mapper
