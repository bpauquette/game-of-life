// optimizedEngine.js
// High-performance game engine with configurable FPS throttling and performance monitoring

import { useEffect, useRef, useCallback } from 'react';

/**
 * Performance-optimized game engine with configurable frame rate limiting
 * Separates game logic updates from rendering updates for better performance
 */
export function useOptimizedEngine(isRunning, gameStep, draw, options = {}) {
  const {
    maxFPS = 60,           // Maximum rendering FPS
    maxGPS = 30,           // Maximum generations per second (game logic updates)
    adaptiveThrottling = true,  // Automatically adjust rates based on performance
    performanceTarget = 16.67   // Target frame time in ms (60 FPS = 16.67ms)
  } = options;

  const rafRef = useRef(null);
  const lastGameTime = useRef(0);
  const frameTimeHistory = useRef([]);
  const currentFPS = useRef(maxFPS);
  const currentGPS = useRef(maxGPS);
  
  // Performance monitoring
  const performanceMetrics = useRef({
    avgFrameTime: 0,
    droppedFrames: 0,
    gameUpdates: 0,
    renderUpdates: 0
  });

  // Calculate optimal throttling based on performance
  const updateThrottling = useCallback(() => {
    if (!adaptiveThrottling) return;
    
    const avgFrameTime = frameTimeHistory.current.length > 0
      ? frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length
      : performanceTarget;
    
    // Adjust FPS based on performance
    if (avgFrameTime > performanceTarget * 1.5) {
      // Performance is poor, reduce rates
      currentFPS.current = Math.max(15, currentFPS.current * 0.8);
      currentGPS.current = Math.max(5, currentGPS.current * 0.8);
    } else if (avgFrameTime < performanceTarget * 0.8) {
      // Performance is good, gradually increase rates
      currentFPS.current = Math.min(maxFPS, currentFPS.current * 1.1);
      currentGPS.current = Math.min(maxGPS, currentGPS.current * 1.1);
    }
  }, [adaptiveThrottling, maxFPS, maxGPS, performanceTarget]);

  // High-precision throttled game loop
  const createThrottledLoop = useCallback((callback, targetFPS) => {
    const targetInterval = 1000 / targetFPS;
    let lastTime = performance.now();
    
    return function throttledCallback() {
      const now = performance.now();
      const elapsed = now - lastTime;
      
      if (elapsed >= targetInterval) {
        const frameStart = performance.now();
        callback();
        const frameTime = performance.now() - frameStart;
        
        // Track frame time for adaptive throttling
        frameTimeHistory.current.push(frameTime);
        if (frameTimeHistory.current.length > 60) {
          frameTimeHistory.current.shift();
        }
        
        lastTime = now;
        
        // Track performance metrics
        performanceMetrics.current.avgFrameTime = frameTime;
        if (frameTime > performanceTarget * 2) {
          performanceMetrics.current.droppedFrames++;
        }
        
        // Update throttling every 2 seconds
        if (Math.floor(now / 2000) !== Math.floor((now - elapsed) / 2000)) {
          updateThrottling();
        }
      }
    };
  }, [performanceTarget, updateThrottling]);

  // Separate game logic and rendering loops
  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Game logic loop (fixed timestep)
    const gameLoop = () => {
      const now = performance.now();
      const gameInterval = 1000 / currentGPS.current;
      
      if (now - lastGameTime.current >= gameInterval) {
        gameStep();
        lastGameTime.current = now;
        performanceMetrics.current.gameUpdates++;
      }
    };

    // Rendering loop (variable timestep with throttling)
    const renderLoop = createThrottledLoop(() => {
      draw();
      performanceMetrics.current.renderUpdates++;
    }, currentFPS.current);

    // Combined RAF loop
    const mainLoop = () => {
      if (isRunning) {
        gameLoop();
        renderLoop();
        rafRef.current = requestAnimationFrame(mainLoop);
      }
    };

    rafRef.current = requestAnimationFrame(mainLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, gameStep, draw, createThrottledLoop]);

  // Return performance controls and metrics
  return {
    setMaxFPS: (fps) => { currentFPS.current = Math.min(fps, maxFPS); },
    setMaxGPS: (gps) => { currentGPS.current = Math.min(gps, maxGPS); },
    getCurrentFPS: () => currentFPS.current,
    getCurrentGPS: () => currentGPS.current,
    getPerformanceMetrics: () => ({ ...performanceMetrics.current })
  };
}

