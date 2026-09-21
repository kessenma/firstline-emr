# Use the official PowerSync service image as base
FROM journeyapps/powersync-service:latest

# Switch to root for setup
USER root

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create config directory
RUN mkdir -p /config

# Copy configuration files (sync-rules only - config.yaml is generated at runtime)
COPY config/sync-rules.yaml /config/sync-rules.yaml
COPY custom-functions/ /config/custom-functions/

# Copy and setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variable to point to config
ENV POWERSYNC_CONFIG_PATH=/config/config.yaml

# Expose ports
EXPOSE 6061 6062

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:6061/probes/liveness || exit 1

# Use entrypoint to generate config from DATABASE_URL then start PowerSync
ENTRYPOINT ["/entrypoint.sh"]
