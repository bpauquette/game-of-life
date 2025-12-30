#!/usr/bin/env python3
"""Start the Game of Life frontend (Python replacement for start-frontend.ps1).

Behavior:
 - Attempts to stop existing node processes (best-effort)
 - Runs `npm start` in the frontend repo
"""
import os
import subprocess
import platform
import time
from pathlib import Path


def kill_node_processes():
    system = platform.system()
    if system == 'Windows':
        # Aggressively kill node.exe processes
        subprocess.run(['taskkill', '/IM', 'node.exe', '/F'], check=False)
    else:
        # Try pkill if available
        subprocess.run(['pkill', '-f', 'node'], check=False)


def main():
    print("🚀 Starting Game of Life Frontend...")
    try:
        kill_node_processes()
    except Exception as e:
        print("Could not stop processes:", e)
    time.sleep(2)

    repo_root = Path(__file__).resolve().parent
    subprocess.run(['npm', 'start'], cwd=str(repo_root))


if __name__ == '__main__':
    main()
