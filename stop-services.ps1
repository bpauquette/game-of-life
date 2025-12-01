# Game of Life Stop Script with Auto-Elevation
# This script automatically requests elevation to stop all processes

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
        }
    } catch {
        Write-Warning "Could not stop processes on port $Port - $($_.Exception.Message)"
    }
}

Write-Host "🛑 Stopping Game of Life services..." -ForegroundColor Red

# If not running as admin, restart with elevation
if (-not (Test-Administrator)) {
    Write-Host "Requesting elevation to stop services..." -ForegroundColor Yellow
    
    # Create script content for elevation
    $elevatedScript = @"
# Load environment variables
`$envFile = Join-Path (Split-Path -Parent `$MyInvocation.MyCommand.Path) '.env'
if (Test-Path `$envFile) {
    Get-Content `$envFile | ForEach-Object {
        if (`$_ -match '^(PORT|GOL_BACKEND_PORT)=(.*)') {
            Set-Variable -Name `$matches[1] -Value `$matches[2] -Scope Global
        }
    }
}

`$frontendPort = if (`$PORT) { `$PORT } else { 3000 }
`$backendPort = if (`$GOL_BACKEND_PORT) { `$GOL_BACKEND_PORT } else { 55000 }

Write-Host "Stopping frontend processes..."
Get-Process | Where-Object { `$_.ProcessName -match 'node|npm' } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Stopping processes on ports `$frontendPort and `$backendPort..."
foreach (`$port in @(`$frontendPort, `$backendPort)) {
    netstat -ano | Select-String ":`$port" | ForEach-Object {
        `$pid = (`$_ -split '\s+')[-1]
        if (`$pid -match '^\d+`$') {
            Stop-Process -Id `$pid -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped PID `$pid on port `$port"
        }
    }
}

Write-Host "✅ All services stopped" -ForegroundColor Green
pause
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
    # Already running as admin, stop services directly
    
    # Load environment variables
    $envFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '.env'
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^(PORT|GOL_BACKEND_PORT)=(.*)') {
                Set-Variable -Name $matches[1] -Value $matches[2] -Scope Global
            }
        }
    }
    
    $frontendPort = if ($PORT) { $PORT } else { 3000 }
    $backendPort = if ($GOL_BACKEND_PORT) { $GOL_BACKEND_PORT } else { 55000 }
    
    Write-Host "Stopping frontend and backend processes..."
    Get-Process | Where-Object { $_.ProcessName -match 'node|npm' } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "Stopping processes on ports $frontendPort and $backendPort..."
    Stop-ProcessOnPort -Port $frontendPort
    Stop-ProcessOnPort -Port $backendPort
    
    Write-Host "✅ All services stopped" -ForegroundColor Green
}