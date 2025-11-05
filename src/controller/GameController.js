import logger from './utils/logger';
const CONST_SHAPES = 'shapes';
// GameController.js - Controller layer for Conway's Game of Life
// Handles user interactions, game loop, and coordination between Model and View

export class GameController {
  // Emit tool state changes through the model's observer mechanism
  emitToolStateChanged() {
    const snapshot = {
      start: this.toolState?.start || null,
      last: this.toolState?.last || null,
      dragging: !!this.toolState?.dragging,
      meta: this.toolState?.meta || {}
    };
    this.model.notifyObservers('toolStateChanged', snapshot);
  }

  // Merge and publish tool state (single path). Optionally update overlay.
  _setToolState(patch, { updateOverlay = false } = {}) {
    if (!this.toolState || typeof this.toolState !== 'object') {
      this.toolState = {};
    }
    if (patch && typeof patch === 'object') {
      Object.assign(this.toolState, patch);
    }
    this.emitToolStateChanged();
    if (updateOverlay) this.updateToolOverlay();
  }
  // Centralized overlay retrieval
  getCurrentOverlay() {
    // Overlay is now managed by the model
    return this.model.getOverlay();
  }
  constructor(model, view, options = {}) {
    this.model = model;
    this.view = view;
    this.options = {
      maxFPS: 60,
      defaultSpeed: 30,
      zoomFactor: 1.12,
      keyboardPanAmount: 1,
      keyboardPanAmountShift: 10,
      ...options
    };

    // Controller state
    this.toolMap = {};
    this.toolState = {};
    this.mouseState = { isDown: false };

  // Persistent buffer for randomRectTool double buffering
  this.randomRectBuffer = null;

    // Game loop state
    this.animationId = null;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.options.defaultSpeed;

    // Performance tracking
    this.performanceCallbacks = [];

  // Render coalescing flag to avoid redundant renders on bulk updates
  this.renderScheduled = false;

    this.init();
  }

  init() {
    this.setupModelObservers();
    this.setupViewEvents();
    this.setupGlobalEvents();
  }

  // Model event handling
  setupModelObservers() {
    this.model.addObserver((event, data) => {
      switch (event) {
        case 'gameStep':
        case 'cellChanged':
        case 'gameCleared':
        case 'shapePlace':
          this.requestRender();
          break;
        case 'colorSchemeChanged':
          // Re-render immediately to apply new background/grid and cell colors
          this.requestRender();
          break;
        case 'runningStateChanged':
          this.handleRunningStateChange(data.isRunning);
          break;
        case 'viewportChanged':
          this.requestRender();
          break;
        case 'selectedToolChanged':
        case 'selectedShapeChanged':
          this.updateToolOverlay();
          break;
        default:
          // Handle unknown events silently
          break;
      }
    });
  }

  // View event handling
  setupViewEvents() {
    this.view.on('mouseDown', ({ cellCoords, event }) => {
      if (!cellCoords) return;
      this.handleMouseDown(cellCoords, event);
    });

    this.view.on('mouseMove', ({ cellCoords, event }) => {
      if (!cellCoords) return;
      this.handleMouseMove(cellCoords, event);
    });

    this.view.on('mouseUp', ({ cellCoords, event }) => {
      if (!cellCoords) return;
      this.handleMouseUp(cellCoords, event);
    });

    this.view.on('click', ({ cellCoords, event }) => {
      if (!cellCoords) return;
      this.handleClick(cellCoords, event);
    });

    this.view.on('wheel', ({ cellCoords, deltaY, event }) => {
      this.handleWheel(deltaY, event);
    });

    // Two-finger pan from touch/pointer gestures
    this.view.on('gesturePan', ({ dx, dy }) => {
      this.handleGesturePan(dx, dy);
    });

    this.view.on('keyDown', ({ key, shiftKey, event }) => {
      this.handleKeyDown(key, shiftKey, event);
    });

    this.view.on('resize', ({ width, height }) => {
      this.requestRender();
    });
  }

  // Global event handling
  setupGlobalEvents() {
    // Global mouse up to handle mouse leaving canvas
    document.addEventListener('mouseup', () => {
      if (this.mouseState.isDown) {
        this.mouseState.isDown = false;
        this.handleToolMouseUp();
      }
    });
  }

  // Tool management
  registerTool(name, toolObject) {
    if (typeof toolObject !== 'object' || !toolObject) {
      throw new Error(`Tool '${name}' must be an object`);
    }
   
    this.toolMap[name] = toolObject;
  }

