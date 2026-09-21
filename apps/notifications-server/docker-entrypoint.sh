#!/bin/sh
set -e

# Decode and write the APNs key from environment variable
if [ -n "$APNS_KEY_BASE64" ]; then
  echo "📝 Writing APNs key from environment variable..."
  echo "$APNS_KEY_BASE64" | base64 -d > /home/gorush/AuthKey.p8
  chmod 600 /home/gorush/AuthKey.p8
  echo "✅ APNs key written successfully"
else
  echo "⚠️  APNS_KEY_BASE64 environment variable not set"
fi

# Start gorush with the config file
exec /gorush -c /home/gorush/config.yml
