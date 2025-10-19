#!/usr/bin/env bash
# usage: ./scripts/sonar-local.sh <TOKEN>
set -euo pipefail

TOKEN="$1"
if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <SONAR_TOKEN>"
  echo "Example: $0 squ_<your_token>"
  exit 1
fi

# Compute a host path that Docker for Windows understands when running from Git Bash
# Prefer pwd -W (Git Bash) which returns a Windows-style path; otherwise use $PWD
# Prefer POSIX path from pwd (e.g. /c/Users/...) when running in Git Bash
# because Docker on Windows will handle MSYS paths reliably.
HOST_PWD_POSIX=""
HOST_PWD_WIN=""
if command -v pwd >/dev/null 2>&1; then
  HOST_PWD_POSIX=$(pwd 2>/dev/null || true)
  HOST_PWD_WIN=$(pwd -W 2>/dev/null || true)
fi
# choose POSIX path if it looks like /c/..., otherwise fall back to Windows path
if [ -n "$HOST_PWD_POSIX" ] && [[ "$HOST_PWD_POSIX" == /* ]]; then
  HOST_PWD="$HOST_PWD_POSIX"
elif [ -n "$HOST_PWD_WIN" ]; then
  HOST_PWD="$HOST_PWD_WIN"
else
  HOST_PWD="$PWD"
fi

echo "Using host path: $HOST_PWD"

# default host URL when not provided in env
SONAR_HOST_URL=${SONAR_HOST_URL:-http://host.docker.internal:9000}

# Explicitly mount the Windows project path to avoid Git-Bash path mangling.
# Using the explicit path requested by the user: C:\\Users\\bryan\\repos\\game-of-life
HOST_PROJECT_PATH="C:/Users/bryan/repos/game-of-life"

echo "Mounting host project path: $HOST_PROJECT_PATH -> /usr/src"

docker run --rm \
  -e SONAR_HOST_URL="$SONAR_HOST_URL" \
  -e SONAR_TOKEN="$TOKEN" \
  -v "$HOST_PROJECT_PATH:/usr/src" \
  sonarsource/sonar-scanner-cli \
  sh -c "cd /usr/src && sonar-scanner -Dsonar.host.url=\"$SONAR_HOST_URL\" -Dsonar.token=\"$TOKEN\" -Dsonar.projectBaseDir=/usr/src"
