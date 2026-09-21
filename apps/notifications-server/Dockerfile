# Build stage
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o notifications-server .

# Runtime stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Create a non-privileged user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/notifications" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    notifications || true

# Create app directory
RUN mkdir -p /notifications && chown -R notifications:notifications /notifications

# Set working directory
WORKDIR /notifications

# Copy binary from builder
COPY --from=builder /app/notifications-server .

# Change ownership
RUN chown notifications:notifications notifications-server

# Switch to non-privileged user
USER notifications

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./notifications-server"]
