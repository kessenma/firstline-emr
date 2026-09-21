#!/bin/sh
# Ensure NVM is loaded and use the project's Node version before starting

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use
else
  echo "NVM is not installed or not found at $NVM_DIR. Please install NVM."
  exit 1
fi

# Detect local IP address for physical device support
# This allows physical devices to connect to Metro bundler
get_local_ip() {
  # Try to get local IP from common network interfaces
  # Prioritize WiFi and Ethernet over other interfaces
  local ip=""

  # macOS/Linux - try multiple methods
  if command -v ipconfig >/dev/null 2>&1; then
    # macOS
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
  fi

  if [ -z "$ip" ]; then
    # Linux/macOS fallback using ifconfig
    ip=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1 | sed 's/addr://')
  fi

  if [ -z "$ip" ]; then
    # Another fallback using hostname
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi

  # If still no IP found, use localhost
  if [ -z "$ip" ]; then
    ip="localhost"
  fi

  echo "$ip"
}

LOCAL_IP=$(get_local_ip)

echo "🌐 Starting Metro bundler..."
echo "📡 Binding to: 0.0.0.0 (all interfaces)"
echo "📱 Simulator can connect to: http://localhost:8081"
echo "📱 Physical devices can connect to: http://$LOCAL_IP:8081"
echo ""

# Start Rock dev server on all interfaces (0.0.0.0)
# This allows both localhost (simulator) and local IP (physical devices) to connect
rock start --host 0.0.0.0
