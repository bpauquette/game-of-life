const CONST_SHAPES = 'shapes';
// GameController.js - Controller layer for Conway's Game of Life
// Handles user interactions, game loop, and coordination between Model and View

export class GameController {
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
    if (this.toolMap[toolName] && currentTool !== toolName) {
      // Clear previous tool state
      this.toolState = {};
      this.view.clearOverlays();
      
      // Clear selected shape when switching away from shapes tool
      if (toolName !== CONST_SHAPES) {
        this.model.setSelectedShape(null);
      }
      
      // The model state is managed by GameMVC, we just handle tool logic here
    }
  }

  getSelectedTool() {
    return this.model.getSelectedTool();
  }

  // Shape management
  setSelectedShape(shape) {
    if (shape) {
      // When selecting a shape, auto-switch to shapes tool
      this.model.setSelectedTool(CONST_SHAPES);
    }
    // The model state is managed by GameMVC
  }

  getSelectedShape() {
    return this.model.getSelectedShape();
  }

  // Mouse event handlers
  handleMouseDown(cellCoords, event) {
    this.mouseState.isDown = true;
    
    const tool = this.toolMap[this.model.getSelectedTool()];
    if (tool?.onMouseDown) {
      tool.onMouseDown(this.toolState, cellCoords.x, cellCoords.y);
      this.updateToolOverlay();
    }
  }

  handleMouseMove(cellCoords, event) {
    this.model.setCursorPosition(cellCoords);
    
    // Only process tool events if mouse is down
    if (this.mouseState.isDown) {
      const tool = this.toolMap[this.model.getSelectedTool()];
      if (tool?.onMouseMove) {
        tool.onMouseMove(this.toolState, cellCoords.x, cellCoords.y, (x, y, alive) => {
          this.model.setCellAlive(x, y, alive);
        });
        this.updateToolOverlay();
      }
    } else if (this.model.getSelectedTool() === CONST_SHAPES && this.model.getSelectedShape()) {
      // Update shape preview for shapes tool
      this.toolState.previewPosition = cellCoords;
      this.updateToolOverlay();
    }
  }

  handleMouseUp(cellCoords, event) {
    this.mouseState.isDown = false;
    this.handleToolMouseUp(cellCoords);
  }

  handleToolMouseUp(cellCoords = null) {
    const tool = this.toolMap[this.model.getSelectedTool()];
    if (tool?.onMouseUp) {
      if (tool.onMouseUp.length === 1) {
        tool.onMouseUp(this.toolState);
      } else if (cellCoords) {
        tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, (x, y, alive) => {
          this.model.setCellAlive(x, y, alive);
        });
      }
      this.updateToolOverlay();
    }
  }

  handleClick(cellCoords, event) {
    if (this.model.getSelectedTool() === 'draw') {
      this.model.setCellAlive(cellCoords.x, cellCoords.y, true);
    } else if (this.model.getSelectedTool() === CONST_SHAPES && this.model.getSelectedShape()) {
      this.model.placeShape(cellCoords.x, cellCoords.y, this.model.getSelectedShape());
    }
  }

  // Wheel zoom handler
  handleWheel(deltaY, event) {
    const viewport = this.model.getViewport();
    const newCellSize = this.calculateNewCellSize(viewport.cellSize, deltaY);
    
    if (newCellSize !== viewport.cellSize) {
      this.model.setViewport(viewport.offsetX, viewport.offsetY, newCellSize);
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
        this.model.setViewport(newOffsetX, newOffsetY, viewport.cellSize);
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
  }

  setRunning(running) {
    this.model.setRunning(running);
  }

  startGame() {
    this.model.setRunning(true);
  }

  stopGame() {
    this.model.setRunning(false);
  }

  toggleRunning() {
    this.model.setRunning(!this.model.getIsRunning());
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
    this.view.clearOverlays();
    
    const tool = this.toolMap[this.model.getSelectedTool()];
    if (tool?.drawOverlay && Object.keys(this.toolState).length > 0) {
      const viewport = this.model.getViewport();
      const { ToolOverlayView } = require('../view/GameView');
      const toolOverlay = new ToolOverlayView(tool, this.toolState, viewport.cellSize);
      this.view.addOverlay(toolOverlay);
    }
    
    // Shape preview overlay
    if (this.model.getSelectedTool() === CONST_SHAPES && this.model.getSelectedShape() && this.toolState.previewPosition) {
      const selectedShape = this.model.getSelectedShape();
      const cells = selectedShape.cells || selectedShape.pattern || [];
      const { ShapePreviewView } = require('../view/GameView');
      const shapeOverlay = new ShapePreviewView(cells, this.toolState.previewPosition);
      this.view.addOverlay(shapeOverlay);
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

