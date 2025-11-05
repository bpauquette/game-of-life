<#
.SYNOPSIS
  Configure Windows firewall and (optionally) WSL2 port proxies for Game of Life dev ports.

.DESCRIPTION
  - Creates inbound firewall rules for TCP ports 3000 (frontend) and 55000 (backend)
    for Private/Domain profiles.
  - If a WSL2 instance is detected, sets up IPv4 port proxies so traffic to
    0.0.0.0:<port> on Windows forwards to <WSL_IP>:<port>.

  Run in an elevated PowerShell (Run as Administrator).

.PARAMETER Ports
  Ports to configure. Defaults to 3000, 55000.

.PARAMETER ListenAddress
  Address on the Windows host to listen on for portproxy. Defaults to 0.0.0.0.

.PARAMETER Profiles
  Firewall profiles to allow. Defaults to Private,Domain.

.EXAMPLE
  # Typical usage (run as Administrator)
  scripts\windows\setup-gol-dev-network.ps1

.EXAMPLE
  # Custom ports
  scripts\windows\setup-gol-dev-network.ps1 -Ports 3000,55000,5173

#>
[CmdletBinding()] param(
  [int[]] $Ports = @(3000, 55000),
  [string] $ListenAddress = '0.0.0.0',
  [ValidateSet('Domain','Private','Public')]
  [string[]] $Profiles = @('Domain','Private','Public'),
  [string] $RemoteAddress = 'Any',
  [string] $WSLIP = $null,
  [string] $PublicHost = $null
)

function Assert-Admin {
  # Determine if running as Administrator (elevated)
  $principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
  $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Error 'Please run this script in an elevated PowerShell (Run as Administrator).'
    exit 1
  }
}

function Get-WSLIPv4 {
  # Warm up WSL so that queries return data even if the distro was stopped
  try { $null = & wsl.exe -e sh -c "true" 2>$null } catch { }

  $candidates = @()
  try {
    $out = & wsl.exe hostname -I 2>$null
    if ($out) { $candidates += $out }
  } catch { }
  try {
    $out = & wsl.exe -e sh -lc "hostname -I" 2>$null
    if ($out) { $candidates += $out }
  } catch { }
  try {
    $out = & wsl.exe -e sh -lc "ip -4 addr show eth0 | awk '/inet /{print $2}' | cut -d/ -f1" 2>$null
    if ($out) { $candidates += $out }
  } catch { }

  if ($candidates.Count -eq 0) { return $null }

  $ipv4s = @()
  foreach ($line in $candidates) {
    $matches = [regex]::Matches($line, '((\d{1,3}\.){3}\d{1,3})')
    foreach ($m in $matches) { $ipv4s += $m.Value }
  }
  $ipv4s = $ipv4s | Where-Object { $_ -and ($_ -notmatch '^127\.') -and ($_ -notmatch '^169\.254\.')} | Select-Object -Unique
  if ($ipv4s.Count -gt 0) { return $ipv4s[0] }
  return $null
}

function Ensure-FirewallRule {
  param(
    [int] $Port
  )
  $ruleName = "GOL Dev TCP $Port (" + ($Profiles -join '/') + ")"
  try {
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule | Out-Null
  } catch { }
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile $Profiles `
    -RemoteAddress $RemoteAddress `
    -EdgeTraversalPolicy Allow | Out-Null
  Write-Host "Firewall rule created: $ruleName"
}

function Ensure-PortProxy {
  param(
    [int] $Port,
    [string] $ListenIP,
    [string] $TargetIP
  )
  if (-not (Is-IPv4 $TargetIP)) {
    Write-Warning ("Target IP '{0}' is not a valid IPv4; skipping port {1}." -f $TargetIP, $Port)
    return $false
  }
  # Remove existing mapping first to avoid duplicates
  $null = & netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=$ListenIP 2>&1
  # Add mapping Windows:ListenIP:Port -> WSL_IP:Port
  $output = & netsh interface portproxy add v4tov4 listenport=$Port listenaddress=$ListenIP connectport=$Port connectaddress=$TargetIP 2>&1
  $code = $LASTEXITCODE
  if ($code -eq 0) {
    Write-Host ("Port proxy set: {0}:{1} -> {2}:{1}" -f $ListenIP, $Port, $TargetIP) -ForegroundColor Green
    return $true
  } else {
    Write-Warning ("Failed to set port proxy for {0} on {1}: {2}" -f $Port, $ListenIP, ($output -join ' '))
    return $false
  }
}

function Get-HostLanIPs {
  try {
    return Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' -and $_.PrefixOrigin -ne 'WellKnown' } |
      Select-Object -ExpandProperty IPAddress
  } catch { return @() }
}

