#!/usr/bin/env bash
# Create a GitHub pull request for the current branch.
# Usage:
#   ./scripts/gh-pr.sh
#   ./scripts/gh-pr.sh -t "Title" -b "Body"
#   ./scripts/gh-pr.sh --draft --base develop
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-main}"
PR_TITLE=""
PR_BODY=""
DRAFT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_BRANCH="$2"
      shift 2
      ;;
    -t|--title)
      PR_TITLE="$2"
      shift 2
      ;;
    -b|--body)
      PR_BODY="$2"
      shift 2
      ;;
    --draft)
      DRAFT=true
      shift
      ;;
    -h|--help)
      sed -n '1,7p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run 'gh auth login' first."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
  echo "Refusing to open a PR from '$CURRENT_BRANCH' into itself."
  echo "Create a feature branch first."
  exit 1
fi

echo "Pushing $CURRENT_BRANCH to origin..."
git push -u origin "$CURRENT_BRANCH"

CMD=(gh pr create --base "$BASE_BRANCH" --head "$CURRENT_BRANCH")
if [[ "$DRAFT" == true ]]; then
  CMD+=(--draft)
fi

if [[ -n "$PR_TITLE" || -n "$PR_BODY" ]]; then
  if [[ -z "$PR_TITLE" || -z "$PR_BODY" ]]; then
    echo "If setting title/body manually, provide both --title and --body."
    exit 1
  fi
  CMD+=(--title "$PR_TITLE" --body "$PR_BODY")
else
  CMD+=(--fill)
fi

echo "Creating pull request..."
"${CMD[@]}"
