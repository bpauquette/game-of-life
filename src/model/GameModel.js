import hashlifeAdapter from './hashlife/adapter.js';
// GameModel.js - Model layer for Conway's Game of Life
// Handles all game state, rules, and data operations

import { step as gameStep } from './gameLogic.js';
import { colorSchemes } from './colorSchemes.js';
import logger from '../controller/utils/logger.js';

// Helpers for bulk updates (module-scope to keep method complexity low)
function normalizeBulkUpdate(u) {
  if (Array.isArray(u)) return { x: u[0], y: u[1], alive: u.length > 2 ? !!u[2] : true };
  if (u && typeof u === 'object') return { x: u.x, y: u.y, alive: Object.prototype.hasOwnProperty.call(u, 'alive') ? !!u.alive : true };
  return null;
}

function applyBulkUpdate(liveCells, upd) {
  const key = `${upd.x},${upd.y}`;
  const wasAlive = liveCells.has(key);
  if (upd.alive) {
    if (!wasAlive) {
      liveCells.set(key, true);
      return { add: 1, rem: 0 };
    }
  } else if (wasAlive) {
    liveCells.delete(key);
    return { add: 0, rem: 1 };
  }
  return { add: 0, rem: 0 };
}
const CONST_UISTATECHANGED = 'uiStateChanged';
const clampNumber = (value, min, max) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(max, Math.max(min, num));
};

function normalizeCursorPosition(position) {
  if (!position) return null;
  return {
    x: Number.isFinite(position.x) ? Math.round(position.x) : position.x,
    y: Number.isFinite(position.y) ? Math.round(position.y) : position.y,
    fx: Number.isFinite(position.fx) ? Number(position.fx.toFixed(2)) : position.fx,
    fy: Number.isFinite(position.fy) ? Number(position.fy.toFixed(2)) : position.fy
  };
}

function hasCursorPositionChanged(previous, next) {
  if (previous === null || next === null) return previous !== next;
  return previous.x !== next.x || previous.y !== next.y || previous.fx !== next.fx || previous.fy !== next.fy;
}

function shouldThrottleCursorUpdate(now, lastUpdateTime, throttleDelay) {
  return now - (lastUpdateTime || 0) < throttleDelay;
}

function runNormalEngineSteps(liveCells, generations) {
  if (!(liveCells instanceof Map) || liveCells.size === 0) return new Map();
  let next = liveCells;
  for (let i = 0; i < generations; i++) {
    next = gameStep(next);
    if (next.size === 0) break;
  }
  return next;
}

function shouldUseHashlifeBatch(engineMode, forceExactGenerations, requestedValue, requestedNumber) {
  if (engineMode !== 'hashlife' || forceExactGenerations) return false;
  return requestedValue === undefined || requestedNumber === 1 || Number.isNaN(requestedNumber);
}

function resolveGenerationCount(requestedValue, requestedNumber, useBatch, batchSize) {
  if (useBatch) return Math.max(1, Number(batchSize) || 1);
  return Math.max(1, requestedNumber || 1);
}

function liveCellsMapToArray(liveCells) {
  return Array.from(liveCells.keys()).map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
}

function calculateHashlifeGenerations(generations, generationBatchSize) {
  return Math.max(1, Number(generations) || Number(generationBatchSize) || 1);
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function computePopulationStats(recent, tolerance) {
  const avg = average(recent);
  const variance = recent.reduce((sum, pop) => sum + Math.pow(pop - avg, 2), 0) / recent.length;
  const stdDev = Math.sqrt(variance);
  return { stdDev, populationStable: stdDev <= tolerance };
}

function computeTrendStable(recent, tolerance) {
  if (recent.length < 10) return true;
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);
  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);
  return Math.abs(secondAvg - firstAvg) <= tolerance * 1.5;
}

function findDetectedPeriod(recentStates, maxPeriod) {
  for (let period = 1; period <= maxPeriod; period++) {
    const cyclesToCheck = Math.floor(recentStates.length / period) - 1;
    if (cyclesToCheck < 2) continue;
    if (isPeriodMatch(recentStates, period, cyclesToCheck)) return period;
  }
  return 0;
}

