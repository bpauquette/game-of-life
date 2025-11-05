@echo off
setlocal
REM Elevate and run the PowerShell setup script with execution policy bypass.
set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%setup-gol-dev-network.ps1

REM Launch elevated PowerShell that runs the script with Bypass
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -Verb RunAs powershell -ArgumentList '-NoProfile','-NoExit','-ExecutionPolicy','Bypass','-File','""%PS1%""'"

endlocal
