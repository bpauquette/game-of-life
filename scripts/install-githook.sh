#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_DIR="$REPO_ROOT/.githooks"

if [ ! -d "$HOOK_DIR" ]; then
  echo "Creating hook dir: $HOOK_DIR"
  mkdir -p "$HOOK_DIR"
fi

if [ -f "$HOOK_DIR/pre-commit" ]; then
  chmod +x "$HOOK_DIR/pre-commit"
fi

echo "Setting git core.hooksPath to $HOOK_DIR"
git config core.hooksPath "$HOOK_DIR"

echo "Pre-commit hook installed. To undo: git config --unset core.hooksPath"
