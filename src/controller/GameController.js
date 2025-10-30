const CONST_SHAPES = 'shapes';
const logger = require('./utils/logger').default || require('./utils/logger');
// GameController.js - Controller layer for Conway's Game of Life
// Handles user interactions, game loop, and coordination between Model and View

export class GameController {
  // Centralized overlay retrieval
  getCurrentOverlay() {
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    const cellSize = this.model.getViewport().cellSize;
    console.log(`[GameController] getCurrentOverlay: selectedTool=${selectedTool}, cellSize=${cellSize}`);
    if (tool?.getOverlay) {
      const overlay = tool.getOverlay(this.toolState, cellSize);
      console.log(`[GameController] getOverlay called for tool=${selectedTool}, overlay=${overlay ? 'exists' : 'null'}`);
      return overlay;
    }
    return null;
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
        case 'runningStateChanged':
          this.handleRunningStateChange(data.isRunning);
          break;
        case 'viewportChanged':
          this.requestRender();
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
  const currentTool = this.model.getSelectedTool();
  console.log(`[GameController] setSelectedTool: toolName=${toolName}, currentTool=${currentTool}`);
    if (!this.toolMap[toolName] || currentTool === toolName) return;

    if (currentTool === CONST_SHAPES && this.model.getSelectedShape()) {
      // Add EraseOverlay to overlays for one frame
      const selectedShape = this.model.getSelectedShape();
      const cells = selectedShape?.cells || selectedShape?.pattern || [];
      try {
        const { EraseOverlay } = require('../view/GameRenderer');
        this.view.resetOverlays(true);
        this.view.addOverlay(new EraseOverlay(cells, true));
        this.view.render(this.model.getLiveCells(), this.model.getViewport());
      } catch (e) {
        logger.error(e);
      }
    }
    this.clearToolState();
    this.clearShapeIfNeeded(toolName);
    this.model.setSelectedToolModel(toolName);  
  }

  eraseShapeOverlay() {
    const selectedShape = this.model.getSelectedShape();
    const cells = selectedShape?.cells || selectedShape?.pattern || [];
    if (this.view.renderer && typeof this.view.renderer.drawCellArray === 'function') {
      const ctx = this.view.renderer.ctx;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      if (cells.length > 0 && this.toolState.previewPosition) {
        this.view.renderer.drawCellArray(cells, '#000');
      }
      // Always draw text in the center to confirm erase logic
      const w = this.view.canvas.width / (window.devicePixelRatio || 1);
      const h = this.view.canvas.height / (window.devicePixelRatio || 1);
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('Erasing Shape Overlay', w / 2, h / 2);
      ctx.restore();
    }
  }

  clearToolState() {
  this.toolState = {};
  this.view.resetOverlays(true);
  }

  clearShapeIfNeeded(toolName) {
    if (toolName !== CONST_SHAPES) {
      this.model.setSelectedShapeModel(null);
    }
  }

  getSelectedTool() {
    return this.model.getSelectedTool();
  }

  // Shape management
  setSelectedShape(shape) {
    if (shape) {
      // When selecting a shape, auto-switch to shapes tool
      this.model.setSelectedToolModel(CONST_SHAPES);
      this.model.setSelectedShapeModel(shape);
      this.model.notifyObservers('selectedShapeChanged', shape);
    } else {
      this.model.setSelectedShapeModel(null);
      this.model.notifyObservers('selectedShapeChanged', null);
    }
  }

  getSelectedShape() {
    return this.model.getSelectedShape();
  }

  // Mouse event handlers
  handleMouseDown(cellCoords, event) {
    this.mouseState.isDown = true;
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    console.log(`[GameController] handleMouseDown: tool=${selectedTool}, cell=(${cellCoords.x},${cellCoords.y})`);
    if (tool?.onMouseDown) {
      tool.onMouseDown(this.toolState, cellCoords.x, cellCoords.y);
      this.updateToolOverlay();
    }
  }

  handleMouseMove(cellCoords, event) {
    this.model.setCursorPositionModel(cellCoords);
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    console.log(`[GameController] handleMouseMove: tool=${selectedTool}, cell=(${cellCoords.x},${cellCoords.y})`);
    // Call onMouseMove for drawing tools
    if (tool?.onMouseMove) {
      tool.onMouseMove(this.toolState, cellCoords.x, cellCoords.y, (x, y, alive) => {
        this.model.setCellAliveModel(x, y, alive);
      });
    }
    // Overlay update for shapes tool
    if (tool?.getOverlay) {
      this.toolState.last = { x: cellCoords.x, y: cellCoords.y };
      this.requestRender();
    }
  }

  handleMouseUp(cellCoords, event) {
  this.mouseState.isDown = false;
  const selectedTool = this.model.getSelectedTool();
  console.log(`[GameController] handleMouseUp: tool=${selectedTool}, cell=(${cellCoords?.x},${cellCoords?.y})`);
  this.handleToolMouseUp(cellCoords);
  }

  handleToolMouseUp(cellCoords = null) {
    const tool = this.toolMap[this.model.getSelectedTool()];
    if (tool?.onMouseUp) {
      if (tool.onMouseUp.length === 1) {
        tool.onMouseUp(this.toolState);
      } else if (cellCoords) {
        tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, (x, y, alive) => {
          this.model.setCellAliveModel(x, y, alive);
        });
      }
      this.updateToolOverlay();
    }
  }

  handleClick(cellCoords, event) {
    if (this.model.getSelectedTool() === 'draw') {
      this.model.setCellAliveModel(cellCoords.x, cellCoords.y, true);
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

  // Game control methods
  step() {
    this.model.step();
  }

  clear() {
  this.model.clear();
  this.clearToolState();
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
    const renderStart = performance.now();
    
    const liveCells = this.model.getLiveCells();
    const viewport = this.model.getViewport();
    this.view.render(liveCells, viewport);
    
    const renderTime = performance.now() - renderStart;
    
    // Track performance for SpeedGauge
    if (globalThis.speedGaugeTracker) {
      globalThis.speedGaugeTracker(renderTime, renderTime);
    }
    
    // Call performance callbacks
    for (const callback of this.performanceCallbacks) {
      callback(renderTime);
    }
  }

  // Tool overlay management
  updateToolOverlay() {
    // Overlay is now derived from tool state in GameView.render
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

