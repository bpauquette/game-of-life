import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/index.js';

async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const addr = server.address();
  const port = typeof addr === 'object' ? addr.port : 0;
  return { server, port };
}

async function waitForPath(p, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(p)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

function thumbsDir() {
  // Mirror backend src logic: backendRoot/data/thumbnails
  const here = path.dirname(new URL(import.meta.url).pathname);
  const backendRoot = path.resolve(here, '..');
  return path.join(backendRoot, 'data', 'thumbnails');
}

// eslint-disable-next-line no-undef
test('POST /v1/shapes generates thumbnails under 128/<scheme>/<name>', async () => {
  const app = createApp();
  const { server, port } = await startServer(app);
  const name = `chokey-test-${Date.now()}`; // unique name to avoid collisions
  try {
    const url = `http://127.0.0.1:${port}/v1/shapes`;
    const body = {
      name,
      cells: [ { x:0, y:0 }, { x:1, y:0 }, { x:0, y:1 } ],
      meta: { source: 'test' }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    assert.equal(res.ok, true, `expected 201 from POST /v1/shapes, got ${res.status}`);

    const base = thumbsDir();
    const pngPath = path.join(base, '128', 'bio', `${name.replace(/[^a-z0-9-]/g,'-').toLowerCase()}.png`);
    const ok = await waitForPath(pngPath, 8000);
    assert.equal(ok, true, 'expected PNG thumbnail to be generated under 128/bio');
  } finally {
    server.close();
  }
});
