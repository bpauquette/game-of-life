# Windows networking helpers for dev

These scripts help expose the frontend (port 3000) and backend (port 55000) to your local network and phone.

Easiest way: double‑click the .cmd wrappers (they elevate and bypass execution policy automatically).

## Setup (open firewall and add WSL2 port proxies)

Option A — Double‑click (recommended)

- scripts/windows/run-setup.cmd

Option B — PowerShell (Admin)

```
powershell -ExecutionPolicy Bypass -File scripts/windows/setup-gol-dev-network.ps1
```

What it does:
- Creates inbound firewall rules for TCP 3000 and 55000 (Private/Domain).
- If WSL2 is detected, adds port proxy mappings:
  - 0.0.0.0:3000 -> <WSL_IP>:3000
  - 0.0.0.0:55000 -> <WSL_IP>:55000

Then, on your phone, open:
- http://<WINDOWS_LAN_IP>:3000 (frontend)
- http://<WINDOWS_LAN_IP>:55000/v1/health (backend health)

## Cleanup (remove rules and port proxies)

Option A — Double‑click

- scripts/windows/run-cleanup.cmd

Option B — PowerShell (Admin)

```
powershell -ExecutionPolicy Bypass -File scripts/windows/cleanup-gol-dev-network.ps1
```

## Notes
- If you set REACT_APP_BACKEND_BASE, avoid using localhost when testing from a phone; prefer http://<WINDOWS_LAN_IP>:55000.
- The backend enables CORS, so cross-origin (3000 -> 55000) is allowed in dev.
- WSL IPs change on reboot; re-run the setup script if needed, or use the quick refresh below.
 - If PowerShell warns about unsigned scripts when run directly, use the .cmd wrappers; they handle elevation and policy bypass.

## Verify (local + LAN reachability)

Option A — Double‑click

- scripts/windows/run-verify.cmd

Option B — PowerShell

```
powershell -ExecutionPolicy Bypass -File scripts/windows/verify-gol-dev-network.ps1
```

This prints your Windows IPv4 addresses, the current portproxy table, and runs checks for:
- http://localhost:3000
- http://localhost:55000/v1/health
- http://<Windows_LAN_IP>:3000
- http://<Windows_LAN_IP>:55000/v1/health

## Quick refresh when phone stops connecting

Sometimes after a reboot or WSL restart, the WSL IP changes and the proxies go stale. Use this one-click refresh:

Option A — Double‑click

- scripts/windows/run-refresh.cmd

Option B — PowerShell (Admin)

```
powershell -ExecutionPolicy Bypass -File scripts/windows/refresh-gol-proxies.ps1
```

You can also force a specific WSL IP if detection fails:

```
powershell -ExecutionPolicy Bypass -File scripts/windows/refresh-gol-proxies.ps1 -WSLIP 172.19.98.117
```
