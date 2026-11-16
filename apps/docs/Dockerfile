# syntax=docker/dockerfile:1.6
# apps/docs/Dockerfile: static docs site (docs.firstline.care)
#
# Build context is the REPOSITORY ROOT (the pnpm lockfile lives there):
#   docker build -f apps/docs/Dockerfile -t firstline-docs .
#   docker run --rm -p 8080:80 firstline-docs
#
# Output is plain HTML/CSS/JS served by nginx. There's no Node.js at runtime.

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
WORKDIR /repo

# 1. Prune the monorepo down to just the docs app + a matching lockfile
FROM base AS pruner
COPY . .
RUN npx --yes turbo@2.5.6 prune docs --docker

# 2. Install dependencies (cached unless package.json/lockfile change), then build
FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter docs build

# 3. Serve the static export
FROM nginx:stable-alpine AS runner
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/docs/out /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
