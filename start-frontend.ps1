# Game of Life Frontend Start Script with Auto-Elevation
# This script automatically requests elevation if needed to kill processes on ports

param(
    [switch]$Force
)

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host "🚀 Starting Game of Life Frontend..." -ForegroundColor Green

# If not running as admin, restart with elevation to stop processes
if (-not (Test-Administrator)) {
    Write-Host "Requesting elevation to stop any existing processes..." -ForegroundColor Yellow
    
    # Simple elevation approach - run stop command
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" -Wait
    } catch {
        Write-Warning "Could not elevate to stop processes"
    }
    Start-Sleep 2
} else {
    # Already running as admin, stop processes directly
    Write-Host "Stopping existing processes..."
    Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*react-scripts*' } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
}

# Start the frontend
Write-Host "Starting npm start..." -ForegroundColor Cyan
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
npm start