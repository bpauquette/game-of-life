// GameView.js - View layer for Conway's Game of Life
// Handles all rendering and presentation logic

import { GameRenderer } from './GameRenderer.js';

export class GameView {
  constructor(canvas, options = {}, model = null) {
    this.canvas = canvas;
    this.renderer = new GameRenderer(canvas, options);
    this.model = model; // Reference to model for performance tracking
    
    // Initialize renderer with default cellSize
    this.renderer.setViewport(0, 0, 8);

    // View state
    this.isVisible = true;

    // Event callbacks
    this.callbacks = {};

    // Improve input responsiveness by disabling default touch actions on the
    // canvas (prevents browser panning/zooming) so we can safely mark input
    // listeners as passive where appropriate. This reduces main-thread
    // jank when handling wheel/touch events.
    try {
      if (this.canvas && this.canvas.style) this.canvas.style.touchAction = 'none';
    } catch (e) {
      // ignore (tests or non-DOM canvases)
    }
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
      const exactCell = this.renderer?.screenToCellExact
        ? this.renderer.screenToCellExact(screenX, screenY)
        : this.screenToCell(screenX, screenY);
      const cellCoords = exactCell
        ? {
            x: Math.floor(exactCell.x),
            y: Math.floor(exactCell.y),
            fx: exactCell.x,
            fy: exactCell.y
          }
        : this.screenToCell(screenX, screenY);
      return { screenX, screenY, cellCoords };
    };

    const getCanvasRect = () => (
      (typeof this.canvas.getBoundingClientRect === 'function')
        ? this.canvas.getBoundingClientRect()
        : {
            left: 0,
            top: 0,
            width: this.canvas?.width || 0,
            height: this.canvas?.height || 0
          }
    );

    const buildPinchCenterPayload = (clientX, clientY) => {
      const rect = getCanvasRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const canvasCenterX = (rect.width || this.canvas?.width || 0) / 2;
      const canvasCenterY = (rect.height || this.canvas?.height || 0) / 2;
      const exactCell = this.renderer?.screenToCellExact
        ? this.renderer.screenToCellExact(localX, localY)
        : this.screenToCell(localX, localY);
      return {
        screenX: localX,
        screenY: localY,
        canvasCenterX,
        canvasCenterY,
        cellX: exactCell?.x ?? 0,
        cellY: exactCell?.y ?? 0
      };
    };

    // Prefer Pointer Events if available to get unified mouse/touch/pen handling
    if (globalThis.PointerEvent) {
      // Pointer Events path with basic pinch-zoom support
      const activePointers = new Map(); // id -> {x,y}
      let pinchReferenceDist = null;
      let isPinchZooming = false;
      let lastPrimaryCoords = null;
      const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

      const onPointerDown = (e) => {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size === 1 && e.isPrimary !== false && !isPinchZooming) {
          const coords = getMouseCoords(e);
          lastPrimaryCoords = coords;
          this.emit('mouseDown', { event: e, ...coords });
        }
        if (activePointers.size === 2) {
          const [p1, p2] = Array.from(activePointers.values());
          pinchReferenceDist = distance(p1, p2);
          // Enter pinch-zoom mode: suspend tool interactions
          if (!isPinchZooming && lastPrimaryCoords) {
            this.emit('mouseUp', { event: e, ...lastPrimaryCoords });
          }
          isPinchZooming = true;
        }
        if (e.cancelable) e.preventDefault();
      };
      let pinchLastCenter = null;
      const onPointerMove = (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.size >= 2 && pinchReferenceDist) {
          const [p1, p2] = Array.from(activePointers.values());
          // Pan: compute centroid movement while pinching
          const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          if (pinchLastCenter) {
            const dx = center.x - pinchLastCenter.x;
            const dy = center.y - pinchLastCenter.y;
            if (Math.abs(dx) + Math.abs(dy) > 0.5) {
              this.emit('gesturePan', { dx, dy });
            }
          }
          pinchLastCenter = center;
          const newDist = distance(p1, p2);
          if (newDist > 0) {
            const ratio = newDist / pinchReferenceDist;
            const threshold = 0.01;
            if (Math.abs(1 - ratio) > threshold) {
              const centerPayload = buildPinchCenterPayload(center.x, center.y);
              this.emit('pinchZoom', { scaleDelta: ratio, center: centerPayload });
              pinchReferenceDist = newDist;
            }
          }
          if (e.cancelable) e.preventDefault();
          return; // Skip normal mouse move while pinching
        }

