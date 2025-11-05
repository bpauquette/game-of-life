#!/usr/bin/env bash
set -euo pipefail

# Bash helper to run the Windows setup-gol-dev-network.ps1 with elevation from WSL.
# It starts an elevated Windows PowerShell (UAC) and forwards any arguments
# to the PowerShell script. It also detects your WSL IPv4 and passes -WSLIP
# explicitly to avoid detection issues under elevation.
#
# Usage examples (from repo root or anywhere under it):
#   scripts/windows/run-setup-admin.sh
#   scripts/windows/run-setup-admin.sh -Ports 3000 55000 -ListenAddress 0.0.0.0

POWERSHELL_EXE="powershell.exe"
# Try resolve powershell.exe when not on PATH
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
PS_SCRIPT_LNX="$REPO_ROOT/scripts/windows/setup-gol-dev-network.ps1"

if [ ! -f "$PS_SCRIPT_LNX" ]; then
  echo "Error: setup script not found at $PS_SCRIPT_LNX" >&2
  exit 1
fi

# Detect WSL IPv4 (best-effort)
WSL_IP="$(hostname -I 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i ~ /^[0-9.]+$/) {print $i; exit}}')"
if [ -z "$WSL_IP" ]; then
  # Fallback: parse from ip route get to a public address
  WSL_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ {for(i=1;i<=NF;i++) if ($i == "src") {print $(i+1); exit}}')"
fi

PS_SCRIPT_WIN="$(wslpath -w "$PS_SCRIPT_LNX")"

# Build the -ArgumentList for Start-Process PowerShell
ARG_LIST="'-NoProfile','-ExecutionPolicy','Bypass','-File','\"$PS_SCRIPT_WIN\"'"

# Include backend port from .env in -Ports list along with frontend 3000
BACKEND_PORT=""
ENV_FILE="$REPO_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  BACKEND_PORT=$(grep -E '^GOL_BACKEND_PORT=' "$ENV_FILE" | tail -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'") || true
fi
if [ -n "$BACKEND_PORT" ]; then
  bp_sanitized="${BACKEND_PORT//\'/''}"
  ARG_LIST+=",'-Ports','3000','$bp_sanitized'"
fi

# If we detected a WSL IP, pass it explicitly to avoid elevation detection quirks
if [ -n "$WSL_IP" ]; then
  # Escape any single quotes just in case
  ip_sanitized="${WSL_IP//\'/''}"
  ARG_LIST+=",'-WSLIP','$ip_sanitized'"
fi

# Read HOST_IP from .env to pass as -PublicHost for clearer Next steps URLs
ENV_FILE="$REPO_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  PUBLIC_HOST_RAW=$(grep -E '^HOST_IP=' "$ENV_FILE" | tail -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" ) || true
  if [ -n "$PUBLIC_HOST_RAW" ]; then
    ph_sanitized="${PUBLIC_HOST_RAW//\'/''}"
    ARG_LIST+=",'-PublicHost','$ph_sanitized'"
  fi
fi

# Append all user-provided arguments (escaped for PowerShell single-quoted strings)
for arg in "$@"; do
  sanitized="${arg//\'/''}"
  ARG_LIST+=",'$sanitized'"
done

"$POWERSHELL_EXE" -NoProfile -ExecutionPolicy Bypass -Command \
  "Start-Process PowerShell -Verb RunAs -ArgumentList $ARG_LIST"

echo "Launched elevated PowerShell to run setup-gol-dev-network.ps1"
