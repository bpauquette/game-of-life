// GameMVC.js - Main orchestrator for MVC pattern
// Creates and coordinates Model, View, and Controller

import { GameModel } from '../model/GameModel';
import { GameView } from '../view/GameView';
import { GameController } from './GameController';

export class GameMVC {
  constructor(canvas, options = {}) {
    // Create MVC components
    this.model = new GameModel();
    this.view = new GameView(canvas, options.view, this.model);
    this.controller = new GameController(this.model, this.view, options.controller);

    // Track tool loading
    this.toolsLoaded = false;
    this.toolLoadPromises = [];

    // Setup initial state
    this.setupDefaults();
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
    // Create promises for each tool import
    const toolImports = [
      import('./tools/drawTool').then(({ drawTool }) => {
        this.controller.registerTool('draw', drawTool);
      }),
      
      import('./tools/lineTool').then(({ lineTool }) => {
        this.controller.registerTool('line', lineTool);
      }),
      
      import('./tools/rectTool').then(({ rectTool }) => {
        this.controller.registerTool('rect', rectTool);
      }),
      
      import('./tools/circleTool').then(({ circleTool }) => {
        this.controller.registerTool('circle', circleTool);
      }),
      
      import('./tools/ovalTool').then(({ ovalTool }) => {
        this.controller.registerTool('oval', ovalTool);
      }),
      
      import('./tools/randomRectTool').then(({ randomRectTool }) => {
        this.controller.registerTool('randomRect', randomRectTool);
      }),
      
      import('./tools/shapesTool').then(({ shapesTool }) => {
        this.controller.registerTool('shapes', shapesTool);
      }),
      
      import('./tools/captureTool').then(({ captureTool }) => {
        // Add callback to trigger capture dialog
        const enhancedCaptureTool = {
          ...captureTool,
          onCaptureComplete: (captureData) => {
            // Set capture data and open dialog through model
            this.model.setUIState({ 
              captureData: captureData,
              captureDialogOpen: true 
            });
          }
        };
        this.controller.registerTool('capture', enhancedCaptureTool);
      })
    ];

    // Wait for all tools to load
    Promise.all(toolImports).then(() => {
      this.toolsLoaded = true;
    }).catch(error => {
      console.error('GameMVC: ❌ Error loading tools:', error);
    });
    
    this.toolLoadPromises = toolImports;
  }

  // Tool management
  async waitForTools() {
    if (this.toolsLoaded) {
      return Promise.resolve();
    }
    return Promise.all(this.toolLoadPromises);
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
    // Update model state (single source of truth)
    this.model.setRunning(running);
    // Also update controller for animation loop
    this.controller.setRunning(running);
  }

  getIsRunning() {
    return this.model.getIsRunning();
  }

  setSelectedTool(tool) {
    // Update model state
    this.model.setSelectedTool(tool);
    // Also update controller for tool logic
    this.controller.setSelectedTool(tool);
  }

  getSelectedTool() {
    return this.model.getSelectedTool();
  }

  setSelectedShape(shape) {
    // Update model state
    this.model.setSelectedShape(shape);
    // Also update controller for tool logic
    this.controller.setSelectedShape(shape);
  }

  getSelectedShape() {
    return this.model.getSelectedShape();
  }

  setSpeed(fps) {
    this.controller.setSpeed(fps);
  }

  // View operations
  setViewport(offsetX, offsetY, cellSize, zoom) {
    return this.model.setViewport(offsetX, offsetY, cellSize, zoom);
  }

  getViewport() {
    return this.model.getViewport();
  }

  // Individual viewport operations
  setOffset(offsetX, offsetY) {
    return this.model.setOffset(offsetX, offsetY);
  }

  setCellSize(cellSize) {
    return this.model.setCellSize(cellSize);
  }

  setZoom(zoom) {
    return this.model.setZoom(zoom);
  }

  getOffset() {
    return this.model.getOffset();
  }

  getCellSize() {
    return this.model.getCellSize();
  }

  getZoom() {
    return this.model.getZoom();
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

  setCursorPosition(position) {
    this.model.setCursorPosition(position);
  }

  getCursorPosition() {
    return this.model.getCursorPosition();
  }

  getPerformanceMetrics() {
    return this.model.getPerformanceMetrics();
  }

  // Color scheme operations
  setColorScheme(colorScheme) {
    this.model.setColorScheme(colorScheme);
  }

  getColorScheme() {
    return this.model.getColorScheme();
  }

  // UI state management operations
  openDialog(dialogName) {
    this.model.openDialog(dialogName);
  }

  closeDialog(dialogName) {
    this.model.closeDialog(dialogName);
  }

  isDialogOpen(dialogName) {
    return this.model.isDialogOpen(dialogName);
  }

  setUIState(key, value) {
    this.model.setUIState(key, value);
  }

  getUIState(key) {
    return this.model.getUIState(key);
  }

  getAllUIState() {
    return this.model.getAllUIState();
  }

  setPerformanceSettings(settings) {
    this.model.setPerformanceSettings(settings);
  }

  getPerformanceSettings() {
    return this.model.getPerformanceSettings();
  }

  toggleChart() {
    this.model.toggleChart();
  }

  toggleSpeedGauge() {
    this.model.toggleSpeedGauge();
  }

  setCaptureData(data) {
    this.model.setCaptureData(data);
  }

  getCaptureData() {
    return this.model.getCaptureData();
  }

  // Performance settings delegation
  setMaxFPS(fps) {
    this.model.setMaxFPS(fps);
  }

  getMaxFPS() {
    return this.model.getMaxFPS();
  }

  setMaxGPS(gps) {
    this.model.setMaxGPS(gps);
  }

  getMaxGPS() {
    return this.model.getMaxGPS();
  }

  // Population stability settings
  setPopulationWindowSize(size) {
    this.model.setPopulationWindowSize(size);
  }

  getPopulationWindowSize() {
    return this.model.getPopulationWindowSize();
  }

  setPopulationTolerance(tolerance) {
    this.model.setPopulationTolerance(tolerance);
  }

  getPopulationTolerance() {
    return this.model.getPopulationTolerance();
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
        selectedTool: this.model.getSelectedTool(),
        selectedShape: this.model.getSelectedShape(),
        cursorPosition: this.model.getCursorPosition(),
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

