#!/bin/bash

# Simple Game of Life Restart Script
echo "🔄 Restarting Game of Life..."

# Kill everything aggressively
echo "🛑 Killing all processes..."
pkill -9 -f "react-scripts" 2>/dev/null
pkill -9 -f "npm.*start" 2>/dev/null  
pkill -9 -f "node.*index.js" 2>/dev/null
pkill -9 -f "webpack" 2>/dev/null

# Load .env for centralized ports (if present)
ENV_FILE="$(dirname "$0")/.env"
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC2046
    export $(grep -E '^(PORT|GOL_BACKEND_PORT)=' "$ENV_FILE" | xargs)
fi
FRONTEND_PORT="${PORT:-3000}"
BACKEND_PORT="${GOL_BACKEND_PORT:-55000}"

# Force kill ports
lsof -ti:"$FRONTEND_PORT" | xargs kill -9 2>/dev/null
lsof -ti:"$BACKEND_PORT" | xargs kill -9 2>/dev/null

sleep 3

# Start backend
echo "🚀 Starting backend..."
cd "$(dirname "$0")/backend"
npm start &
sleep 5

# Test backend
if curl -s "http://localhost:${BACKEND_PORT}/v1/health" >/dev/null 2>&1; then
    echo "✅ Backend running"
else
    echo "❌ Backend failed - check backend/error.log"
    exit 1
fi

# Start frontend
echo "🚀 Starting frontend..."
cd "$(dirname "$0")"
npm start &
sleep 10

echo "✅ Done!"
echo "🌐 Frontend: http://localhost:${FRONTEND_PORT}"
echo "🔧 Backend:  http://localhost:${BACKEND_PORT}"