import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const addr = server.address();
  const port = typeof addr === 'object' ? addr.port : 0;
  return { server, port };
}

async function waitForPaths(paths, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const allExist = paths.every(p => fs.existsSync(p));
    if (allExist) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

// eslint-disable-next-line no-undef
test('POST /v1/shapes generates PNGs for each color scheme and icon size', async () => {
  const app = createApp();
  const { server, port } = await startServer(app);
  const cleanup = [];
  try {
    // Read color schemes from repo root so we know what to expect
    const repoRoot = path.resolve(__dirname, '..', '..');
    const csPath = path.join(repoRoot, 'src', 'model', 'colorSchemes.js');
    const mod = await import(`file://${csPath}`);
    const schemes = Object.keys(mod.colorSchemes || {});

    assert.ok(schemes.length > 0, 'expected at least one color scheme');

    const sizes = [64, 96, 128];
    const name = `capture-test-${Date.now()}`;

    // POST a tiny shape
    const url = `http://127.0.0.1:${port}/v1/shapes`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cells: [{ x:0, y:0 }, { x:1, y:0 }, { x:0, y:1 }] })
    });
    assert.equal(res.status, 201, 'expected 201 Created from POST /v1/shapes');

    // Build expected file paths
    const backendRoot = path.resolve(__dirname, '..');
    const base = path.join(backendRoot, 'data', 'thumbnails');
    const expectedPngs = [];
    for (const size of sizes) {
      for (const scheme of schemes) {
        expectedPngs.push(path.join(base, String(size), scheme, `${name}.png`));
      }
    }

    // Wait for async generator to write all PNGs
    const ok = await waitForPaths(expectedPngs, 8000);
    if (!ok) {
      const missing = expectedPngs.filter(p => !fs.existsSync(p));
      assert.fail(`thumbnails not generated in time; missing: ${missing.slice(0,6).join(', ')}`);
    }

    // Queue cleanup (best-effort)
    cleanup.push(() => {
      for (const p of expectedPngs) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
    });
  } finally {
    try { server.close(); } catch {}
    // cleanup created files
    for (const c of cleanup) { try { c(); } catch {} }
  }
});
