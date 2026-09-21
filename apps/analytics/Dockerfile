# Use the official Drizzle Gateway image as base
FROM ghcr.io/drizzle-team/gateway:latest

# Expose port for Drizzle Gateway
EXPOSE 4983

# Health check - check if the service is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4983/ || exit 1
