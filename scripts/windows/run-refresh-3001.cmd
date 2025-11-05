@echo off
setlocal
REM Elevate and refresh port proxies for frontend 3001 and backend 55000.
set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%refresh-gol-proxies.ps1

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -Verb RunAs powershell -ArgumentList '-NoProfile','-NoExit','-ExecutionPolicy','Bypass','-File','""%PS1%""','-Ports','3001,55000'"

endlocal
