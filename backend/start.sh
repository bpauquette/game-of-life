#!/usr/bin/env bash
set -euo pipefail

# Simple start script for the backend prototype.
# Writes PID to backend/backend.pid and logs to backend/backend.log

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$BASEDIR/backend.pid"
LOGFILE="$BASEDIR/backend.log"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Backend already running (pid=$PID). Use stop.sh to stop it." >&2
    exit 1
  else
    echo "Removing stale PID file." >&2
    rm -f "$PIDFILE"
  fi
fi

echo "Starting backend in $BASEDIR..."
cd "$BASEDIR"

# Allow optional GOL_BACKEND_PORT (preferred) then PORT env var; default 55000
# If GOL_BACKEND_PORT is set, use it; otherwise fall back to PORT. Start script
# honors either env var. Default to 55000 when neither is set.
: "${GOL_BACKEND_PORT:=${PORT:=55000}}"

# Start the server in the background, redirect output to log file
nohup npm start > "$LOGFILE" 2>&1 &
PID=$!
echo $PID > "$PIDFILE"
echo "Backend started (pid=$PID). Logs: $LOGFILE"
