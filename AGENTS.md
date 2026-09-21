# Agent Guide — Firstline EMR

Repository guidance for coding agents lives in **[CLAUDE.md](CLAUDE.md)**. Read that
first — it maps the monorepo and links a per-area guide for each subsystem (patient
chart, admin dashboard, notifications, PowerSync, media, Telegram).

## Layout

| Path | What |
|---|---|
| `apps/web` | Next.js app — API routes, patient chart, admin dashboard |
| `apps/mobile` | React Native (bare, Rock + Re.Pack, New Arch) — offline-first via PowerSync |
| `apps/notifications-server` | Go — Telegram bot + push notifications |
| `apps/powersync-server` | PowerSync service and sync rules |
| `apps/translation-service` | Translation API |
| `apps/auth` | Zitadel SSO and oauth2-proxy |
| `apps/object-storage` | S3-compatible storage (RustFS) |
| `apps/livekit-server` | WebRTC SFU for staff calling |
| `packages/shared` | Shared types, media/audio utilities, legal copy |

## Conventions

- **Package manager**: pnpm 8 workspaces, Node 22. Never mix in npm or yarn.
- **Commits**: Conventional Commits, enforced by commitlint.
- **Database**: Drizzle ORM. Schema lives in `apps/web/db/schema/`; migrations are
  generated, not hand-written, and every migration must appear in
  `_journal.json` or it will not run.
- **PowerSync sync rules**: no JOINs, no ORDER BY or LIMIT in data queries, single-table
  SELECTs only. Complex shapes go through views in the `powersync_views` schema.
- **Mobile runtime is Hermes**: `AbortSignal.timeout()` and `TypedArray.prototype.buffer`
  are unavailable. Use `AbortController` with `setTimeout`, and avoid `Buffer.from`
  on typed arrays.

## Secrets

No credentials belong in this repository. Configuration comes from environment
files that are gitignored; `.env.auth.example` and `.env.powersync.example` show
the shape and contain placeholders only. Generate real values locally
(`openssl rand -base64 48`) and never commit them.

## Deployment

Deployment topology is environment-specific and intentionally not described here.
The `docker-compose.*.yml` files at the repository root define the services; each
expects a reverse proxy to terminate TLS in front of it.
