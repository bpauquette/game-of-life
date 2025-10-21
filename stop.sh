#!/bin/bash

# Game of Life Stop Script
echo "🛑 Stopping Game of Life services..."

# Kill frontend and backend processes
pkill -f "react-scripts\|npm.*start" 2>/dev/null
pkill -f "node.*index.js" 2>/dev/null

# Wait a moment
sleep 2

# Force kill if still running
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:55000 | xargs kill -9 2>/dev/null

echo "✅ Services stopped"