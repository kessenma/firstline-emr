# Coolify Build Optimization Guide

This guide explains how to optimize Docker builds specifically for Coolify deployments.

## Coolify-Specific Optimizations

Coolify supports several build optimization features that we can leverage:

### 1. BuildKit Cache Backend

Coolify supports Docker BuildKit with registry cache backend. Add this to your build configuration:

```dockerfile
# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy monorepo root package files first for better caching
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies with BuildKit cache mount (works in Coolify)
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    bun install
```

### 2. Coolify Environment Variables

Set these in your Coolify application settings:

```bash
# Enable BuildKit
DOCKER_BUILDKIT=1
BUILDKIT_INLINE_CACHE=1

# Optimize build context
COMPOSE_DOCKER_CLI_BUILD=1
```

### 3. Registry Cache (Recommended for Coolify)

Instead of local cache mounts, use registry cache which Coolify supports better:

```bash
# In your Coolify build settings, add these build args:
--cache-from=type=registry,ref=your-registry/your-app:cache
--cache-to=type=registry,ref=your-registry/your-app:cache,mode=max
```

### 4. Coolify Build Hooks

Create a `.coolify/build.sh` script for pre-build optimizations:

```bash
#!/bin/bash
# Pre-build optimization script for Coolify

# Clean up old build artifacts
rm -rf apps/web/.next/cache/*

# Ensure proper permissions
chmod -R 755 apps/web/

# Log build context size
echo "Build context size:"
du -sh . | head -1
```

## Current Working Setup for Coolify

Your current Dockerfile is already optimized for Coolify with:

1. **Multi-stage builds** - Coolify handles these efficiently
2. **Layer optimization** - Dependencies cached separately from source code
3. **Minimal build context** - .dockerignore reduces upload time to Coolify

## Performance Tips for Coolify

1. **Use Coolify's built-in caching**: Don't fight the platform, work with it
2. **Optimize .dockerignore**: Reduces upload time to Coolify servers
3. **Layer ordering**: Keep changing files last in COPY commands
4. **Registry caching**: Better than local cache mounts for cloud deployments

## Coolify-Specific Build Command

If you want to enable advanced caching in Coolify, you can modify your docker-compose.web.yml:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: runner
      cache_from:
        - your-registry/your-app:cache
      args:
        BUILDKIT_INLINE_CACHE: 1
```

## Expected Performance with Current Setup

- **First build**: Normal time (3-5 minutes)
- **Code changes**: 40-60% faster due to layer caching
- **Dependency changes**: Only deps layer rebuilds
- **Config changes**: Only config and subsequent layers rebuild

Your current setup is already well-optimized for Coolify's architecture!
