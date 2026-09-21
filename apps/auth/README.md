# Fajr SSO Authentication Service

This service provides Single Sign-On (SSO) across all Fajr Mission applications using [Zitadel](https://zitadel.com/).

## Architecture

```
                         ┌─────────────────────────────────┐
                         │      Zitadel (Identity)         │
                         │   identity.fajrmission.org      │
                         └───────────────┬─────────────────┘
                                         │ OIDC
            ┌────────────────────────────┼────────────────────────────┐
            │                            │                            │
            ▼                            ▼                            ▼
   ┌─────────────────┐        ┌─────────────────┐         ┌─────────────────┐
   │   MedFlow EMR   │        │  OAuth2 Proxy   │         │  OAuth2 Proxy   │
   │   (NextAuth)    │        │       ↓         │         │       ↓         │
   │                 │        │ Drizzle Studio  │         │  RustFS Console │
   └─────────────────┘        └─────────────────┘         └─────────────────┘
```

## Services

| Service | Domain | Purpose |
|---------|--------|---------|
| Zitadel | identity.fajrmission.org | Central identity provider |
| OAuth2 Proxy (Analytics) | analytics.fajrmission.org | Protects Drizzle Studio |
| OAuth2 Proxy (Storage) | console.storage.fajrmission.org | Protects RustFS Console |

## Setup

### 1. Generate Required Secrets

```bash
# Generate Zitadel master key (exactly 32 hex characters - guaranteed)
openssl rand -hex 16

# Generate cookie secret for OAuth2 Proxy (32 bytes base64)
openssl rand -base64 32
```

### 2. Create Zitadel Database

Run the database init service (uses your existing Postgres credentials from .env):

```bash
docker-compose -f docker-compose.auth.yml --profile init run --rm zitadel-db-init
```

Or manually via psql:
```sql
CREATE DATABASE zitadel;
```

### 3. Configure Environment

Copy `.env.auth.example` to `.env.auth.local` and fill in the values:

```bash
cp .env.auth.example .env.auth.local
```

### 4. Deploy

```bash
docker-compose -f docker-compose.auth.yml up -d
```

### 5. Initial Zitadel Setup

1. Access https://identity.fajrmission.org
2. Login with the admin credentials from your env file
3. Create a new project for your applications
4. For each app that needs SSO, create an OIDC application:
   - **MedFlow EMR**: Web application, Authorization Code flow
   - **Analytics Proxy**: Web application, Authorization Code flow
   - **Storage Proxy**: Web application, Authorization Code flow

### 6. Configure OAuth2 Proxy

After creating applications in Zitadel, update the environment variables:
- `OAUTH2_PROXY_CLIENT_ID` / `OAUTH2_PROXY_CLIENT_SECRET`
- `OAUTH2_PROXY_STORAGE_CLIENT_ID` / `OAUTH2_PROXY_STORAGE_CLIENT_SECRET`

### 7. Update NextAuth

Add Zitadel as an OIDC provider in your NextAuth configuration.

## User Migration

To migrate existing users from the MedFlow database to Zitadel:

1. Export users using the provided script (coming soon)
2. Import via Zitadel Management API
3. Users will need to re-register passkeys in Zitadel

## Server Migration (Zitadel database)

Zitadel keeps **all** of its state — projects, OIDC applications and their client
secrets, users, passkeys, the Generic-OIDC federation, and branding — in its own
`zitadel` Postgres database, with every secret encrypted at rest by
`ZITADEL_MASTERKEY`. The app's main backup/restore tool does **not** touch this
database, so moving Zitadel to a new server uses two dedicated scripts.

```bash
# On the OLD server — snapshot the zitadel database + a metadata sidecar
./apps/auth/backup-zitadel.sh                 # writes ./zitadel-backups/zitadel-<ts>.dump (+ .meta.json)
./apps/auth/backup-zitadel.sh /path/to/out    # or choose an output directory

# On the NEW server — restore BEFORE starting the Zitadel container
./apps/auth/restore-zitadel.sh ./zitadel-backups/zitadel-<ts>.dump
```

Both scripts read `DATABASE_URL`, `ZITADEL_MASTERKEY`, and `ZITADEL_DOMAIN` from
the environment, auto-sourcing `./.env` and `./.env.auth.local` if present. They
require `pg_dump`/`pg_restore`/`psql` whose major version is **≥** the Postgres
server's.

### Three invariants that MUST hold on the new server

| Invariant | Why it matters |
|-----------|----------------|
| Same **`ZITADEL_MASTERKEY`** | Decrypts every secret in the DB. `restore-zitadel.sh` compares a SHA-256 fingerprint against the dump's sidecar and **refuses** on mismatch (override with `--force`). |
| Same **external domain** (`ZITADEL_DOMAIN`) | Baked into the token issuer, OIDC redirect URIs, and the **WebAuthn RP-ID** passkeys are bound to. Keep the domain and repoint DNS → passkeys/redirects survive; change it → users must re-enroll passkeys. |
| Same **Zitadel version** | Restore into the same version pinned in `apps/auth/Dockerfile` (`v2.64.1`); upgrade separately after a clean migration. |

### Order of operations (new server)

1. Bring up Postgres and the app, but **do not start the Zitadel container yet**
   (Zitadel holds connections; you can't restore its DB while it runs).
2. Ensure the original `ZITADEL_MASTERKEY` is set on the host.
3. Run `restore-zitadel.sh` (it drops/recreates `zitadel`, then loads the dump).
4. **Then** start the Zitadel container — `start-from-init` detects the restored
   instance and skips re-seeding a fresh org/admin.

> These scripts are the CLI equivalent of the one-click "Include authentication"
> option in the admin dashboard's Database Backups section, which bundles this
> same Zitadel dump (plus app passkey/TOTP credentials) into an encrypted backup.

## Troubleshooting

### Zitadel won't start
- Ensure the `zitadel` database exists in Postgres
- Check that `ZITADEL_MASTERKEY` is exactly 32 characters
- Verify Postgres connection details

### OAuth2 Proxy redirect issues
- Ensure the redirect URIs in Zitadel match exactly
- Check that cookies are being set (HTTPS required)

### CORS errors
- Verify `ZITADEL_EXTERNALDOMAIN` matches your actual domain