function detectPeriodicStateStability(stateHashHistory, effectiveWindowSize) {
  if (stateHashHistory.length < 6) return { periodicStable: false, detectedPeriod: 0 };

  const recentStates = stateHashHistory.slice(-effectiveWindowSize);
  const maxPeriod = Math.min(8, Math.floor(recentStates.length / 3));
  const detectedPeriod = findDetectedPeriod(recentStates, maxPeriod);
  return { periodicStable: detectedPeriod > 0, detectedPeriod };
}

function computePlateauStable(recent, engineMode, effectiveWindowSize, tolerance) {
  const plateauWindow = engineMode === 'hashlife' ? Math.min(15, Math.max(5, effectiveWindowSize)) : 15;
  if (recent.length < plateauWindow) return false;

  const lastSample = recent.slice(-plateauWindow);
  const uniqueValues = [...new Set(lastSample)];
  if (uniqueValues.length === 1) return true;
  if (uniqueValues.length !== 2) return false;

  const sorted = uniqueValues.sort((a, b) => a - b);
  return (sorted[1] - sorted[0]) <= Math.max(1, tolerance * 0.5);
}

function hasRecentPerfectStability(recent, requiredLength = 10) {
  if (recent.length < requiredLength) return false;
  const lastValue = recent[recent.length - 1];
  return recent.slice(-requiredLength).every((pop) => pop === lastValue);
}

function isPeriodMatch(recentStates, period, cyclesToCheck) {
  for (let cycle = 0; cycle < cyclesToCheck; cycle++) {
    for (let offset = 0; offset < period; offset++) {
      const idx1 = recentStates.length - 1 - offset;
      const idx2 = idx1 - period;
      if (idx2 >= 0 && recentStates[idx1] !== recentStates[idx2]) return false;
    }
  }
  return true;
}

function applyNumericPerformanceSetting(next, settings, key, min, max) {
  if (!Object.prototype.hasOwnProperty.call(settings, key)) return false;
  const clamped = clampNumber(settings[key], min, max);
  if (clamped === null || clamped === next[key]) return false;
  next[key] = clamped;
  return true;
}

function applyBooleanPerformanceSetting(next, settings, key) {
  if (!Object.prototype.hasOwnProperty.call(settings, key)) return false;
  const boolValue = !!settings[key];
  if (boolValue === next[key]) return false;
  next[key] = boolValue;
  return true;
}

export class GameModel {
  // Overlay management - persistent caching
  // Overlay is cached and only cleared when tool/shape explicitly changes,
  // NOT when the mouse stops moving. This allows overlays (previews, crosshairs)
  // to persist and remain visible while the user positions/considers placement.
  setOverlay(overlay) {
    const changed = this.overlay !== overlay;
    this.overlay = overlay;
    if (changed) {
      this.notifyObservers('overlayChanged', overlay);
    }
  }

  getOverlay() {
    return this.overlay || null;
  }

