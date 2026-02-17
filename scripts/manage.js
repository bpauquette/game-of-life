#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('node:net');

// Simple cross-platform process manager for frontend dev server only.
// Usage: node scripts/manage.js frontend <start|stop|status> [--foreground]

const area = 'frontend';
const action = process.argv[2];
if (!action) {
  console.error('Usage: node scripts/manage.js frontend <start|stop|status> [--foreground]');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');

// Minimal .env loader so scripts can read HOST_IP/GOL_HOST without extra deps
function loadDotEnv(envPath) {
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = val;
      }
    });
  } catch { /* ignore if missing */ }
}

loadDotEnv(path.join(root, '.env'));
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const config = {
  cmd: npmCmd,
  args: ['start'],
  cwd: root,
  pidFile: path.join(root, 'frontend.pid'),
  logFile: path.join(root, 'frontend.log'),
  portEnv: process.env.PORT || '3000',
};

function readPid(pidFile) {
  try {
    const pid = fs.readFileSync(pidFile, 'utf8').trim();
    return pid || null;
  } catch (e) {
    return null;
  }
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number.parseInt(pid, 10), 0);
    return true;
  } catch (e) {
    return false;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function checkPortAvailability(port, host = '0.0.0.0') {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.unref();
    tester.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        err.code = 'EADDRINUSE';
        return reject(err);
      }
      return reject(err);
    });
    tester.once('listening', () => {
      tester.close(() => resolve());
    });
    tester.listen(port, host);
  });
}

async function ensurePortAvailable(port, { timeoutMs = 8000, intervalMs = 250, hosts = ['0.0.0.0'] } = {}) {
  const started = Date.now();
  while (true) {
    try {
      for (const host of hosts) {
        await checkPortAvailability(port, host);
        // Give the OS a brief moment to release the socket before the next attempt.
        if (hosts.length > 1) await delay(50);
      }
      return;
    } catch (err) {
      if (!err || err.code !== 'EADDRINUSE') throw err;
      if (Date.now() - started > timeoutMs) {
        const timeoutErr = new Error(`Port ${port} is still in use after waiting ${timeoutMs}ms.`);
        timeoutErr.code = 'PORT_IN_USE';
        throw timeoutErr;
      }
      await delay(intervalMs);
    }
  }
}

function isForegroundRequested(argv = process.argv) {
  return argv.includes('--foreground') || argv.includes('--no-detach');
}

function resolveSpawnTarget() {
  if (process.platform === 'win32') {
    return { cmd: 'cmd.exe', args: ['/c', npmCmd].concat(config.args || []) };
  }
  return { cmd: config.cmd, args: config.args };
}

function isNpmCommand(command) {
  return Boolean(command) && command.toLowerCase().indexOf('npm') !== -1;
}

function logSpawnConfig(spawnCmd, spawnArgs) {
  console.log('spawn command:', spawnCmd);
  console.log('spawn args:', JSON.stringify(spawnArgs));
  console.log('spawn cwd:', config.cwd);
}

function openLogFd(logFile) {
  try {
    return fs.openSync(logFile, 'a');
  } catch (e) {
    console.warn('Unable to open log file for writing, falling back to ignore:', e.message);
    return 'ignore';
  }
}

function closeFd(fd) {
  if (typeof fd !== 'number') return;
  try {
    fs.closeSync(fd);
  } catch (e) {
    console.warn('Failed to close file descriptor:', e.message);
  }
}

function spawnDetached(spawnCmd, spawnArgs) {
  const outFd = openLogFd(config.logFile);
  const stdioOption = (typeof outFd === 'number') ? ['ignore', outFd, outFd] : ['ignore', 'ignore', 'ignore'];
  try {
    return spawn(spawnCmd, spawnArgs, {
      cwd: config.cwd,
      stdio: stdioOption,
      detached: true,
      env: { ...process.env, PORT: config.portEnv },
    });
  } finally {
    closeFd(outFd);
  }
}

function spawnForeground(spawnCmd, spawnArgs) {
  if (process.platform === 'win32' && isNpmCommand(config.cmd)) {
    return spawn(npmCmd, config.args, {
      cwd: config.cwd,
      stdio: 'inherit',
      detached: false,
      env: { ...process.env, PORT: config.portEnv },
    });
  }
  return spawn(spawnCmd, spawnArgs, {
    cwd: config.cwd,
    stdio: 'inherit',
    detached: false,
    env: { ...process.env, PORT: config.portEnv },
  });
}

function spawnManagedProcess(foreground) {
  const { cmd: spawnCmd, args: spawnArgs } = resolveSpawnTarget();
  logSpawnConfig(spawnCmd, spawnArgs);
  return foreground ? spawnForeground(spawnCmd, spawnArgs) : spawnDetached(spawnCmd, spawnArgs);
}

function handlePortReadyCheck() {
  const waitPort = area === 'frontend' ? (process.env.PORT || '3000') : (process.env.GOL_BACKEND_PORT || process.env.PORT || config.portEnv);
  const configuredHost = process.env.HOST_IP || process.env.GOL_HOST || '127.0.0.1';
  const localFallback = '127.0.0.1';
  const portNum = Number.parseInt(waitPort, 10);
  waitForPort(configuredHost, portNum, 20000)
    .then(() => console.log(`${area} appears to be accepting connections on ${configuredHost}:${waitPort}`))
    .catch(() => {
      if (configuredHost !== localFallback) {
        return waitForPort(localFallback, portNum, 8000)
          .then(() => console.log(`${area} appears to be accepting connections on ${localFallback}:${waitPort} (fallback)`))
          .catch((err) => console.warn(`${area} port check failed on ${configuredHost} and localhost: ${err.message}`));
      }
      console.warn(`${area} port check failed: timeout`);
      return null;
    });
}

