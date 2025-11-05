wsl@echo off
setlocal
REM Elevate and run the PowerShell cleanup script with execution policy bypass.
set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%cleanup-gol-dev-network.ps1

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -Verb RunAs powershell -ArgumentList '-NoProfile','-NoExit','-ExecutionPolicy','Bypass','-File','""%PS1%""'"

endlocal
