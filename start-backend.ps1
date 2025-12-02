# Minimal Game of Life Backend Start Script

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

Set-Location (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'backend')
npm start