function Ensure-PortProxy-WithFallback {
  param(
    [int] $Port,
    [string] $TargetIP
  )
  # Try 0.0.0.0 first
  if (Ensure-PortProxy -Port $Port -ListenIP '0.0.0.0' -TargetIP $TargetIP) { return '0.0.0.0' }
  # Fallback to binding specific LAN IPs (some environments block 0.0.0.0)
  $lanIPs = Get-HostLanIPs
  foreach ($ip in $lanIPs) {
    if (Ensure-PortProxy -Port $Port -ListenIP $ip -TargetIP $TargetIP) { return $ip }
  }
  return $null
}

function Is-IPv4 {
  param([string] $ip)
  if (-not $ip) { return $false }
  return [bool]($ip -as [System.Net.IPAddress] -and $ip -match '^(?:\d{1,3}\.){3}\d{1,3}$')
}

function Show-NextSteps {
  param([string] $WSLIP, [string] $PublicHost)
  Write-Host ''
  Write-Host 'Next steps:' -ForegroundColor Cyan
  Write-Host '  1) Start the frontend on port 3000 and host 0.0.0.0:'
  Write-Host '       npm start' -ForegroundColor Yellow
  Write-Host '  2) Start the backend on port 55000:'
  Write-Host '       cd backend && npm start' -ForegroundColor Yellow
  Write-Host '  3) From your phone, open:'
  if ($PublicHost) {
    Write-Host ("       http://{0}:3000" -f $PublicHost) -ForegroundColor Yellow
  } else {
    Write-Host '       http://<WINDOWS_LAN_IP>:3000' -ForegroundColor Yellow
  }
  Write-Host '     Health check (backend):'
  if ($PublicHost) {
    Write-Host ("       http://{0}:55000/v1/health" -f $PublicHost) -ForegroundColor Yellow
  } else {
    Write-Host '       http://<WINDOWS_LAN_IP>:55000/v1/health' -ForegroundColor Yellow
  }
  if ($WSLIP) { Write-Host "     (Detected WSL IPv4: $WSLIP)" -ForegroundColor DarkGray }
}

# --- Main ---
Assert-Admin

# Ensure required services are running (portproxy uses IP Helper)
try { Start-Service iphlpsvc -ErrorAction SilentlyContinue } catch { }

Write-Host "Configuring firewall rules for ports: $($Ports -join ', ')" -ForegroundColor Cyan
foreach ($p in $Ports) { Ensure-FirewallRule -Port $p }

$useProvidedWSLIP = $PSBoundParameters.ContainsKey('WSLIP')
$wslIP = if ($useProvidedWSLIP) { $WSLIP } else { Get-WSLIPv4 }
if ($useProvidedWSLIP -and -not (Is-IPv4 $WSLIP)) {
  Write-Warning ("Provided -WSLIP '{0}' is not a valid IPv4; ignoring." -f $WSLIP)
  $wslIP = Get-WSLIPv4
}
if ($wslIP) {
  Write-Host ("WSL detected at {0}. Configuring portproxy mappings..." -f $wslIP) -ForegroundColor Cyan
  foreach ($p in $Ports) {
    $bound = Ensure-PortProxy-WithFallback -Port $p -TargetIP $wslIP
    if ($null -ne $bound) {
      Write-Host ("[OK] Port {0} exposed on {1}" -f $p, $bound) -ForegroundColor Green
    } else {
      Write-Warning ("[FAIL] Failed to expose port {0}. See warnings above; consider checking if the port is already in use on Windows or a security suite is blocking portproxy." -f $p)
    }
  }
  Write-Host "Current portproxy table:" -ForegroundColor DarkGray
  & netsh interface portproxy show v4tov4
} else {
  Write-Host 'WSL IPv4 not detected. If your services run natively on Windows, the firewall rules are sufficient.' -ForegroundColor DarkYellow
  Write-Host 'If you run services in WSL2, launch your distro or run "wsl.exe" once, then re-run this script to add port proxies.' -ForegroundColor DarkYellow
  Write-Host 'Alternatively, provide the WSL IP explicitly: powershell -File .\setup-gol-dev-network.ps1 -WSLIP 172.19.x.y' -ForegroundColor DarkYellow
}

# Prefer explicit -PublicHost; otherwise allow env var fallback (useful via launcher)
if (-not $PublicHost) {
  $PublicHost = $env:PUBLIC_HOST
  if (-not $PublicHost) { $PublicHost = $env:HOST_IP }
  if (-not $PublicHost) { $PublicHost = $env:GOL_HOST }
}
Show-NextSteps -WSLIP $wslIP -PublicHost $PublicHost
