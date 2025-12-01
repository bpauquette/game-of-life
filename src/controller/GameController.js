import { eraserTool } from './tools/eraserTool';
import logger from './utils/logger';
const CONST_SHAPES = 'shapes';
// GameController.js - Controller layer for Conway's Game of Life
// Handles user interactions, game loop, and coordination between Model and View

export class GameController {
  constructor(model, view, options = {}) {
    this.undoStack = [];
    this.redoStack = [];
    this.model = model;
    this.view = view;
    this.options = {
      maxFPS: 60,
      defaultSpeed: 30,
      maxGPS: 30,
      zoomFactor: 1.12,
      keyboardPanAmount: 1,
      keyboardPanAmountShift: 10,
      ...options
    };

    // Controller state
    this.toolMap = {};
    this.toolState = {};
    this.mouseState = { isDown: false };

    // Undo/redo stacks
    this.undoStack = [];
    this.redoStack = [];

    // Persistent buffer for randomRectTool double buffering
    this.randomRectBuffer = null;

  // Timestamp of the last placement operation to avoid duplicate placements
  // caused by both mouseup and click handlers firing for the same action.
  this._lastPlacementAt = 0;

    // Game loop state
    this.animationId = null;
    this.lastFrameTime = 0;
    this.performanceCaps = {
      maxFPS: Math.max(1, Number(this.options.maxFPS) || 60),
      maxGPS: Math.max(1, Number(this.options.maxGPS || this.options.defaultSpeed) || 30),
      enableFPSCap: false,
      enableGPSCap: false
    };
    this.frameInterval = 0; // 0 means "no cap"; run every RAF

    // Performance tracking
    this.performanceCallbacks = [];

    // Render coalescing flag to avoid redundant renders on bulk updates
    this.renderScheduled = false;

    this.init();
    // Register eraser tool
    this.registerTool('eraser', eraserTool);
  }

  // Helper to record a diff for undo
  recordDiff(cells) {
    // cells: Array of {x, y, prevAlive, newAlive}
    if (!Array.isArray(cells) || cells.length === 0) return;
    this.undoStack.push(cells);
    this.redoStack = [];
  }

  // Undo: revert last diff
  undo() {
    if (this.undoStack.length === 0) return;
    const diff = this.undoStack.pop();
    const inverse = [];
    for (const { x, y, prevAlive, newAlive } of diff) {
      this.model.setCellAliveModel(x, y, prevAlive);
      inverse.push({ x, y, prevAlive, newAlive });
    }
    this.redoStack.push(inverse);
    this.requestRender();
  }

