// Adapter that exposes a small API to run the Hashlife engine via a
// dedicated Web Worker when available, or falls back to the in-process
// worker implementation used in tests and environments without Workers.

const engine = require('./engine');
const fallbackWorker = require('./worker');

// Worker loader: if runtime supports Worker, spawn worker.thread.js
function createWorker() {
  try {
    if (typeof Worker !== 'undefined') {
      // Prefer bundler-friendly URL resolution when available so the worker
      // script is loaded from the correct location instead of the app root.
      try {
        // Avoid referencing `import.meta` directly so this file remains valid
        // in CommonJS/Jest environments that don't support import.meta.
        /* eslint-disable no-eval */
        const metaUrl = (function () {
          try { return eval('import.meta.url'); } catch (e) { return undefined; }
        }());
        /* eslint-enable no-eval */
        if (metaUrl && typeof URL === 'function') {
          // Prefer the ESM shim which the bundler can emit as a standalone
          // module worker asset (`worker.esm.js`). This avoids referencing
          // the CommonJS `worker.thread.js` which may contain `require()`
          // calls and not be suitable as a raw module worker.
          const url = new URL('./worker.esm.js', metaUrl);
          return new Worker(url, { type: 'module' });
        }
      } catch (e) {
        // fall through to safe fallback
      }
      // If we couldn't resolve a bundler URL above then try the absolute
      // public path which we'll populate during build/dev (`public/model/hashlife/worker.thread.js`).
      // This avoids relative-path resolution issues with dev servers.
      try {
        if (typeof globalThis !== 'undefined' && globalThis.location && typeof Worker === 'function') {
          return new Worker('/model/hashlife/worker.thread.js', { type: 'module' });
        }
      } catch (e) {
        // fall through to null fallback below
      }
      // Fallback: no worker available — caller will use in-process wrapper.
      return null;
    }
  } catch (e) {
    // Worker not available (Node/Jest) — fall through to fallback
  }
  return null;
}

class HashlifeAdapter {
  constructor() {
    this._worker = null;
    this._pending = new Map();
    this._nextId = 1;
    this._progressCb = null;
    // Throttle progress callback: only call every N generations
    this._lastProgressGen = null;
    this._progressThrottleN = 10; // Change N to adjust frequency
  }

  _ensureWorker() {
    if (this._worker) return this._worker;
    const w = createWorker();
    if (!w) return null;
    w.onmessage = (ev) => this._onMessage(ev.data);
    w.onerror = (err) => {
      // propagate error to all pending promises
      for (const { reject } of this._pending.values()) reject(err);
      this._pending.clear();
    };
    this._worker = w;
    return w;
  }

  _onMessage(msg) {
    const { id, type, payload } = msg;
    try {
      // Lightweight diagnostic: summarize incoming worker messages
      let cellsCount;
      try {
        if (payload && payload.cells) {
          if (Array.isArray(payload.cells)) cellsCount = payload.cells.length;
          else if (payload.cells instanceof Map) cellsCount = payload.cells.size;
        }
      } catch (e) { /* ignore summary errors */ }
      try { console.debug('[hashlifeAdapter] _onMessage', { id, type, generation: payload && payload.generation, cellsCount }); } catch (e) {}
    } catch (e) {}
    if (type === 'progress' && this._progressCb) {
      // Throttle: only call progressCb every N generations
      const gen = payload && payload.generation;
      if (gen == null || this._lastProgressGen == null || gen - this._lastProgressGen >= this._progressThrottleN) {
        this._lastProgressGen = gen;
        this._progressCb(payload);
      }
      return;
    }
    const entry = this._pending.get(id);
    if (!entry) return;
    if (type === 'result') entry.resolve(payload);
    else if (type === 'error') entry.reject(new Error(payload && payload.message ? payload.message : 'worker error'));
    this._pending.delete(id);
  }

  run(cells, generations, opts = {}) {
    // Try to use platform Worker; if not available use fallback worker.run
    const w = this._ensureWorker();
    try {
      // Diagnostic: log run requests
      try {
        let count = 'unknown';
        if (Array.isArray(cells)) count = cells.length;
        else if (cells instanceof Map) count = cells.size;
        else if (cells && typeof cells.forEachCell === 'function') count = 'iterable';
        console.info('[hashlifeAdapter] run requested', { generations, cellCount: count });
      } catch (e) {}
    } catch (e) {}
    
    console.log('🔍 [hashlifeAdapter] worker availability:', { hasWorker: !!w, workerType: w ? 'WebWorker' : 'fallback' });
    
    if (!w) {
      // fallback: in-process wrapper
      console.log('📞 [hashlifeAdapter] using fallback worker.run()');
      return fallbackWorker.run(cells, generations, (p) => {
        if (this._progressCb) this._progressCb(p);
      });
    }

    const id = this._nextId++;
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
      w.postMessage({ id, type: 'run', payload: { cells, generations, opts } });
    });
  }

  cancel() {
    if (this._worker) this._worker.postMessage({ type: 'cancel' });
    // no-op for fallback (could be extended to support cancellation tokens)
  }

  clearCache() {
    if (this._worker) this._worker.postMessage({ type: 'clear' });
    return engine.clearEngineCache();
  }

  onProgress(cb) { this._progressCb = cb; }
}

module.exports = new HashlifeAdapter();
