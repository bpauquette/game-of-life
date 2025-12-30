#!/usr/bin/env python3
"""Start the Game of Life backend (Python replacement for start-backend.ps1).

Behavior:
 - Reads GOL_BACKEND_PORT from .env (if present) or defaults to 55000
 - Kills any process listening on that port
 - Changes directory to sibling `game-of-life-backend` and runs `npm start`
"""
import os
import sys
import subprocess
import time
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
    import platform
    system = platform.system()
    pids = set()
    if system == 'Windows':
        out = subprocess.check_output(['netstat', '-ano'], text=True, errors='ignore')
        for line in out.splitlines():
            if f":{port} " in line or f":{port}\r" in line or line.strip().endswith(f":{port}"):
                parts = line.split()
                if parts:
                    pid = parts[-1]
                    if pid.isdigit():
                        pids.add(int(pid))
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
    import platform
    system = platform.system()
    try:
        if system == 'Windows':
            subprocess.run(['taskkill', '/PID', str(pid), '/F'], check=False)
        else:
            os.kill(pid, 9)
    except Exception:
        pass


def stop_process_on_port(port):
    pids = find_pids_on_port(port)
    for pid in pids:
        print(f"Stopping PID {pid} on port {port}")
        kill_pid(pid)


def main():
    repo_root = Path(__file__).resolve().parent
    env_file = repo_root / '.env'
    backend_port = read_env_port(env_file, 'GOL_BACKEND_PORT', 55000)

    print(f"Starting Game of Life backend on port {backend_port}...")
    stop_process_on_port(backend_port)
    time.sleep(2)

    backend_repo = repo_root.parent / 'game-of-life-backend'
    if not backend_repo.exists():
        print(f"Backend repository not found at '{backend_repo}'. Clone the backend repo alongside this frontend repo.")
        sys.exit(1)

    # Run `npm start` in backend repo
    subprocess.run(['npm', 'start'], cwd=str(backend_repo))


if __name__ == '__main__':
    main()