function onSpawnError(err) {
  console.error('Failed to spawn process:', err && err.stack ? err.stack : err);
  process.exit(1);
}

function writePidFile(pid) {
  fs.writeFileSync(config.pidFile, String(pid));
}

function logStartResult(pid, foreground) {
  if (foreground) console.log(`${area} started in foreground (pid=${pid}).`);
  else console.log(`${area} started in background (pid=${pid}). Logs: ${config.logFile}`);
}

function finalizeStart(child, foreground) {
  if (!foreground && child.unref) child.unref();
  if (child.pid) {
    writePidFile(child.pid);
    logStartResult(child.pid, foreground);
  } else {
    console.log(`${area} started (no pid available). Logs: ${config.logFile}`);
  }
  handlePortReadyCheck();
}

function cleanupPidFile() {
  if (!fs.existsSync(config.pidFile)) return;
  try {
    fs.unlinkSync(config.pidFile);
  } catch (e) {
    console.warn('Failed to remove PID file:', e.message);
  }
}

function attachForegroundLifecycle(child) {
  child.on('exit', (code, signal) => {
    cleanupPidFile();
    if (typeof code === 'number') process.exit(code);
    if (signal) process.exit(1);
    process.exit(0);
  });
  const forward = (sig) => {
    if (!child || !child.pid) return;
    try {
      child.kill(sig);
    } catch (e) {
      console.warn(`Failed to send ${sig} to process:`, e.message);
    }
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));
}

async function verifyDesiredPort() {
  const desiredPort = Number.parseInt(config.portEnv, 10);
  try {
    await ensurePortAvailable(desiredPort, {
      timeoutMs: 8000,
      hosts: [process.env.HOST_IP || process.env.GOL_HOST || '0.0.0.0'],
    });
  } catch (err) {
    if (err && (err.code === 'PORT_IN_USE' || err.code === 'EADDRINUSE')) {
      console.error(`Cannot start ${area}: port ${desiredPort} is already in use.`);
      console.error('Please stop the process occupying that port and try again.');
      process.exit(1);
    }
    console.error(`Failed to verify port ${desiredPort}:`, err && err.message ? err.message : err);
    process.exit(1);
  }
}

async function start() {
  const existing = readPid(config.pidFile);
  if (existing && isRunning(existing)) {
    console.log(`${area} already running (pid=${existing}). Logs: ${config.logFile}`);
    process.exit(0);
  }

  console.log(`Starting ${area} (cwd=${config.cwd})`);

  await verifyDesiredPort();

  // Default to background (detached) start for all platforms so `manage.js start`
  // returns immediately. Pass --foreground to keep the manager attached and
  // stream logs to the terminal (behaves like running `npm start` directly).
  const foreground = isForegroundRequested();
  const shouldDetach = !foreground;

  let child;
  try {
    child = spawnManagedProcess(foreground);
  } catch (err) {
    console.error('spawn threw synchronously:', err && err.stack ? err.stack : err);
    throw err;
  }

  child.on('error', onSpawnError);

  // detach and write PID only after spawn succeeded
  try {
    finalizeStart(child, foreground);
  } catch (e) {
    console.error('Error while writing PID file:', e.message);
  }

  // In foreground mode, forward signals to the child and exit with its code so
  // the manager behaves like running the command directly.
  if (!shouldDetach) {
    attachForegroundLifecycle(child);
  }
}

function waitForPort(host, port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function attempt() {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(attempt, 300);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(attempt, 300);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    })();
  });
}

function removePidFile(message) {
  if (!fs.existsSync(config.pidFile)) return;
  try {
    fs.unlinkSync(config.pidFile);
  } catch (e) {
    console.warn(message, e.message);
  }
}

function tryKill(pid, signal) {
  try {
    process.kill(Number.parseInt(pid, 10), signal);
    return true;
  } catch (e) {
    return false;
  }
}

function stop() {
  const pid = readPid(config.pidFile);
  if (!pid) {
    console.log(`No PID file at ${config.pidFile}. Nothing to stop.`);
    process.exit(0);
  }
  if (!isRunning(pid)) {
    console.log(`Process ${pid} not running. Removing stale PID file.`);
    removePidFile('Failed to remove stale PID file:');
    process.exit(0);
  }
  console.log(`Stopping ${area} (pid=${pid})`);
  const sentSigTerm = tryKill(pid);
  if (!sentSigTerm) {
    console.error('Error sending SIGTERM, attempting kill -9');
    const sentSigKill = tryKill(pid, 'SIGKILL');
    if (!sentSigKill) {
      console.error('Failed to kill process with SIGKILL:', 'unknown error');
    }
  }
  // wait briefly
  setTimeout(() => {
    if (isRunning(pid)) {
      const forced = tryKill(pid, 'SIGKILL');
      if (!forced) {
        console.warn('Failed to force kill process:', 'unknown error');
      }
    }
    removePidFile('Failed to remove PID file:');
    console.log(`${area} stopped.`);
    process.exit(0);
  }, 500);
}

function status() {
  const pid = readPid(config.pidFile);
  if (pid && isRunning(pid)) {
    console.log(`${area} running (pid=${pid}). Logs: ${config.logFile}`);
    process.exit(0);
  }
  console.log(`${area} not running.`);
  process.exit(1);
}

if (action === 'start') {
  start().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
else if (action === 'stop') stop();
else if (action === 'status') status();
else {
  console.error('Unknown action:', action);
  process.exit(2);
}