        if (e.isPrimary !== false && !isPinchZooming) {
          const coords = getMouseCoords(e);
          lastPrimaryCoords = coords;
          this.emit('mouseMove', { event: e, ...coords });
        }
      };
      const onPointerUp = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) { pinchReferenceDist = null; pinchLastCenter = null; isPinchZooming = false; }
        if (e.isPrimary !== false && !isPinchZooming) {
          const coords = getMouseCoords(e);
          lastPrimaryCoords = coords;
          this.emit('mouseUp', { event: e, ...coords });
        }
        if (e.cancelable) e.preventDefault();
      };
      const onClick = (e) => {
        if (isPinchZooming) return; // Ignore clicks that may fire after pinch gestures
        const coords = getMouseCoords(e);
        this.emit('click', { event: e, ...coords });
      };
      this.canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
      this.canvas.addEventListener('pointermove', onPointerMove, { passive: false });
      this.canvas.addEventListener('pointerup', onPointerUp, { passive: false });
      this.canvas.addEventListener('pointercancel', onPointerUp, { passive: false });
      this.canvas.addEventListener('click', onClick);
      // Wheel zoom still useful on trackpads/mice
      // Use a passive wheel listener to avoid the browser delaying the
      // handler when the main thread is busy. We set touchAction='none'
      // above so preventing default browser scroll isn't necessary.
      this.canvas.addEventListener('wheel', (e) => {
        const coords = getMouseCoords(e);
        this.emit('wheel', { event: e, deltaY: e.deltaY, ...coords });
      }, { passive: true });
    } else {
      // Mouse fallback
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

      // Touch fallback with basic pinch-zoom support
  let activeTouchId = null;
  let pinchReferenceDist = null;
  let touchLastCenter = null;
      const getTouchCoords = (touchEvent) => {
        const rect = (typeof this.canvas.getBoundingClientRect === 'function')
          ? this.canvas.getBoundingClientRect()
          : { left: 0, top: 0 };
        const t = activeTouchId != null
          ? Array.from(touchEvent.touches).find(tt => tt.identifier === activeTouchId) || touchEvent.changedTouches[0]
          : touchEvent.changedTouches[0];
        const screenX = t.clientX - rect.left;
        const screenY = t.clientY - rect.top;
        const exactCell = this.renderer?.screenToCellExact
          ? this.renderer.screenToCellExact(screenX, screenY)
          : this.screenToCell(screenX, screenY);
        const cellCoords = exactCell
          ? {
              x: Math.floor(exactCell.x),
              y: Math.floor(exactCell.y),
              fx: exactCell.x,
              fy: exactCell.y
            }
          : this.screenToCell(screenX, screenY);
        return { screenX, screenY, cellCoords };
      };
      const touchDistance = (touches) => {
        if (!touches || touches.length < 2) return 0;
        const [a, b] = [touches[0], touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      };
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1 && e.changedTouches && e.changedTouches.length > 0) {
          activeTouchId = e.changedTouches[0].identifier;
          const coords = getTouchCoords(e);
          this.emit('mouseDown', { event: e, ...coords });
        }
        if (e.touches.length === 2) {
          // If we were drawing, end the stroke before entering pinch-zoom
          if (activeTouchId != null) {
            const coords = getTouchCoords(e);
            this.emit('mouseUp', { event: e, ...coords });
          }
          pinchReferenceDist = touchDistance(e.touches);
          activeTouchId = null; // suspend drawing while pinching
        }
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length >= 2 && pinchReferenceDist) {
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          if (touchLastCenter) {
            const dx = cx - touchLastCenter.x;
            const dy = cy - touchLastCenter.y;
            if (Math.abs(dx) + Math.abs(dy) > 0.5) {
              this.emit('gesturePan', { dx, dy });
            }
          }
          touchLastCenter = { x: cx, y: cy };
          const newDist = touchDistance(e.touches);
          if (newDist > 0) {
            const ratio = newDist / pinchReferenceDist;
            const threshold = 0.01;
            if (Math.abs(1 - ratio) > threshold) {
              const centerPayload = buildPinchCenterPayload(cx, cy);
              this.emit('pinchZoom', { scaleDelta: ratio, center: centerPayload });
              pinchReferenceDist = newDist;
            }
          }
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (activeTouchId != null) {
          const coords = getTouchCoords(e);
          this.emit('mouseMove', { event: e, ...coords });
          if (e.cancelable) e.preventDefault();
        }
      }, { passive: false });
      this.canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) { pinchReferenceDist = null; touchLastCenter = null; }
        if (activeTouchId != null) {
          const coords = getTouchCoords(e);
          this.emit('mouseUp', { event: e, ...coords });
          activeTouchId = null;
        }
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      // Mouse wheel (zoom)
      // Mouse wheel (zoom) - make passive for improved responsiveness.
      this.canvas.addEventListener('wheel', (e) => {
        const coords = getMouseCoords(e);
        this.emit('wheel', { event: e, deltaY: e.deltaY, ...coords });
      }, { passive: true });
    }

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
    globalThis.addEventListener('resize', () => {
      const container = this.canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        this.resize(rect.width, rect.height);
        this.emit('resize', { width: rect.width, height: rect.height });
      }
    });

    // Listen for script-driven grid updates and trigger re-render
    globalThis.addEventListener('gol:script:step', (ev) => {
      // Update model liveCells with new cells from event, then re-render
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const cells = detail.cells || detail;
        if (this.model && typeof this.model.setCellsAliveBulk === 'function' && Array.isArray(cells)) {
          // Accept [{x, y}, ...] or [[x, y], ...]
          this.model.setCellsAliveBulk(cells);
        }
      } catch (e) {
         
        console.error('GameView: failed to update model on gol:script:step', e);
      }
      // Now trigger a re-render
      if (typeof this.renderer?.requestRender === 'function') {
        this.renderer.requestRender();
      } else if (typeof this.render === 'function') {
        try {
          const liveCells = this.model?.getLiveCells?.() ?? new Map();
          const viewport = this.model?.getViewport?.() ?? { offsetX: 0, offsetY: 0, cellSize: 8 };
          this.render(liveCells, viewport);
        } catch (e) {
           
          console.error('GameView: failed to re-render on gol:script:step', e);
        }
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
