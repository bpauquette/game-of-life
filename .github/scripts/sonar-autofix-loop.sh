#!/usr/bin/env bash
set -euo pipefail
# Sonar autofix loop
# Iteratively fetches Sonar issues, attempts safe automatic fixes (eslint --fix, prettier),
# re-runs tests and triggers a new Sonar analysis until no auto-fixable issues remain
# or max iterations is reached.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$REPO_ROOT/tmp/overnight-logs"
mkdir -p "$LOG_DIR"

CONFIG_FILE="$REPO_ROOT/.github/scripts/sonar-autofix-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Missing config: $CONFIG_FILE"
  exit 1
fi

SONAR_TOKEN="${SONAR_TOKEN:-}"
SONAR_HOST_URL="${SONAR_HOST_URL:-https://sonarcloud.io}"
SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-}"

if [ -z "$SONAR_PROJECT_KEY" ]; then
  # try to parse from sonar-project.properties
  if [ -f "$REPO_ROOT/sonar-project.properties" ]; then
    SONAR_PROJECT_KEY=$(grep '^sonar.projectKey=' "$REPO_ROOT/sonar-project.properties" | cut -d'=' -f2- || true)
  fi
fi

if [ -z "$SONAR_PROJECT_KEY" ]; then
  echo "SONAR_PROJECT_KEY not set and not found in sonar-project.properties. Set SONAR_PROJECT_KEY env var." >&2
  exit 1
fi

if [ -z "$SONAR_TOKEN" ]; then
  echo "Warning: SONAR_TOKEN not set. API queries may fail. Continuing in best-effort (dry) mode." >&2
fi

MAX_ITER=$(jq -r '.maxIterations // 5' "$CONFIG_FILE")

echo "Starting Sonar autofix loop for project $SONAR_PROJECT_KEY (max iter $MAX_ITER)" | tee "$LOG_DIR/sonar-autofix.log"

# Ensure fixer tooling (eslint plugin for sonarjs and prettier) is available non-interactively.
ensure_fix_tools_installed() {
  # If node_modules exists and required packages are present, skip install.
  local need_install=0

  # Check for eslint-plugin-sonarjs presence
  if [ ! -d "$REPO_ROOT/node_modules/eslint-plugin-sonarjs" ] && [ ! -f "$REPO_ROOT/node_modules/eslint-plugin-sonarjs/index.js" ]; then
    need_install=1
    echo "Fixer helper: eslint-plugin-sonarjs not found in node_modules" | tee -a "$LOG_DIR/sonar-autofix.log"
  fi

  # Check for prettier presence
  if [ ! -d "$REPO_ROOT/node_modules/prettier" ] && [ ! -f "$REPO_ROOT/node_modules/prettier/index.js" ]; then
    need_install=1
    echo "Fixer helper: prettier not found in node_modules" | tee -a "$LOG_DIR/sonar-autofix.log"
  fi

  if [ "$need_install" -eq 1 ]; then
    echo "Installing autofix helpers (eslint-plugin-sonarjs, prettier) into node_modules (no package.json change)" | tee -a "$LOG_DIR/sonar-autofix.log"
    # Use npm install --no-save to avoid modifying package.json in the repo. Use --no-audit --no-fund to avoid prompts.
    (cd "$REPO_ROOT" && npm install --no-save --no-audit --no-fund eslint-plugin-sonarjs@^1.18.0 prettier@^3.0.0) 2>&1 | tee -a "$LOG_DIR/sonar-autofix.log" || true
  else
    echo "Autofix helpers already present; skipping install." | tee -a "$LOG_DIR/sonar-autofix.log"
  fi
}

ensure_fix_tools_installed

run_sonar_scan() {
  echo "Running sonar-scanner..." | tee -a "$LOG_DIR/sonar-autofix.log"
  # sonar-scanner must be configured in the environment; this call is best-effort.
  if command -v sonar-scanner >/dev/null 2>&1; then
    sonar-scanner -Dsonar.projectKey="$SONAR_PROJECT_KEY" || true
  else
    echo "sonar-scanner not installed in PATH; skipping scan (caller may have run it)." | tee -a "$LOG_DIR/sonar-autofix.log"
  fi
}

query_sonar_issues() {
  # returns newline-separated JSON objects (compact) for issues
  local page=1
  local pageSize=500
  local issues_json
  issues_json=$(curl -sS -G "$SONAR_HOST_URL/api/issues/search" \
    --data-urlencode "componentKeys=$SONAR_PROJECT_KEY" \
    --data-urlencode "ps=$pageSize" \
    --data-urlencode "p=$page" \
    ${SONAR_TOKEN:+-H "Authorization: Bearer $SONAR_TOKEN"} )
  echo "$issues_json"
}

