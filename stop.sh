#!/bin/bash

# Game of Life Stop Script
echo "🛑 Stopping Game of Life services..."

# Kill frontend and backend processes
pkill -f "react-scripts\|npm.*start" 2>/dev/null
pkill -f "node.*index.js" 2>/dev/null

# Wait a moment
sleep 2

# Load .env for centralized ports
ENV_FILE="$(dirname "$0")/.env"
if [ -f "$ENV_FILE" ]; then
	# shellcheck disable=SC2046
	export $(grep -E '^(PORT|GOL_BACKEND_PORT)=' "$ENV_FILE" | xargs)
fi
FRONTEND_PORT="${PORT:-3000}"
BACKEND_PORT="${GOL_BACKEND_PORT:-55000}"

# Force kill if still running
lsof -ti:"$FRONTEND_PORT" | xargs kill -9 2>/dev/null
lsof -ti:"$BACKEND_PORT" | xargs kill -9 2>/dev/null

echo "✅ Services stopped"