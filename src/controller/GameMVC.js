// GameMVC.js - Main orchestrator for MVC pattern
// Creates and coordinates Model, View, and Controller

import { GameModel } from '../model/GameModel';
import { GameView } from '../view/GameView';
import { GameController } from './GameController';

export class GameMVC {
  setSelectedTool(toolName) {
    if (this.controller && typeof this.controller.setSelectedTool === 'function') {
      this.controller.setSelectedTool(toolName);
    }
  }
  // Game step
  step() {
    return this.model.step();
  }

  // Population history
  getPopulationHistory() {
    return this.model.getPopulationHistory();
  }
  constructor(canvas, options = {}) {
    // Create MVC components
  this.model = new GameModel();
  this.view = new GameView(canvas, options.view, this.model);
  this.controller = new GameController(this.model, this.view, options.controller);
  // Ensure overlays work: model.controller must be set
  this.model.controller = this.controller;

    // Track tool loading
    this.toolsLoaded = false;
    this.toolLoadPromises = [];

    // Setup initial state
    this.setupDefaults();
  }

  // Running state
  setRunning(isRunning) {
    this.model.setRunningModel(isRunning);
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
            this.model.setUIStateModel({ 
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
  const logger = require('./utils/logger').default || require('./utils/logger');
  logger.error('GameMVC: ❌ Error loading tools:', error);
    });
    
    this.toolLoadPromises = toolImports;
  }

  // Tool management
  async waitForTools() {
    if (this.toolsLoaded) {
      return;
    }
    return Promise.all(this.toolLoadPromises);
  }

  // Public API - delegate to appropriate MVC component

  // Model operations
  setCellAlive(x, y, alive) {
  return this.model.setCellAliveModel(x, y, alive);
  }

  getLiveCells() {
    return this.model.getLiveCells();
  }

  clear() {
    this.controller.clear();
  }

  setOffset(offsetX, offsetY) {
    return this.model.setOffsetModel(offsetX, offsetY);
  }

  setCellSize(cellSize) {
    return this.model.setCellSizeModel(cellSize);
  }

  setZoom(zoom) {
    return this.model.setZoomModel(zoom);
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

  getBounds() {
    return this.model.getBounds();
  }

  getGameStats() {
    return this.controller.getGameStats();
  }

  setCursorPosition(position) {
    this.model.setCursorPositionModel(position);
  }

  getCursorPosition() {
    return this.model.getCursorPosition();
  }

  getPerformanceMetrics() {
    return this.model.getPerformanceMetrics();
  }

  // Color scheme operations
  setColorScheme(colorScheme) {
    this.model.setColorSchemeModel(colorScheme);
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
    this.model.setUIStateModel(key, value);
  }

  getUIState(key) {
    return this.model.getUIState(key);
  }

  getAllUIState() {
    return this.model.getAllUIState();
  }

  setPerformanceSettings(settings) {
    this.model.setPerformanceSettingsModel(settings);
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
    this.model.setCaptureDataModel(data);
  }

  getCaptureData() {
    return this.model.getCaptureData();
  }

  // Performance settings delegation
  setMaxFPS(fps) {
    this.model.setMaxFPSModel(fps);
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
    this.model.setPopulationWindowSizeModel(size);
  }

  getPopulationWindowSize() {
    return this.model.getPopulationWindowSize();
  }

  setPopulationTolerance(tolerance) {
    this.model.setPopulationToleranceModel(tolerance);
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

  // Tool selection
  getSelectedTool() {
    return this.model.getSelectedTool();
  }

  getSelectedShape() {
    return this.model.getSelectedShape();
  }
}