apply_fixes_for_rules() {
  # Use mapping to decide which fixer to run. We'll group by fixer type.
  echo "Applying fixes: running eslint --fix and prettier as configured" | tee -a "$LOG_DIR/sonar-autofix.log"

  # Run eslint --fix for JS files
  if command -v npx >/dev/null 2>&1; then
    echo "Running: npx eslint . --ext .js,.jsx --fix" | tee -a "$LOG_DIR/sonar-autofix.log"
    npx eslint . --ext .js,.jsx --fix || true
  else
    echo "npx not available; skipping eslint fixes" | tee -a "$LOG_DIR/sonar-autofix.log"
  fi

  # Run prettier
  if command -v npx >/dev/null 2>&1; then
    if [ -f package.json ]; then
      echo "Running: npx prettier --write ." | tee -a "$LOG_DIR/sonar-autofix.log"
      npx prettier --write . || true
    fi
  else
    echo "npx not available; skipping prettier" | tee -a "$LOG_DIR/sonar-autofix.log"
  fi

  # You can add more specific codemod/tool invocations here if desired.
}

remaining_issues_report() {
  echo "Collecting remaining Sonar issues..." | tee -a "$LOG_DIR/sonar-autofix.log"
  if [ -n "$SONAR_TOKEN" ]; then
    curl -sS -G "$SONAR_HOST_URL/api/issues/search" \
      --data-urlencode "componentKeys=$SONAR_PROJECT_KEY" \
      --data-urlencode "ps=500" \
      ${SONAR_TOKEN:+-H "Authorization: Bearer $SONAR_TOKEN"} > "$LOG_DIR/sonar-remaining-issues.json"
    echo "Wrote $LOG_DIR/sonar-remaining-issues.json" | tee -a "$LOG_DIR/sonar-autofix.log"
  else
    echo "SONAR_TOKEN missing; cannot query Sonar API for remaining issues." | tee -a "$LOG_DIR/sonar-autofix.log"
  fi
}

# Main loop
run_sonar_scan

iter=0
while [ $iter -lt "$MAX_ITER" ]; do
  iter=$((iter + 1))
  echo "Autofix iteration $iter" | tee -a "$LOG_DIR/sonar-autofix.log"

  issues_json=$(query_sonar_issues)
  total=$(echo "$issues_json" | jq -r '.total // 0')
  echo "Total open issues reported by Sonar: $total" | tee -a "$LOG_DIR/sonar-autofix.log"

  # Filter auto-fixable rules based on config
  auto_rules=$(jq -r '.rules | keys[]' "$CONFIG_FILE" || true)
  if [ -z "$auto_rules" ]; then
    echo "No auto-fix rules configured. Exiting." | tee -a "$LOG_DIR/sonar-autofix.log"
    break
  fi

  # find issues whose rule matches any key in config
  issues_to_fix=$(echo "$issues_json" | jq -c --argjson arr "$(jq -c '.rules | keys' "$CONFIG_FILE")" '.issues[] | select(.rule as $r | ($arr | index($r)))') || true

  if [ -z "$issues_to_fix" ]; then
    echo "No auto-fixable issues found. Breaking." | tee -a "$LOG_DIR/sonar-autofix.log"
    break
  fi

  echo "Found auto-fixable issues; attempting fixes." | tee -a "$LOG_DIR/sonar-autofix.log"

  # Run the fixer(s)
  apply_fixes_for_rules

  # If git has changes, run tests before committing
  if [ -n "$(git status --porcelain)" ]; then
    echo "Repository changed after fixes; running tests." | tee -a "$LOG_DIR/sonar-autofix.log"
    if ! npm test -- --watchAll=false --runInBand; then
      echo "Tests failed after autofix. Aborting and leaving changes unstaged for inspection." | tee -a "$LOG_DIR/sonar-autofix.log"
      remaining_issues_report
      exit 2
    fi
  else
    echo "No repository changes detected after fixes." | tee -a "$LOG_DIR/sonar-autofix.log"
  fi

  # re-run sonar scanner to refresh issues
  run_sonar_scan
done

remaining_issues_report

echo "Sonar autofix loop complete (iterations: $iter)" | tee -a "$LOG_DIR/sonar-autofix.log"

exit 0
