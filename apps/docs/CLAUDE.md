# apps/docs: Firstline self-hosting docs (docs.firstline.care)

Static docs site for **IT managers who self-host Firstline**. Fumadocs (`fumadocs-ui` via the Base UI
build, `fumadocs-core`, `fumadocs-mdx`) on Next.js 16, exported with `output: 'export'`.

## Layout

| Path | What |
| --- | --- |
| `content/docs/**.mdx` | Pages. Frontmatter: `title`, `description` |
| `content/docs/**/meta.json` | Sidebar order (`pages`). Root `meta.json` uses `---Label---` separators and `...folder` to flatten folders into labeled sections |
| `app/(docs)/[[...slug]]/page.tsx` | Renders every page. Docs are mounted at the site root (`docsRoute = '/'` in `lib/shared.ts`) |
| `app/api/search/route.ts` | Static Orama index (`staticGET`), fetched and searched in the browser by `components/search.tsx` |
| `app/llms*.txt`, `app/llms.mdx/` | Markdown copies for "Copy Markdown" and LLM tools |
| `app/og/pages/` | Build-time Open Graph images |
| `app/global.css` | Theme: `--color-fd-*` overrides (Firstline teal; hex values copied from `packages/shared/src/theme/palette.ts`) and fonts |
| `lib/layout.shared.tsx` | Header ("[logo] Firstline / Docs" breadcrumb, PocketDev-docs style), GitHub + "Open Firstline" links |
| `components/mdx.tsx` | MDX components available without imports (Callout, Steps, Tabs, Cards, …) |

## Rules

- **Static only.** No server-only features: no dynamic route handlers, no `cookies()`/`headers()`, and
  no ISR. Every route must prerender (`revalidate = false`, `generateStaticParams`).
- **No workspace dependencies.** It's deliberately standalone, so `turbo prune docs` stays tiny. Copy
  brand values in; don't import `@firstline/shared`.
- **Internal links** use trailing slashes (`/self-hosting/overview/`) because `trailingSlash: true`.
- **Audience is IT managers**, not developers. Put commands in fenced code blocks, and use callouts for
  warnings that can cause data loss or a security exposure. End pages with "Upstream docs" links rather
  than duplicating Coolify or Docker docs.
- **Numbers:** label measured resource numbers with their source and date. Don't document unbuilt
  features (e.g. the staff Telegram bot) until they ship.
- Fumadocs APIs change often. Check https://fumadocs.dev/llms.txt before changing layout or search
  code.

## Known noise

`next build` prints a Turbopack CSS warning about `::highlight(fd-search)` coming from Fumadocs'
stylesheet. It's harmless: the rule and the theme are still emitted.
