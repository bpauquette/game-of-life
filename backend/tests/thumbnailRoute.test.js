import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/index.js';

// Basic integration test to ensure the name-based thumbnail route resolves
// correctly (and is not shadowed by /v1/shapes/:id). Uses port 0 to avoid
// collisions and relies on repository thumbnail fixtures.

async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const addr = server.address();
  const port = typeof addr === 'object' ? addr.port : 0;
  return { server, port };
}

const PNG = 'image/png';

// eslint-disable-next-line no-undef
test('GET /v1/shapes/thumbnail (name+scheme+size) serves existing file', async () => {
  const app = createApp();
  const { server, port } = await startServer(app);
  try {
    const url = `http://127.0.0.1:${port}/v1/shapes/thumbnail?name=135-degree-mwss-to-g&scheme=bio&size=128`;
    const res = await fetch(url);
    assert.equal(res.status, 200, 'expected 200 OK from thumbnail endpoint');
    const ct = res.headers.get('content-type') || '';
    assert.equal(ct.includes(PNG), true, `expected content-type to include ${PNG}`);
  } finally {
    server.close();
  }
});