  // Redo: re-apply last undone diff
  redo() {
    if (this.redoStack.length === 0) return;
    const diff = this.redoStack.pop();
    const inverse = [];
    for (const { x, y, prevAlive, newAlive } of diff) {
      this.model.setCellAliveModel(x, y, newAlive);
      inverse.push({ x, y, prevAlive, newAlive });
    }
    this.undoStack.push(inverse);
    this.requestRender();
  }
  _getDrawWhileRunning() {
    try {
      const v = globalThis.localStorage.getItem('drawWhileRunning');
      if (v != null) return JSON.parse(v);
      // Default to true when not set
      return true;
    } catch {
      return true;
    }
  }
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
    this.view.on('pinchZoom', ({ scaleDelta, center }) => {
      this.handlePinchZoom(scaleDelta, center);
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

    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
      const isMac = (() => {
        try {
          const p = navigator.userAgentData && navigator.userAgentData.platform;
          if (typeof p === 'string') return p.toUpperCase().includes('MAC');
          const ua = navigator.userAgent;
          if (typeof ua === 'string') return ua.toUpperCase().includes('MAC');
        } catch (err) {
          // fallback to false on any unexpected value
        }
        return false;
      })();
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      // Undo: Ctrl+Z or Cmd+Z
      if (ctrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if (
        ctrlOrCmd &&
        ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        this.redo();
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
    // Temporary instrumentation: record tool selection into the on-page
    // debug buffer so it's visible when diagnosing rendering regressions.
    try {
      const before = this.model && typeof this.model.getSelectedTool === 'function' ? this.model.getSelectedTool() : null;
      const info = { event: 'controller.setSelectedTool.before', toolName, before, ts: Date.now() };
      try { globalThis.__GOL_PUSH_CANVAS_LOG__ && globalThis.__GOL_PUSH_CANVAS_LOG__(JSON.stringify(info)); } catch (e) {}
    } catch (e) {}
    logger.debug(`[GameController] setSelectedTool: toolName=${toolName}`);
    this.model.setSelectedToolModel(toolName);
    // If user selects the capture (pick) tool, pause the simulation for precise selection
    if (toolName === 'capture' && this.model.getIsRunning?.() === true) {
      this.model.setRunningModel(false);
    }
    // Always update overlay after tool change
    this.updateToolOverlay();

    try {
      const after = this.model && typeof this.model.getSelectedTool === 'function' ? this.model.getSelectedTool() : null;
      const info2 = { event: 'controller.setSelectedTool.after', toolName, after, ts: Date.now() };
      try { globalThis.__GOL_PUSH_CANVAS_LOG__ && globalThis.__GOL_PUSH_CANVAS_LOG__(JSON.stringify(info2)); } catch (e) {}
    } catch (e) {}
  }

  getSelectedTool() {
    return this.model.getSelectedTool();
  }

  // Shape management
  setSelectedShape(shape) {
    this.model.setSelectedShapeModel(shape || null);
    // Keep controller toolState in sync for tools that read from it (e.g., shapes preview)
    const cursor = this.model.getCursorPosition?.();
    const lastPos = (cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number')
      ? { x: cursor.x, y: cursor.y }
      : (this.toolState?.last || { x: 0, y: 0 });
    this._setToolState({ selectedShapeData: shape || null, last: lastPos }, { updateOverlay: true });
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
    // Start a new diff buffer for undo tracking
    this._currentDiff = [];
    if (button !== 0) {
      // Do not start tool interactions for non-left clicks
      return;
    }
    const selectedTool = this.model.getSelectedTool();
    const tool = this.toolMap[selectedTool];
    // Centralized draw-while-running logic
    const drawWhileRunning = this._getDrawWhileRunning();
    if (
      this.model.getIsRunning?.() &&
      !drawWhileRunning &&
      ['draw', 'eraser', 'rect', 'line', 'circle', 'oval'].includes(selectedTool)
    ) {
      // Block drawing tools while running if option is off
      return;
    }
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
    // Wrap setCellAlive to collect diffs
    this._setCellAliveForUndo = (x, y, alive) => {
      const prevAlive = this.model.isCellAlive(x, y);
      if (prevAlive !== alive) {
        this._currentDiff.push({ x, y, prevAlive, newAlive: alive });
      }
      this.model.setCellAliveModel(x, y, alive);
    };
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
    // Centralized draw-while-running logic
    const drawWhileRunning = this._getDrawWhileRunning();
    if (
      this.model.getIsRunning?.() &&
      !drawWhileRunning &&
      ['draw', 'eraser', 'rect', 'line', 'circle', 'oval'].includes(selectedTool)
    ) {
      // Block drawing tools while running if option is off
      return;
    }
    // Only process tool movement when left button is held from a prior mouseDown
    if (this.mouseState.isDown && this.mouseState.button === 0 && tool?.onMouseMove) {
      // Use wrapped setCellAlive for undo tracking
      const setCellAlive = this._setCellAliveForUndo || ((x, y, alive) => this.model.setCellAliveModel(x, y, alive));
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
    if (!tool?.onMouseUp) return;

    if (tool.onMouseUp.length === 1) {
      tool.onMouseUp(this.toolState);
      this._finalizeToolMouseUp();
      return;
    }

    if (!cellCoords) {
      this._finalizeToolMouseUp();
      return;
    }

    const setCellAlive = this._setCellAliveForUndo || ((x, y, alive) => this.model.setCellAliveModel(x, y, alive));
    const setCellsAliveBulk = this._createSetCellsAliveBulk(setCellAlive);

    switch (selectedTool) {
      case 'shapes':
        this._handleShapesToolMouseUp(tool, cellCoords, setCellAlive, setCellsAliveBulk);
        break;
      case 'capture':
        this._handleCaptureToolMouseUp(tool, cellCoords, setCellAlive, setCellsAliveBulk);
        break;
      default:
        tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, setCellsAliveBulk);
        break;
    }

    this._finalizeToolMouseUp();
  }

  _createSetCellsAliveBulk(setCellAlive) {
    return (updates) => {
      if (!Array.isArray(updates)) return;
      for (const raw of updates) {
        const upd = Array.isArray(raw)
          ? { x: raw[0], y: raw[1], alive: raw.length > 2 ? !!raw[2] : true }
          : raw;
        if (!upd || typeof upd.x !== 'number' || typeof upd.y !== 'number') continue;
        setCellAlive(upd.x, upd.y, upd.alive);
      }
    };
  }

  _handleShapesToolMouseUp(tool, cellCoords, setCellAlive, setCellsAliveBulk) {
    const placeShape = (x, y) => {
      const shape = this.model.getSelectedShape();
      if (shape) {
        // Collect diff for undo
        const cells = shape.cells || shape.pattern || [];
        const diff = [];
        for (const cell of cells) {
          const hasX = cell && Object.hasOwn(cell, 'x');
          const hasY = cell && Object.hasOwn(cell, 'y');
          let offsetX = hasX ? cell.x : Array.isArray(cell) ? cell[0] ?? 0 : 0;
          let offsetY = hasY ? cell.y : Array.isArray(cell) ? cell[1] ?? 0 : 0;
          const cellX = x + offsetX;
          const cellY = y + offsetY;
          const prevAlive = this.model.isCellAlive(cellX, cellY);
          if (!prevAlive) {
            diff.push({ x: cellX, y: cellY, prevAlive, newAlive: true });
          }
        }
        this.model.placeShape(x, y, shape);
        if (!this._currentDiff) this._currentDiff = [];
        this._currentDiff.push(...diff);
        // record when a placement happened so a subsequent click event
        // that fires immediately after mouseup doesn't duplicate it
        this._lastPlacementAt = Date.now();
      }
    };
    tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, placeShape, setCellsAliveBulk);
  }

  _handleCaptureToolMouseUp(tool, cellCoords, setCellAlive, setCellsAliveBulk) {
    const getLiveCells = () => this.model.getLiveCells();
    tool.onMouseUp(this.toolState, cellCoords.x, cellCoords.y, setCellAlive, getLiveCells, tool, setCellsAliveBulk);
  }

  _finalizeToolMouseUp() {
    if (Array.isArray(this._currentDiff) && this._currentDiff.length > 0) {
      this.recordDiff(this._currentDiff);
    }
    this._currentDiff = null;
    this._setCellAliveForUndo = null;
    this.updateToolOverlay();
  }

  handleClick(cellCoords, event) {
    // Only left-click toggles
    const button = event && typeof event.button === 'number' ? event.button : 0;
    if (button !== 0) return;
    if (this.model.getSelectedTool() === 'draw') {
      const currentlyAlive = this.model.isCellAlive(cellCoords.x, cellCoords.y);
      this.model.setCellAliveModel(cellCoords.x, cellCoords.y, !currentlyAlive);
    } else if (this.model.getSelectedTool() === CONST_SHAPES && this.model.getSelectedShape()) {
      // Guard against duplicate placements: if we just placed via mouseup,
      // the click event may fire immediately after. Ignore clicks within
      // a short window after a placement.
      const now = Date.now();
      if (this._lastPlacementAt && (now - this._lastPlacementAt) < 350) {
        // ignore duplicate click
        return;
      }
      this.model.placeShape(cellCoords.x, cellCoords.y, this.model.getSelectedShape());
    }
  }

  // Wheel zoom handler
  handleWheel(deltaY, event) {
    const viewport = this.model.getViewport();
    const currentCellSize = this.view.renderer.viewport.cellSize || 8; // Get cellSize from renderer
    const newCellSize = this.calculateNewCellSize(currentCellSize, deltaY);

    if (newCellSize !== currentCellSize) {
      // Update renderer directly since model no longer manages cellSize
      this.view.renderer.setViewport(viewport.offsetX, viewport.offsetY, newCellSize);
      // Update model offset if needed
      this.model.setOffsetModel(viewport.offsetX, viewport.offsetY);
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
    // Triple the pan increment
    const deltaCellsX = (dx * 3) / cellSize;
    const deltaCellsY = (dy * 3) / cellSize;
    const newOffsetX = viewport.offsetX - deltaCellsX;
    const newOffsetY = viewport.offsetY - deltaCellsY;
    this.model.setViewportModel(newOffsetX, newOffsetY, viewport.cellSize);
  }

  handlePinchZoom(scaleDelta, center) {
    if (!Number.isFinite(scaleDelta) || scaleDelta <= 0) return;
    const viewport = this.model.getViewport();
    const currentSize = this.view.renderer.viewport.cellSize || 8; // Get cellSize from renderer
    const effectiveScale = Math.min(Math.max(scaleDelta, 0.5), 2);
    let nextSize = currentSize * effectiveScale;
    const dpr = window.devicePixelRatio || 1;
    const minCellSize = 1 / dpr;
    const maxCellSize = 200;
    nextSize = Math.min(Math.max(nextSize, minCellSize), maxCellSize);
    if (!Number.isFinite(nextSize) || nextSize === currentSize) return;

    const screenX = Number.isFinite(center?.screenX) ? center.screenX : center?.canvasCenterX || 0;
    const screenY = Number.isFinite(center?.screenY) ? center.screenY : center?.canvasCenterY || 0;
    const canvasCenterX = Number.isFinite(center?.canvasCenterX) ? center.canvasCenterX : screenX;
    const canvasCenterY = Number.isFinite(center?.canvasCenterY) ? center.canvasCenterY : screenY;
    const targetCellX = Number.isFinite(center?.cellX) ? center.cellX : viewport.offsetX;
    const targetCellY = Number.isFinite(center?.cellY) ? center.cellY : viewport.offsetY;

    const newOffsetX = targetCellX - (screenX - canvasCenterX) / nextSize;
    const newOffsetY = targetCellY - (screenY - canvasCenterY) / nextSize;
    // Update renderer directly and model offset
    this.view.renderer.setViewport(newOffsetX, newOffsetY, nextSize);
    this.model.setOffsetModel(newOffsetX, newOffsetY);
  }

  // Keyboard handlers
  handleKeyDown(key, shiftKey, event) {
    const viewport = this.model.getViewport();
    const amount = (shiftKey ? this.options.keyboardPanAmountShift : this.options.keyboardPanAmount) * 3;

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

      const delta = timestamp - this.lastFrameTime;
      const shouldStep = this.frameInterval <= 0 || delta >= this.frameInterval;

      if (shouldStep) {
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
    const requested = Math.max(1, Number(fps) || 1);
    const loopRate = Math.max(1, Math.min(requested, this.performanceCaps.maxFPS, this.performanceCaps.maxGPS));
    if (!this.performanceCaps.enableFPSCap && !this.performanceCaps.enableGPSCap) {
      this.frameInterval = 0;
      return;
    }
    this.frameInterval = 1000 / loopRate;
  }

  applyPerformanceSettings(settings = {}) {
    if (!settings || typeof settings !== 'object') return;

    let capsChanged = false;

    if (Object.prototype.hasOwnProperty.call(settings, 'maxFPS')) {
      const nextFps = Math.max(1, Math.min(Number(settings.maxFPS) || this.performanceCaps.maxFPS, 120));
      if (nextFps !== this.performanceCaps.maxFPS) {
        this.performanceCaps.maxFPS = nextFps;
        capsChanged = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'maxGPS')) {
      const nextGps = Math.max(1, Math.min(Number(settings.maxGPS) || this.performanceCaps.maxGPS, 60));
      if (nextGps !== this.performanceCaps.maxGPS) {
        this.performanceCaps.maxGPS = nextGps;
        capsChanged = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'enableFPSCap')) {
      const next = !!settings.enableFPSCap;
      if (next !== this.performanceCaps.enableFPSCap) {
        this.performanceCaps.enableFPSCap = next;
        capsChanged = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'enableGPSCap')) {
      const next = !!settings.enableGPSCap;
      if (next !== this.performanceCaps.enableGPSCap) {
        this.performanceCaps.enableGPSCap = next;
        capsChanged = true;
      }
    }

    if (capsChanged) {
      if (!this.performanceCaps.enableFPSCap && !this.performanceCaps.enableGPSCap) {
        this.frameInterval = 0;
      } else {
        this.frameInterval = 1000 / this._getLoopRate();
      }
    }
  }

  _getLoopRate() {
    const fps = Math.max(1, this.performanceCaps.maxFPS || 60);
    const gps = Math.max(1, this.performanceCaps.maxGPS || this.options.defaultSpeed || 30);
    const useFps = this.performanceCaps.enableFPSCap ? fps : Infinity;
    const useGps = this.performanceCaps.enableGPSCap ? gps : Infinity;
    const rate = Math.min(useFps, useGps);
    return Number.isFinite(rate) && rate > 0 ? rate : 60;
  }

  // Rendering
  requestRender() {
    // Coalesce multiple requestRender calls into a single animation frame
    // Instrument the moment a new render is scheduled (only when scheduling,
    // not on subsequent coalesced calls) so we can trace interactive tool
    // selections that should cause a render.
    if (this.renderScheduled) return;
    try {
      const info = { event: 'controller.requestRender.scheduled', ts: Date.now(), selectedTool: this.model?.getSelectedTool?.() };
      try { globalThis.__GOL_PUSH_CANVAS_LOG__ && globalThis.__GOL_PUSH_CANVAS_LOG__(JSON.stringify(info)); } catch (e) {}
    } catch (e) {}
    this.renderScheduled = true;

    const doRender = () => {
      this.renderScheduled = false;
      const renderStart = performance.now();

      const liveCells = this.model.getLiveCells();
      const modelViewport = this.model.getViewport();
      const cellSize = this.view.renderer.viewport.cellSize || 8;
      const viewport = { ...modelViewport, cellSize };
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
    const cellSize = this.view.renderer.viewport.cellSize;
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

