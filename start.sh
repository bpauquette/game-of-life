#!/usr/bin/env bash
set -euo pipefail

# Simple start script for the frontend dev server (Create React App)
# Writes PID to frontend.pid and logs to frontend.log in the repo root.

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$BASEDIR/frontend.pid"
LOGFILE="$BASEDIR/frontend.log"
PORT=${PORT:-3000}

echo "Checking frontend state (port $PORT, pidfile=$PIDFILE)..."

# show any process listening on the port (best-effort)
echo "Port $PORT listeners (if any):"
netstat -ano | findstr ":${PORT}" || true

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Frontend appears to be running (pid=$PID). Logs: $LOGFILE"
    exit 0
  else
    echo "Found stale PID file (pid=$PID). Removing." >&2
    rm -f "$PIDFILE"
  fi
fi

echo "Starting frontend in $BASEDIR..."
cd "$BASEDIR"

# Start CRA dev server in background, redirect output to log
nohup npm start > "$LOGFILE" 2>&1 &
PID=$!
echo $PID > "$PIDFILE"
echo "Frontend started (pid=$PID). Logs: $LOGFILE"

echo "Listeners after start:"
sleep 0.5
netstat -ano | findstr ":${PORT}" || true

exit 0
