# Firstline EMR

An offline-first electronic medical record system built for field and
low-connectivity clinical work — mobile clinics, field hospitals, and
humanitarian deployments where the network is unreliable and care cannot wait
for it.

Clinicians work from a local database that syncs when a connection appears.
Patients reach the clinic through a Telegram bot rather than an app install.

> **Status: pre-production.** This is working software under active development,
> not a certified medical device. It has no regulatory clearance and no
> third-party security audit. Read [SECURITY.md](SECURITY.md) before deploying
> it anywhere near real patient data.

## Why it's built this way

| Constraint | Consequence in the code |
|---|---|
| Connectivity drops mid-visit | Mobile reads and writes a local SQLite database; [PowerSync](https://powersync.com) replicates to PostgreSQL when a link returns. Writes queue and replay. |
| Patients have Telegram, not app stores | Intake and two-way messaging run through a Telegram bot; patients get a one-time web form link instead of installing anything. |
| Patients and staff share no language | Message-level translation with per-message toggles; intake and confirmations in English, Arabic, Farsi, Pashto, Turkish, Urdu, Spanish, and French. |
| Multiple clinicians, one patient | Per-patient care teams with roles independent of account type, plus explicit conflict records when two devices claim the same lead offline. |
| Bandwidth is expensive | Signed-URL media with layered caches — in-memory, on-device SQLite, and a failure cooldown to stop retry storms. |

## Layout

```
apps/
  web                   Next.js 16 — API routes, patient chart, admin dashboard
  mobile                React Native 0.84 (bare, New Arch) — offline-first client
  notifications-server  Go — Telegram bot + APNs/FCM push via Gorush
  powersync-server      PowerSync service + sync rules
  translation-service   Translation API
  auth                  Zitadel SSO + oauth2-proxy
  object-storage        S3-compatible storage (RustFS)
  livekit-server        WebRTC SFU for staff calling
  analytics             Self-hosted analytics
packages/
  shared                Shared types, media/audio utilities, legal copy
```

## Stack

**Web** — Next.js 16, React 19, Drizzle ORM on PostgreSQL, NextAuth, Tailwind 4, TanStack Query
**Mobile** — React Native 0.84 (Rock + Re.Pack), PowerSync 2.x, op-sqlite
**Services** — Go 1.23, PostgreSQL with logical replication, S3-compatible object storage
**Tooling** — pnpm 8 workspaces, Turborepo, Node 22

## Getting started

Requires Node 22, pnpm 8, PostgreSQL 14+ with logical replication, and Docker.

```bash
git clone https://github.com/<your-username>/firstline-emr.git
cd firstline-emr
pnpm install
```

Configuration comes from environment files. Copy the examples and fill them in —
**every secret must be one you generate yourself**:

```bash
cp .env.auth.example .env.auth.local
cp .env.powersync.example .env.powersync

openssl rand -base64 48   # JWT_SECRET, NEXTAUTH_SECRET
openssl rand -hex 32      # service API keys
```

Then:

```bash
pnpm dev --filter=web     # web app on :3000
pnpm dev --filter=mobile  # React Native bundler
```

PostgreSQL needs `wal_level=logical` for PowerSync to replicate; see
[docs/ENABLE_LOGICAL_REPLICATION.md](docs/ENABLE_LOGICAL_REPLICATION.md).
Service compose files live at the repository root (`docker-compose.*.yml`) and
each expects a reverse proxy to terminate TLS in front of it.

## Architecture docs

[CLAUDE.md](CLAUDE.md) is the map — it describes the monorepo and links a guide
for each subsystem. The cross-cutting systems (notifications, media and audio,
Telegram messaging) are documented there; the offline sync layer is documented in
[apps/mobile/src/services/powersync/](apps/mobile/src/services/powersync/CLAUDE.md).

Deeper reference material is under [docs/](docs/).

## Contributing

Issues and pull requests are welcome. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/) — enforced by
commitlint. Run `pnpm lint` before opening a PR.

Contributions are accepted under the Apache License 2.0, per section 5 of the
License.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
