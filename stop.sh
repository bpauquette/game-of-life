#!/usr/bin/env bash
set -euo pipefail

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$BASEDIR/frontend.pid"
PORT=${PORT:-3000}

echo "Checking frontend state (port $PORT, pidfile=$PIDFILE)..."

echo "Port $PORT listeners (if any):"
netstat -ano | findstr ":${PORT}" || true

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Stopping frontend (pid=$PID)..."
    kill $PID || true
    echo "Waiting for process to exit..."
    sleep 0.5
    if kill -0 "$PID" 2>/dev/null; then
      echo "Process still running, forcing kill..."
      kill -9 $PID || true
    fi
    rm -f "$PIDFILE" || true
    echo "Frontend stopped."
    exit 0
  else
    echo "PID file present but process not running. Removing stale PID file." >&2
    rm -f "$PIDFILE"
  fi
fi

echo "No frontend PID file found. Attempting to find process by port $PORT..."
PIDS=$(netstat -ano | findstr ":${PORT}" | awk '{print $5}' | awk -F":" '{print $2}' | tr '\n' ' ' || true)
if [ -n "$PIDS" ]; then
  echo "Found PIDs: $PIDS"
  for pid in $PIDS; do
    echo "Killing $pid..."
    taskkill /PID $pid /F || kill -9 $pid || true
  done
  echo "Done."
else
  echo "No process found listening on port $PORT. Nothing to stop."
fi

exit 0
