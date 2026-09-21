# Database Backup & Restore System

## Context

This feature provides backup and restore capabilities for the Fajr MedFlow EMR database. Backups can be created from two sources:

1. **Mobile (PowerSync)** — Admin exports local SQLite data from their phone and uploads to the server
2. **Server (PostgreSQL)** — Admin triggers a direct database export from the web admin dashboard

Both produce the same JSON format and are stored in object storage (RustFS/S3). Either can be restored using the same restore flow.

## Backup Modes

### Clinical Backup (routine use)
Tables: patients, notes, note_edits, med_orders, rx_orders, patient_media, patient_care_team, care_team_conflicts, missions, mission_attachments, telegram_threads, telegram_messages, telegram_thread_participants, internal_message_threads, internal_message_thread_participants, internal_messages, notifications, notification_recipients, admin_notifications, user_feedback, patient_follow_ups, user_messages

### Full Migration (server migration)
All clinical tables PLUS: users, admins, user_settings, user_profile_logs, telegram_link_codes, mission_requests

**Never included**: passkey_credentials, totp_credentials, oidc (users must re-setup 2FA on new server)

## Creating Backups

### From Mobile App
1. Open Admin Dashboard > Database Backups
2. Select mode: "Clinical Backup" or "Full Migration"
3. Optionally deselect specific tables
4. Tap "Create Backup"
5. Wait for progress: reading tables > packaging JSON > uploading to server
6. Backup appears in history with "Mobile" source badge

### From Web Admin Dashboard
1. Open Admin Dashboard > Database Backups
2. Click "Clinical Backup" or "Full Migration" button in the "Create Server Backup" card
3. Server queries PostgreSQL directly and uploads JSON to S3
4. Backup appears in list with "Server" source badge

## Exporting Encrypted Backups

### From Mobile App
1. Open Admin Dashboard > Database Backups
2. Tap "Export Encrypted" on any available backup
3. Enter a passphrase (min 12 characters) and confirm it
4. The backup is encrypted (AES-256-GCM) and saved as a `.fajr-backup` file
5. Share sheet opens — save to Files, AirDrop, email, etc.

### From Web Admin Dashboard
1. Open Admin Dashboard > Database Backups
2. Expand a backup > click "Download Encrypted"
3. Enter a passphrase (min 12 characters)
4. The encrypted `.fajr-backup` file downloads to your browser

### Importing an Encrypted Backup
1. Open Admin Dashboard > Database Backups
2. In the "Import Encrypted Backup" card, select a `.fajr-backup` file
3. Enter the passphrase used to encrypt it
4. Click "Decrypt & Import" — the file is decrypted server-side and stored in S3
5. The backup appears in the list and can be restored normally

## Restoring Data

### From the Web Admin Dashboard (Same Server)
1. Open Admin Dashboard > Database Backups
2. Click a backup > "View & Restore"
3. Click "Preview Restore" to compare backup data vs current database
4. Select which tables to restore (all pre-selected by default)
5. Choose conflict strategy:
   - **Skip** (default) — Don't overwrite existing records
   - **Overwrite** — Replace all matching records by ID
   - **Newer wins** — Only overwrite if backup record has a newer `updatedAt`
6. Click "Restore" and confirm
7. Review per-table results (inserted, skipped, failed counts)

### Destructive Restore (Same Server, Full Migration)
For replacing all data on an existing server (e.g., syncing from a different environment):
1. Select a **Full Migration** backup > "View & Restore"
2. Enable **Destructive Restore Mode** in the warning panel
3. Type `DELETE ALL DATA` in the confirmation field
4. Check the "I understand" checkbox
5. Click "Destructive Restore" and confirm
6. Selected tables are TRUNCATEd (in reverse FK order) before inserting backup data

## Restoring on a New Server (Migration Playbook)

### Prerequisites
- New server has PostgreSQL running
- Drizzle migrations applied: `cd apps/web && pnpm db:migrate`
- Object storage (RustFS) accessible and configured in `.env`
- `.env` configured with DATABASE_URL, OBJECT_STORAGE_* vars, JWT_SECRET, etc.
- Web app deployed and accessible

### Option A: Setup Wizard (Recommended)
1. Deploy the web app on the new server
2. Navigate to the app — you'll be redirected to `/setup` (empty database detected)
3. Choose "Import Existing Database"
4. Upload a `.fajr-backup` file (exported from mobile or downloaded from old server)
5. Enter the passphrase used to encrypt it
6. Review the preview (table counts, user accounts, admin list)
7. Optionally toggle "Require password reset for all imported users"
8. Click "Restore Database"
9. After completion, go to Login — imported users can log in with their existing credentials
10. All users must re-setup 2FA (passkeys/TOTP are not backed up)

