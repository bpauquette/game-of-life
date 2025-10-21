// GameModel.js - Model layer for Conway's Game of Life
// Handles all game state, rules, and data operations

import { step as gameStep } from './gameLogic';

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
      cellSize: 8
    };
    
    // Performance tracking
    this.populationHistory = [];
    this.maxPopulationHistory = 1000;
    
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
    this.observers.forEach(observer => {
      if (typeof observer === 'function') {
        observer(event, data);
      } else if (observer[event]) {
        observer[event](data);
      }
    });
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
    if (this.liveCells.size === 0) return;
    
    const newLiveCells = gameStep(this.liveCells);
    
    // Update state
    this.liveCells = newLiveCells;
    this.generation++;
    
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
  setViewport(offsetX, offsetY, cellSize) {
    const changed = 
      this.viewport.offsetX !== offsetX ||
      this.viewport.offsetY !== offsetY ||
      this.viewport.cellSize !== cellSize;
      
    if (changed) {
      this.viewport = { offsetX, offsetY, cellSize };
      this.notifyObservers('viewportChanged', { ...this.viewport });
    }
    
    return changed;
  }

  getViewport() {
    return { ...this.viewport };
  }

  // Shape operations
  placeShape(x, y, shape) {
    if (!shape || (!shape.cells && !shape.pattern)) return;
    
    const cells = shape.cells || shape.pattern || [];
    let cellsPlaced = 0;
    
    for (const cell of cells) {
      const cellX = x + (cell.x !== undefined ? cell.x : cell[0] || 0);
      const cellY = y + (cell.y !== undefined ? cell.y : cell[1] || 0);
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
        if (recent[recent.length - 1 - i] === recent[recent.length - 1 - i - period]) {
          matches++;
        }
      }
      if (matches >= maxPeriod * 0.9) { // 90% match
        return period;
      }
    }
    
    return 0;
  }
}