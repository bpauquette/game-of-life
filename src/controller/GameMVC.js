// GameMVC.js - Main orchestrator for MVC pattern
// Creates and coordinates Model, View, and Controller

import { GameModel } from '../model/GameModel';
import { GameView } from '../view/GameView';
import { GameController } from './GameController';
import { drawTool } from './tools/drawTool';
import { eraserTool } from './tools/eraserTool';
import { lineTool } from './tools/lineTool';
import { rectTool, squareTool } from './tools/rectTool';
import { circleTool } from './tools/circleTool';
import { ovalTool } from './tools/ovalTool';
import { randomRectTool } from './tools/randomRectTool';
import { shapesTool } from './tools/shapesTool';
import { captureTool } from './tools/captureTool';
import logger from './utils/logger';

export class GameMVC {
  setSelectedTool(toolName) {
    if (this.controller && typeof this.controller.setSelectedTool === 'function') {
      this.controller.setSelectedTool(toolName);
    }
  }

  setSelectedShape(shape) {
    if (this.controller && typeof this.controller.setSelectedShape === 'function') {
      this.controller.setSelectedShape(shape);
    }
  }
  // Game step
  async step() {
    return await this.model.step();
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
  try {
    const initialSettings = this.model.getPerformanceSettings?.();
    if (initialSettings) {
      this.controller.applyPerformanceSettings?.(initialSettings);
    }
  } catch (e) {
    logger.warn?.('GameMVC: failed to apply initial performance settings', e);
  }
  // Expose controller for developer debugging (dev convenience)
  if (typeof globalThis !== 'undefined') {
    globalThis.gameController = this.controller;
  }

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
  
  try {
    this.controller.registerTool('draw', drawTool);
    this.controller.registerTool('erase', eraserTool);
    this.controller.registerTool('line', lineTool);
    this.controller.registerTool('rect', rectTool);
    this.controller.registerTool('square', squareTool);
    this.controller.registerTool('circle', circleTool);
    this.controller.registerTool('oval', ovalTool);
    this.controller.registerTool('randomRect', randomRectTool);
    this.controller.registerTool('shapes', shapesTool);

    // Enhanced capture tool with observer callback
    const enhancedCaptureTool = {
      ...captureTool,
      onCaptureComplete: (captureData) => {
        try {
          // Debug: trace capture completion flow
          try { logger.debug('[GameMVC] enhancedCaptureTool.onCaptureComplete', { cellCount: captureData?.cellCount, bounds: captureData?.originalBounds }); } catch (e) { /* ignore */ }
          this.model.notifyObservers('captureCompleted', captureData);
        } catch (e) {
          logger.error('Failed to notify captureCompleted:', e);
        }
      },
    };

    this.controller.registerTool('capture', enhancedCaptureTool);

    // Mark tools as loaded immediately
    this.toolsLoaded = true;
  } catch (error) {
    logger.error('GameMVC: ❌ Error registering default tools:', error);
  }
}


  // Public API - delegate to appropriate MVC component

  // Model operations
  setCellAlive(x, y, alive) {
  return this.model.setCellAliveModel(x, y, alive);
  }

  setCellsAliveBulk(updates) {
    return this.model.setCellsAliveBulk(updates);
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
    // Update renderer directly since model no longer manages cellSize
    const viewport = this.model.getViewport();
    return this.view.renderer.setViewport(viewport.offsetX, viewport.offsetY, cellSize);
  }

  setZoom(zoom) {
    return this.model.setZoomModel(zoom);
  }

  getOffset() {
    return this.model.getOffset();
  }

  getCellSize() {
    // Get cellSize from renderer since model no longer manages it
    return this.view.renderer.viewport.cellSize || 8;
  }

  getZoom() {
    return this.model.getZoom();
  }

  getViewport() {
    const modelViewport = this.model.getViewport();
    const cellSize = this.view.renderer.viewport.cellSize || 8;
    return { ...modelViewport, cellSize };
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
    logger.debug('[GameMVC] setColorScheme called:', colorScheme);
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
    const next = this.model.setPerformanceSettingsModel(settings);
    this.controller.applyPerformanceSettings?.(next);
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

