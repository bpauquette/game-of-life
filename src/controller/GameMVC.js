// GameMVC.js - Main orchestrator for MVC pattern
// Creates and coordinates Model, View, and Controller

import { GameModel } from '../model/GameModel';
import { GameView } from '../view/GameView';
import { GameController } from './GameController';

export class GameMVC {
  constructor(canvas, options = {}) {
    // Create MVC components
    this.model = new GameModel();
    this.view = new GameView(canvas, options.view);
    this.controller = new GameController(this.model, this.view, options.controller);

    // Setup initial state
    this.setupDefaults();
    
    // Initial render
    this.controller.requestRender();
  }



  setupDefaults() {
    // Setup default tools
    this.registerDefaultTools();
    
    // Setup initial viewport
    const container = this.view.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.view.resize(rect.width || 800, rect.height || 600);
    }
    
    // Setup all event listeners
    this.view.setupMouseEvents();
    this.view.setupKeyboardEvents();
    this.view.setupWindowEvents();
  }

  registerDefaultTools() {
    // Import and register all available tools
    import('./tools/drawTool').then(({ drawTool }) => {
      this.controller.registerTool('draw', drawTool);
    });
    
    import('./tools/lineTool').then(({ lineTool }) => {
      this.controller.registerTool('line', lineTool);
    });
    
    import('./tools/rectTool').then(({ rectTool }) => {
      this.controller.registerTool('rect', rectTool);
    });
    
    import('./tools/circleTool').then(({ circleTool }) => {
      this.controller.registerTool('circle', circleTool);
    });
    
    import('./tools/ovalTool').then(({ ovalTool }) => {
      this.controller.registerTool('oval', ovalTool);
    });
    
    import('./tools/randomRectTool').then(({ randomRectTool }) => {
      this.controller.registerTool('randomRect', randomRectTool);
    });
    
    import('./tools/shapesTool').then(({ shapesTool }) => {
      this.controller.registerTool('shapes', shapesTool);
    });
    
    import('./tools/captureTool').then(({ captureTool }) => {
      this.controller.registerTool('capture', captureTool);
    });
  }

  // Public API - delegate to appropriate MVC component

  // Model operations
  setCellAlive(x, y, alive) {
    return this.model.setCellAlive(x, y, alive);
  }

  getLiveCells() {
    return this.model.getLiveCells();
  }

  clear() {
    this.controller.clear();
  }

  step() {
    this.controller.step();
  }

  placeShape(x, y, shape) {
    return this.model.placeShape(x, y, shape);
  }

  // Controller operations
  setRunning(running) {
    this.controller.setRunning(running);
  }

  getIsRunning() {
    return this.model.getIsRunning();
  }

  setSelectedTool(tool) {
    this.controller.setSelectedTool(tool);
  }

  getSelectedTool() {
    return this.controller.getSelectedTool();
  }

  setSelectedShape(shape) {
    this.controller.setSelectedShape(shape);
  }

  setSpeed(fps) {
    this.controller.setSpeed(fps);
  }

  // View operations
  setViewport(offsetX, offsetY, cellSize) {
    return this.model.setViewport(offsetX, offsetY, cellSize);
  }

  getViewport() {
    return this.model.getViewport();
  }

  screenToCell(screenX, screenY) {
    return this.view.screenToCell(screenX, screenY);
  }

  // State operations
  getGeneration() {
    return this.model.getGeneration();
  }

  getCellCount() {
    return this.model.getCellCount();
  }

  getPopulationHistory() {
    return this.model.getPopulationHistory();
  }

  getBounds() {
    return this.model.getBounds();
  }

  getGameStats() {
    return this.controller.getGameStats();
  }

  getCursorPosition() {
    return this.controller.getCursorPosition();
  }

  // Performance monitoring
  addPerformanceCallback(callback) {
    this.controller.addPerformanceCallback(callback);
  }

  removePerformanceCallback(callback) {
    this.controller.removePerformanceCallback(callback);
  }

  // Event handling
  onModelChange(callback) {
    this.model.addObserver(callback);
  }

  offModelChange(callback) {
    this.model.removeObserver(callback);
  }

  // Utility methods
  isStable(windowSize, tolerance) {
    return this.model.isStable(windowSize, tolerance);
  }

  detectPeriod(maxPeriod) {
    return this.model.detectPeriod(maxPeriod);
  }

  // State management
  exportState() {
    return this.controller.exportState();
  }

  importState(state) {
    this.controller.importState(state);
  }

  // Debug information
  getDebugInfo() {
    return {
      model: {
        cellCount: this.model.getCellCount(),
        generation: this.model.getGeneration(),
        isRunning: this.model.getIsRunning(),
        viewport: this.model.getViewport(),
        observerCount: this.model.observers.size
      },
      view: this.view.getDebugInfo(),
      controller: {
        selectedTool: this.controller.getSelectedTool(),
        toolCount: Object.keys(this.controller.toolMap).length,
        performanceCallbackCount: this.controller.performanceCallbacks.length,
        animationRunning: !!this.controller.animationId
      }
    };
  }

  // Cleanup
  destroy() {
    this.controller.destroy();
  }
}

