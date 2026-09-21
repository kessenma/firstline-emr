# Use the official LiveKit server image as base
FROM livekit/livekit-server:latest

# Create a non-privileged user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/livekit" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    livekit || true

# Create config directory
RUN mkdir -p /livekit/config && chown -R livekit:livekit /livekit

# Set working directory
WORKDIR /livekit

# Config template + the script that renders it (see entrypoint.sh for why)
COPY config.yaml /livekit/config/config.yaml
COPY entrypoint.sh /livekit/entrypoint.sh

# Set ownership and make the entrypoint executable
RUN chown livekit:livekit /livekit/config/config.yaml /livekit/entrypoint.sh \
    && chmod +x /livekit/entrypoint.sh

# Switch to non-privileged user
USER livekit

# 7880: HTTP/WebSocket signalling (proxied by Caddy, not published)
# 7881: TCP for ICE/TCP fallback
# 7882/udp: UDP mux for direct media
# 3478/udp: TURN relay (required for mobile clients behind carrier-grade NAT)
# Must stay in sync with config.yaml and docker-compose.livekit.yml.
EXPOSE 7880 7881 7882/udp 3478/udp

# Health check. LiveKit 1.13 answers 406 to a plain GET / — it expects a
# WebSocket upgrade — so an HTTP status check can never pass. A TCP connect
# is the meaningful signal that signalling is up.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD nc -z localhost 7880 || exit 1

# entrypoint.sh substitutes the bits LiveKit cannot interpolate itself
# (webhook api_key and base URL, TURN domain), then execs the server.
# API keys are passed via the LIVEKIT_KEYS environment variable.
ENTRYPOINT ["/livekit/entrypoint.sh"]
CMD []
