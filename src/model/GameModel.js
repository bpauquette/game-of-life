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
      cellSize: 20, // Default to 20 instead of 8
      zoom: 1,
      minCellSize: 1,
      maxCellSize: 200
    };
    // Performance tracking
    this.populationHistory = [];
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
  }

  addObserver(observer) {
    this.observers.add(observer);
  }

  removeObserver(observer) {
    this.observers.delete(observer);
  }

  notifyObservers(event, data) {
    for (const observer of this.observers) {
      if (typeof observer === 'function') {
        observer(event, data);
      } else if (observer[event]) {
        observer[event](data);
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

  setRunningModel(isRunning) {
  logger.info('[GameModel] setRunningModel called:', isRunning);
  this.isRunning = isRunning;
  this.notifyObservers('runningStateChanged', { isRunning });
  }

  setColorSchemeModel(colorScheme) {
    logger.info('[GameModel] setColorSchemeModel called:', colorScheme);
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
      this.viewport.cellSize !== cellSize ||
      (zoom !== undefined && this.viewport.zoom !== zoom)
    ) {
      this.viewport.offsetX = offsetX;
      this.viewport.offsetY = offsetY;
      this.viewport.cellSize = cellSize;
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
    return this.setViewportModel(offsetX, offsetY, this.viewport.cellSize, this.viewport.zoom);
  }

  setCellSizeModel(cellSize) {
    const safeCellSize = (typeof cellSize === 'number' && !Number.isNaN(cellSize)) ? cellSize : this.viewport.cellSize;
    const clampedSize = Math.max(this.viewport.minCellSize, Math.min(this.viewport.maxCellSize, safeCellSize));
    return this.setViewportModel(this.viewport.offsetX, this.viewport.offsetY, clampedSize, this.viewport.zoom);
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
    return this.viewport.cellSize;
  }

  getZoom() {
    return this.viewport.zoom;
  }

  // Game evolution
  step() {
    let newLiveCells = this.liveCells;

    // Only evolve if there are live cells
    if (this.liveCells.size > 0) {
      newLiveCells = gameStep(this.liveCells);
      this.liveCells = newLiveCells;
    }

    // Always increment generation and notify (for performance metrics)
    this.generation++;

    // Track generation timestamp for performance metrics
    this.trackGeneration();

    // Update population history
    this.populationHistory.push(this.liveCells.size);
    if (this.populationHistory.length > this.maxPopulationHistory) {
      this.populationHistory.shift();
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
    this.viewport = state.viewport || { offsetX: 0, offsetY: 0, cellSize: 8 };
    this.populationHistory = state.populationHistory || [];

    this.notifyObservers('stateImported', state);
  }

  // Pattern analysis
  isStable(windowSize = 50, tolerance = 3) {
    if (this.populationHistory.length < windowSize) return false;

    const recent = this.populationHistory.slice(-windowSize);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

    return recent.every(pop => Math.abs(pop - avg) <= tolerance);
  }

  detectPeriod(maxPeriod = 30) {
    if (this.populationHistory.length < maxPeriod * 2) return 0;

    const recent = this.populationHistory.slice(-maxPeriod * 2);

    for (let period = 1; period <= maxPeriod; period++) {
      let matches = 0;
      for (let i = 0; i < maxPeriod; i++) {
        if (recent.at(-1 - i) === recent.at(-1 - i - period)) {
          matches++;
        }
      }
      if (matches >= maxPeriod * 0.9) { // 90% match
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
    this.generation = 0;
    this.populationHistory = [];
    // Preserve tool and interaction state
    // this.selectedTool, this.selectedShape, this.cursorPosition remain unchanged
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      cellSize: 20,
      zoom: 1,
      minCellSize: 1,
      maxCellSize: 200
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
  // No-op: UI state now managed in React
  }

  getMaxFPS() {
  return 60;
  }

  setMaxGPS(gps) {
  // No-op: UI state now managed in React
  }

  getMaxGPS() {
  return 30;
  }

  // Combined performance settings methods
  getPerformanceSettings() {
    return {
      maxFPS: 60,
      maxGPS: 30
    };
  }

  setPerformanceSettingsModel(settings) {
    // No-op: UI state now managed in React
  }

  // Population stability settings
  setPopulationWindowSizeModel(size) {
  // No-op: UI state now managed in React
  }

  getPopulationWindowSize() {
  return 10;
  }

  setPopulationToleranceModel(tolerance) {
  // No-op: UI state now managed in React
  }

  getPopulationTolerance() {
  return 0.1;
  }
}