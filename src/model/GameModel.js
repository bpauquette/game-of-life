// GameModel.js - Model layer for Conway's Game of Life
// Handles all game state, rules, and data operations

import { step as gameStep } from './gameLogic';
import { colorSchemes } from './colorSchemes';
import logger from '../controller/utils/logger';

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

export class GameModel {
  // Overlay management
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
  clear() {
    this.clearModel();
  }
  constructor() {
    // Game state
    this.liveCells = new Map();
    this.generation = 0;
    this.isRunning = false;
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
      enableGPSCap: false
    };
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
    try {
      if (event === 'captureCompleted') {
        logger.debug('[GameModel] notifyObservers -> captureCompleted (observerCount=' + this.observers.size + ')', data);
      }
    } catch (e) {
      // swallow logging errors to avoid breaking runtime observer delivery
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
        try { logger.error('[GameModel] observer threw for event ' + event + ':', err); } catch (e) {}
      }
    }
  }

  // Game state operations
  setCellAliveModel(x, y, alive) {
    const key = `${x},${y}`;
    const wasAlive = this.liveCells.has(key);
    if (alive && !wasAlive) {
      this.liveCells.set(key, true);
      this.notifyObservers('cellChanged', { x, y, alive: true });
    } else if (!alive && wasAlive) {
      this.liveCells.delete(key);
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
    if (changed > 0) this.notifyObservers('cellsChangedBulk', { added, removed, changed });
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
  logger.debug('[GameModel] setRunningModel called:', isRunning);
  this.isRunning = isRunning;
  this.notifyObservers('runningStateChanged', { isRunning });
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
    const changed = (this.cursorPosition === null && position !== null) ||
      (this.cursorPosition !== null && position === null) ||
      (this.cursorPosition !== null && position !== null &&
        (this.cursorPosition.x !== position.x || this.cursorPosition.y !== position.y));
    if (!changed) {
      return;
    }
    const now = performance.now();
    if (now - this.lastCursorUpdateTime < this.cursorThrottleDelay) {
      return;
    }
    this.cursorPosition = position ? { ...position } : null;
    this.lastCursorUpdateTime = now;
    this.notifyObservers('cursorPositionChanged', this.cursorPosition);
  }

  getCursorPosition() {
    return this.cursorPosition;
  }

  setViewportModel(offsetX, offsetY, cellSize, zoom) {
    if (
      this.viewport.offsetX !== offsetX ||
      this.viewport.offsetY !== offsetY ||
      (zoom !== undefined && this.viewport.zoom !== zoom)
    ) {
      this.viewport.offsetX = offsetX;
      this.viewport.offsetY = offsetY;
      if (zoom !== undefined) {
        this.viewport.zoom = zoom;
      }
      this.notifyObservers('viewportChanged', { ...this.viewport });
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

  setCellSizeModel(cellSize) {
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
  step() {
    const nextLiveCells = this.liveCells.size > 0
      ? gameStep(this.liveCells)
      : new Map();
    this._applyStepResult(nextLiveCells, 1);
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
    this.generation += generationDelta;
    this.trackGeneration();
    
    // Track both population and state hash for proper oscillator detection
    this.populationHistory.push(this.liveCells.size);
    this.stateHashHistory.push(this.getStateHash());
    
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
  isStable(windowSize = 50, tolerance = 3) {
    // Require more history for reliable detection - prevent premature detection
    const minHistory = Math.max(windowSize * 1.5, 40);
    if (this.populationHistory.length < minHistory) {
      console.log(`🔍 [Stability] Not enough history: ${this.populationHistory.length} < ${minHistory}`);
      return false;
    }

    const recent = this.populationHistory.slice(-windowSize);
    
    // Multi-criteria stability detection heuristic
    
    // Criterion 1: Population variance analysis (primary indicator)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, pop) => sum + Math.pow(pop - avg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    const populationStable = stdDev <= tolerance;
    
    // Criterion 2: Trend analysis (detect long-term drift)
    let trendStable = true;
    if (recent.length >= 10) {
      const mid = Math.floor(recent.length / 2);
      const firstHalf = recent.slice(0, mid);
      const secondHalf = recent.slice(mid);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Allow small drift but reject significant population changes
      trendStable = Math.abs(secondAvg - firstAvg) <= tolerance * 1.5;
    }
    
    // Criterion 3: Oscillation detection using state hashes (proper detection for oscillators)
    let periodicStable = false;
    let detectedPeriod = 0;
    
    if (this.stateHashHistory.length >= 6) {
      const recentStates = this.stateHashHistory.slice(-windowSize);
      
      // Debug: log recent states to see what we're working with
      if (this.generation === 45) {
        console.log(`🔍 [State Hash Debug] Recent states:`, recentStates.slice(-10));
        console.log(`🔍 [State Hash Debug] Current state:`, this.getStateHash());
        console.log(`🔍 [State Hash Debug] Live cells:`, Array.from(this.liveCells.keys()));
      }
      
      // Check for stable oscillations (periods 1-8)
      for (let period = 1; period <= Math.min(8, Math.floor(recentStates.length / 3)); period++) {
        let cyclicMatch = true;
        const cyclesToCheck = Math.floor(recentStates.length / period) - 1;
        
        if (cyclesToCheck >= 2) {
          // Check if the pattern repeats with this period
          for (let cycle = 0; cycle < cyclesToCheck && cyclicMatch; cycle++) {
            for (let offset = 0; offset < period && cyclicMatch; offset++) {
              const idx1 = recentStates.length - 1 - offset;
              const idx2 = idx1 - period;
              if (idx2 >= 0 && recentStates[idx1] !== recentStates[idx2]) {
                cyclicMatch = false;
              }
            }
          }
          if (cyclicMatch) {
            periodicStable = true;
            detectedPeriod = period;
            
            // Debug: log when we find a match
            if (this.generation === 45) {
              console.log(`🔍 [Period Debug] Found period ${period}, checking states:`, {
                lastStates: recentStates.slice(-period * 2),
                cyclesToCheck,
                period
              });
            }
            break;
          }
        }
      }
    }
    
    // Criterion 4: Plateau detection (stable still life) - more strict
    let plateauStable = false;
    if (recent.length >= 15) {
      const lastFifteen = recent.slice(-15);
      const uniqueValues = [...new Set(lastFifteen)];
      // Require longer plateau and stricter criteria
      // Last 15 generations must have identical populations (true still life)
      // OR at most 2 unique values with very small variance (tight oscillation)
      if (uniqueValues.length === 1) {
        plateauStable = true; // Perfect still life
      } else if (uniqueValues.length === 2) {
        // Check if it's a tight 2-state oscillation
        const sorted = uniqueValues.sort((a, b) => a - b);
        plateauStable = (sorted[1] - sorted[0]) <= Math.max(1, tolerance * 0.5);
      }
      
      // Debug plateau detection
      if (this.generation >= 500 && this.generation <= 505) {
        console.log(`🔍 [Plateau Debug] Gen ${this.generation}:`, {
          lastFifteen,
          uniqueValues,
          uniqueCount: uniqueValues.length,
          plateauStable
        });
      }
    }
    
    // Combine criteria with stricter logic to reduce false positives
    // Require both population stability AND trend stability for still life
    // OR require both periodic pattern AND population stability for oscillators
    const stillLifeDetected = populationStable && trendStable && plateauStable;
    const oscillatorDetected = periodicStable && populationStable;
    
    // RELAXED CRITERIA: If population has been perfectly stable (stdDev = 0) for a long time,
    // treat it as stable regardless of other criteria to prevent "stability flapping"
    const perfectlyStableForLongTime = populationStable && stdDev <= 0.1 && recent.length >= 20;
    const recentlyPerfectStable = recent.length >= 10 && 
      recent.slice(-10).every(pop => pop === recent[recent.length - 1]);
    
    const finalResult = stillLifeDetected || oscillatorDetected || (perfectlyStableForLongTime && recentlyPerfectStable);
    
    console.log(`🔍 [Stability] Analysis:`, {
      gen: this.generation,
      historyLen: this.populationHistory.length,
      stateHashHistoryLen: this.stateHashHistory.length,
      recentPops: recent.slice(-10),
      recentStates: this.stateHashHistory.slice(-10),
      stdDev: stdDev.toFixed(2),
      detectedPeriod,
      populationStable,
      trendStable,
      periodicStable,
      plateauStable,
      perfectlyStableForLongTime,
      recentlyPerfectStable,
      stillLifeDetected,
      oscillatorDetected,
      finalResult
    });
    
    return finalResult;
  }

  detectPeriod(maxPeriod = 30) {
    console.log(`🔍 [DetectPeriod] CALLED with maxPeriod=${maxPeriod}, gen=${this.generation}, stateHistory=${this.stateHashHistory.length}`);
    
    // Need at least 6 states minimum, and enough to check at least 2 cycles of the largest period we'll test
    const absoluteMinimum = 6;
    if (this.stateHashHistory.length < absoluteMinimum) {
      console.log(`🔍 [DetectPeriod] Not enough state history: ${this.stateHashHistory.length} < ${absoluteMinimum}`);
      return 0;
    }

    const recentStates = this.stateHashHistory;
    
    console.log(`🔍 [DetectPeriod] Checking ${recentStates.length} states for periods up to ${maxPeriod}`);
    
    // Use state hash comparison for accurate period detection
    // Only test periods where we have enough history for at least 3 full cycles
    const effectiveMaxPeriod = Math.min(maxPeriod, Math.floor(recentStates.length / 3));
    
    for (let period = 1; period <= effectiveMaxPeriod; period++) {
      const cyclesToCheck = Math.floor(recentStates.length / period) - 1;
      
      if (cyclesToCheck < 2) continue; // Need at least 2 complete cycles
      
      let perfectMatch = true;
      
      // Check if the pattern repeats perfectly with this period
      for (let cycle = 0; cycle < cyclesToCheck && perfectMatch; cycle++) {
        for (let offset = 0; offset < period && perfectMatch; offset++) {
          const idx1 = recentStates.length - 1 - offset;
          const idx2 = idx1 - period;
          
          if (idx2 >= 0 && recentStates[idx1] !== recentStates[idx2]) {
            perfectMatch = false;
          }
        }
      }
      
      if (perfectMatch) {
        console.log(`🔍 [DetectPeriod] Found period ${period} with ${cyclesToCheck} cycles checked`);
        console.log(`🔍 [DetectPeriod] Last ${period * 2} states:`, recentStates.slice(-period * 2));
        return period;
      }
    }

    console.log(`🔍 [DetectPeriod] No period detected (max checked: ${maxPeriod})`);
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

  setCaptureDataModel(data) {
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
    let changed = false;

    if (Object.prototype.hasOwnProperty.call(settings, 'maxFPS')) {
      const clamped = clampNumber(settings.maxFPS, 1, 120);
      if (clamped !== null && clamped !== next.maxFPS) {
        next.maxFPS = clamped;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'maxGPS')) {
      const clamped = clampNumber(settings.maxGPS, 1, 60);
      if (clamped !== null && clamped !== next.maxGPS) {
        next.maxGPS = clamped;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'populationWindowSize')) {
      const clamped = clampNumber(settings.populationWindowSize, 1, 1000);
      if (clamped !== null && clamped !== next.populationWindowSize) {
        next.populationWindowSize = clamped;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'populationTolerance')) {
      const clamped = clampNumber(settings.populationTolerance, 0, 1000);
      if (clamped !== null && clamped !== next.populationTolerance) {
        next.populationTolerance = clamped;
        changed = true;
      }
    }

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