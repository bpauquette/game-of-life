#!/bin/bash

# Simple Game of Life Restart Script
echo "🔄 Restarting Game of Life..."

# Kill everything aggressively
echo "🛑 Killing all processes..."
pkill -9 -f "react-scripts" 2>/dev/null
pkill -9 -f "npm.*start" 2>/dev/null  
pkill -9 -f "node.*index.js" 2>/dev/null
pkill -9 -f "webpack" 2>/dev/null

# Force kill ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:55000 | xargs kill -9 2>/dev/null

sleep 3

# Start backend
echo "🚀 Starting backend..."
cd "$(dirname "$0")/backend"
npm start &
sleep 5

# Test backend
if curl -s http://localhost:55000/v1/health >/dev/null 2>&1; then
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
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:55000"