#!/usr/bin/env bash
set -euo pipefail

# Bash helper to run the Windows cleanup script with elevation from WSL.
# It starts an elevated Windows PowerShell process (UAC prompt) and
# forwards any arguments to the PowerShell script.
#
# Usage examples (from repo root or anywhere under it):
#   scripts/windows/run-cleanup-admin.sh
#   scripts/windows/run-cleanup-admin.sh -Ports 3000 55000 -ListenAddress 0.0.0.0
#
# Notes:
# - Requires running on Windows through WSL (so powershell.exe is available).
# - The PowerShell window will be a separate elevated process.

POWERSHELL_EXE="powershell.exe"
# Try resolve powershell.exe when not on PATH (common if interop PATH is disabled)
if ! command -v "$POWERSHELL_EXE" >/dev/null 2>&1; then
  # Typical Windows PowerShell location
  if [ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
    POWERSHELL_EXE="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
  # Fallback to PowerShell 7 if installed
  elif [ -x "/mnt/c/Program Files/PowerShell/7/pwsh.exe" ]; then
    POWERSHELL_EXE="/mnt/c/Program Files/PowerShell/7/pwsh.exe"
  else
    echo "Error: Could not find Windows PowerShell. This helper must be run inside WSL on a Windows host with interop enabled." >&2
    echo " - If you are on Windows+WSL: enable interop (see /etc/wsl.conf) and ensure powershell.exe is accessible." >&2
    echo " - If you are on pure Linux (no Windows host): Windows portproxy/firewall cannot be managed from here." >&2
    exit 1
  fi
fi
if ! command -v wslpath >/dev/null 2>&1; then
  echo "Error: wslpath not found (WSL utilities missing)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PS_SCRIPT_LNX="$REPO_ROOT/scripts/windows/cleanup-gol-dev-network.ps1"

if [ ! -f "$PS_SCRIPT_LNX" ]; then
  echo "Error: cleanup script not found at $PS_SCRIPT_LNX" >&2
  exit 1
fi

PS_SCRIPT_WIN="$(wslpath -w "$PS_SCRIPT_LNX")"

# Build the -ArgumentList for Start-Process as a comma-separated list of
# single-quoted strings. For the file path argument, we wrap the Windows path
# in escaped double-quotes so that PowerShell preserves spaces.
ARG_LIST="'-NoProfile','-ExecutionPolicy','Bypass','-File','\"$PS_SCRIPT_WIN\"'"

# Append all user-provided arguments, escaping any single quotes for PowerShell
# single-quoted strings by doubling them (' -> '').
for arg in "$@"; do
  sanitized="${arg//\'/''}"
  ARG_LIST+=",'$sanitized'"
done

# Launch elevated Windows PowerShell to run the script
"$POWERSHELL_EXE" -NoProfile -ExecutionPolicy Bypass -Command \
  "Start-Process PowerShell -Verb RunAs -ArgumentList $ARG_LIST"

echo "Launched elevated Windows PowerShell to run cleanup-gol-dev-network.ps1"
