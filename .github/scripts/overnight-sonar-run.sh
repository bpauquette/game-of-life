#!/usr/bin/env bash
set -euo pipefail

# Overnight runner script for CI (dry-run by default).
# It installs dependencies, runs lint/tests and (optionally) sonar-scanner.
# If DRY_RUN=0 and AUTO_PR=1, the script will create a branch and open a PR with
# any automatic fixes (eslint --fix) if tests pass. By default we do nothing
# that mutates the repo on the runner; use DRY_RUN=0 and provide a token to
# enable auto-PR behavior.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="tmp/overnight-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
LOG_FILE="$LOG_DIR/overnight-$TIMESTAMP.log"

DRY_RUN=${DRY_RUN:-1}
AUTO_PR=${AUTO_PR:-0}
BRANCH_PREFIX=${BRANCH_PREFIX:-automated/sonar-fixes}

echo "Overnight run starting at $TIMESTAMP" | tee "$LOG_FILE"

echo "Node version:" | tee -a "$LOG_FILE"
node --version 2>&1 | tee -a "$LOG_FILE" || true

echo "=== Install dependencies (npm ci) ===" | tee -a "$LOG_FILE"
npm ci 2>&1 | tee -a "$LOG_FILE"

echo "=== Lint (eslint --fix) ===" | tee -a "$LOG_FILE"
# run eslint --fix but only commit or PR if AUTO_PR and DRY_RUN=0
if command -v npx >/dev/null 2>&1; then
  npx eslint . --ext .js,.jsx --fix || true
else
  echo "eslint not found, skipping --fix" | tee -a "$LOG_FILE"
fi

echo "=== Run tests ===" | tee -a "$LOG_FILE"
CI=true npm test -- --watchAll=false --runInBand 2>&1 | tee -a "$LOG_FILE"

# Optional Sonar scan (requires SONAR_TOKEN and sonar-scanner configured)
if [ -n "${SONAR_TOKEN:-}" ]; then
  echo "=== Running Sonar scan ===" | tee -a "$LOG_FILE"
  # Example using sonar-scanner CLI. Ensure sonar-scanner is available in PATH
  if command -v sonar-scanner >/dev/null 2>&1; then
    SONAR_TOKEN="$SONAR_TOKEN" sonar-scanner 2>&1 | tee -a "$LOG_FILE" || true
  else
    echo "sonar-scanner not found; skipping Sonar step" | tee -a "$LOG_FILE"
  fi
else
  echo "SONAR_TOKEN not provided; skipping Sonar scan" | tee -a "$LOG_FILE"
fi

# Run Sonar autofix loop (attempt safe, iterative fixes) if script present
if [ -f ".github/scripts/sonar-autofix-loop.sh" ]; then
  echo "=== Running Sonar autofix loop ===" | tee -a "$LOG_FILE"
  # Export sonar env vars so the loop can pick them up; leave unset values untouched
  export SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-}"
  export SONAR_HOST_URL="${SONAR_HOST_URL:-https://sonarcloud.io}"
  if [ -n "${SONAR_TOKEN:-}" ]; then
    export SONAR_TOKEN
  fi
  bash .github/scripts/sonar-autofix-loop.sh 2>&1 | tee -a "$LOG_FILE" || true
else
  echo "No sonar-autofix-loop.sh found; skipping autofix loop" | tee -a "$LOG_FILE"
fi

echo "=== Create PR with fixes (optional) ===" | tee -a "$LOG_FILE"
if [ "$DRY_RUN" = "0" ] && [ "$AUTO_PR" = "1" ]; then
  # detect git changes (from eslint --fix or other auto-fix steps)
  if [ -n "$(git status --porcelain)" ]; then
    echo "Detected repo changes after fixes:" | tee -a "$LOG_FILE"
    git --no-pager status --porcelain | tee -a "$LOG_FILE"

    # If AUTO_PR=1 and DRY_RUN=0, commit and push directly to the current branch
    if [ "$AUTO_PR" = "1" ] && [ "$DRY_RUN" = "0" ]; then
      echo "Committing and pushing fixes to current branch" | tee -a "$LOG_FILE"
      # Ensure git has user identity for commits
      git config user.name "github-actions[bot]" || true
      git config user.email "41898282+github-actions[bot]@users.noreply.github.com" || true
      git add -A
      git commit -m "chore: automated fixes (eslint/prettier)" || true
      if git push origin HEAD 2>&1 | tee -a "$LOG_FILE"; then
        echo "Pushed fixes to branch" | tee -a "$LOG_FILE"
      else
        echo "Failed to push fixes to branch" | tee -a "$LOG_FILE"
      fi
    else
      echo "AUTO_PR=$AUTO_PR or DRY_RUN=$DRY_RUN prevents auto-push. Skipping push." | tee -a "$LOG_FILE"
    fi
  else
    echo "No repo changes detected; nothing to commit" | tee -a "$LOG_FILE"
  fi
else
  echo "DRY_RUN=$DRY_RUN or AUTO_PR=$AUTO_PR prevents auto-PR creation. Skipping." | tee -a "$LOG_FILE"
fi

echo "Overnight run finished at $(date -u +"%Y%m%dT%H%M%SZ")" | tee -a "$LOG_FILE"

exit 0
