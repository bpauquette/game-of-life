# Kill all processes using port 3000
$port = 3000
$netstat = netstat -ano | Select-String ":$port"
$netstat | ForEach-Object {
    $fields = ($_ -split '\s+')
    $pid = $fields[-1]
    if ($pid -match '^\d+$') {
        try {
            Write-Host "Killing PID $pid"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}
pause