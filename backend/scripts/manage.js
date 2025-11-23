#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const action = process.argv[2];
if (!action) {
  console.error('Usage: node backend/scripts/manage.js <start|stop|status> [--foreground]');
  process.exit(2);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');

// Use the current node executable by default so the manager tracks the actual server process PID.
const nodeCmd = process.execPath; // full path to node
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const config = {
  cmd: nodeCmd,
  args: ['src/index.js'],
  cwd: path.join(root, 'backend'),
  pidFile: path.join(root, 'backend', 'backend.pid'),
  logFile: path.join(root, 'backend', 'backend.log'),
  portEnv: process.env.GOL_BACKEND_PORT || process.env.PORT || '55000',
};

const enableDebugThumbs = process.argv.includes('--debug-thumbs') || Boolean(process.env.GOL_DEBUG_THUMBS);

function readPid(pidFile) {
  try {
    const pid = fs.readFileSync(pidFile, 'utf8').trim();
    return pid || null;
  } catch {
    return null;
  }
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number.parseInt(pid, 10), 0);
    return true;
  } catch {
    return false;
  }
}

function waitForPort(host, port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function attempt() {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once('error', () => { socket.destroy(); if (Date.now() - start > timeoutMs) return reject(new Error('timeout')); setTimeout(attempt, 300); });
      socket.once('timeout', () => { socket.destroy(); if (Date.now() - start > timeoutMs) return reject(new Error('timeout')); setTimeout(attempt, 300); });
      socket.connect(port, host, () => { socket.end(); resolve(); });
    })();
  });
}

function start() {
  const existing = readPid(config.pidFile);
  if (existing && isRunning(existing)) {
    console.log(`backend already running (pid=${existing}). Logs: ${config.logFile}`);
    process.exit(0);
  }

  console.log(`Starting backend (cwd=${config.cwd})`);
  const foreground = process.argv.includes('--foreground') || process.argv.includes('--no-detach');
  const shouldDetach = !foreground;

  // Default to using node directly, but allow `--use-npm` to still use 'npm start'
  let spawnCmd = config.cmd;
  let spawnArgs = config.args;
  const useNpm = process.argv.includes('--use-npm');
  if (useNpm) {
    spawnCmd = npmCmd;
    spawnArgs = ['start'];
  }

  console.log('spawn command:', spawnCmd);
  console.log('spawn args:', JSON.stringify(spawnArgs));
  console.log('spawn cwd:', config.cwd);
  if (enableDebugThumbs) console.log('manager: forwarding GOL_DEBUG_THUMBS to child process');

  let child;
  try {
    if (shouldDetach) {
      child = spawnDetached(spawnCmd, spawnArgs);
    } else {
      child = spawnForeground(spawnCmd, spawnArgs);
    }
  } catch (err) {
    console.error('spawn threw synchronously:', err);
    throw err;
  }

  child.on('error', (err) => {
    console.error('Failed to spawn process:', err);
    process.exit(1);
  });

  try {
    if (shouldDetach && child.unref) child.unref();
    if (child.pid) {
      fs.writeFileSync(config.pidFile, String(child.pid));
      console.log(`backend started ${shouldDetach ? 'in background' : 'in foreground'} (pid=${child.pid}). Logs: ${config.logFile}`);
    }
  } catch (e) {
    console.error('Error while writing PID file:', e.message);
  }

  const host = '127.0.0.1';
  waitForPort(host, Number.parseInt(config.portEnv, 10), 20000)
    .then(() => console.log(`backend appears to be accepting connections on ${host}:${config.portEnv}`))
    .catch((err) => console.warn(`backend port check failed: ${err.message}`));

  if (!shouldDetach) {
    child.on('exit', (code, signal) => {
      if (fs.existsSync(config.pidFile)) fs.unlinkSync(config.pidFile);
      process.exit(code ?? (signal ? 1 : 0));
    });

    const forward = (sig) => { if (child?.pid) child.kill(sig); };
    process.on('SIGINT', () => forward('SIGINT'));
    process.on('SIGTERM', () => forward('SIGTERM'));
  }
}

function spawnDetached(cmd, args) {
  const outFd = fs.openSync(config.logFile, 'a');
  const child = spawn(cmd, args, {
    cwd: config.cwd,
    stdio: ['ignore', outFd, outFd],
    detached: true,
    env: { ...process.env, PORT: config.portEnv, ...(enableDebugThumbs ? { GOL_DEBUG_THUMBS: '1' } : {}) },
    shell: false,
  });
  fs.closeSync(outFd);
  return child;
}

function spawnForeground(cmd, args) {
  return spawn(cmd, args, {
    cwd: config.cwd,
    stdio: 'inherit',
    detached: false,
    env: { ...process.env, PORT: config.portEnv, ...(enableDebugThumbs ? { GOL_DEBUG_THUMBS: '1' } : {}) },
    shell: false,
  });
}

function stop() {
  const pid = readPid(config.pidFile);
  if (!pid || !isRunning(pid)) {
    if (fs.existsSync(config.pidFile)) fs.unlinkSync(config.pidFile);
    console.log(`backend not running. PID file removed if it existed.`);
    process.exit(0);
  }

  console.log(`Stopping backend (pid=${pid})`);
  try { process.kill(Number.parseInt(pid, 10)); } catch (e) { /* ignore */ }
  // On Windows, try taskkill to ensure the process tree is eliminated.
  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } catch (e) { /* ignore */ }
  }
  setTimeout(() => {
    if (isRunning(pid)) try { process.kill(Number.parseInt(pid, 10), 'SIGKILL'); } catch {}
    if (fs.existsSync(config.pidFile)) fs.unlinkSync(config.pidFile);
    console.log(`backend stopped.`);
    process.exit(0);
  }, 500);
}

function status() {
  const pid = readPid(config.pidFile);
  if (pid && isRunning(pid)) {
    console.log(`backend running (pid=${pid}). Logs: ${config.logFile}`);
    process.exit(0);
  }
  console.log(`backend not running.`);
  process.exit(1);
}

if (action === 'start') start();
else if (action === 'stop') stop();
else if (action === 'status') status();
else {
  console.error('Unknown action:', action);
  process.exit(2);
}
