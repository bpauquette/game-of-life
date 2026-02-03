// src/controller/StepScheduler.js
// Unified scheduler for stepping via RAF or Web Worker
// Abstracts away the choice of loop mechanism so controller never manages
// both RAF and Worker loops directly.

let resolveWorkerUrlMemo;

function resolveGameWorkerUrl() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.__GOL_GAME_WORKER_URL__ === 'string') {
    return globalThis.__GOL_GAME_WORKER_URL__;
  }
  if (resolveWorkerUrlMemo !== undefined) {
    return resolveWorkerUrlMemo;
  }
  try {
    const getter = new Function('try { return new URL("../workers/gameWorker.js", import.meta.url); } catch (e) { return null; }');
    resolveWorkerUrlMemo = getter();
  } catch (e) {
    resolveWorkerUrlMemo = null;
  }
  return resolveWorkerUrlMemo;
}

export class StepScheduler {
  constructor(stepFn, options = {}) {
    if (typeof stepFn !== 'function') throw new Error('StepScheduler requires a step function');
    this.step = stepFn;
    this.maxFPS = Math.max(1, Math.min(Number(options.maxFPS) || 60, 120));
    this.maxGPS = Math.max(1, Math.min(Number(options.maxGPS) || 30, 60));
    this.enableFPSCap = options.enableFPSCap !== undefined ? !!options.enableFPSCap : true;
    this.enableGPSCap = options.enableGPSCap !== undefined ? !!options.enableGPSCap : true;
    this.useWorker = !!options.useWorker;
    this.onPerformance = typeof options.onPerformance === 'function' ? options.onPerformance : null;
    this.isRunning = false;
    this.worker = null;
    this.animationId = null;
    this.lastFrameTime = Number.NaN;
    this._calculateFrameInterval();
  }

  _calculateFrameInterval() {
    const fps = this.enableFPSCap ? (this.maxFPS || Infinity) : Infinity;
    const gps = this.enableGPSCap ? (this.maxGPS || Infinity) : Infinity;
    const rate = Math.min(fps, gps);
    this.frameInterval = Number.isFinite(rate) && rate > 0 ? 1000 / rate : 0;
  }

  setMaxFPS(fps) {
    this.maxFPS = Math.max(1, Math.min(Number(fps) || 60, 120));
    this._calculateFrameInterval();
    this._updateWorkerInterval();
    if (this.worker) {
      this.worker.postMessage({ command: 'start' });
    }
  }

  setMaxGPS(gps) {
    this.maxGPS = Math.max(1, Math.min(Number(gps) || 30, 60));
    this._calculateFrameInterval();
    this._updateWorkerInterval();
  }

  setCaps({ maxFPS, maxGPS, enableFPSCap, enableGPSCap }) {
    if (maxFPS !== undefined) this.maxFPS = Math.max(1, Math.min(Number(maxFPS) || 60, 120));
    if (maxGPS !== undefined) this.maxGPS = Math.max(1, Math.min(Number(maxGPS) || 30, 60));
    if (enableFPSCap !== undefined) this.enableFPSCap = !!enableFPSCap;
    if (enableGPSCap !== undefined) this.enableGPSCap = !!enableGPSCap;
    this._calculateFrameInterval();
    this._updateWorkerInterval();
    if (this.worker && this.isRunning) {
      this.worker.postMessage({ command: 'start' });
    }
  }

  setUseWorker(use) {
    const next = !!use;
    if (next === this.useWorker) return;
    if (this.isRunning) {
      this.stop();
      this.useWorker = next;
      this.start();
    } else {
      this.useWorker = next;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    if (this.useWorker) {
      this._startWorkerLoop();
    } else {
      this._startRAFLoop();
    }
  }

  stop() {
    this.isRunning = false;
    this.useWorker ? this._stopWorkerLoop() : this._stopRAFLoop();
  }

  _startRAFLoop() {
    const loop = (timestamp) => {
      if (!this.isRunning) return;
      const shouldStep = !this.lastFrameTime || (timestamp - this.lastFrameTime >= this.frameInterval);
      if (shouldStep) {
        const frameStart = performance.now();
        try {
          this.step();
        } catch (error_) {
          console.warn('[StepScheduler] Step failed:', error_);
        }
        const frameTime = performance.now() - frameStart;
        if (this.onPerformance) {
          try { this.onPerformance(frameTime); } catch (error_) { console.warn('[StepScheduler] onPerformance error', error_); }
        }
        this.lastFrameTime = timestamp;
      }
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  _startWorkerLoop() {
    if (this.worker) return;
    if (typeof Worker === 'undefined' || typeof URL === 'undefined') {
      this.useWorker = false;
      this._startRAFLoop();
      return;
    }
    const workerUrl = resolveGameWorkerUrl();
    if (!workerUrl) {
      this.useWorker = false;
      this._startRAFLoop();
      return;
    }
    try {
      this.worker = new Worker(workerUrl, { type: 'module' });
    } catch (error_) {
      console.warn('[StepScheduler] Worker creation failed, falling back to RAF:', error_);
      this.useWorker = false;
      this._startRAFLoop();
      return;
    }
    this.worker.onmessage = (e) => {
      const data = e.data || {};
      if (data.command === 'step') {
        const frameStart = performance.now();
        try {
          this.step();
        } catch (error_) {
          console.warn('[StepScheduler] Step failed:', error_);
        }
        const frameTime = performance.now() - frameStart;
        if (this.onPerformance) {
          try { this.onPerformance(frameTime); } catch (error_) { console.warn('[StepScheduler] onPerformance error', error_); }
        }
      }
    };
    this._updateWorkerInterval();
    this.worker.postMessage({ command: 'start' });
  }

  _stopRAFLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }


  _stopWorkerLoop() {
    if (this.worker) {
      this.worker.postMessage({ command: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }
  }

  _updateWorkerInterval() {
    if (this.worker) {
      this.worker.postMessage({ command: 'set-interval', payload: this.frameInterval });
    }
  }
}

export default StepScheduler;
