#!/usr/bin/env bash
# SonarQube management helper for WSL
# Usage: ./scripts/sonar-helper.sh [start|stop|status|logs|scan]

set -euo pipefail

COMPOSE_FILE="docker-compose.sonarqube.yml"
SONAR_URL="http://localhost:9000"

case "${1:-help}" in
  start)
    echo "Starting SonarQube..."
    docker-compose -f "$COMPOSE_FILE" up -d
    echo "Waiting for SonarQube to be ready..."
    for i in {1..30}; do
      if curl -s --connect-timeout 2 "$SONAR_URL/api/system/status" > /dev/null 2>&1; then
        echo "SonarQube is ready at $SONAR_URL"
        exit 0
      fi
      echo -n "."
      sleep 2
    done
    echo "SonarQube may still be starting. Check manually at $SONAR_URL"
    ;;
    
  stop)
    echo "Stopping SonarQube..."
    docker-compose -f "$COMPOSE_FILE" down
    ;;
    
  status)
    echo "Checking SonarQube status..."
    if curl -s --connect-timeout 5 "$SONAR_URL/api/system/status" 2>/dev/null; then
      echo "SonarQube is running at $SONAR_URL"
    else
      echo "SonarQube is not accessible at $SONAR_URL"
      echo "Check if containers are running:"
      docker-compose -f "$COMPOSE_FILE" ps
    fi
    ;;
    
  logs)
    echo "Showing SonarQube logs..."
    docker-compose -f "$COMPOSE_FILE" logs -f sonarqube
    ;;
    
  scan)
    # Load .env.local if it exists
    if [ -f ".env.local" ]; then
      export $(grep -v '^#' .env.local | xargs)
    fi
    
    TOKEN="${2:-${SONAR_TOKEN:-}}"
    if [ -z "$TOKEN" ]; then
      echo "Usage: $0 scan [SONAR_TOKEN]"
      echo "Get your token from: $SONAR_URL/account/security"
      echo ""
      echo "Options:"
      echo "  1. Pass token as argument: $0 scan squ_your_token"
      echo "  2. Set SONAR_TOKEN environment variable"
      echo "  3. Add to .env.local: echo 'SONAR_TOKEN=squ_your_token' > .env.local"
      exit 1
    fi
    echo "Running SonarQube scan..."
    ./scripts/sonar-local.sh "$TOKEN"
    ;;
    
  help|*)
    echo "SonarQube Helper Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start   - Start SonarQube containers"
    echo "  stop    - Stop SonarQube containers"  
    echo "  status  - Check if SonarQube is running"
    echo "  logs    - Show SonarQube logs"
    echo "  scan    - Run code analysis (requires token)"
    echo "  help    - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 scan                    # Uses SONAR_TOKEN from .env.local"
    echo "  $0 scan squ_your_token     # Uses provided token"
    echo "  $0 status"
    echo ""
    echo "Setup:"
    echo "  ./scripts/setup-sonar-token.sh   # Help set up token securely"
    ;;
esac