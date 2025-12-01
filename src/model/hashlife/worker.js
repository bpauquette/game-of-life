// Lightweight Hashlife worker wrapper.
// In browsers this could spawn a real Web Worker. For now we provide an
// async wrapper that runs the engine off the immediate event loop so callers
// don't block the caller synchronously. This makes it safe to call from UI
// code and tests; later we can replace this with a real Worker implementation.

const engine = require('./engine');

function run(cells, generations, onProgress) {
  return new Promise((resolve, reject) => {
    // schedule the work asynchronously so the caller isn't blocked
    const defer = (typeof setImmediate !== 'undefined') ? setImmediate : (fn) => setTimeout(fn, 0);
    defer(async () => {
      try {
        const res = await engine.advance(cells, generations, onProgress);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function clearCache() {
  return engine.clearEngineCache();
}

module.exports = { run, clearCache };
