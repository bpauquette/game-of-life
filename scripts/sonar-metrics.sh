#!/bin/bash
# SonarQube metrics reporter for Claude AI analysis

cd "$(dirname "$0")/.."
source .env.local 2>/dev/null || { echo "Error: .env.local not found"; exit 1; }

echo "🔍 SonarQube Metrics Report"
echo "=========================="
echo "Project: game-of-life"
echo "Timestamp: $(date)"
echo ""

# Get comprehensive metrics
curl -s -u "${SONAR_TOKEN}:" \
  "http://localhost:9000/api/measures/component?component=game-of-life&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc,complexity,cognitive_complexity,reliability_rating,security_rating,sqale_rating" \
  | jq -r '
    .component.measures[] | 
    "  \(.metric | ascii_upcase | gsub("_"; " ")): \(.value)" + 
    (if .bestValue == true then " ✅" elif .bestValue == false then " ⚠️" else "" end)
  ' | sort

echo ""
echo "📊 Quality Gate Status:"
curl -s -u "${SONAR_TOKEN}:" \
  "http://localhost:9000/api/qualitygates/project_status?projectKey=game-of-life" \
  | jq -r '.projectStatus.status // "UNKNOWN"'