#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tunnel.sh  —  Start Expo Metro + localtunnel (ngrok replacement)
#
# Usage:
#   ./scripts/tunnel.sh
#
# Requirements: node, npx
# ─────────────────────────────────────────────────────────────────────────────

PORT=8081

# Kill any stale Metro on our port
STALE=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$STALE" ]; then
  echo "⚠  Killing stale process on :$PORT (pid $STALE)"
  kill -9 $STALE 2>/dev/null
  sleep 1
fi

echo "🚀 Starting Metro on port $PORT..."
# Start Metro in background
npx expo start --port $PORT &
METRO_PID=$!

echo "⏳ Waiting for Metro to be ready..."
# Wait up to 30s for Metro to come up
for i in $(seq 1 30); do
  if curl -sf "http://localhost:$PORT/status" > /dev/null 2>&1; then
    echo "✅ Metro is ready!"
    break
  fi
  sleep 1
done

echo ""
echo "🌐 Opening localtunnel to port $PORT..."
# Run localtunnel — it will print the public URL
npx localtunnel --port $PORT &
LT_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Open Expo Go on your phone and enter the URL"
echo " printed above by localtunnel (https://xxx.loca.lt)"
echo " Use: exp://xxx.loca.lt  in the Expo Go URL field"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo " Press Ctrl+C to stop both Metro and the tunnel."
echo ""

# Wait for either process to exit
wait $METRO_PID $LT_PID
