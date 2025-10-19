#!/usr/bin/env bash
# usage: ./scripts/sonar-local.sh [TOKEN]
# If no token provided, will use SONAR_TOKEN environment variable
set -euo pipefail

# Load .env.local if it exists
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

TOKEN="${1:-${SONAR_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "Usage: $0 [SONAR_TOKEN]"
  echo "Example: $0 squ_<your_token>"
  echo ""
  echo "Alternatively, set SONAR_TOKEN environment variable or add it to .env.local"
  echo "Create .env.local with: echo 'SONAR_TOKEN=squ_your_token' > .env.local"
  exit 1
fi

# Detect environment and set appropriate paths
if grep -qi microsoft /proc/version 2>/dev/null || [ -n "${WSL_DISTRO_NAME:-}" ]; then
  # Running in WSL - use Linux paths directly
  HOST_PROJECT_PATH="$(pwd)"
  # For WSL with Docker Desktop, try host.docker.internal first, fallback to localhost
  SONAR_HOST_URL=${SONAR_HOST_URL:-http://host.docker.internal:9000}
  DOCKER_NETWORK_ARG="--network=host"
  echo "Detected WSL environment"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
  # Running in Git Bash/MSYS - use Windows path conversion
  HOST_PWD_POSIX=$(pwd 2>/dev/null || true)
  HOST_PWD_WIN=$(pwd -W 2>/dev/null || true)
  if [ -n "$HOST_PWD_POSIX" ] && [[ "$HOST_PWD_POSIX" == /* ]]; then
    HOST_PROJECT_PATH="$HOST_PWD_POSIX"
  elif [ -n "$HOST_PWD_WIN" ]; then
    HOST_PROJECT_PATH="$HOST_PWD_WIN"
  else
    HOST_PROJECT_PATH="$PWD"
  fi
  SONAR_HOST_URL=${SONAR_HOST_URL:-http://host.docker.internal:9000}
  DOCKER_NETWORK_ARG=""
  echo "Detected Windows/Git Bash environment"
else
  # Running on native Linux/macOS
  HOST_PROJECT_PATH="$(pwd)"
  SONAR_HOST_URL=${SONAR_HOST_URL:-http://localhost:9000}
  DOCKER_NETWORK_ARG="--network=host"
  echo "Detected native Linux/macOS environment"
fi

echo "Using host project path: $HOST_PROJECT_PATH"
echo "SonarQube URL: $SONAR_HOST_URL"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH"
  exit 1
fi

# Check if SonarQube is accessible
echo "Checking if SonarQube is accessible..."
if ! curl -s --connect-timeout 5 "$SONAR_HOST_URL/api/system/status" > /dev/null 2>&1; then
  echo "Warning: SonarQube may not be running at $SONAR_HOST_URL"
  echo "Start it with: docker-compose -f docker-compose.sonarqube.yml up -d"
  echo "Continuing anyway..."
fi

echo "Mounting host project path: $HOST_PROJECT_PATH -> /usr/src"

docker run --rm \
  -e SONAR_HOST_URL="$SONAR_HOST_URL" \
  -e SONAR_TOKEN="$TOKEN" \
  -v "$HOST_PROJECT_PATH:/usr/src" \
  $DOCKER_NETWORK_ARG \
  sonarsource/sonar-scanner-cli \
  sh -c "cd /usr/src && sonar-scanner \
    -Dsonar.host.url=\"$SONAR_HOST_URL\" \
    -Dsonar.token=\"$TOKEN\" \
    -Dsonar.projectBaseDir=/usr/src"
