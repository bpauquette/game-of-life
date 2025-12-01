# Game of Life Backend Stop Script with Auto-Elevation
# This script automatically requests elevation to stop backend processes

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
            Write-Host "Stopping process $pid on port $Port" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        
        if ($processes.Count -gt 0) {
            Write-Host "Stopped $($processes.Count) process(es) on port $Port" -ForegroundColor Green
        } else {
            Write-Host "No processes found on port $Port" -ForegroundColor Gray
        }
    } catch {
        Write-Warning "Could not stop processes on port $Port - $($_.Exception.Message)"
    }
}

Write-Host "🛑 Stopping Game of Life Backend..." -ForegroundColor Red

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

# If not running as admin, restart with elevation
if (-not (Test-Administrator)) {
    Write-Host "Requesting elevation to stop backend processes..." -ForegroundColor Yellow
    
    # Create script content for elevation
    $elevatedScript = @"
# Stop backend processes
Write-Host "Stopping backend Node.js processes..."
Get-Process | Where-Object { `$_.ProcessName -match 'node' -and (`$_.CommandLine -like '*backend*' -or `$_.CommandLine -like '*index.js*') } | ForEach-Object {
    Write-Host "Stopping `$(`$_.ProcessName) (PID: `$(`$_.Id))"
    Stop-Process -Id `$_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopping processes on port $backendPort..."
netstat -ano | Select-String ":$backendPort" | ForEach-Object {
    `$pid = (`$_ -split '\s+')[-1]
    if (`$pid -match '^\d+`$') {
        Stop-Process -Id `$pid -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped PID `$pid on port $backendPort"
    }
}

Write-Host "✅ Backend stopped" -ForegroundColor Green
Start-Sleep 2
"@
    
    # Write and run elevated script
    $tempFile = [System.IO.Path]::GetTempFileName() + ".ps1"
    $elevatedScript | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$tempFile`"" -Wait
    } finally {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
} else {
    # Already running as admin, stop processes directly
    Write-Host "Stopping backend Node.js processes..."
    Get-Process | Where-Object { $_.ProcessName -match 'node' -and ($_.CommandLine -like '*backend*' -or $_.CommandLine -like '*index.js*') } | ForEach-Object {
        Write-Host "Stopping $($_.ProcessName) (PID: $($_.Id))"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Stopping processes on port $backendPort..."
    Stop-ProcessOnPort -Port $backendPort
    
    Write-Host "✅ Backend stopped" -ForegroundColor Green
}