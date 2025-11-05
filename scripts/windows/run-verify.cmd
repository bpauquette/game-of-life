@echo off
setlocal
REM Run verification checks without requiring elevation (read-only)
set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%verify-gol-dev-network.ps1

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"

endlocal
