// GameModel.js - Model layer for Conway's Game of Life
// Handles all game state, rules, and data operations

import { step as gameStep } from './gameLogic';

const CONST_OPEN = 'Open';
const CONST_UISTATECHANGED = 'uiStateChanged';

export class GameModel {
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
    this.colorScheme = null;
    
    // Tool and interaction state (not serialized)
    this.selectedTool = 'draw'; // Default to draw tool
    this.selectedShape = null;
    this.cursorPosition = null;
    this.lastCursorUpdateTime = 0;
    this.cursorThrottleDelay = 16; // ~60fps throttling for cursor updates
    
    // UI state management (not serialized)
    this.uiState = {
      // Dialog states
      helpOpen: false,
      aboutOpen: false,
      optionsOpen: false,
      paletteOpen: false,
      captureDialogOpen: false,
      saveDialogOpen: false,
      loadDialogOpen: false,
      
      // Chart and gauge states  
      showChart: false,
      showSpeedGauge: true,
      
      // Capture-related state
      captureData: null,
      
      // Performance settings
      maxFPS: 60,
      maxGPS: 30,
      
      // Population stability settings
      popWindowSize: 10,
      popTolerance: 0.1
    };
    
    // Observers for state changes
    this.observers = new Set();
  }

  // Observer pattern for state change notifications
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
  setCellAlive(x, y, alive) {
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

  isCellAlive(x, y) {
    return this.liveCells.has(`${x},${y}`);
  }

  getLiveCells() {
    return this.liveCells;
  }

  getCellCount() {
    return this.liveCells.size;
  }

  clear() {
    const hadCells = this.liveCells.size > 0;
    this.liveCells.clear();
    this.generation = 0;
    this.populationHistory = [];
    
    if (hadCells) {
      this.notifyObservers('gameCleared');
    }
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
  setRunning(running) {
    if (this.isRunning !== running) {
      this.isRunning = running;
      this.notifyObservers('runningStateChanged', { isRunning: running });
    }
  }

  getIsRunning() {
    return this.isRunning;
  }

  getGeneration() {
    return this.generation;
  }

  getPopulationHistory() {
    return [...this.populationHistory];
  }

  // Viewport operations
  setViewport(offsetX, offsetY, cellSize, zoom) {
    const changed = 
      this.viewport.offsetX !== offsetX ||
      this.viewport.offsetY !== offsetY ||
      this.viewport.cellSize !== cellSize ||
      (zoom !== undefined && this.viewport.zoom !== zoom);
      
    if (changed) {
      this.viewport.offsetX = offsetX;
      this.viewport.offsetY = offsetY;
      this.viewport.cellSize = cellSize;
      if (zoom !== undefined) {
        this.viewport.zoom = zoom;
      }
      this.notifyObservers('viewportChanged', { ...this.viewport });
    }
    
    return changed;
  }

  getViewport() {
    return { ...this.viewport };
  }

  // Individual viewport property setters
  setOffset(offsetX, offsetY) {
    return this.setViewport(offsetX, offsetY, this.viewport.cellSize);
  }

  setCellSize(cellSize) {
    // Handle NaN, null, undefined, and invalid values
    const safeCellSize = (typeof cellSize === 'number' && !Number.isNaN(cellSize)) ? cellSize : this.viewport.cellSize;
    const clampedSize = Math.max(this.viewport.minCellSize, Math.min(this.viewport.maxCellSize, safeCellSize));
    return this.setViewport(this.viewport.offsetX, this.viewport.offsetY, clampedSize);
  }

  setZoom(zoom) {
    // Handle NaN, null, undefined, and invalid values
    const safeZoom = (typeof zoom === 'number' && !Number.isNaN(zoom)) ? zoom : this.viewport.zoom;
    const clampedZoom = Math.max(0.1, Math.min(10, safeZoom));
    if (this.viewport.zoom !== clampedZoom) {
      this.viewport.zoom = clampedZoom;
      this.notifyObservers('viewportChanged', { ...this.viewport });
      return true;
    }
    return false;
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

  // Shape operations
  placeShape(x, y, shape) {
    if (!shape || (!shape.cells && !shape.pattern)) return;
    
    const cells = shape.cells || shape.pattern || [];
    let cellsPlaced = 0;
    
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
      this.setCellAlive(cellX, cellY, true);
      cellsPlaced++;
    }
    
    if (cellsPlaced > 0) {
      this.notifyObservers('shapePlace', { x, y, shape, cellsPlaced });
    }
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
    this.clear();
    
    if (state.liveCells) {
      for (const cell of state.liveCells) {
        this.setCellAlive(cell.x, cell.y, true);
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

  // Color scheme operations (not serialized)
  setColorScheme(colorScheme) {
    this.colorScheme = colorScheme;
    this.notifyObservers('colorSchemeChanged', colorScheme);
  }

  getColorScheme() {
    return this.colorScheme;
  }

  // Tool and interaction state operations (not serialized)
  setSelectedTool(tool) {
    if (this.selectedTool !== tool) {
      this.selectedTool = tool;
      this.notifyObservers('selectedToolChanged', tool);
    }
  }

  getSelectedTool() {
    return this.selectedTool;
  }

  setSelectedShape(shape) {
    if (this.selectedShape !== shape) {
      this.selectedShape = shape;
      this.notifyObservers('selectedShapeChanged', shape);
    }
  }

  getSelectedShape() {
    return this.selectedShape;
  }

  setCursorPosition(position) {
    // Only update if position actually changed
    const changed = (this.cursorPosition === null && position !== null) ||
      (this.cursorPosition !== null && position === null) ||
      (this.cursorPosition !== null && position !== null && 
       (this.cursorPosition.x !== position.x || this.cursorPosition.y !== position.y));
    
    if (!changed) {
      return;
    }
    
    const now = performance.now();
    
    // Throttle cursor updates to avoid excessive notifications
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

  // UI state management operations (not serialized)
  openDialog(dialogName) {
    if (this.uiState[dialogName + CONST_OPEN] !== undefined) {
      this.uiState[dialogName + CONST_OPEN] = true;
      this.notifyObservers(CONST_UISTATECHANGED, { 
        type: 'dialogOpen', 
        dialog: dialogName, 
        open: true 
      });
    }
  }

  closeDialog(dialogName) {
    if (this.uiState[dialogName + CONST_OPEN] !== undefined) {
      this.uiState[dialogName + CONST_OPEN] = false;
      this.notifyObservers(CONST_UISTATECHANGED, { 
        type: 'dialogClose', 
        dialog: dialogName, 
        open: false 
      });
    }
  }

  isDialogOpen(dialogName) {
    return this.uiState[dialogName + CONST_OPEN] || false;
  }

  setUIState(key, value) {
    if (this.uiState[key] !== value) {
      this.uiState[key] = value;
      this.notifyObservers(CONST_UISTATECHANGED, { 
        type: 'stateChange', 
        key, 
        value 
      });
    }
  }

  getUIState(key) {
    return this.uiState[key];
  }

  getAllUIState() {
    return { ...this.uiState };
  }

  // Convenience methods for common UI operations
  toggleChart() {
    this.setUIState('showChart', !this.uiState.showChart);
  }

  toggleSpeedGauge() {
    this.setUIState('showSpeedGauge', !this.uiState.showSpeedGauge);
  }

  setCaptureData(data) {
    this.uiState.captureData = data;
    if (data) {
      this.openDialog('captureDialog');
    }
    this.notifyObservers(CONST_UISTATECHANGED, { 
      type: 'captureDataChanged', 
      data 
    });
  }

  getCaptureData() {
    return this.uiState.captureData;
  }

  // Performance settings
  setMaxFPS(fps) {
    this.setUIState('maxFPS', Math.max(1, Math.min(240, fps)));
  }

  getMaxFPS() {
    return this.uiState.maxFPS;
  }

  setMaxGPS(gps) {
    this.setUIState('maxGPS', Math.max(1, Math.min(120, gps)));
  }

  getMaxGPS() {
    return this.uiState.maxGPS;
  }

  // Combined performance settings methods
  getPerformanceSettings() {
    return {
      maxFPS: this.uiState.maxFPS,
      maxGPS: this.uiState.maxGPS
    };
  }

  setPerformanceSettings(settings) {
    if (settings.maxFPS !== undefined) {
      this.setMaxFPS(settings.maxFPS);
    }
    if (settings.maxGPS !== undefined) {
      this.setMaxGPS(settings.maxGPS);
    }
  }

  // Population stability settings
  setPopulationWindowSize(size) {
    this.setUIState('popWindowSize', Math.max(5, Math.min(100, size)));
  }

  getPopulationWindowSize() {
    return this.uiState.popWindowSize;
  }

  setPopulationTolerance(tolerance) {
    this.setUIState('popTolerance', Math.max(0.01, Math.min(1, tolerance)));
  }

  getPopulationTolerance() {
    return this.uiState.popTolerance;
  }
}