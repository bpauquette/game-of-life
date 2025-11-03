// GameView.js - View layer for Conway's Game of Life
// Handles all rendering and presentation logic

import { GameRenderer } from './GameRenderer';

export class GameView {
  constructor(canvas, options = {}, model = null) {
    this.canvas = canvas;
    this.renderer = new GameRenderer(canvas, options);
    this.model = model; // Reference to model for performance tracking

    // View state
    this.isVisible = true;

    // Event callbacks
    this.callbacks = {};
  }

  // Event handling setup
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      for (const callback of this.callbacks[event]) {
       
          callback(data);
       
      }
    }
  }

  // Coordinate conversion (View responsibility)
  screenToCell(screenX, screenY) {
    return this.renderer.screenToCell(screenX, screenY);
  }

  cellToScreen(cellX, cellY) {
    return this.renderer.cellToScreen(cellX, cellY);
  }

  // Rendering methods
  render(liveCells, viewport) {
    if (!this.isVisible) return;
    
    // Track render timestamp for performance metrics
    if (this.model?.trackRender) {
      this.model.trackRender();
    }
    
    // Update viewport
    this.renderer.setViewport(viewport.offsetX, viewport.offsetY, viewport.cellSize);
    
    // Get colorScheme and overlay from model
    const colorScheme = this.model?.getColorScheme();
    const overlay = this.model?.getOverlay ? this.model.getOverlay() : null;

    // Pass overlay descriptor directly to renderer
    this.renderer.render(liveCells, colorScheme, overlay);
  }

  clear() {
    this.renderer.clear();
  }

  // Overlay management
  // Overlay management handled by the model/renderer; no per-view overlay state

  // Canvas management
  resize(width, height) {
    this.renderer.resize(width, height);
  }

  setVisible(visible) {
    this.isVisible = visible;
    if (!visible) {
      this.clear();
    }
  }

  // Mouse event handling setup
  setupMouseEvents() {
    // If the canvas doesn't expose DOM event APIs (common in jsdom/test
    // environments or when a lightweight/mock canvas is provided), skip
    // wiring DOM event listeners to avoid throwing errors. Tests can still
    // interact with the view by calling emit() directly.
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') {
      return;
    }

    const getMouseCoords = (e) => {
      // Guard against missing getBoundingClientRect in mocks
      const rect = (typeof this.canvas.getBoundingClientRect === 'function')
        ? this.canvas.getBoundingClientRect()
        : { left: 0, top: 0 };

      const screenX = (e && typeof e.clientX === 'number') ? (e.clientX - rect.left) : 0;
      const screenY = (e && typeof e.clientY === 'number') ? (e.clientY - rect.top) : 0;
      const cellCoords = this.screenToCell(screenX, screenY);
      return { screenX, screenY, cellCoords };
    };

    // Mouse down
    this.canvas.addEventListener('mousedown', (e) => {
      const coords = getMouseCoords(e);
      this.emit('mouseDown', { event: e, ...coords });
    });

    // Mouse move
    this.canvas.addEventListener('mousemove', (e) => {
      const coords = getMouseCoords(e);
      this.emit('mouseMove', { event: e, ...coords });
    });

    // Mouse up
    this.canvas.addEventListener('mouseup', (e) => {
      const coords = getMouseCoords(e);
      this.emit('mouseUp', { event: e, ...coords });
    });

    // Mouse click
    this.canvas.addEventListener('click', (e) => {
      const coords = getMouseCoords(e);
      this.emit('click', { event: e, ...coords });
    });

    // Mouse wheel (zoom)
    this.canvas.addEventListener('wheel', (e) => {
      const coords = getMouseCoords(e);
      this.emit('wheel', { event: e, deltaY: e.deltaY, ...coords });
    }, { passive: false });

    // Context menu
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const coords = getMouseCoords(e);
      this.emit('contextMenu', { event: e, ...coords });
    });
  }

  // Keyboard event setup (global)
  setupKeyboardEvents() {
    const isTypingTarget = (el) => {
      if (!el || typeof el.tagName !== 'string') return false;
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const nonTextTypes = new Set(['checkbox','radio','button','submit','reset','file','color','range']);
      if (el.isContentEditable) return true;
      if (tag === 'textarea') return true;
      if (tag === 'input') return !nonTextTypes.has(type);
      return false;
    };

    document.addEventListener('keydown', (e) => {
      // Do not capture/override keys while user is typing in inputs/textareas/contentEditable
      if (isTypingTarget(e.target)) return;
      this.emit('keyDown', { event: e, key: e.key, shiftKey: e.shiftKey });
    });

    document.addEventListener('keyup', (e) => {
      if (isTypingTarget(e.target)) return;
      this.emit('keyUp', { event: e, key: e.key });
    });
  }

  // Window event setup
  setupWindowEvents() {
    window.addEventListener('resize', () => {
      const container = this.canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        this.resize(rect.width, rect.height);
        this.emit('resize', { width: rect.width, height: rect.height });
      }
    });
  }

  // Utility methods
  getCanvasSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  getRenderer() {
    return this.renderer;
  }

  // Debug information
  getDebugInfo() {
    return {
      ...this.renderer.getDebugInfo(),
      overlayPresent: !!(this.model && typeof this.model.getOverlay === 'function' && this.model.getOverlay()),
      isVisible: this.isVisible,
      callbackCount: Object.keys(this.callbacks).reduce((total, key) => {
        return total + (this.callbacks[key] ? this.callbacks[key].length : 0);
      }, 0)
    };
  }

  // Cleanup
  destroy() {
    // Remove event listeners
    this.callbacks = {};
    
    // Clear renderer caches
    this.renderer.clearCaches();
  }
}
