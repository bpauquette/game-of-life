#!/bin/bash

# SonarQube scan script for main branch analysis
set -e

echo "🔍 SonarQube Scan - Main Branch"
echo "===================================="

# Get current branch and commit
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_HASH=$(git rev-parse HEAD)
echo "📋 Analyzing branch: $CURRENT_BRANCH"
echo "📋 Commit: $COMMIT_HASH"

# Clean any previous scan cache
rm -rf .scannerwork

TOKEN="${1:-${SONAR_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "❌ Error: SONAR_TOKEN is not set"
  echo "Set SONAR_TOKEN or pass token as first argument."
  exit 1
fi

echo "🚀 Starting SonarQube analysis for $CURRENT_BRANCH branch..."
# Generate coverage report for Sonar (Jest/CRA produces coverage/lcov.info)
echo "🧪 Running test coverage to generate coverage/lcov.info"
npm run test:coverage || true

# Run SonarQube scan via the shared local scanner wrapper.
./scripts/sonar-local.sh "$TOKEN"

echo "✅ SonarQube analysis complete for $CURRENT_BRANCH branch"
echo "🌐 View results at: http://localhost:9000/dashboard?id=game-of-life"
echo "📋 Analyzed commit: $COMMIT_HASH from $CURRENT_BRANCH branch"
