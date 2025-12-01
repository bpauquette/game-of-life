// Worker thread entry point for Hashlife. The bundler should make this
// available as a separate worker script. This file expects to be run in a
// Worker context where `postMessage`/`onmessage` are available.

const engine = require('./engine');

let running = false;

async function handleRun(id, payload) {
  try {
    const { cells, generations } = payload;
    const res = await engine.advance(cells, generations, (gen) => {
      // notify progress back to the adapter/host
      try { postMessage({ id: null, type: 'progress', payload: { generation: gen } }); } catch (e) {}
    });
    postMessage({ id, type: 'result', payload: res });
  } catch (err) {
    postMessage({ id, type: 'error', payload: { message: err.message || String(err) } });
  }
}

onmessage = function(ev) {
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
    // No cancellation support in engine yet; reply with simple ack
    postMessage({ id: null, type: 'cancelled' });
  } else if (type === 'clear') {
    engine.clearEngineCache();
    postMessage({ id: null, type: 'cleared' });
  }
};
