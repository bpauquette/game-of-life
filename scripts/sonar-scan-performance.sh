#!/bin/bash

# SonarQube scan script for performance branch analysis
set -e

echo "🔍 SonarQube Scan - Performance Branch"
echo "===================================="

# Get current branch and commit
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_HASH=$(git rev-parse HEAD)
echo "📋 Analyzing branch: $CURRENT_BRANCH"
echo "📋 Commit: $COMMIT_HASH"

# Clean any previous scan cache
rm -rf .scannerwork

# Set default token for local analysis if not set
SONAR_TOKEN="${SONAR_TOKEN:-sqa_default_local_token}"

echo "🚀 Starting SonarQube analysis for $CURRENT_BRANCH branch..."

# Run SonarQube scan (Community Edition - no branch support) with fresh analysis
docker run --rm \
    -v "$(pwd):/usr/src" \
    --network game-of-life_default \
    sonarsource/sonar-scanner-cli \
    -Dsonar.projectKey=game-of-life \
    -Dsonar.projectName="Game of Life" \
    -Dsonar.sources=/usr/src/src,/usr/src/backend \
    -Dsonar.tests=/usr/src/src \
    -Dsonar.test.inclusions="**/*.test.js" \
    -Dsonar.exclusions="**/node_modules/**,**/build/**,**/public/**,**/coverage/**,**/.scannerwork/**" \
    -Dsonar.host.url=http://sonarqube:9000 \
    -Dsonar.token="$SONAR_TOKEN" \
    -Dsonar.scm.provider=git \
    -Dsonar.scm.forceReloadAll=true \
    -Dsonar.projectVersion="$COMMIT_HASH"

echo "✅ SonarQube analysis complete for $CURRENT_BRANCH branch"
echo "🌐 View results at: http://localhost:9000/dashboard?id=game-of-life"
echo "📋 Analyzed commit: $COMMIT_HASH from $CURRENT_BRANCH branch"