   setSelectedTool(toolName) {
  if (!this.toolMap[toolName]) return;
  logger.debug(`[GameController] setSelectedTool: toolName=${toolName}`);
  this.model.setSelectedToolModel(toolName);
  // If user selects the capture (pick) tool, pause the simulation for precise selection
  if (toolName === 'capture' && this.model.getIsRunning?.() === true) {
    this.model.setRunningModel(false);
  }
  // Always update overlay after tool change
  this.updateToolOverlay();
  }
 
  getSelectedTool() {
    return this.model.getSelectedTool();
  }

  // Shape management
  setSelectedShape(shape) {
    this.model.setSelectedShapeModel(shape || null);
    // Keep controller toolState in sync for tools that read from it (e.g., shapes preview)
    this._setToolState({ selectedShapeData: shape || null }, { updateOverlay: true });
  }

  getSelectedShape() {
    return this.model.getSelectedShape();
  }

  // Mouse event handlers
  handleMouseDown(cellCoords, event) {
    // Only handle left-button interactions for drawing
    const button = event && typeof event.button === 'number' ? event.button : 0;
    this.mouseState.isDown = true;
    this.mouseState.button = button;
    if (button !== 0) {
      // Do not start tool interactions for non-left clicks
      return;
    }
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    // Ensure start/last/dragging set for two-point flows
    if (selectedTool === CONST_SHAPES) {
      const selectedShape = this.model.getSelectedShape();
      this._setToolState({
        selectedShapeData: selectedShape || null,
        start: { x: cellCoords.x, y: cellCoords.y },
        last: { x: cellCoords.x, y: cellCoords.y },
        dragging: true
      });
    } else {
      this._setToolState({
        start: { x: cellCoords.x, y: cellCoords.y },
        last: { x: cellCoords.x, y: cellCoords.y },
        dragging: true
      });
    }
    if (tool?.onMouseDown) {
      tool.onMouseDown(this.toolState, cellCoords.x, cellCoords.y);
      this._setToolState({}, { updateOverlay: true });
    } else {
      // No-op if tool lacks mousedown
    }
  }

  handleMouseMove(cellCoords, event) {
    this.model.setCursorPositionModel(cellCoords);
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    // Only process tool movement when left button is held from a prior mouseDown
    if (this.mouseState.isDown && this.mouseState.button === 0 && tool?.onMouseMove) {
      const setCellAlive = (x, y, alive) => {
        this.model.setCellAliveModel(x, y, alive);
      };
      // For most tools the 5th arg is isCellAlive; for capture we provide getLiveCells
      if (selectedTool === 'capture') {
        const getLiveCells = () => this.model.getLiveCells();
        tool.onMouseMove(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, getLiveCells);
      } else {
        const isCellAlive = (x, y) => this.model.isCellAlive(x, y);
        tool.onMouseMove(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, isCellAlive);
      }
      this.emitToolStateChanged();
    }
    // Update last position and overlay for preview-enabled tools
    this._setToolState({ last: { x: cellCoords.x, y: cellCoords.y } }, { updateOverlay: !!tool?.getOverlay });
  }

  handleMouseUp(cellCoords, event) {
    this.mouseState.isDown = false;
    this.mouseState.button = undefined;
    this.handleToolMouseUp(cellCoords);
    this.emitToolStateChanged();
  }

