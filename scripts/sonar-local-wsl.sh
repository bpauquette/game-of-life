#!/usr/bin/env bash
# usage: ./scripts/sonar-local.sh <TOKEN>
set -euo pipefail

TOKEN="$1"
if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <SONAR_TOKEN>"
  echo "Example: $0 squ_<your_token>"
  exit 1
fi

# For WSL/Linux, use the current directory directly
# Docker in WSL can mount Linux paths natively
HOST_PROJECT_PATH="$(pwd)"

echo "Using host project path: $HOST_PROJECT_PATH"

# Default host URL - adjust for your Docker setup
# For WSL with Docker Desktop: use host.docker.internal
# For native Docker in WSL: use localhost or 172.17.0.1
SONAR_HOST_URL=${SONAR_HOST_URL:-http://localhost:9000}

echo "SonarQube URL: $SONAR_HOST_URL"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH"
  exit 1
fi

# Check if SonarQube is running
echo "Checking if SonarQube is accessible at $SONAR_HOST_URL..."
if ! curl -s --connect-timeout 5 "$SONAR_HOST_URL/api/system/status" > /dev/null 2>&1; then
  echo "Warning: SonarQube may not be running at $SONAR_HOST_URL"
  echo "Start it with: docker-compose -f docker-compose.sonarqube.yml up -d"
  echo "Continuing anyway..."
fi

echo "Mounting host project path: $HOST_PROJECT_PATH -> /usr/src"

# Run SonarQube scanner with proper WSL paths
docker run --rm \
  -e SONAR_HOST_URL="$SONAR_HOST_URL" \
  -e SONAR_TOKEN="$TOKEN" \
  -v "$HOST_PROJECT_PATH:/usr/src" \
  --network="host" \
  sonarsource/sonar-scanner-cli \
  sh -c "cd /usr/src && sonar-scanner \
    -Dsonar.host.url=\"$SONAR_HOST_URL\" \
    -Dsonar.token=\"$TOKEN\" \
    -Dsonar.projectBaseDir=/usr/src"