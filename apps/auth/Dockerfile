# Multi-stage build: Copy Zitadel binary to Alpine (which has shell)
FROM ghcr.io/zitadel/zitadel:v2.64.1 AS zitadel

# Use Alpine as the final image (has shell for entrypoint script)
FROM alpine:3.19

# Install required packages
RUN apk add --no-cache ca-certificates wget

# Copy Zitadel binary from official image
COPY --from=zitadel /app/zitadel /app/zitadel

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create non-root user
RUN addgroup -S zitadel && adduser -S zitadel -G zitadel
USER zitadel

WORKDIR /app

# Expose Zitadel port (configurable via ZITADEL_PORT env var, default 8080)
ARG ZITADEL_PORT=7777
EXPOSE ${ZITADEL_PORT}

# Health check uses the port from env var
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=10 \
  CMD wget -q --spider http://localhost:${ZITADEL_PORT:-7777}/debug/ready || exit 1

ENTRYPOINT ["/entrypoint.sh"]
