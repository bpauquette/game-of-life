<#
 Minimal Game of Life Backend Start Script (frontend repo)

 NOTE: The backend code now lives in a separate repository
         (e.g. `game-of-life-backend`). This script only attempts
         to start a backend if that repository is checked out
         as a sibling directory.

 Expected layout (generic example):
     <some-root>\game-of-life           (this repo - frontend)
     <some-root>\game-of-life-backend   (separate backend repo)
#>

function Get-BackendPort {
    $default = 55000
    $envFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '.env'
    if (Test-Path $envFile) {
        foreach ($line in (Get-Content $envFile)) {
            if ($line -match '^GOL_BACKEND_PORT=(.*)') {
                if ([int]::TryParse($matches[1], [ref]$outPort)) {
                    return $outPort
                }
            }
        }
    }
    return $default
}

function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = netstat -ano | Select-String ":$Port" | ForEach-Object {
            ($_ -split '\s+')[-1]
        } | Select-Object -Unique | Where-Object { $_ -match '^\d+$' }

        foreach ($pid in $processes) {
            Write-Host ("Stopping process {0} on port {1}" -f $pid, $Port)
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Warning ("Could not stop processes on port {0} - {1}" -f $Port, $_.Exception.Message)
    }
}

$backendPort = Get-BackendPort
Write-Host ("Starting Game of Life backend on port {0}..." -f $backendPort)

Stop-ProcessOnPort -Port $backendPort
Start-Sleep 2

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRepo = Join-Path (Split-Path $repoRoot -Parent) 'game-of-life-backend'

if (-not (Test-Path $backendRepo)) {
    Write-Error "Backend repository not found at '$backendRepo'. Clone the backend repo (game-of-life-backend) alongside this frontend repo."
    exit 1
}

Set-Location $backendRepo
npm start