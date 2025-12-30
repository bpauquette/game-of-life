#!/usr/bin/env python3
"""Stop Game of Life services (Python replacement for stop-services.ps1).

Behavior:
 - Stops node/npm processes and any processes listening on frontend/backend ports
 - Reads PORT and GOL_BACKEND_PORT from .env if present
"""
import os
import time
import subprocess
import sys
import platform
from pathlib import Path


def read_env_port(env_path, key, default):
    if not env_path.exists():
        return default
    try:
        for line in env_path.read_text().splitlines():
            if line.strip().startswith(f"{key}="):
                return int(line.split('=', 1)[1].strip())
    except Exception:
        pass
    return default


def find_pids_on_port(port):
    pids = set()
    system = platform.system()
    if system == 'Windows':
        try:
            out = subprocess.check_output(['netstat', '-ano'], text=True, errors='ignore')
            for line in out.splitlines():
                if f":{port} " in line or f":{port}\r" in line or line.strip().endswith(f":{port}"):
                    parts = line.split()
                    if parts:
                        pid = parts[-1]
                        if pid.isdigit():
                            pids.add(int(pid))
        except Exception:
            pass
    else:
        try:
            out = subprocess.check_output(['lsof', '-i', f':{port}', '-t'], text=True, stderr=subprocess.DEVNULL)
            for l in out.splitlines():
                if l.strip().isdigit():
                    pids.add(int(l.strip()))
        except Exception:
            pass
    return list(pids)


def kill_pid(pid):
    system = platform.system()
    try:
        if system == 'Windows':
            subprocess.run(['taskkill', '/PID', str(pid), '/F'], check=False)
        else:
            os.kill(pid, 9)
    except Exception:
        pass


def kill_node_processes():
    system = platform.system()
    if system == 'Windows':
        subprocess.run(['taskkill', '/IM', 'node.exe', '/F'], check=False)
        subprocess.run(['taskkill', '/IM', 'npm.exe', '/F'], check=False)
    else:
        subprocess.run(['pkill', '-f', 'node'], check=False)


def stop_processes_on_ports(ports):
    for port in ports:
        pids = find_pids_on_port(port)
        for pid in pids:
            print(f"Stopping PID {pid} on port {port}")
            kill_pid(pid)


def main():
    repo_root = Path(__file__).resolve().parent
    env_file = repo_root / '.env'
    frontend_port = read_env_port(env_file, 'PORT', 3000)
    backend_port = read_env_port(env_file, 'GOL_BACKEND_PORT', 55000)

    print("🛑 Stopping Game of Life services...")
    kill_node_processes()
    time.sleep(1)
    stop_processes_on_ports([frontend_port, backend_port])
    print("✅ All services stopped")


if __name__ == '__main__':
    main()