  // Clear overlay only when explicitly needed (e.g., tool/shape changes)
  clearOverlay() {
    this.setOverlay(null);
  }
  clear() {
    this.clearModel();
  }
  constructor() {
    // Game state
    this.liveCells = new Map();
    this.liveCellsVersion = 0;
    // Expose a version marker on the map so downstream consumers can detect
    // mutations even when the Map reference is reused.
    this.liveCells.version = this.liveCellsVersion;
    this.generation = 0;
    this.isRunning = false;
    this.engineMode = 'normal'; // 'normal' or 'hashlife'
    // Viewport state
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1
    };
    // Performance tracking
    this.populationHistory = [];
    this.stateHashHistory = []; // Track actual cell states for proper oscillator detection
    this.maxPopulationHistory = 1000;
    this.generationBatchSize = 1;
    // Timestamp tracking for FPS and Gen/s calculation
    this.lastRenderTime = performance.now();
    this.lastGenerationTime = performance.now();
    this.renderTimestamps = [];
    this.generationTimestamps = [];
    this.maxTimestamps = 60; // Keep last 60 timestamps for averaging
    // Color scheme for rendering (not serialized)
    // Safe default comes from model; renderer should not guess/import
    const defaultKey = 'bio';
    const defaultFromKey = colorSchemes?.[defaultKey] || null;
    const firstKey = Object.keys(colorSchemes || {}).at(0);
    const fallback = firstKey ? colorSchemes[firstKey] : { background: '#000000', getCellColor: () => '#ffffff' };
    this.colorScheme = defaultFromKey || fallback;
    // Overlay for tools
    this.overlay = null;
    // Tool and interaction state (not serialized)
    this.selectedTool = 'draw'; // Default to draw tool
    this.selectedShape = null;
    this.cursorPosition = null;
    this.lastCursorUpdateTime = 0;
    this.cursorThrottleDelay = 16; // ~60fps throttling for cursor updates
    // Observers for state changes
    this.observers = new Set();
    this.performanceSettings = {
      maxFPS: 60,
      maxGPS: 30,
      populationWindowSize: 50,
      populationTolerance: 3,
      enableFPSCap: false,
      enableGPSCap: false,
      useWebWorker: false
    };
  }

  _bumpLiveCellsVersion(delta = 1) {
    this.liveCellsVersion += Number.isFinite(delta) ? delta : 1;
    this.liveCells.version = this.liveCellsVersion;
    return this.liveCellsVersion;
  }

  addObserver(observer) {
    this.observers.add(observer);
  }

  removeObserver(observer) {
    this.observers.delete(observer);
  }

  notifyObservers(event, data) {
    // Lightweight debug trace for captureCompleted to help diagnose why
    // the UI might not be reacting to capture events.
    if (event === 'captureCompleted') {
      logger.debug('[GameModel] notifyObservers -> captureCompleted (observerCount=' + this.observers.size + ')', data);
    }

    for (const observer of this.observers) {
      try {
        if (typeof observer === 'function') {
          observer(event, data);
        } else if (observer[event]) {
          observer[event](data);
        }
      } catch (err) {
        // Protect observer iteration from individual observer failures
        logger.error('[GameModel] observer threw for event ' + event + ':', err);
      }
    }
  }

  // Game state operations
  setCellAliveModel(x, y, alive) {
    const key = `${x},${y}`;
    const wasAlive = this.liveCells.has(key);
    if (alive && !wasAlive) {
      this.liveCells.set(key, true);
      this._bumpLiveCellsVersion();
      this.notifyObservers('cellChanged', { x, y, alive: true });
    } else if (!alive && wasAlive) {
      this.liveCells.delete(key);
      this._bumpLiveCellsVersion();
      this.notifyObservers('cellChanged', { x, y, alive: false });
    }
  }

  // Bulk update API: apply many cell state changes with a single notification
  // Accepts an array of updates; each update can be:
  // - [x, y]
  // - [x, y, alive]
  // - { x, y, alive }
  // When alive is omitted, defaults to true.
  setCellsAliveBulk(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
      return { added: 0, removed: 0, changed: 0 };
    }
    let added = 0;
    let removed = 0;
    for (const raw of updates) {
      const upd = normalizeBulkUpdate(raw);
      if (!upd || typeof upd.x !== 'number' || typeof upd.y !== 'number') continue;
      const res = applyBulkUpdate(this.liveCells, upd);
      added += res.add;
      removed += res.rem;
    }
    const changed = added + removed;
    if (changed > 0) {
      this._bumpLiveCellsVersion(changed);
      this.notifyObservers('cellsChangedBulk', { added, removed, changed });
    }
    return { added, removed, changed };
  }

  isCellAlive(x, y) {
    return this.liveCells.has(`${x},${y}`);
  }

  getLiveCells() {
    return this.liveCells;
  }

  getCellCount() {
    return this.liveCells.size;
  }

  // Generate a hash representing the current state of all live cells
  getStateHash() {
    if (this.liveCells.size === 0) return 'empty';

    // Sort cell coordinates to ensure consistent hash regardless of Map iteration order
    const sortedCells = Array.from(this.liveCells.keys()).sort();
    return sortedCells.join('|');
  }

  setRunningModel(isRunning) {
    this.isRunning = isRunning;
    this.notifyObservers('runningStateChanged', { isRunning });
  }

  setEngineMode(mode) {
    if (mode === 'normal' || mode === 'hashlife') {
      logger.debug('[GameModel] setEngineMode called:', mode);
      this.engineMode = mode;
      this.notifyObservers('engineModeChanged', { engineMode: mode });
    }
  }

  getEngineMode() {
    return this.engineMode;
  }

  setGenerationBatchSize(size) {
    if (typeof size === 'number' && size >= 1 && size <= 10000) {
      logger.debug('[GameModel] setGenerationBatchSize called:', size);
      this.generationBatchSize = size;
      this.notifyObservers('generationBatchSizeChanged', { generationBatchSize: size });
    }
  }

  getGenerationBatchSize() {
    return this.generationBatchSize;
  }

  setColorSchemeModel(colorScheme) {
    logger.debug('[GameModel] setColorSchemeModel called:', colorScheme);
    this.colorScheme = colorScheme;
    this.notifyObservers('colorSchemeChanged', colorScheme);
  }


  getColorScheme() {
    return this.colorScheme;
  }

  setSelectedToolModel(tool) {
    if (this.selectedTool !== tool) {
      this.selectedTool = tool;
      this.notifyObservers('selectedToolChanged', tool);
    }
  }

  getSelectedTool() {
    return this.selectedTool;
  }

  setSelectedShapeModel(shape) {
    if (this.selectedShape !== shape) {
      this.selectedShape = shape;
      this.notifyObservers('selectedShapeChanged', shape);
    }
  }

  getSelectedShape() {
    return this.selectedShape;
  }

  setCursorPositionModel(position) {
    const now = performance.now();
    const nextPos = normalizeCursorPosition(position);
    const prev = this.cursorPosition;
    if (!hasCursorPositionChanged(prev, nextPos)) return;

    if (shouldThrottleCursorUpdate(now, this.lastCursorUpdateTime, this.cursorThrottleDelay)) {
      this.cursorPosition = nextPos;
      return;
    }

    this.cursorPosition = nextPos;
    this.lastCursorUpdateTime = now;
    this.notifyObservers('cursorPositionChanged', this.cursorPosition);
  }

  getCursorPosition() {
    return this.cursorPosition;
  }

  setViewportModel(offsetX, offsetY, cellSize, zoom) {
    const cellSizeChanged = (typeof cellSize === 'number' && this.viewport.cellSize !== cellSize);
    if (
      this.viewport.offsetX !== offsetX ||
      this.viewport.offsetY !== offsetY ||
      (zoom !== undefined && this.viewport.zoom !== zoom) ||
      cellSizeChanged
    ) {
      this.viewport.offsetX = offsetX;
      this.viewport.offsetY = offsetY;
      if (zoom !== undefined) {
        this.viewport.zoom = zoom;
      }
      if (cellSizeChanged) {
        this.viewport.cellSize = cellSize;
      }
      const payload = { offsetX: this.viewport.offsetX, offsetY: this.viewport.offsetY };
      if (typeof cellSize === 'number') {
        payload.cellSize = cellSize;
      }
      this.notifyObservers('viewportChanged', payload);
      return true;
    }
    return false;
  }

  // Viewport operations
  getViewport() {
    return { ...this.viewport };
  }


  setOffsetModel(offsetX, offsetY) {
    return this.setViewportModel(offsetX, offsetY, undefined, this.viewport.zoom);
  }

  setCellSizeModel() {
    // Cell size is not managed by the model
    return undefined;
  }

  setZoomModel(zoom) {
    const safeZoom = (typeof zoom === 'number' && !Number.isNaN(zoom)) ? zoom : this.viewport.zoom;
    const clampedZoom = Math.max(0.1, Math.min(10, safeZoom));
    return this.setViewportModel(this.viewport.offsetX, this.viewport.offsetY, this.viewport.cellSize, clampedZoom);
  }

  getOffset() {
    return { x: this.viewport.offsetX, y: this.viewport.offsetY };
  }

  getCellSize() {
    // Cell size is not managed by the model
    return undefined;
  }

  getZoom() {
    return this.viewport.zoom;
  }

  // Game evolution  
  async step(n = 1, options = {}) {
    const requested = Number(n);
    const forceExactGenerations = !!options?.forceExactGenerations;
    const useBatch = shouldUseHashlifeBatch(this.engineMode, forceExactGenerations, n, requested);
    const generations = resolveGenerationCount(n, requested, useBatch, this.generationBatchSize);

    if (this.engineMode === 'hashlife') return this._stepHashlife(generations);

    const next = runNormalEngineSteps(this.liveCells, generations);
    this._applyStepResult(next, generations);
  }

  async _stepHashlife(generations = 1) {
    if (this.liveCells.size === 0) {
      this._applyStepResult(new Map(), Math.max(1, Number(generations) || 1));
      return;
    }

    const gens = calculateHashlifeGenerations(generations, this.generationBatchSize);

    try {
      const cellsArray = liveCellsMapToArray(this.liveCells);
      const result = await hashlifeAdapter.run(cellsArray, gens);

      if (result && result.cells) {
        this.applyExternalStepResult({ ...result, generations: gens }, gens);
        return;
      }

      this._applyStepResult(runNormalEngineSteps(this.liveCells, gens), gens);
    } catch (error) {
      logger.warn('[GameModel] Hashlife step failed, falling back to normal step:', error);
      this._applyStepResult(runNormalEngineSteps(this.liveCells, gens), gens);
    }
  }

  applyExternalStepResult(result) {
    if (!result || !Array.isArray(result.cells)) {
      return;
    }
    const nextLiveCells = new Map();
    for (const cell of result.cells) {
      if (!cell || typeof cell.x !== 'number' || typeof cell.y !== 'number') continue;
      nextLiveCells.set(`${cell.x},${cell.y}`, true);
    }
    const delta = Math.max(1, Number(result.generations) || 1);
    this._applyStepResult(nextLiveCells, delta);
  }

  _applyStepResult(nextLiveCells, generationDelta = 1) {
    this.liveCells = nextLiveCells;
    this._bumpLiveCellsVersion();
    this.generation += generationDelta;
    this.trackGeneration();

    // Record one history entry per applied step. For Hashlife batch
    // stepping we rely on generationDelta to track how many
    // generations were advanced, without faking intermediate states.
    const currentPop = this.liveCells.size;
    const currentHash = this.getStateHash();
    this.populationHistory.push(currentPop);
    this.stateHashHistory.push(currentHash);

    if (this.populationHistory.length > this.maxPopulationHistory) {
      this.populationHistory.shift();
    }
    if (this.stateHashHistory.length > this.maxPopulationHistory) {
      this.stateHashHistory.shift();
    }
    this.notifyObservers('gameStep', {
      generation: this.generation,
      population: this.liveCells.size,
      liveCells: this.liveCells
    });
  }

  // Running state
  getIsRunning() {
    return this.isRunning;
  }

  getGeneration() {
    return this.generation;
  }

  getPopulationHistory() {
    return [...this.populationHistory];
  }

  // Shape operations
  placeShape(x, y, shape) {
    if (!shape || (!shape.cells && !shape.pattern)) return;

    const cells = shape.cells || shape.pattern || [];
    let cellsPlaced = 0;

    cellsPlaced = this.drawShape(cells, x, y, cellsPlaced);

    if (cellsPlaced > 0) {
      this.notifyObservers('shapePlace', { x, y, shape, cellsPlaced });
    }
  }

  drawShape(cells, x, y, cellsPlaced) {
    for (const cell of cells) {
      const hasX = cell && Object.hasOwn(cell, 'x');
      const hasY = cell && Object.hasOwn(cell, 'y');
      let offsetX;
      if (hasX) {
        offsetX = cell.x;
      } else if (Array.isArray(cell)) {
        offsetX = cell[0] ?? 0;
      } else {
        offsetX = 0;
      }
      let offsetY;
      if (hasY) {
        offsetY = cell.y;
      } else if (Array.isArray(cell)) {
        offsetY = cell[1] ?? 0;
      } else {
        offsetY = 0;
      }
      const cellX = x + offsetX;
      const cellY = y + offsetY;
      this.setCellAliveModel(cellX, cellY, true);
      cellsPlaced++;
    }
    return cellsPlaced;
  }

  // Utility methods
  getBounds() {
    if (this.liveCells.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const key of this.liveCells.keys()) {
      const [x, y] = key.split(',').map(Number);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    return { minX, maxX, minY, maxY };
  }

  // Export/import state
  exportState() {
    return {
      liveCells: Array.from(this.liveCells.keys()).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      }),
      generation: this.generation,
      viewport: { ...this.viewport },
      populationHistory: [...this.populationHistory]
    };
  }

  importState(state) {
    this.clearModel();

    if (state.liveCells) {
      for (const cell of state.liveCells) {
        this.setCellAliveModel(cell.x, cell.y, true);
      }
    }

    this.generation = state.generation || 0;

    // Only set default viewport position/zoom; cellSize is not managed by the model
    if (typeof this.viewport === 'undefined' || this.viewport == null) {
      this.viewport = state.viewport || { offsetX: 0, offsetY: 0, zoom: 1 };
    } else {
      this.viewport = state.viewport || { ...this.viewport };
    }
    this.populationHistory = state.populationHistory || [];

    this.notifyObservers('stateImported', state);
  }

  // Enhanced pattern analysis with sophisticated heuristic algorithm
  isStable(globalThisSize = 50, tolerance = 3) {
    const isHashlife = this.engineMode === 'hashlife';
    const batchSize = isHashlife ? this.generationBatchSize : 1;
    const effectiveWindowSize = isHashlife
      ? Math.min(globalThisSize, Math.max(10, Math.floor(globalThisSize / Math.max(1, batchSize / 10))))
      : globalThisSize;
    const effectiveTolerance = isHashlife
      ? Math.max(tolerance, tolerance * Math.min(2, Math.sqrt(batchSize / 10)))
      : tolerance;
    const minHistory = isHashlife
      ? Math.max(effectiveWindowSize, 15)
      : Math.max(globalThisSize * 1.5, 40);

    if (this.populationHistory.length < minHistory) {
      return false;
    }

    const recent = this.populationHistory.slice(-effectiveWindowSize);
    const { stdDev, populationStable } = computePopulationStats(recent, effectiveTolerance);
    const trendStable = computeTrendStable(recent, effectiveTolerance);
    const { periodicStable, detectedPeriod } = detectPeriodicStateStability(this.stateHashHistory, effectiveWindowSize);
    const plateauStable = computePlateauStable(recent, this.engineMode, effectiveWindowSize, effectiveTolerance);

    const stillLifeDetected = populationStable && trendStable && plateauStable;
    const oscillatorDetected = periodicStable && populationStable;
    const perfectlyStableForLongTime = populationStable && stdDev <= 0.1 && recent.length >= 20;
    const recentlyPerfectStable = hasRecentPerfectStability(recent);
    const hasStateRepetition = periodicStable || detectedPeriod > 0;
    return stillLifeDetected || oscillatorDetected || (perfectlyStableForLongTime && recentlyPerfectStable && hasStateRepetition);
  }

  detectPeriod(maxPeriod = 30) {
    const absoluteMinimum = 6;
    if (this.stateHashHistory.length < absoluteMinimum) {
      return 0;
    }

    const recentStates = this.stateHashHistory;
    const effectiveMaxPeriod = Math.min(maxPeriod, Math.floor(recentStates.length / 3));

    for (let period = 1; period <= effectiveMaxPeriod; period++) {
      const cyclesToCheck = Math.floor(recentStates.length / period) - 1;
      if (cyclesToCheck < 2) continue;
      if (isPeriodMatch(recentStates, period, cyclesToCheck)) {
        return period;
      }
    }
    return 0;
  }

  // Performance tracking methods (runtime only - not serialized)
  trackRender() {
    const now = performance.now();
    this.renderTimestamps.push(now);

    // Keep only recent timestamps
    if (this.renderTimestamps.length > this.maxTimestamps) {
      this.renderTimestamps.shift();
    }

    this.lastRenderTime = now;
  }

  trackGeneration() {
    const now = performance.now();
    this.generationTimestamps.push(now);

    // Keep only recent timestamps
    if (this.generationTimestamps.length > this.maxTimestamps) {
      this.generationTimestamps.shift();
    }

    this.lastGenerationTime = now;
  }

  getFPS() {
    if (this.renderTimestamps.length < 2) return 0;

    const now = performance.now();
    const timestamps = this.renderTimestamps.filter(t => now - t <= 1000); // Last 1 second

    if (timestamps.length < 2) return 0;

    const timeSpan = timestamps.at(-1) - timestamps[0];
    if (timeSpan === 0) return 0;

    return Math.round(((timestamps.length - 1) * 1000) / timeSpan);
  }

  getGenPerSecond() {
    if (this.generationTimestamps.length < 2) return 0;

    const now = performance.now();
    const timestamps = this.generationTimestamps.filter(t => now - t <= 1000); // Last 1 second

    if (timestamps.length < 2) return 0;

    const timeSpan = timestamps.at(-1) - timestamps[0];
    if (timeSpan === 0) return 0;

    return Math.round(((timestamps.length - 1) * 1000) / timeSpan);
  }

  getPerformanceMetrics() {
    return {
      fps: this.getFPS(),
      gps: this.getGenPerSecond(),
      generation: this.generation,
      population: this.getCellCount(),
      lastRenderTime: this.lastRenderTime,
      lastGenerationTime: this.lastGenerationTime
    };
  }

  // UI state management operations (not serialized)

  // Convenience methods for common UI operations
  clearModel() {
    this.liveCells.clear();
    this._bumpLiveCellsVersion();
    this.generation = 0;
    this.populationHistory = [];
    this.stateHashHistory = [];
    // Preserve tool and interaction state
    // this.selectedTool, this.selectedShape, this.cursorPosition remain unchanged
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1
    };
    this.notifyObservers('modelCleared');
    this.notifyObservers('gameCleared');
  }

  toggleSpeedGauge() {
    this.uiState.showSpeedGauge = !this.uiState.showSpeedGauge;
    this.notifyObservers(CONST_UISTATECHANGED, { showSpeedGauge: this.uiState.showSpeedGauge });
  }

  setCaptureDataModel() {
    // No-op: UI state now managed in React
  }

  getCaptureData() {
    return this.uiState.captureData;
  }

  // Performance settings
  setMaxFPSModel(fps) {
    return this.setPerformanceSettingsModel({ maxFPS: fps });
  }

  getMaxFPS() {
    return this.performanceSettings.maxFPS;
  }

  setMaxGPS(gps) {
    return this.setPerformanceSettingsModel({ maxGPS: gps });
  }

  getMaxGPS() {
    return this.performanceSettings.maxGPS;
  }

  // Combined performance settings methods
  getPerformanceSettings() {
    return { ...this.performanceSettings };
  }

  setPerformanceSettingsModel(settings) {
    if (!settings || typeof settings !== 'object') {
      return this.getPerformanceSettings();
    }

    const next = { ...this.performanceSettings };
    const changed = [
      applyNumericPerformanceSetting(next, settings, 'maxFPS', 1, 120),
      applyNumericPerformanceSetting(next, settings, 'maxGPS', 1, 60),
      applyNumericPerformanceSetting(next, settings, 'populationWindowSize', 1, 1000),
      applyNumericPerformanceSetting(next, settings, 'populationTolerance', 0, 1000),
      applyBooleanPerformanceSetting(next, settings, 'useWebWorker'),
      applyBooleanPerformanceSetting(next, settings, 'enableFPSCap'),
      applyBooleanPerformanceSetting(next, settings, 'enableGPSCap')
    ].some(Boolean);

    if (changed) {
      this.performanceSettings = next;
      this.notifyObservers('performanceSettingsChanged', { ...this.performanceSettings });
    }
    return this.getPerformanceSettings();
  }

  // Population stability settings
  setPopulationWindowSizeModel(size) {
    return this.setPerformanceSettingsModel({ populationWindowSize: size });
  }

  getPopulationWindowSize() {
    return this.performanceSettings.populationWindowSize;
  }

  setPopulationToleranceModel(tolerance) {
    return this.setPerformanceSettingsModel({ populationTolerance: tolerance });
  }

  getPopulationTolerance() {
    return this.performanceSettings.populationTolerance;
  }
}
