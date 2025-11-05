#!/usr/bin/env bash
set -euo pipefail

# Bash helper to run the Windows run-verify.cmd with elevation from WSL.
# Starts elevated cmd.exe and forwards any arguments to the .cmd script.

POWERSHELL_EXE="powershell.exe"
if ! command -v "$POWERSHELL_EXE" >/dev/null 2>&1; then
  if [ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
    POWERSHELL_EXE="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
  elif [ -x "/mnt/c/Program Files/PowerShell/7/pwsh.exe" ]; then
    POWERSHELL_EXE="/mnt/c/Program Files/PowerShell/7/pwsh.exe"
  else
    echo "Error: Could not find Windows PowerShell. Run inside WSL on a Windows host." >&2
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CMD_SCRIPT_LNX="$REPO_ROOT/scripts/windows/run-verify.cmd"

if [ ! -f "$CMD_SCRIPT_LNX" ]; then
  echo "Error: verify script not found at $CMD_SCRIPT_LNX" >&2
  exit 1
fi

CMD_SCRIPT_WIN="$(wslpath -w "$CMD_SCRIPT_LNX")"

ARG_LIST="'/c','\"$CMD_SCRIPT_WIN\"'"
for arg in "$@"; do
  sanitized="${arg//\'/''}"
  ARG_LIST+=",'$sanitized'"
done

"$POWERSHELL_EXE" -NoProfile -ExecutionPolicy Bypass -Command \
  "Start-Process -Verb RunAs -FilePath cmd.exe -ArgumentList $ARG_LIST"

echo "Launched elevated cmd to run run-verify.cmd"
