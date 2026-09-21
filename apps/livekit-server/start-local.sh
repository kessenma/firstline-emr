#!/bin/bash

# LiveKit Local Development Startup Script

set -e

echo "🚀 Starting LiveKit Server for local development..."

# Check if .env file exists
if [ ! -f "../../.env" ]; then
    echo "❌ Error: .env file not found in project root"
    echo "Please copy .env.livekit.example to .env and configure it"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

# Load environment variables
export $(cat ../../.env | grep -v '^#' | xargs)

# Check required environment variables
if [ -z "$LIVEKIT_API_KEY" ] || [ -z "$LIVEKIT_API_SECRET" ]; then
    echo "⚠️  Warning: LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set"
    echo "Using default development credentials (devkey/secret)"
    export LIVEKIT_API_KEY="devkey"
    export LIVEKIT_API_SECRET="secret"
fi

# Start LiveKit server
echo "📦 Building and starting LiveKit container..."
cd ../..
docker-compose -f docker-compose.video.yml up -d

# Wait for server to be ready
echo "⏳ Waiting for LiveKit server to be ready..."
sleep 5

# Check if server is running
if curl -s http://localhost:7880/ > /dev/null; then
    echo "✅ LiveKit server is running!"
    echo ""
    echo "📍 Server URL: ws://localhost:7880"
    echo "🔑 API Key: $LIVEKIT_API_KEY"
    echo "🔐 API Secret: $LIVEKIT_API_SECRET"
    echo ""
    echo "🎥 Test the video call at: http://localhost:3000/video?room=test&user=doctor1"
    echo ""
    echo "📋 View logs: docker-compose -f docker-compose.video.yml logs -f"
    echo "🛑 Stop server: docker-compose -f docker-compose.video.yml down"
else
    echo "❌ Error: LiveKit server failed to start"
    echo "Check logs: docker-compose -f docker-compose.video.yml logs"
    exit 1
fi
