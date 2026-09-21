#!/bin/bash

# Local Notifications Server Development Script
# This script runs the notifications server and gorush locally for testing

set -e

echo "🚀 Starting Notifications Server Locally..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with required environment variables"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env"
    exit 1
fi

if [ -z "$APNS_KEY_BASE64" ]; then
    echo "⚠️  Warning: APNS_KEY_BASE64 not set - iOS notifications will not work"
fi

echo "📋 Configuration:"
echo "  - Database: ${DATABASE_URL:0:30}..."
echo "  - Environment: ${NODE_ENV:-development}"
echo "  - Notifications Port: ${NOTIFICATIONS_PORT:-8080}"
echo "  - Gorush Port: 8088"
echo "  - Web App: http://localhost:${PORT_ENV:-3000}"
echo ""

# Create tmp directory for gorush keys if it doesn't exist
mkdir -p ./tmp/gorush-keys

echo "🐳 Starting services with Docker Compose..."
echo ""
echo "Services will be available at:"
echo "  - Notifications Server: http://localhost:${NOTIFICATIONS_PORT:-8080}"
echo "  - Gorush: http://localhost:8088"
echo "  - Health Check: http://localhost:${NOTIFICATIONS_PORT:-8080}/health"
echo ""
echo "To test notifications from your web app, add this to your .env.local:"
echo "  NOTIFICATIONS_SERVER_URL=http://localhost:${NOTIFICATIONS_PORT:-8080}"
echo ""

# Start services using local docker-compose
docker-compose -f docker-compose.notifications.local.yml up \
    --build \
    --force-recreate \
    --remove-orphans

# Cleanup on exit
trap "echo '🧹 Cleaning up...'; docker-compose -f docker-compose.notifications.local.yml down" EXIT
