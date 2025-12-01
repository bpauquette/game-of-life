// ES module worker entry point for Hashlife. This file is intended to be
// imported as a module worker (`new Worker(url, { type: 'module' })`). It
// imports the engine and responds to `postMessage` commands. Using ESM
// imports lets the bundler emit a standalone worker asset that the dev
// server can serve as JavaScript (avoiding index.html responses).

import engineModule from './engine';
const engine = engineModule && engineModule.default ? engineModule.default : engineModule;

let running = false;

async function handleRun(id, payload) {
  try {
    const { cells, generations } = payload;
    const res = await engine.advance(cells, generations);
    postMessage({ id, type: 'result', payload: res });
  } catch (err) {
    postMessage({ id, type: 'error', payload: { message: err && err.message ? err.message : String(err) } });
  }
}

globalThis.onmessage = function (ev) {
  const msg = ev.data;
  const { id, type, payload } = msg;
  if (type === 'run') {
    if (running) {
      postMessage({ id, type: 'error', payload: { message: 'already running' } });
      return;
    }
    running = true;
    handleRun(id, payload).finally(() => { running = false; });
  } else if (type === 'cancel') {
    postMessage({ id: null, type: 'cancelled' });
  } else if (type === 'clear') {
    engine.clearEngineCache();
    postMessage({ id: null, type: 'cleared' });
  }
};
