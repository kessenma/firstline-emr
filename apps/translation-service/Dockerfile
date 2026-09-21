# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for CTranslate2 optimization
RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y \
    libgomp1 \
    curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Install uv for faster package management
RUN pip install --no-cache-dir uv

# Create a non-privileged user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/app" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    translator || true

# Create models directory with proper permissions
RUN mkdir -p /app/models && chown -R translator:translator /app

# Copy uv project files and install Python dependencies
COPY --chown=translator:translator pyproject.toml uv.lock ./

# Use uv sync for faster, more reliable package management
RUN uv sync --frozen --no-dev

# Copy application code
COPY --chown=translator:translator app.py .

# Switch to non-privileged user
USER translator

# Expose port (configurable via TRANSLATION_PORT, defaults to 9000)
ARG TRANSLATION_PORT=9000
EXPOSE ${TRANSLATION_PORT}

# Environment variable for runtime
ENV TRANSLATION_PORT=${TRANSLATION_PORT}

# Health check using environment variable and API key
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f -H "X-API-Key: ${TRANSLATION_API_KEY}" http://localhost:${TRANSLATION_PORT}/health || exit 1

# Run the application
CMD ["uv", "run", "python", "app.py"]
