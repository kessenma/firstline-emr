# Firstline Docs

Source for **docs.firstline.care**, the documentation for IT teams who self-host Firstline EMR.

Built with [Fumadocs](https://fumadocs.dev) on Next.js and exported as a fully static site (`out/`).
There's no login, no database and no server code at runtime.

## Develop

```bash
# from the repo root (Node 22, pnpm 8 via corepack)
pnpm install
pnpm devDocs            # or: pnpm --filter docs dev
# → http://localhost:3100
```

## Build

```bash
pnpm --filter docs build        # static export → apps/docs/out/
pnpm --filter docs start        # preview out/ at http://localhost:3100
pnpm --filter docs check-types
```

## Write a page

1. Add an `.mdx` file under `content/docs/` with `title` and `description` frontmatter.
2. Add its file name (without `.mdx`) to the `pages` array in that folder's `meta.json`. The order there
   is the sidebar order.
3. Use the built-in components without importing them: `<Callout>`, `<Steps>`/`<Step>`,
   `<Tabs>`/`<Tab>`, `<Cards>`/`<Card>`. Code fences get syntax highlighting and a copy button.

## Docker

The Dockerfile builds from the **repository root** (it needs the root `pnpm-lock.yaml`):

```bash
docker build -f apps/docs/Dockerfile -t firstline-docs .
docker run --rm -p 8080:80 firstline-docs     # → http://localhost:8080
```

It prunes the monorepo with `turbo prune`, builds the static export, and serves it with nginx
(`nginx.conf`) on port 80.

## Deploying to Coolify (not set up yet)

When there's a target server, add the docs as a Coolify **Application**:

| Setting | Value |
| --- | --- |
| Source | This repository (GitHub App) |
| Build pack | Dockerfile |
| Base directory | `/` |
| Dockerfile location | `apps/docs/Dockerfile` |
| Port | `80` |
| Domain | `https://docs.firstline.care` |

No environment variables are needed.
