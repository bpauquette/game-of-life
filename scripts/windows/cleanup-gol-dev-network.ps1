<#
.SYNOPSIS
  Remove Windows firewall rules and WSL2 port proxies created for Game of Life dev ports.

.DESCRIPTION
  - Removes inbound firewall rules created by setup-gol-dev-network.ps1
  - Removes netsh portproxy mappings for the given ports

  Run in an elevated PowerShell (Run as Administrator).

.PARAMETER Ports
  Ports to clean up. Defaults to 3000, 55000.

.PARAMETER ListenAddress
  Listen address used for portproxy mappings. Defaults to 0.0.0.0.

.EXAMPLE
  scripts\windows\cleanup-gol-dev-network.ps1

#>
[CmdletBinding()] param(
  [int[]] $Ports = @(3000, 55000),
  [string] $ListenAddress = '0.0.0.0'
)

function Assert-Admin {
  # Use explicit identity -> principal construction to avoid parsing issues
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Error 'Please run this script in an elevated PowerShell (Run as Administrator).'
    exit 1
  }
}

function Remove-FirewallRule {
  param([int] $Port)
  # Remove rules created by setup script (name contains the port number)
  $rules = Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "GOL Dev TCP $Port*" }
  if ($rules) {
    $rules | Remove-NetFirewallRule | Out-Null
    Write-Host "Removed firewall rules for port $Port"
  } else {
    Write-Host "No matching firewall rules found for port $Port"
  }
}

function Remove-PortProxy {
  param([int] $Port, [string] $ListenIP)
  & netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=$ListenIP | Out-Null
  # Use subexpression to avoid interpreting ':' as a scope designator in interpolated strings
  Write-Host "Removed port proxy: $($ListenIP):$Port"
}

# --- Main ---
Assert-Admin

foreach ($p in $Ports) { Remove-FirewallRule -Port $p }
foreach ($p in $Ports) { Remove-PortProxy -Port $p -ListenIP $ListenAddress }

Write-Host 'Cleanup complete.' -ForegroundColor Green
