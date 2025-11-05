<#
.SYNOPSIS
  Verify frontend/backend dev ports are reachable from Windows and over LAN.

.DESCRIPTION
  - Shows Windows IPv4 addresses and current portproxy table
  - Tests localhost and LAN URLs for:
      * Frontend:  http://<host>:3000
      * Backend:   http://<host>:55000/v1/health (expects { ok: true })

  Run from Windows PowerShell. Admin is not required for read-only checks.

.PARAMETER FrontendPort
  Port for the frontend (default 3000)

.PARAMETER BackendPort
  Port for the backend (default 55000)

.EXAMPLE
  scripts\windows\verify-gol-dev-network.ps1

#>
[CmdletBinding()] param(
  [int] $FrontendPort = 3000,
  [int] $BackendPort  = 55000
)

# Allow environment variables to set defaults when parameters aren't provided
if (-not $PSBoundParameters.ContainsKey('FrontendPort') -and $env:PORT) {
  try { $FrontendPort = [int]$env:PORT } catch { }
}
if (-not $PSBoundParameters.ContainsKey('BackendPort')) {
  if ($env:GOL_BACKEND_PORT) { try { $BackendPort = [int]$env:GOL_BACKEND_PORT } catch { } }
  elseif ($env:PORT -and $FrontendPort -ne [int]$env:PORT) { try { $BackendPort = [int]$env:PORT } catch { } }
}

function Write-Section($title) {
  Write-Host "`n=== $title ===" -ForegroundColor Cyan
}

function Get-LanIPv4 {
  $ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' -and $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object -Property InterfaceMetric, SkipAsSource
  return $ips
}

function Test-Url {
  param(
    [string] $Url,
    [int] $TimeoutSec = 3,
    [string] $ExpectJsonOk = $null
  )
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec -ErrorAction Stop
    $status = $resp.StatusCode
    $ok = $true
    $msg = "HTTP $status"
    if ($ExpectJsonOk) {
      try {
        $json = $resp.Content | ConvertFrom-Json -ErrorAction Stop
        if ($null -ne $json.$ExpectJsonOk -and $json.$ExpectJsonOk -eq $true) {
          $msg = "$msg; $ExpectJsonOk=true"
        } else {
          $ok = $false
          $msg = "$msg; $ExpectJsonOk missing/false"
        }
      } catch {
        $ok = $false
        $msg = "$msg; invalid JSON"
      }
    }
    return [PSCustomObject]@{ Url=$Url; Success=$ok; Message=$msg }
  } catch {
    return [PSCustomObject]@{ Url=$Url; Success=$false; Message=$_.Exception.Message }
  }
}

# 1) Show IPs
Write-Section "Windows IPv4 addresses"
$lan = Get-LanIPv4
if ($lan.Count -eq 0) { Write-Warning 'No non-loopback IPv4 addresses detected.' } else { $lan | Format-Table InterfaceAlias,IPAddress -Auto }

# 2) Show portproxy table
Write-Section "Current portproxy table"
try { netsh interface portproxy show v4tov4 } catch { Write-Warning 'Failed to read portproxy table.' }

# 3) Localhost tests
Write-Section "Localhost tests"
$tests = @()
$tests += Test-Url -Url ("http://localhost:{0}" -f $FrontendPort)
$tests += Test-Url -Url ("http://localhost:{0}/v1/health" -f $BackendPort) -ExpectJsonOk 'ok'
$tests | Format-Table Url,Success,Message -Auto

# 4) LAN tests
if ($lan.Count -gt 0) {
  Write-Section "LAN tests (use these addresses on your phone)"
  $lanResults = @()
  foreach ($ip in $lan) {
    $addr = $ip.IPAddress
    $lanResults += Test-Url -Url ("http://{0}:{1}" -f $addr, $FrontendPort)
    $lanResults += Test-Url -Url ("http://{0}:{1}/v1/health" -f $addr, $BackendPort) -ExpectJsonOk 'ok'
  }
  $lanResults | Format-Table Url,Success,Message -Auto
}

# 5) Summary
Write-Section "Summary"
$all = @($tests) + @($lanResults)
$fail = $all | Where-Object { -not $_.Success }
if ($fail.Count -eq 0) {
  Write-Host 'All checks passed.' -ForegroundColor Green
} else {
  Write-Warning ("{0} checks failed." -f $fail.Count)
  Write-Host 'If LAN checks failed:'
  Write-Host '  - Ensure port proxies and firewall rules are applied (run run-setup.cmd as Admin)'
  Write-Host ("  - Confirm services are running on WSL: frontend ({0}), backend ({1})" -f $FrontendPort, $BackendPort)
  Write-Host ("  - Some security suites can still block inbound ports — allow {0} and {1}" -f $FrontendPort, $BackendPort)
}
