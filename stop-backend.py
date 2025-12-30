#!/usr/bin/env python3
"""Stop just the backend by killing processes on the backend port."""
from pathlib import Path
import time
import subprocess
import platform
import os


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
    try:
        if platform.system() == 'Windows':
            subprocess.run(['taskkill', '/PID', str(pid), '/F'], check=False)
        else:
            os.kill(pid, 9)
    except Exception:
        pass


def main():
    repo_root = Path(__file__).resolve().parent
    env_file = repo_root / '.env'
    backend_port = read_env_port(env_file, 'GOL_BACKEND_PORT', 55000)
    pids = find_pids_on_port(backend_port)
    for pid in pids:
        print(f"Stopping PID {pid} on backend port {backend_port}")
        kill_pid(pid)
    time.sleep(1)


if __name__ == '__main__':
    main()
