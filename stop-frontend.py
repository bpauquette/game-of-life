#!/usr/bin/env python3
"""Stop just the frontend by killing node/npm processes and any process on the frontend port."""
from pathlib import Path
import subprocess
import platform
import os
import time


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


def kill_node_processes():
    if platform.system() == 'Windows':
        subprocess.run(['taskkill', '/IM', 'node.exe', '/F'], check=False)
        subprocess.run(['taskkill', '/IM', 'npm.exe', '/F'], check=False)
    else:
        subprocess.run(['pkill', '-f', 'node'], check=False)


def main():
    repo_root = Path(__file__).resolve().parent
    env_file = repo_root / '.env'
    frontend_port = read_env_port(env_file, 'PORT', 3000)

    print("Stopping frontend processes...")
    kill_node_processes()
    time.sleep(1)
    pids = find_pids_on_port(frontend_port)
    for pid in pids:
        print(f"Stopping PID {pid} on port {frontend_port}")
        kill_pid(pid)


if __name__ == '__main__':
    main()
