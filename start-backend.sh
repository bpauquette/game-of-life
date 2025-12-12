#!/bin/bash

# Start backend only (frontend repo helper)
#
# NOTE: The backend now lives in a separate repository
# (e.g. ../game-of-life-backend). This script assumes that
# repo exists next to this one and simply runs `npm start`
# from there.

echo "🚀 Starting backend from separate repo..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_REPO="$(cd "$SCRIPT_DIR/.." && pwd)/game-of-life-backend"

if [ ! -d "$BACKEND_REPO" ]; then
	echo "❌ Backend repository not found at $BACKEND_REPO"
	echo "   Clone https://github.com/bpauquette/game-of-life-backend next to this repo."
	exit 1
fi

cd "$BACKEND_REPO"
npm start