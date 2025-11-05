<#
.SYNOPSIS
  Quickly refresh Windows portproxy mappings for Game of Life dev ports to the current WSL IP.

.DESCRIPTION
  - Detects the active WSL IPv4 and maps Windows ports (default 3000, 55000)
    from 0.0.0.0:<port> to <WSL_IP>:<port>.
  - Falls back to binding specific LAN IPs if 0.0.0.0 is blocked.
  - Prints the resulting portproxy table.

  Run in an elevated PowerShell (Run as Administrator).

.PARAMETER Ports
  Ports to map. Defaults to 3000, 55000.

.PARAMETER WSLIP
  Override the detected WSL IPv4 (e.g., -WSLIP 172.19.98.117).

.EXAMPLE
  scripts\windows\refresh-gol-proxies.ps1

.EXAMPLE
  scripts\windows\refresh-gol-proxies.ps1 -WSLIP 172.19.98.117
#>
[CmdletBinding()] param(
  [int[]] $Ports = @(3000, 55000),
  [string] $WSLIP = $null
)

function Assert-Admin {
  $principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
  $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Error 'Please run this script in an elevated PowerShell (Run as Administrator).'
    exit 1
  }
}

function Is-IPv4 { param([string] $ip) if (-not $ip) { return $false } return [bool]($ip -as [System.Net.IPAddress] -and $ip -match '^(?:\d{1,3}\.){3}\d{1,3}$') }

function Get-WSLIPv4 {
  try { $null = & wsl.exe -e sh -c "true" 2>$null } catch { }
  $candidates = @()
  try { $out = & wsl.exe hostname -I 2>$null; if ($out) { $candidates += $out } } catch { }
  try { $out = & wsl.exe -e sh -lc "hostname -I" 2>$null; if ($out) { $candidates += $out } } catch { }
  try { $out = & wsl.exe -e sh -lc "ip -4 addr show eth0 | awk '/inet /{print $2}' | cut -d/ -f1" 2>$null; if ($out) { $candidates += $out } } catch { }
  if ($candidates.Count -eq 0) { return $null }
  $ipv4s = @()
  foreach ($line in $candidates) { $matches = [regex]::Matches($line, '((\d{1,3}\.){3}\d{1,3})'); foreach ($m in $matches) { $ipv4s += $m.Value } }
  $ipv4s = $ipv4s | Where-Object { $_ -and ($_ -notmatch '^127\.') -and ($_ -notmatch '^169\.254\.') } | Select-Object -Unique
  if ($ipv4s.Count -gt 0) { return $ipv4s[0] }
  return $null
}

function Ensure-PortProxy {
  param([int] $Port, [string] $ListenIP, [string] $TargetIP)
  if (-not (Is-IPv4 $TargetIP)) { Write-Warning ("Target IP '{0}' invalid; skipping {1}" -f $TargetIP, $Port); return $false }
  $null = & netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=$ListenIP 2>&1
  $out = & netsh interface portproxy add v4tov4 listenport=$Port listenaddress=$ListenIP connectport=$Port connectaddress=$TargetIP 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host ("[OK] {0}:{1} -> {2}:{1}" -f $ListenIP, $Port, $TargetIP) -ForegroundColor Green; return $true }
  Write-Warning ("[FAIL] {0}:{1} -> {2}:{1} : {3}" -f $ListenIP, $Port, $TargetIP, ($out -join ' ')); return $false
}

function Get-HostLanIPs {
  try { return Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress } catch { return @() }
}

function Ensure-PortProxy-WithFallback { param([int] $Port, [string] $TargetIP)
  if (Ensure-PortProxy -Port $Port -ListenIP '0.0.0.0' -TargetIP $TargetIP) { return '0.0.0.0' }
  $lanIPs = Get-HostLanIPs
  foreach ($ip in $lanIPs) { if (Ensure-PortProxy -Port $Port -ListenIP $ip -TargetIP $TargetIP) { return $ip } }
  return $null }

# --- Main ---
Assert-Admin
try { Start-Service iphlpsvc -ErrorAction SilentlyContinue } catch { }

$wslIP = if ($WSLIP) { $WSLIP } else { Get-WSLIPv4 }
if ($WSLIP -and -not (Is-IPv4 $WSLIP)) { Write-Warning ("Provided -WSLIP '{0}' is not a valid IPv4; ignoring." -f $WSLIP); $wslIP = Get-WSLIPv4 }

if (-not $wslIP) { Write-Error 'WSL IPv4 not detected. Start WSL (wsl.exe) or supply -WSLIP <addr> and retry.'; exit 1 }
Write-Host ("WSL detected at {0}. Refreshing port proxies..." -f $wslIP) -ForegroundColor Cyan

foreach ($p in $Ports) { $bound = Ensure-PortProxy-WithFallback -Port $p -TargetIP $wslIP; if ($null -ne $bound) { Write-Host ("[OK] Port {0} exposed on {1}" -f $p, $bound) -ForegroundColor Green } else { Write-Warning ("[FAIL] Could not expose port {0}" -f $p) } }

Write-Host "Current portproxy table:" -ForegroundColor DarkGray
& netsh interface portproxy show v4tov4