### Option B: S3 Accessible from New Server
If both old and new servers share the same S3/RustFS instance (or you've copied the bucket):
1. Deploy the web app on the new server
2. Create a first admin account via `/setup` > "Start Fresh"
3. The backup list may show existing backups if the `backups` table was migrated
4. Select the desired backup > Preview > Restore with "Overwrite" strategy

### Option C: Manual Upload via API
If S3 is not shared and the setup wizard is not suitable:
1. On the **old server**: Download an encrypted backup via the admin dashboard
2. On the **new server**: Use the setup wizard upload, OR create an admin account first and use the admin dashboard's "Import Encrypted Backup" feature

### Post-Restore Checklist
- [ ] Verify record counts match expectations (check patients, users, notes tables)
- [ ] Test login with an existing user account
- [ ] Users must **re-setup 2FA** (passkeys, TOTP credentials are not backed up)
- [ ] Verify PowerSync sync rules point to the new DATABASE_URL
- [ ] Check media files: S3 file paths in `patient_media.url`, `mission_attachments.file_path` etc. must still resolve (same bucket or migrated)
- [ ] Test Telegram bot connectivity (if applicable)
- [ ] Verify push notification device tokens (may need re-registration)

## Backup JSON Format

```json
{
  "version": 1,
  "backupMode": "clinical | full_migration",
  "createdAt": "2026-03-26T10:30:00.000Z",
  "deviceInfo": {
    "platform": "ios | android | server",
    "appVersion": "1.0.0"
  },
  "tables": {
    "patients": {
      "columns": ["id", "first_name", "last_name", ...],
      "records": [
        { "id": "uuid", "first_name": "John", ... },
        ...
      ]
    },
    "notes": { ... },
    ...
  }
}
```

**Format notes:**
- Column names are **snake_case** (PostgreSQL/PowerSync format)
- JSON-type columns are stored as **stringified JSON text** (e.g. `"phone": "{\"mobile\":\"123\"}"`)
- Booleans: **0/1 integers** (mobile backups) or **true/false** (server backups) — restore handles both
- Timestamps as **ISO-8601 strings**
- Mobile and server backups use the **same format** and are fully interchangeable

## Encryption

Backup files are encrypted using **AES-256-GCM** with **PBKDF2** key derivation (SHA-256, 600k iterations).

- File extension: `.fajr-backup`
- Binary format: `FAJR` magic bytes + version + algo + salt + IV + auth tag + ciphertext
- Passphrase minimum: 12 characters
- Passphrase is never stored — used only transiently for encrypt/decrypt
- Server uses Node.js `crypto` module; mobile uses `react-native-quick-crypto`

## API Reference

All admin routes require authentication: `Authorization: Bearer <token>`
Setup routes are unauthenticated but guarded by empty-DB check.

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/POST/backups/upload` | POST | Admin | Upload backup JSON (FormData: file, tables, totalRecords, backupMode, deviceInfo, checksum) |
| `/api/admin/POST/backups/upload-encrypted` | POST | Admin | Upload encrypted .fajr-backup file (FormData: file, passphrase) |
| `/api/admin/POST/backups/create-server` | POST | Admin | Create backup from server DB (JSON: backupMode, selectedTables?) |
| `/api/admin/POST/backups/[id]/download-encrypted` | POST | Admin | Download backup as encrypted .fajr-backup (JSON: passphrase) |
| `/api/admin/POST/backups/[id]/delete` | POST | Admin | Delete backup (S3 file + DB record) |
| `/api/admin/POST/backups/restore` | POST | Admin | Execute restore (JSON: backupId, selectedTables, conflictStrategy, destructive?, confirmationPhrase?) |
| `/api/admin/GET/backups` | GET | Admin | List backups (query: page, limit, status, mode) |
| `/api/admin/GET/backups/[id]` | GET | Admin | Backup detail + signed download URL + restore history |
| `/api/admin/GET/backups/[id]/preview` | GET | Admin | Compare backup tables vs current DB (counts per table) |
| `/api/setup/check` | GET | None | Returns `{ isEmpty: boolean }` — is the DB empty? |
| `/api/setup/upload-and-preview` | POST | None* | Upload encrypted file + passphrase, returns preview |
| `/api/setup/restore` | POST | None* | Execute restore on empty DB (JSON: setupToken, requirePasswordReset?) |

*Setup routes return 403 if any users exist in the database.

## Database Tables

- **`backups`** — Backup metadata (id, createdBy, fileName, filePath, fileSize, status, backupMode, backupSource, tables manifest, totalRecords, checksum, deviceInfo, expiresAt)
- **`backup_restores`** — Restore audit trail (id, backupId, restoredBy, status, conflictStrategy, per-table results, error log, timestamps)

## Key Files

| File | Purpose |
|------|---------|
| `packages/shared/src/backup/encryption.ts` | Shared encryption types, constants, file format spec |
| `apps/web/lib/backup/encryptionService.ts` | Server-side AES-256-GCM encrypt/decrypt |
| `apps/web/lib/backup/restoreService.ts` | Core restore logic (batch upsert, FK ordering, destructive truncate) |
| `apps/web/lib/backup/backupGenerator.ts` | Server-side PG -> JSON backup generator |
| `apps/web/lib/backup/columnMaps.ts` | PowerSync <-> Drizzle column mappings (28 tables) |
| `apps/web/db/schema/backups.ts` | Drizzle schema for backup tables |
| `apps/web/app/api/admin/POST/backups/` | Upload, upload-encrypted, restore, delete, create-server, download-encrypted routes |
| `apps/web/app/api/admin/GET/backups/` | List, detail, preview routes |
| `apps/web/app/api/setup/` | Setup wizard API (check, upload-and-preview, restore) |
| `apps/web/app/setup/page.tsx` | Setup wizard UI (new server import flow) |
| `apps/web/components/adminDashboard/sections/database-backups/` | Web admin backup UI (View + ViewModel) |
| `apps/mobile/src/services/backup/encryptionService.ts` | Mobile AES-256-GCM encrypt/decrypt via react-native-quick-crypto |
| `apps/mobile/src/components/admin/sections/backup/` | Mobile backup UI (BackupView, PassphraseModal) |
| `apps/mobile/src/viewModels/admin/useBackupViewModel.ts` | Mobile backup ViewModel (create, export, fetch) |
| `packages/shared/src/admin/types.ts` | Shared types (BackupSummary, table lists, etc.) |
