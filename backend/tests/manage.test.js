import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');
const manageScript = path.join(root, 'backend', 'scripts', 'manage.js');
const pidFile = path.join(root, 'backend', 'backend.pid');
const logFile = path.join(root, 'backend', 'backend.log');
const port = '55000'; // default port

function runManage(action, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [manageScript, action, ...extraArgs], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => stdout += data);
    child.stderr.on('data', (data) => stderr += data);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    child.on('error', reject);
  });
}

function readPid() {
  try {
    return fs.readFileSync(pidFile, 'utf8').trim();
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

function waitForPort(host, port, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(attempt, 500);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(attempt, 500);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    };
    attempt();
  });
}

function cleanup() {
  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
}

// Clean up before and after tests
test.before(async () => {
  await runManage('stop'); // Ensure backend is stopped before tests
  cleanup();
});
test.after(() => cleanup());

test('manage.js status when not running', async () => {
  const result = await runManage('status');
  assert.strictEqual(result.code, 1, 'Status should exit 1 when not running');
  assert(result.stdout.includes('backend not running'), 'Should report not running');
});

test('manage.js start and stop', async () => {
  // Start
  const startResult = await runManage('start');
  assert.strictEqual(startResult.code, 0, 'Start should succeed');
  assert(startResult.stdout.includes('backend started'), 'Should report started');

  // Check PID file
  const pid = readPid();
  assert(pid, 'PID file should exist');
  assert(isRunning(pid), 'Process should be running');

  // Wait for port
  await waitForPort('127.0.0.1', Number.parseInt(port, 10), 15000);

  // Status
  const statusResult = await runManage('status');
  assert.strictEqual(statusResult.code, 0, 'Status should exit 0 when running');
  assert(statusResult.stdout.includes('backend running'), 'Should report running');

  // Stop
  const stopResult = await runManage('stop');
  assert.strictEqual(stopResult.code, 0, 'Stop should succeed');
  assert(stopResult.stdout.includes('backend stopped'), 'Should report stopped');

  // Verify stopped
  assert(!isRunning(pid), 'Process should not be running');
  assert(!fs.existsSync(pidFile), 'PID file should be removed');
});

test('manage.js stop when not running', async () => {
  const result = await runManage('stop');
  assert.strictEqual(result.code, 0, 'Stop should succeed even if not running');
  assert(result.stdout.includes('not running'), 'Should report not running');
});

test('manage.js invalid action', async () => {
  const result = await runManage('invalid');
  assert.strictEqual(result.code, 2, 'Invalid action should exit 2');
  assert(result.stderr.includes('Unknown action'), 'Should report unknown action');
});