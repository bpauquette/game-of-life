#!/usr/bin/env node
const { spawn } = require('cross-spawn');
const fs = require('node:fs');
const path = require('node:path');

// Simple cross-platform process manager for the backend dev server.
// Usage: node backend/scripts/manage.js <start|stop|status> [--foreground]

const action = process.argv[2];
if (!action) {
  console.error('Usage: node backend/scripts/manage.js <start|stop|status> [--foreground]');
  process.exit(2);
}

const root = path.resolve(__dirname, '..', '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const config = {
  cmd: npmCmd,
  args: ['start'],
  cwd: path.join(root, 'backend'),
  pidFile: path.join(root, 'backend', 'backend.pid'),
  logFile: path.join(root, 'backend', 'backend.log'),
  portEnv: process.env.GOL_BACKEND_PORT || process.env.PORT || '55000',
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
    process.kill(parseInt(pid, 10), 0);
    return true;
  } catch (e) {
    return false;
  }
}

function waitForPort(host, port, timeoutMs) {
  const net = require('net');
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

function start() {
  const existing = readPid(config.pidFile);
  if (existing && isRunning(existing)) {
    console.log(`backend already running (pid=${existing}). Logs: ${config.logFile}`);
    process.exit(0);
  }

  console.log(`Starting backend (cwd=${config.cwd})`);

  const foreground = process.argv.includes('--foreground') || process.argv.includes('--no-detach');
  const shouldDetach = !foreground;

  let spawnCmd = config.cmd;
  let spawnArgs = config.args;
  if (process.platform === 'win32') {
    spawnCmd = 'cmd.exe';
    spawnArgs = ['/c', npmCmd].concat(config.args || []);
  }

  console.log('spawn command:', spawnCmd);
  console.log('spawn args:', JSON.stringify(spawnArgs));
  console.log('spawn cwd:', config.cwd);

  let child;
  try {
    if (shouldDetach) {
      child = spawnDetached(spawnCmd, spawnArgs);
    } else {
      child = spawnForeground(spawnCmd, spawnArgs);
    }
  } catch (err) {
    console.error('spawn threw synchronously:', err && err.stack ? err.stack : err);
    throw err;
  }

  child.on('error', (err) => {
    console.error('Failed to spawn process:', err && err.stack ? err.stack : err);
    process.exit(1);
  });

  try {
    if (shouldDetach && child.unref) child.unref();
    if (child.pid) {
      fs.writeFileSync(config.pidFile, String(child.pid));
      if (shouldDetach) console.log(`backend started in background (pid=${child.pid}). Logs: ${config.logFile}`);
      else console.log(`backend started in foreground (pid=${child.pid}).`);
    } else {
      console.log(`backend started (no pid available). Logs: ${config.logFile}`);
    }

    const waitPort = config.portEnv;
    const host = '127.0.0.1';
    waitForPort(host, parseInt(waitPort, 10), 20000)
      .then(() => console.log(`backend appears to be accepting connections on ${host}:${waitPort}`))
      .catch((err) => console.warn(`backend port check failed: ${err.message}`));
  } catch (e) {
    console.error('Error while writing PID file:', e.message);
  }

  // In foreground mode, forward signals to the child and exit with its code so
  // the manager behaves like running the command directly.
  if (!shouldDetach) {
    child.on('exit', (code, signal) => {
      // cleanup pidfile on foreground exit
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

function spawnDetached(cmd, args) {
  let outFd;
  try {
    outFd = fs.openSync(config.logFile, 'a');
  } catch (e) {
    console.warn('Unable to open log file for writing, falling back to ignore:', e.message);
    outFd = 'ignore';
  }
  const stdioOption = (typeof outFd === 'number') ? ['ignore', outFd, outFd] : ['ignore', 'ignore', 'ignore'];
  const child = spawn(cmd, args, {
    cwd: config.cwd,
    stdio: stdioOption,
    detached: true,
    env: { ...process.env, PORT: config.portEnv },
  });
  if (typeof outFd === 'number') {
    try { 
      fs.closeSync(outFd); 
    } catch (e) { 
      console.warn('Failed to close file descriptor:', e.message); 
    }
  }
  return child;
}

function spawnForeground(cmd, args) {
  if (process.platform === 'win32' && config.cmd && config.cmd.toLowerCase().indexOf('npm') !== -1) {
    return spawn(npmCmd, config.args, {
      cwd: config.cwd,
      stdio: 'inherit',
      detached: false,
      env: { ...process.env, PORT: config.portEnv },
    });
  }
  return spawn(cmd, args, {
    cwd: config.cwd,
    stdio: 'inherit',
    detached: false,
    env: { ...process.env, PORT: config.portEnv },
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
  console.log(`Stopping backend (pid=${pid})`);
  try {
    process.kill(parseInt(pid, 10));
  } catch (e) {
    console.warn('Error sending SIGTERM, attempting kill -9');
    try { 
      process.kill(parseInt(pid, 10), 'SIGKILL'); 
    } catch (e2) { 
      console.warn('Failed to kill process with SIGKILL:', e2.message); 
    }
  }
  setTimeout(() => {
    if (isRunning(pid)) {
      try { 
        process.kill(parseInt(pid, 10), 'SIGKILL'); 
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
