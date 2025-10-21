#!/bin/bash

# Start backend only
echo "🚀 Starting backend..."

# Kill any existing backend
pkill -9 -f "node.*index.js" 2>/dev/null
lsof -ti:55000 | xargs kill -9 2>/dev/null
sleep 2

# Start it
cd "$(dirname "$0")/backend"
npm start