  handleToolMouseUp(cellCoords = null) {
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    if (tool?.onMouseUp) {
      if (tool.onMouseUp.length === 1) {
        tool.onMouseUp(this.toolState);
      } else if (cellCoords) {
        // Common callback for pixel-level cell placement
        const setCellAlive = (x, y, alive) => {
          this.model.setCellAliveModel(x, y, alive);
        };
        const setCellsAliveBulk = (updates) => {
          return this.model.setCellsAliveBulk(updates);
        };
        if (selectedTool === 'shapes') {
          // Provide placeShape callback to shapes tool
          const placeShape = (x, y) => {
            const shape = this.model.getSelectedShape();
            if (shape) {
              this.model.placeShape(x, y, shape);
            }
          };
          tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, placeShape, setCellsAliveBulk);
        } else if (selectedTool === 'capture') {
          // Provide getLiveCells and the tool itself for callback
          const getLiveCells = () => this.model.getLiveCells();
          tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, getLiveCells, tool, setCellsAliveBulk);
        } else {
          tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, setCellsAliveBulk);
        }
      }
      this.updateToolOverlay();
    }
  }

  handleClick(cellCoords, event) {
    // Only left-click toggles
    const button = event && typeof event.button === 'number' ? event.button : 0;
    if (button !== 0) return;
    if (this.model.getSelectedTool() === 'draw') {
      const currentlyAlive = this.model.isCellAlive(cellCoords.x, cellCoords.y);
      this.model.setCellAliveModel(cellCoords.x, cellCoords.y, !currentlyAlive);
    } else if (this.model.getSelectedTool() === CONST_SHAPES && this.model.getSelectedShape()) {
      this.model.placeShape(cellCoords.x, cellCoords.y, this.model.getSelectedShape());
    }
  }

  // Wheel zoom handler
  handleWheel(deltaY, event) {
    const viewport = this.model.getViewport();
    const newCellSize = this.calculateNewCellSize(viewport.cellSize, deltaY);
    
    if (newCellSize !== viewport.cellSize) {
      this.model.setViewportModel(viewport.offsetX, viewport.offsetY, newCellSize);
    }
    
    if (event.cancelable) {
      event.preventDefault();
    }
  }

  calculateNewCellSize(currentSize, zoomDirection) {
    const dpr = window.devicePixelRatio || 1;
    const minCellSize = 1 / dpr;
    const maxCellSize = 200;
    const factor = zoomDirection < 0 ? this.options.zoomFactor : 1 / this.options.zoomFactor;

    const prevDevice = currentSize * dpr;
    let newDevice = prevDevice * factor;
    const maxDevice = maxCellSize * dpr;
    
    newDevice = Math.max(1, Math.min(maxDevice, newDevice));
    let snappedDevice;
    
    if (newDevice > prevDevice) {
      snappedDevice = Math.ceil(newDevice);
    } else {
      snappedDevice = Math.floor(newDevice);
    }
    
    snappedDevice = Math.max(1, Math.min(Math.round(maxDevice), snappedDevice));
    const snappedSize = Math.max(minCellSize, snappedDevice / dpr);
    
    return snappedSize === currentSize ? currentSize : snappedSize;
  }

  // Handle two-finger panning by mapping screen dx/dy to cell offset deltas
  handleGesturePan(dx, dy) {
    const viewport = this.model.getViewport();
    const cellSize = viewport.cellSize || 1;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(cellSize) || cellSize <= 0) return;
    const deltaCellsX = dx / cellSize;
    const deltaCellsY = dy / cellSize;
    const newOffsetX = viewport.offsetX - deltaCellsX;
    const newOffsetY = viewport.offsetY - deltaCellsY;
    this.model.setViewportModel(newOffsetX, newOffsetY, viewport.cellSize);
  }

  // Keyboard handlers
  handleKeyDown(key, shiftKey, event) {
    const viewport = this.model.getViewport();
    const amount = shiftKey ? this.options.keyboardPanAmountShift : this.options.keyboardPanAmount;
    
    let newOffsetX = viewport.offsetX;
    let newOffsetY = viewport.offsetY;
    let handled = false;

    switch (key) {
      case 'ArrowLeft':
        newOffsetX -= amount;
        handled = true;
        break;
      case 'ArrowRight':
        newOffsetX += amount;
        handled = true;
        break;
      case 'ArrowUp':
        newOffsetY -= amount;
        handled = true;
        break;
      case 'ArrowDown':
        newOffsetY += amount;
        handled = true;
        break;
      case ' ': // Spacebar - toggle play/pause
        this.toggleRunning();
        handled = true;
        break;
      case 'c': // Clear
        if (event.ctrlKey) {
          this.model.clear();
          handled = true;
        }
        break;
      case 'f': // Focus viewport on live cells
        this.centerOnLiveCells();
        handled = true;
        break;
      default:
        // Handle other keys
        break;
    }

    if (handled) {
      if (newOffsetX !== viewport.offsetX || newOffsetY !== viewport.offsetY) {
        this.model.setViewportModel(newOffsetX, newOffsetY, viewport.cellSize);
      }
      event.preventDefault();
    }
  }

  // Center viewport on current live cells
  centerOnLiveCells() {
    const bounds = this.model.getBounds();
    const viewport = this.model.getViewport();
    const centerX = Math.floor((bounds.minX + bounds.maxX) / 2);
    const centerY = Math.floor((bounds.minY + bounds.maxY) / 2);
    this.model.setViewportModel(centerX, centerY, viewport.cellSize, viewport.zoom);
    this.requestRender();
  }

  // Game control methods
  step() {
    this.model.step();
  }

  clear() {
  this.model.clear();
  this.clearToolState();
  }

  // Reset transient tool state and clear overlay
  clearToolState() {
    this.toolState = {};
    this.emitToolStateChanged();
    this.model.setOverlay(null);
    this.requestRender();
  }

  setRunning(running) {
    this.model.setRunningModel(running);
  }

  startGame() {
    this.model.setRunningModel(true);
  }

  stopGame() {
    this.model.setRunningModel(false);
  }

  toggleRunning() {
    this.model.setRunningModel(!this.model.getIsRunning());
  }

  isRunning() {
    return this.model.getIsRunning();
  }

  handleRunningStateChange(isRunning) {
    if (isRunning) {
      this.startGameLoop();
    } else {
      this.stopGameLoop();
    }
  }

  // Game loop
  startGameLoop() {
    if (this.animationId) return; // Already running
    
    const loop = (timestamp) => {
      if (!this.model.getIsRunning()) {
        this.animationId = null;
        return;
      }

      // Throttle to desired speed
      if (timestamp - this.lastFrameTime >= this.frameInterval) {
        const frameStart = performance.now();
        
        this.model.step();
        this.requestRender();
        
        const frameTime = performance.now() - frameStart;
        this.notifyPerformance(frameTime);
        
        this.lastFrameTime = timestamp;
      }

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  stopGameLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setSpeed(fps) {
    this.frameInterval = 1000 / Math.max(1, Math.min(fps, this.options.maxFPS));
  }

  // Rendering
  requestRender() {
    // Coalesce multiple requestRender calls into a single animation frame
    if (this.renderScheduled) return;
    this.renderScheduled = true;

    const doRender = () => {
      this.renderScheduled = false;
      const renderStart = performance.now();

      const liveCells = this.model.getLiveCells();
      const viewport = this.model.getViewport();
      this.view.render(liveCells, viewport);

      const renderTime = performance.now() - renderStart;

      if (globalThis.speedGaugeTracker) {
        globalThis.speedGaugeTracker(renderTime, renderTime);
      }
      for (const callback of this.performanceCallbacks) {
        callback(renderTime);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(doRender);
    } else {
      // Fallback for non-browser environments
      setTimeout(doRender, 0);
    }
  }


  // Tool overlay management
  updateToolOverlay() {
    // Overlay is managed by the model; tools provide descriptors
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    const cellSize = this.model.getViewport().cellSize;
    if (tool?.getOverlay) {
      const overlay = tool.getOverlay(this.toolState, cellSize);
      this.model.setOverlay(overlay);
    } else {
      this.model.setOverlay(null);
    }
    this.requestRender();
  }

  // Performance monitoring
  addPerformanceCallback(callback) {
    this.performanceCallbacks.push(callback);
  }

  removePerformanceCallback(callback) {
    const index = this.performanceCallbacks.indexOf(callback);
    if (index > -1) {
      this.performanceCallbacks.splice(index, 1);
    }
  }

  notifyPerformance(frameTime) {
    for (const callback of this.performanceCallbacks) {
      callback(frameTime);
    }
  }

  // State management
  getCursorPosition() {
    return this.model.getCursorPosition();
  }

  getGameStats() {
    return {
      generation: this.model.getGeneration(),
      population: this.model.getCellCount(),
      isRunning: this.model.getIsRunning(),
      viewport: this.model.getViewport(),
      selectedTool: this.model.getSelectedTool(),
      hasSelectedShape: !!this.model.getSelectedShape()
    };
  }

  // Import/Export
  exportState() {
    return {
      model: this.model.exportState(),
      selectedTool: this.model.getSelectedTool(),
      selectedShape: this.selectedShape
    };
  }

  importState(state) {
    if (state.model) {
      this.model.importState(state.model);
    }
    if (state.selectedTool) {
      this.setSelectedTool(state.selectedTool);
    }
    if (state.selectedShape) {
      this.setSelectedShape(state.selectedShape);
    }
    this.requestRender();
  }

  // Cleanup
  destroy() {
    this.stopGameLoop();
    this.view.destroy();
    this.model.observers.clear();
    this.performanceCallbacks = [];
  }
}

