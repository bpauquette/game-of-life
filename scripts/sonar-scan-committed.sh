#!/bin/bash

# SonarQube scan script that only analyzes committed code on main branch
# This ensures we get accurate metrics for checked-in code only

set -e

echo "🔍 SonarQube Scan - Committed Code Only"
echo "======================================"

# Ensure we're on main branch and everything is committed
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Not on main branch. Current: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Uncommitted changes detected. Please commit all changes first."
    echo "Uncommitted files:"
    git diff-index --name-only HEAD --
    exit 1
fi

echo "✅ On main branch with all changes committed"

# Get current commit hash for reference
COMMIT_HASH=$(git rev-parse HEAD)
echo "📋 Analyzing commit: $COMMIT_HASH"

# Clean any previous scan cache to ensure fresh analysis
rm -rf .scannerwork

# Run SonarQube scan with explicit SCM settings
echo "🚀 Starting SonarQube analysis..."
docker run --rm \
    -v "$(pwd):/usr/src" \
    --network game-of-life_default \
    sonarsource/sonar-scanner-cli \
    -Dsonar.projectKey=game-of-life \
    -Dsonar.sources=/usr/src \
    -Dsonar.host.url=http://sonarqube:9000 \
    -Dsonar.token=REDACTED_TOKEN \
    -Dsonar.scm.provider=git \
    -Dsonar.scm.forceReloadAll=true \
    -Dsonar.projectVersion="$COMMIT_HASH"

echo "⏳ Waiting for analysis to complete..."
sleep 10

echo "📊 Getting metrics for committed code..."
./scripts/sonar-metrics.sh

echo "✅ Analysis complete for committed code on main branch"