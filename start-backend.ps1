# Game of Life Backend Start Script with Auto-Elevation
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

# Function to kill processes on a specific port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $processes = netstat -ano | Select-String ":$Port" | ForEach-Object {
            ($_ -split '\s+')[-1]
        } | Select-Object -Unique | Where-Object { $_ -match '^\d+$' }
        
        foreach ($pid in $processes) {
            Write-Host "Stopping process $pid on port $Port"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Warning "Could not stop processes on port $Port - $($_.Exception.Message)"
    }
}

Write-Host "🔧 Starting Game of Life Backend..." -ForegroundColor Blue

# Load environment variables
$envFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^GOL_BACKEND_PORT=(.*)') {
            $global:GOL_BACKEND_PORT = $matches[1]
        }
    }
}

$backendPort = if ($GOL_BACKEND_PORT) { $GOL_BACKEND_PORT } else { 55000 }

# If not running as admin and processes need to be killed, restart with elevation
if (-not (Test-Administrator)) {
    Write-Host "Requesting elevation to stop any existing processes..." -ForegroundColor Yellow
    
    # Create a temporary script to handle the elevation
    $tempScript = @"
# Kill existing backend processes
Get-Process | Where-Object { `$_.ProcessName -match 'node' -and `$_.CommandLine -like '*backend*' } | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill processes on backend port
netstat -ano | Select-String ':$backendPort' | ForEach-Object {
    `$pid = (`$_ -split '\s+')[-1]
    if (`$pid -match '^\d+`$') {
        Stop-Process -Id `$pid -Force -ErrorAction SilentlyContinue
    }
}

Write-Host 'Backend processes stopped. Starting backend...'
Start-Sleep 2
"@
    
    # Write temp script and run elevated
    $tempFile = [System.IO.Path]::GetTempFileName() + ".ps1"
    $tempScript | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$tempFile`"" -Wait
    } finally {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
} else {
    # Already running as admin, stop processes directly
    Write-Host "Stopping existing backend processes..."
    Stop-ProcessOnPort -Port $backendPort
    Start-Sleep 2
}

# Start the backend
Write-Host "Starting backend on port $backendPort..." -ForegroundColor Cyan
Set-Location (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "backend")
npm start