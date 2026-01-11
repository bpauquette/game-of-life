// src/controller/StepScheduler.js
// Unified scheduler for stepping via RAF or Web Worker
// Abstracts away the choice of loop mechanism so controller never manages
// both RAF and Worker loops directly.

export class StepScheduler {
  constructor(stepFn, options = {}) {
    if (typeof stepFn !== 'function') throw new Error('StepScheduler requires a step function');
    
    this.step = stepFn;
    this.maxFPS = Math.max(1, Math.min(Number(options.maxFPS) || 60, 120));
    this.maxGPS = Math.max(1, Math.min(Number(options.maxGPS) || 30, 60));
    this.useWorker = !!options.useWorker;
    this.onPerformance = typeof options.onPerformance === 'function' ? options.onPerformance : null;
    
    // Internal state
    this.isRunning = false;
    this.worker = null;
    this.animationId = null;
    this.lastFrameTime = NaN;
    this._calculateFrameInterval();
  }

  _calculateFrameInterval() {
    // If neither cap is enabled, run every frame (interval = 0)
    if (!this.maxFPS && !this.maxGPS) {
      this.frameInterval = 0;
      return;
    }
    // Use minimum of enabled caps
    const fps = this.maxFPS || Infinity;
    const gps = this.maxGPS || Infinity;
    const rate = Math.min(fps, gps);
    this.frameInterval = Number.isFinite(rate) && rate > 0 ? 1000 / rate : 0;
  }

  setMaxFPS(fps) {
    this.maxFPS = Math.max(1, Math.min(Number(fps) || 60, 120));
    this._calculateFrameInterval();
    this._updateWorkerInterval();
  }

  setMaxGPS(gps) {
    this.maxGPS = Math.max(1, Math.min(Number(gps) || 30, 60));
    this._calculateFrameInterval();
    this._updateWorkerInterval();
  }

  setUseWorker(use) {
    const next = !!use;
    if (next === this.useWorker) return;
    
    if (this.isRunning) {
      // Restart with new mechanism
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
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.useWorker) {
      this._stopWorkerLoop();
    } else {
      this._stopRAFLoop();
    }
  }

  // RAF Loop
  _startRAFLoop() {
    const loop = async (timestamp) => {
      if (!this.isRunning) {
        this.animationId = null;
        return;
      }

      // Initialize baseline on first frame
      if (!Number.isFinite(this.lastFrameTime)) {
        this.lastFrameTime = 0;
      }

      const delta = timestamp - this.lastFrameTime;
      const shouldStep = this.frameInterval <= 0 || delta >= this.frameInterval;

      if (shouldStep) {
        const frameStart = performance.now();
        try {
          await this.step();
        } catch (error) {
          console.warn('[StepScheduler] Step failed:', error);
        }

        const frameTime = performance.now() - frameStart;
        if (this.onPerformance) {
          try { this.onPerformance(frameTime); } catch (_) {}
        }
        this.lastFrameTime = timestamp;
      }

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  _stopRAFLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Worker Loop
  _startWorkerLoop() {
    if (this.worker) return; // Already created
    
    try {
      if (typeof globalThis !== 'undefined' && typeof URL !== 'undefined' && typeof Worker !== 'undefined') {
        try {
          const createWorkerCode = `new Worker(new URL('../workers/gameWorker.js', import.meta.url))`;
          // eslint-disable-next-line no-new-func
          const createWorker = new Function('URL', 'Worker', `return ${createWorkerCode}`);
          this.worker = createWorker(URL, Worker);
        } catch (syntaxError) {
          // import.meta not available (e.g., test environment)
          return;
        }
      }
    } catch (error) {
      if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        console.warn('[StepScheduler] Could not create Web Worker:', error);
      }
      return;
    }

    if (!this.worker) return;

    this.worker.onmessage = async (e) => {
      if (e.data.command === 'step') {
        const frameStart = performance.now();
        try {
          await this.step();
        } catch (error) {
          console.warn('[StepScheduler] Step failed:', error);
        }

        const frameTime = performance.now() - frameStart;
        if (this.onPerformance) {
          try { this.onPerformance(frameTime); } catch (_) {}
        }
      }
    };

    this._updateWorkerInterval();
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