/**
 * Simple frame rate limiter utility
 */
export function createFrameRateLimiter(targetFPS) {
  const targetInterval = 1000 / targetFPS;
  let lastTime = 0;
  
  return (callback) => {
    return (...args) => {
      const now = performance.now();
      if (now - lastTime >= targetInterval) {
        lastTime = now;
        return callback(...args);
      }
    };
  };
}

/**
 * Performance monitoring utility
 */
export function usePerformanceMonitor(isRunning) {
  const metricsRef = useRef({
    frameCount: 0,
    startTime: performance.now(),
    lastUpdateTime: performance.now(),
    fps: 0,
    averageFrameTime: 0
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - metricsRef.current.lastUpdateTime;
      
      if (elapsed >= 1000) {
        metricsRef.current.fps = Math.round(
          (metricsRef.current.frameCount * 1000) / elapsed
        );
        metricsRef.current.frameCount = 0;
        metricsRef.current.lastUpdateTime = now;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const trackFrame = useCallback((frameTime = 0) => {
    metricsRef.current.frameCount++;
    if (frameTime > 0) {
      const history = metricsRef.current.frameTimeHistory || [];
      history.push(frameTime);
      if (history.length > 60) history.shift();
      metricsRef.current.frameTimeHistory = history;
      metricsRef.current.averageFrameTime = 
        history.reduce((sum, time) => sum + time, 0) / history.length;
    }
  }, []);

  return {
    metrics: metricsRef.current,
    trackFrame
  };
}

/**
 * Web Worker for offscreen game logic processing
 */
export class GameLogicWorker {
  constructor() {
    this.worker = null;
    this.callbacks = new Map();
    this.messageId = 0;
  }

  async initialize() {
    const workerCode = `
      // Game of Life logic in worker
      const getNeighbors = (x, y) => {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) neighbors.push([x + dx, y + dy]);
          }
        }
        return neighbors;
      };

      const gameStep = (liveCellsArray) => {
        const liveCellsMap = new Map(liveCellsArray.map(key => [key, true]));
        const neighborCounts = new Map();
        
        for (const key of liveCellsMap.keys()) {
          const [x, y] = key.split(',').map(Number);
          for (const [nx, ny] of getNeighbors(x, y)) {
            const nKey = \`\${nx},\${ny}\`;
            neighborCounts.set(nKey, (neighborCounts.get(nKey) || 0) + 1);
          }
        }

        const newCells = [];
        for (const [key, count] of neighborCounts.entries()) {
          if (count === 3 || (count === 2 && liveCellsMap.has(key))) {
            newCells.push(key);
          }
        }

        return newCells;
      };

      self.onmessage = function(e) {
        const { id, data } = e.data;
        const result = gameStep(data.liveCells);
        self.postMessage({ id, type: 'step-result', data: result });
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (e) => {
      const { id, data } = e.data;
      const callback = this.callbacks.get(id);
      if (callback) {
        callback(data);
        this.callbacks.delete(id);
      }
    };
  }

  async step(liveCells) {
    if (!this.worker) await this.initialize();
    
    return new Promise((resolve) => {
      const id = this.messageId++;
      this.callbacks.set(id, resolve);
      
      this.worker.postMessage({
        id,
        type: 'step',
        data: { liveCells: Array.from(liveCells.keys()) }
      });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.callbacks.clear();
  }
}