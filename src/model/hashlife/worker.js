// Lightweight Hashlife worker wrapper.
// In browsers this could spawn a real Web Worker. For now we provide an
// async wrapper that runs the engine off the immediate event loop so callers
// don't block the caller synchronously. This makes it safe to call from UI
// code and tests; later we can replace this with a real Worker implementation.

const engine = require('./engine');

function run(cells, generations, onProgress) {
  console.log('🔧 [fallback worker] run() called with:', { cellCount: cells?.length, generations });
  return new Promise((resolve, reject) => {
    // schedule the work asynchronously so the caller isn't blocked
    const defer = (typeof setImmediate !== 'undefined') ? setImmediate : (fn) => setTimeout(fn, 0);
    defer(async () => {
      try {
        console.log('⚙️ [fallback worker] calling engine.advance()');
        const res = await engine.advance(cells, generations, onProgress);
        console.log('✅ [fallback worker] engine.advance() completed:', { hasCells: !!(res?.cells), cellCount: res?.cells?.length });
        resolve(res);
      } catch (err) {
        console.error('❌ [fallback worker] engine.advance() failed:', err);
        reject(err);
      }
    });
  });
}

function clearCache() {
  return engine.clearEngineCache();
}

module.exports = { run, clearCache };
