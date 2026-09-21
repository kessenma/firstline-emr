# syntax=docker/dockerfile:1.6
# apps/web/Dockerfile - Using Bun for optimal performance

FROM oven/bun:1 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files from apps/web
COPY apps/web/package.json ./

# Strip workspace dependency (@fajr/shared) before install — it's pure TS with
# no external deps, so we only need to symlink it in the builder stage.
RUN sed -i '/"@fajr\/shared"/d' package.json

# Use BuildKit cache mount to cache bun's global cache between builds
# This dramatically reduces memory usage and speeds up subsequent builds
# Mounting both the install cache and the global cache for maximum efficiency
# Set BUN_INSTALL_CACHE_DIR to explicitly use the cache mount
RUN --mount=type=cache,target=/root/.bun/install/cache \
    --mount=type=cache,target=/root/.bun/cache \
    BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache \
    bun install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy all source files from apps/web
COPY apps/web/package.json ./
COPY apps/web/next.config.mjs ./
COPY apps/web/tsconfig.json ./
COPY apps/web/postcss.config.js ./
COPY apps/web/drizzle.config.ts ./
COPY apps/web/components.json ./
COPY apps/web/app ./app
COPY apps/web/components ./components
COPY apps/web/lib ./lib
COPY apps/web/hooks ./hooks
COPY apps/web/utils ./utils
COPY apps/web/stores ./stores
COPY apps/web/types ./types
COPY apps/web/styles ./styles
COPY apps/web/public ./public
COPY apps/web/db ./db
COPY apps/web/data ./data

# Copy dependencies from deps stage (cached if package.json unchanged)
COPY --from=deps /app/node_modules ./node_modules

# Copy shared package source and symlink it into node_modules
COPY packages/shared ./packages/shared
RUN mkdir -p node_modules/@fajr && ln -s /app/packages/shared node_modules/@fajr/shared

# Set build arguments - ONLY for variables that must be baked into the build
# All NEXT_PUBLIC_* variables need to be available at build time
ARG NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_TELEGRAM_BOT_NAME
ARG NEXT_PUBLIC_ANALYTICS_URL
ARG NEXT_PUBLIC_LIVEKIT_URL

# Set environment variables for the build process
# Only NEXT_PUBLIC_* vars needed here - runtime secrets will be injected at container start
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_TELEGRAM_BOT_NAME=${NEXT_PUBLIC_TELEGRAM_BOT_NAME}
ENV NEXT_PUBLIC_ANALYTICS_URL=${NEXT_PUBLIC_ANALYTICS_URL}
ENV NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}

# Build the application directly with next
#
# Bun 1.3.14 segfaults during process teardown *after* `next build` has already
# completed and written every artifact — it dies with SIGILL (exit 132) while
# tearing down the worker threads Next.js spawns for static generation. Bun's
# own crash message says this is a Bun bug, not ours. Taking the exit code at
# face value fails the image even though the build is complete and correct.
#
# So: ignore the exit status, then assert on the build output. A genuinely
# broken build produces no standalone server.js / BUILD_ID / static dir and
# still fails here, loudly. Revisit once Bun ships a fix and drop the guard.
RUN set -e; \
    bun next build || echo "next build exited non-zero — verifying artifacts before trusting that"; \
    test -f .next/standalone/server.js || { echo "FATAL: .next/standalone/server.js missing — build genuinely failed"; exit 1; }; \
    test -f .next/BUILD_ID          || { echo "FATAL: .next/BUILD_ID missing — build genuinely failed"; exit 1; }; \
    test -d .next/static            || { echo "FATAL: .next/static missing — build genuinely failed"; exit 1; }; \
    echo "next build output verified complete"



# Migration gate. Runs as a one-shot service that `web` depends on, so it
# executes with THIS release's db/migrations — see docker-compose.web.yml.
#
# It has to be its own stage because the runner stage only carries Next's
# .next/standalone output: no db/migrations, no meta/_journal.json, and only the
# dependencies Next traced. The check needs the journal, the .sql files, and pg.
#
# Deliberately NOT built from `builder` — that stage depends on `next build`
# (several minutes, and the Bun teardown workaround above). This stage only needs
# deps + source files, so it builds in seconds and, more importantly, in parallel
# with the app build rather than behind it.
FROM base AS migrator
WORKDIR /app

COPY apps/web/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/db ./db
COPY apps/web/scripts/check-migrations.ts ./scripts/check-migrations.ts

# --apply: safe (additive) pending migrations are applied so the deploy can
# proceed; anything that could lose data or break the still-running release stops
# here, as does any failure during the apply. Either way the exit code is
# non-zero and the deployment fails.
CMD ["bun", "scripts/check-migrations.ts", "--apply"]


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install bash (Coolify compatibility) and the PostgreSQL 17 client.
# pg_dump/pg_restore are used by the admin "Include authentication" backup path
# to snapshot and restore the separate Zitadel identity database. The client
# MAJOR version must be >= the Postgres server's (17). The oven/bun:1 base is
# Debian 13 "trixie", whose main repo already ships postgresql-client-17, so we
# install it directly — no PGDG repo needed. If the base ever drops below a
# Debian that ships pg17 in main, add the PGDG apt repo for the right codename.
#
# poppler-utils provides pdftoppm, which renders page one of a PDF so it can be
# thumbnailed. sharp's prebuilt libvips has no PDF support, so this is the only
# way a PDF gets a preview. It is spawned per-thumbnail and exits immediately —
# not a service. Without it, thumbnailing reports "unavailable" and the UI falls
# back to a document icon, so the image still runs correctly if this is dropped.
RUN apt-get update && apt-get install -y bash postgresql-client-17 poppler-utils \
 && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Bun image uses different commands)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy the standalone output - without outputFileTracingRoot, it's a flat structure
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public



USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js application using bun
# Without outputFileTracingRoot, server.js is at the root
CMD ["bun", "server.js"]
