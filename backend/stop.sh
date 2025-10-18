#!/usr/bin/env bash
set -euo pipefail

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$BASEDIR/backend.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "No PID file found. Is the backend running?" >&2
  exit 1
fi

PID=$(cat "$PIDFILE")
if [ -z "$PID" ]; then
  echo "PID file empty. Removing." >&2
  rm -f "$PIDFILE"
  exit 1
fi

echo "Stopping backend (pid=$PID)..."
kill "$PID" || true
sleep 1
if kill -0 "$PID" 2>/dev/null; then
  echo "Process still running, sending SIGKILL..."
  kill -9 "$PID" || true
fi
rm -f "$PIDFILE"
echo "Backend stopped."
