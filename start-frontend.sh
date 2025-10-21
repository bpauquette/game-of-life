#!/bin/bash

# Start frontend only
echo "🚀 Starting frontend..."

# Kill any existing frontend
pkill -9 -f "react-scripts" 2>/dev/null
pkill -9 -f "npm.*start" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Start it
cd "$(dirname "$0")"
npm start