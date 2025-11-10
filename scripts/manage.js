#!/usr/bin/env node
const { spawn } = require('cross-spawn');
const fs = require('fs');
const path = require('path');

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

function start() {
  const existing = readPid(config.pidFile);
  if (existing && isRunning(existing)) {
    console.log(`${area} already running (pid=${existing}). Logs: ${config.logFile}`);
    process.exit(0);
  }

  console.log(`Starting ${area} (cwd=${config.cwd})`);

  // Default to background (detached) start for all platforms so `manage.js start`
  // returns immediately. Pass --foreground to keep the manager attached and
  // stream logs to the terminal (behaves like running `npm start` directly).
  const foreground = process.argv.includes('--foreground') || process.argv.includes('--no-detach');
  const shouldDetach = !foreground;

  // On Windows, spawning shell commands is more reliable via cmd.exe /c
  let spawnCmd = config.cmd;
  let spawnArgs = config.args;
  if (process.platform === 'win32') {
    spawnCmd = 'cmd.exe';
    spawnArgs = ['/c', npmCmd].concat(config.args || []);
  }

  // debug log the spawn options to diagnose EINVAL
  console.log('spawn command:', spawnCmd);
  console.log('spawn args:', JSON.stringify(spawnArgs));
  console.log('spawn cwd:', config.cwd);

  let child;
  try {
    if (shouldDetach) {
      // Open the log file and pass its fd directly to the child as stdout/stderr.
      // This allows the child to write logs without piping through the parent,
      // so the parent can exit and the child keeps running.
      let outFd;
      try {
        outFd = fs.openSync(config.logFile, 'a');
      } catch (e) {
        console.warn('Unable to open log file for writing, falling back to ignore:', e.message);
        outFd = 'ignore';
      }

  const stdioOption = (typeof outFd === 'number') ? ['ignore', outFd, outFd] : ['ignore', 'ignore', 'ignore'];

      child = spawn(spawnCmd, spawnArgs, {
        cwd: config.cwd,
        stdio: stdioOption,
        detached: true,
        // Always pass PORT so the frontend sticks to a predictable port
        env: { ...process.env, PORT: config.portEnv },
      });

      // Parent no longer needs the fd open — close it so file isn't leaked.
      if (typeof outFd === 'number') {
        try { 
          fs.closeSync(outFd); 
        } catch (e) { 
          console.warn('Failed to close file descriptor:', e.message); 
        }
      }
    } else {
      // Foreground: inherit stdio so the child appears in this terminal and
      // Ctrl+C behaves normally. On Windows, spawn npm.cmd directly to avoid
      // the extra cmd.exe wrapper.
      if (process.platform === 'win32' && config.cmd && config.cmd.toLowerCase().indexOf('npm') !== -1) {
        child = spawn(npmCmd, config.args, {
          cwd: config.cwd,
          stdio: 'inherit',
          detached: false,
          env: { ...process.env, PORT: config.portEnv },
        });
      } else {
        child = spawn(spawnCmd, spawnArgs, {
          cwd: config.cwd,
          stdio: 'inherit',
          detached: false,
          env: { ...process.env, PORT: config.portEnv },
        });
      }
    }
  } catch (err) {
    console.error('spawn threw synchronously:', err && err.stack ? err.stack : err);
    throw err;
  }

  child.on('error', (err) => {
    console.error('Failed to spawn process:', err && err.stack ? err.stack : err);
    process.exit(1);
  });

  // detach and write PID only after spawn succeeded
  try {
    if (shouldDetach && child.unref) child.unref();
    if (child.pid) {
      fs.writeFileSync(config.pidFile, String(child.pid));
      if (shouldDetach) console.log(`${area} started in background (pid=${child.pid}). Logs: ${config.logFile}`);
      else console.log(`${area} started in foreground (pid=${child.pid}).`);
    } else {
      console.log(`${area} started (no pid available). Logs: ${config.logFile}`);
    }
    // After start, wait for the expected port to be ready (only for start action)
    const waitPort = area === 'frontend' ? (process.env.PORT || '3000') : (process.env.GOL_BACKEND_PORT || process.env.PORT || config.portEnv);
    const configuredHost = process.env.HOST_IP || process.env.GOL_HOST || '127.0.0.1';
    const localFallback = '127.0.0.1';
    const portNum = Number.parseInt(waitPort, 10);
    // Try configured host first; if that fails (e.g., portproxy not set yet), try localhost.
    waitForPort(configuredHost, portNum, 20000)
      .then(() => console.log(`${area} appears to be accepting connections on ${configuredHost}:${waitPort}`))
      .catch(() => {
        if (configuredHost !== localFallback) {
          return waitForPort(localFallback, portNum, 8000)
            .then(() => console.log(`${area} appears to be accepting connections on ${localFallback}:${waitPort} (fallback)`))
            .catch((err) => console.warn(`${area} port check failed on ${configuredHost} and localhost: ${err.message}`));
        }
        console.warn(`${area} port check failed: timeout`);
      });
  } catch (e) {
    console.error('Error while writing PID file:', e.message);
  }

  // In foreground mode, forward signals to the child and exit with its code so
  // the manager behaves like running the command directly.
  if (!shouldDetach) {
    child.on('exit', (code, signal) => {
      if (fs.existsSync(config.pidFile)) {
        try { 
          fs.unlinkSync(config.pidFile); 
        } catch (e) { 
          console.warn('Failed to remove PID file:', e.message); 
        }
      }
      if (typeof code === 'number') process.exit(code);
      if (signal) process.exit(1);
      process.exit(0);
    });
    const forward = (sig) => { 
      if (child && child.pid) {
        try { 
          child.kill(sig); 
        } catch (e) { 
          console.warn(`Failed to send ${sig} to process:`, e.message); 
        }
      }
    };
    process.on('SIGINT', () => forward('SIGINT'));
    process.on('SIGTERM', () => forward('SIGTERM'));
  }
}

function waitForPort(host, port, timeoutMs) {
  const net = require('node.net');
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

function stop() {
  const pid = readPid(config.pidFile);
  if (!pid) {
    console.log(`No PID file at ${config.pidFile}. Nothing to stop.`);
    process.exit(0);
  }
  if (!isRunning(pid)) {
    console.log(`Process ${pid} not running. Removing stale PID file.`);
    if (fs.existsSync(config.pidFile)) {
      try { 
        fs.unlinkSync(config.pidFile); 
      } catch (e) { 
        console.warn('Failed to remove stale PID file:', e.message); 
      }
    }
    process.exit(0);
  }
  console.log(`Stopping ${area} (pid=${pid})`);
  try {
    process.kill(Number.parseInt(pid, 10));
  } catch (e) {
    console.error('Error sending SIGTERM, attempting kill -9');
    try { 
      process.kill(Number.parseInt(pid, 10), 'SIGKILL'); 
    } catch (error) { 
      console.error('Failed to kill process with SIGKILL:', error.message); 
    }
  }
  // wait briefly
  setTimeout(() => {
    if (isRunning(pid)) {
      try { 
        process.kill(Number.parseInt(pid, 10), 'SIGKILL'); 
      } catch (e) { 
        console.warn('Failed to force kill process:', e.message); 
      }
    }
    if (fs.existsSync(config.pidFile)) {
      try { 
        fs.unlinkSync(config.pidFile); 
      } catch (e) { 
        console.warn('Failed to remove PID file:', e.message); 
      }
    }
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

if (action === 'start') start();
else if (action === 'stop') stop();
else if (action === 'status') status();
else {
  console.error('Unknown action:', action);
  process.exit(2);
}
