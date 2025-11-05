#!/bin/bash

# Start backend only
echo "🚀 Starting backend..."

# Load .env to get backend port
ENV_FILE="$(dirname "$0")/.env"
if [ -f "$ENV_FILE" ]; then
	# shellcheck disable=SC2046
	export $(grep -E '^GOL_BACKEND_PORT=' "$ENV_FILE" | xargs)
fi
BACKEND_PORT="${GOL_BACKEND_PORT:-55000}"

# Kill any existing backend
pkill -9 -f "node.*index.js" 2>/dev/null
lsof -ti:"$BACKEND_PORT" | xargs kill -9 2>/dev/null
sleep 2

# Start it
cd "$(dirname "$0")/backend"
npm start