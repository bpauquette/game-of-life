#!/usr/bin/env bash
# Script to securely set up SonarQube token
set -euo pipefail

echo "SonarQube Token Setup"
echo "===================="
echo ""

if [ -f ".env.local" ] && grep -q "SONAR_TOKEN=" .env.local 2>/dev/null; then
  echo "✅ SONAR_TOKEN is already configured in .env.local"
  echo ""
  echo "To update it:"
  echo "1. Edit .env.local manually, or"
  echo "2. Run: sed -i 's/SONAR_TOKEN=.*/SONAR_TOKEN=your_new_token/' .env.local"
  echo ""
  echo "To test: ./scripts/sonar-helper.sh scan"
else
  echo "To set up your SonarQube token securely:"
  echo ""
  echo "1. Get your token from: http://localhost:9000/account/security"
  echo "2. Add it to .env.local (won't be committed to git):"
  echo ""
  echo "   echo 'SONAR_TOKEN=squ_your_token_here' >> .env.local"
  echo ""
  echo "3. Then run scans with: ./scripts/sonar-helper.sh scan"
  echo ""
  echo "Alternative: Set as environment variable:"
  echo "   export SONAR_TOKEN=squ_your_token_here"
  echo "   ./scripts/sonar-helper.sh scan"
fi

echo ""
echo "Checking SonarQube availability..."
if curl -s --connect-timeout 5 "http://localhost:9000/api/system/status" > /dev/null 2>&1; then
  echo "✅ SonarQube is running at http://localhost:9000"
else
  echo "❌ SonarQube is not running. Start it with:"
  echo "   ./scripts/sonar-helper.sh start"
fi