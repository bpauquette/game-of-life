// ...existing code...
const CONST_FUNCTION = 'function';
const CONST_FFFFFF = '#ffffff';
const DEBUG_PUSH_LOG_FAILED = '[GameRenderer] Failed to push canvas log to __GOL_PUSH_CANVAS_LOG__';
// GameRenderer.js
// Centralized rendering service for Conway's Game of Life
// Handles all canvas operations, coordinate transformations, and drawing

export class GameRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    // Attempt to get a real 2D context. If unavailable (tests/jsdom or a
    // lightweight mock), provide a no-op context implementing the commonly
    // used methods to avoid runtime errors during rendering.
    let ctx = null;
    try {
      ctx = canvas && typeof canvas.getContext === CONST_FUNCTION ? canvas.getContext('2d') : null;
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('GameRenderer: failed to get 2D context, falling back to noop context.', e);
      }
      ctx = null;
    }
    this.ctx = ctx || {
      fillStyle: '#000',
      strokeStyle: '#000',
      globalAlpha: 1,
      lineWidth: 1,
      scale: () => {},
      setTransform: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      strokeRect: () => {},
      clearRect: () => {}
    };
    this.options = {
      backgroundColor: '#000000',
  gridColor: '#ffffff',
      // Align 1px grid lines crisply on device pixels by default
      gridLineOffset: 0.5,
      cellSaturation: 80,
      cellLightness: 55,
      hueMultiplierX: 2.5,
      hueMultiplierY: 1.7,
      hueMax: 360,
      showGrid: true,
      ...options,
    };
    this.options.showGrid = true;
    this.viewport = { width: 0, height: 0 };
    this.colorCache = new Map();
    this.maxColorCacheSize = 10000;
    this._invalidateGridCache();
  // Debounce timeout for coalescing rapid resize events (ms).
  // Use a small default to avoid layout thrash during header hide/show.
  this._resizeDebounceMs = (options && typeof options.resizeDebounceMs === 'number') ? options.resizeDebounceMs : 80;

  // Enable verbose renderer logs only when explicitly requested to avoid
  // spamming the console during normal development. Can be enabled with
  // options.debugLogs or the global flag `window.GOL_DEBUG_CANVAS`.
  this._enableLogs = !!(options && options.debugLogs) || !!globalThis.GOL_DEBUG_CANVAS || !!globalThis.__GOL_DEBUG_CANVAS__;
  // Setup high-DPI rendering
  this.setupHighDPI();
  }

  // Internal immediate resize implementation (used by debounce and tests)
  /* eslint-disable complexity */
  _doResizeImmediate(width, height) {
    // Clear any existing scaling (guard if ctx missing)
    if (this.ctx && typeof this.ctx.setTransform === CONST_FUNCTION) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const dpr = window.devicePixelRatio || 1;

    // Ensure minimum size
    width = Math.max(width, 200);
    height = Math.max(height, 200);

    // Use integer CSS pixel sizes to avoid sub-pixel rounding artifacts
    // (ceil to be conservative so backing buffer always covers display area)
    const styleWidth = Math.ceil(width);
    const styleHeight = Math.ceil(height);

    // Set canvas backing buffer using DPR-aware ceil to ensure coverage
    this.canvas.width = Math.ceil(styleWidth * dpr);
    this.canvas.height = Math.ceil(styleHeight * dpr);
    this.canvas.style.width = styleWidth + 'px';
    this.canvas.style.height = styleHeight + 'px';
    // Make sure canvas participates as a block-level element to avoid
    // inline whitespace/layout surprises
    try { this.canvas.style.display = this.canvas.style.display || 'block'; } catch (e) {}

    // Defensive clear/fill of the backing buffer (operate in device pixels)
    try {
      if (this.ctx && typeof this.ctx.setTransform === CONST_FUNCTION) {
        // reset transform so we clear/fill in raw pixel coordinates
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      if (this.ctx && typeof this.ctx.clearRect === CONST_FUNCTION) {
        // clear the entire backing buffer (device pixels)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      if (this.ctx && typeof this.ctx.fillRect === CONST_FUNCTION) {
        const prevFill = this.ctx.fillStyle;
        this.ctx.fillStyle = this.options.backgroundColor;
        // fill in device-pixel coordinates for a solid background before scaling
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = prevFill;
      }
    } catch (e) {
      // Non-fatal: continue to scale and draw even if clearing fails
    }

    // Scale for high-DPI (guard)
    if (this.ctx && typeof this.ctx.scale === CONST_FUNCTION) {
      this.ctx.scale(dpr, dpr);
    }

  // Update viewport (use the integer CSS sizes)
  this.viewport.width = styleWidth;
  this.viewport.height = styleHeight;

    // Invalidate caches
    this._invalidateGridCache();
    this.colorCache.clear();

    try {
      const info = { phase: 'resize', width, height, dpr, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height, styleW: this.canvas.style.width, styleH: this.canvas.style.height };
      if (this._enableLogs && console && typeof console.info === 'function') console.info('[GameRenderer] resize (immediate)', info);
      try {
        globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify(info));
      } catch (e) {
        if (this._enableLogs && typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug(DEBUG_PUSH_LOG_FAILED, e);
        }
      }
    } catch (e) {
      if (this._enableLogs && typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[GameRenderer] Failed to build or emit resize info', e);
      }
    }
  }

  /**
   * Update renderer options without recreating the renderer
   */
  

    /**
     * Draws overlay from a descriptor object
     * Currently supports: shapePreview
     * @param {{type:string, cells:Array<{x:number,y:number}>, origin?:{x:number,y:number}, style?:{color?:string,alpha?:number}}} overlay
     */
    drawOverlayDescriptor(overlay) {
      const type = overlay?.type;
      if (!type) return;
      if (type === 'shapePreview') {
        const origin = overlay.origin || { x: 0, y: 0 };
        const cells = Array.isArray(overlay.cells) ? overlay.cells : [];
        const color = overlay.style?.color || '#4CAF50';
        const alpha = (typeof overlay.style?.alpha === 'number') ? overlay.style.alpha : 0.6;
        
        // Translate to absolute cells once
        const shapeCells = cells.map(({ x, y }) => ({ x: x + origin.x, y: y + origin.y }));
        // Default path: draw each cell (already fairly fast without strokes)
        const prevAlpha = this.ctx.globalAlpha;
        this.ctx.globalAlpha = alpha;
        this.drawCellArray(shapeCells, color);
        this.ctx.globalAlpha = prevAlpha;
      } else if (type === 'cellsHighlight') {
        const cells = Array.isArray(overlay.cells) ? overlay.cells : [];
        const color = overlay.style?.color || '#ffffff';
        const prevAlpha = this.ctx.globalAlpha;
        if (typeof overlay.style?.alpha === 'number') {
          this.ctx.globalAlpha = overlay.style.alpha;
        }
        this.drawCellArray(cells, color);
        this.ctx.globalAlpha = prevAlpha;
      } else if (type === 'shapePreviewWithCrosshairs') {
        this._drawShapePreviewWithCrosshairs(overlay);
      }
      
    }

  _drawShapePreviewWithCrosshairs(overlay) {
    const origin = overlay.origin || { x: 0, y: 0 };
    const cursor = overlay.cursor || origin;
    const cells = Array.isArray(overlay.cells) ? overlay.cells : [];
    const color = overlay.style?.color || '#4CAF50';
    const alpha = (typeof overlay.style?.alpha === 'number') ? overlay.style.alpha : 0.6;

    this.ctx.save();

    // Draw crosshairs first (so they appear behind the shape)
    this.ctx.strokeStyle = '#00BFFF'; // Bright blue
    this.ctx.lineWidth = 2.5;
    this.ctx.globalAlpha = 0.95;

    const screenPos = this.cellToScreen(cursor.x, cursor.y);
    if (screenPos) {
      const centerX = screenPos.x + this.viewport.cellSize / 2;
      const centerY = screenPos.y + this.viewport.cellSize / 2;

      // Horizontal line across the canvas
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY);
      this.ctx.lineTo(this.viewport.width, centerY);
      this.ctx.stroke();

      // Vertical line across the canvas
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, 0);
      this.ctx.lineTo(centerX, this.viewport.height);
      this.ctx.stroke();

      // Center dot
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, this.viewport.cellSize * 0.12, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#00BFFF';
      this.ctx.globalAlpha = 0.85;
      this.ctx.fill();
    }

    // Draw shape preview
    if (cells.length > 0) {
      this.ctx.globalAlpha = alpha;
      const shapeCells = cells.map(({ x, y }) => ({ x: x + origin.x, y: y + origin.y }));
      this.drawCellArray(shapeCells, color);
    }

    this.ctx.restore();
  }

  updateOptions(newOptions) {
    const prevGridColor = this.options.gridColor;
    const prevBackground = this.options.backgroundColor;
    Object.assign(this.options, newOptions);
    // Invalidate grid cache if visual grid appearance changed (grid or background color)
    if (prevGridColor !== this.options.gridColor || prevBackground !== this.options.backgroundColor) {
      this._invalidateGridCache();
    }
    // Clear color cache since colors or background changed
    this.colorCache.clear();
  }

  /**
   * Setup high-DPI (retina) display support
   */
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const { displayWidth, displayHeight } = this._getDisplaySize();
    this._setCanvasSize(displayWidth, displayHeight, dpr);
    this._scaleContextForDPI(dpr);
    this.viewport.width = displayWidth;
    this.viewport.height = displayHeight;
    try {
      const info = { phase: 'setupHighDPI', dpr, displayWidth, displayHeight, canvasClient: this.canvas.getBoundingClientRect && this.canvas.getBoundingClientRect() };
  if (this._enableLogs && console && typeof console.info === 'function') console.info('[GameRenderer] setupHighDPI', info);
      try {
        globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify(info));
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug(DEBUG_PUSH_LOG_FAILED, e);
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[GameRenderer] Failed to build or emit setupHighDPI info', e);
      }
    }
  }

  _getDisplaySize() {
    const rect = this.canvas.getBoundingClientRect();
    let displayWidth, displayHeight;
    if (rect && rect.width > 0 && rect.height > 0) {
      displayWidth = rect.width;
      displayHeight = rect.height;
    } else {
      const container = this.canvas.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        displayWidth = containerRect.width || 800;
        displayHeight = containerRect.height || 600;
      } else {
        displayWidth = 800;
        displayHeight = 600;
      }
    }
    return {
      displayWidth: Math.max(displayWidth, 200),
      displayHeight: Math.max(displayHeight, 200)
    };
  }

  _setCanvasSize(displayWidth, displayHeight, dpr) {
    // Normalize/display integer CSS pixels to avoid fractional artifacts
    const styleW = Math.ceil(Math.max(displayWidth || 0, 200));
    const styleH = Math.ceil(Math.max(displayHeight || 0, 200));
    this.canvas.style.width = styleW + 'px';
    this.canvas.style.height = styleH + 'px';
    try { this.canvas.style.display = this.canvas.style.display || 'block'; } catch (e) {}

    // Backing buffer must be at least as large as the displayed size in device pixels
    this.canvas.width = Math.ceil(styleW * dpr);
    this.canvas.height = Math.ceil(styleH * dpr);

    try {
      const rect = this.canvas.getBoundingClientRect && this.canvas.getBoundingClientRect();
      const info = { phase: '_setCanvasSize', displayWidth, displayHeight, dpr, backingWidth: this.canvas.width, backingHeight: this.canvas.height, styleW: this.canvas.style.width, styleH: this.canvas.style.height, clientRect: rect };
  if (this._enableLogs && console && typeof console.info === 'function') console.info('[GameRenderer] _setCanvasSize', info);
      try {
        globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify(info));
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug(DEBUG_PUSH_LOG_FAILED, e);
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[GameRenderer] _setCanvasSize logging failed', e);
      }
    }
  }

  _scaleContextForDPI(dpr) {
    if (this.ctx && typeof this.ctx.scale === CONST_FUNCTION) {
      this.ctx.scale(dpr, dpr);
    } else if (!this.ctx) {
      this.ctx = this.canvas.getContext ? this.canvas.getContext('2d') : { scale: () => {} };
      if (this.ctx && typeof this.ctx.scale === CONST_FUNCTION) {
        this.ctx.scale(dpr, dpr);
      }
    }
  }

  /**
   * Resize canvas (call when container size changes)
   */
  resize(width, height) {
    // If no explicit width/height provided, treat as a full re-setup immediately
    if (width === undefined || height === undefined) {
      if (this.ctx && typeof this.ctx.setTransform === CONST_FUNCTION) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      this.setupHighDPI();
      this._invalidateGridCache();
      this.colorCache.clear();
      return;
    }

    // In test environment, avoid debounce to keep deterministic behavior.
    // Guard access to `process` because in browser builds `process` may be
    // undefined which would throw a ReferenceError. Use typeof check first.
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test') {
      this._doResizeImmediate(width, height);
      return;
    }

    // Coalesce rapid resize calls to avoid thrash during layout changes.
    this._pendingResizeArgs = { width, height };
    try {
      globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify({ phase: 'resize.scheduled', width, height, pending: !!this._pendingResizeTimer }));
    } catch (e) {}
    try { if (this._pendingResizeTimer) clearTimeout(this._pendingResizeTimer); } catch (e) {}
    this._pendingResizeTimer = setTimeout(() => {
      this._pendingResizeTimer = null;
      const args = this._pendingResizeArgs;
      this._pendingResizeArgs = null;
      try {
        globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify({ phase: 'resize.flushed', width: args?.width, height: args?.height }));
      } catch (e) {}
      if (args) this._doResizeImmediate(args.width, args.height);
    }, this._resizeDebounceMs);
  }

  /**
   * Set viewport parameters (offset and cell size)
   */
  setViewport(offsetX, offsetY, cellSize) {
    const changed = 
      this.viewport.offsetX !== offsetX ||
      this.viewport.offsetY !== offsetY ||
      this.viewport.cellSize !== cellSize;
      
    if (changed) {
      this.viewport.offsetX = offsetX;
      this.viewport.offsetY = offsetY;
      this.viewport.cellSize = cellSize;
      
      // Invalidate grid cache when viewport changes
      this._invalidateGridCache();
    }
    
    return changed;
  }

  /**
   * Convert screen coordinates to cell coordinates
   */
  screenToCell(screenX, screenY) {
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;
    
    const cellX = Math.floor(this.viewport.offsetX + (screenX - centerX) / this.viewport.cellSize);
    const cellY = Math.floor(this.viewport.offsetY + (screenY - centerY) / this.viewport.cellSize);
    
    return { x: cellX, y: cellY };
  }

  screenToCellExact(screenX, screenY) {
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;
    const cellX = this.viewport.offsetX + (screenX - centerX) / this.viewport.cellSize;
    const cellY = this.viewport.offsetY + (screenY - centerY) / this.viewport.cellSize;
    return { x: cellX, y: cellY };
  }

  /**
   * Convert cell coordinates to screen coordinates
   */
  cellToScreen(cellX, cellY) {
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;
    
    const computedOffset = {
      x: this.viewport.offsetX * this.viewport.cellSize - centerX,
      y: this.viewport.offsetY * this.viewport.cellSize - centerY
    };
    
    return {
      x: cellX * this.viewport.cellSize - computedOffset.x,
      y: cellY * this.viewport.cellSize - computedOffset.y
    };
  }

  /**
   * Get cached cell color
   */
  getCellColor(cellX, cellY) {
    // Use colorScheme if available
    if (this.currentColorScheme?.getCellColor) {
      return this.currentColorScheme.getCellColor(cellX, cellY);
    }
    
    // Fallback to cached default color calculation
    const key = `${cellX},${cellY}`;
    let color = this.colorCache.get(key);
    
    if (!color) {
      const hue = (cellX * this.options.hueMultiplierX + cellY * this.options.hueMultiplierY) % this.options.hueMax;
      color = `hsl(${hue}, ${this.options.cellSaturation}%, ${this.options.cellLightness}%)`;
      
      // Prevent memory leaks
      if (this.colorCache.size >= this.maxColorCacheSize) {
        const entries = Array.from(this.colorCache.entries());
        for (let i = 0; i < entries.length / 4; i++) {
          this.colorCache.delete(entries[i][0]);
        }
      }
      
      this.colorCache.set(key, color);
    }
    
    return color;
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
  }

  _invalidateGridCache() {
    this.gridCache = null;
    this.gridCacheDpr = null;
    this.gridCacheCssWidth = 0;
    this.gridCacheCssHeight = 0;
  }

  /**
   * Draw the grid (cached for performance)
   */
  drawGrid() {
    const dpr = (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio))
      ? window.devicePixelRatio
      : 1;
    if (this.gridCache && this.gridCacheDpr !== dpr) {
      this._invalidateGridCache();
    }
    if (!this.gridCache) {
      this._createGridCache(dpr);
    }
    this._drawGridCache();
  }

  _createGridCache(dprInput) {
    const dpr = Number.isFinite(dprInput) && dprInput > 0 ? dprInput : 1;
    const cache = document.createElement('canvas');
    cache.width = Math.ceil(this.viewport.width * dpr);
    cache.height = Math.ceil(this.viewport.height * dpr);
    const gridCtx = cache.getContext('2d') || this.canvas.getContext('2d') || {
      fillStyle: '',
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      scale: () => {},
      setTransform: () => {}
    };

    if (typeof gridCtx.setTransform === CONST_FUNCTION) {
      gridCtx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (typeof gridCtx.scale === CONST_FUNCTION) {
      gridCtx.scale(dpr, dpr);
    }

    this.gridCache = cache;
    this.gridCacheDpr = dpr;
    this.gridCacheCssWidth = this.viewport.width;
    this.gridCacheCssHeight = this.viewport.height;

    this._drawGridBackground(gridCtx);
    this._drawGridLines(gridCtx, dpr);
    gridCtx.stroke?.();
  }

  _drawGridBackground(gridCtx) {
    gridCtx.fillStyle = this.options.backgroundColor;
    gridCtx.fillRect(0, 0, this.viewport.width, this.viewport.height);
  }

  _drawGridLines(gridCtx, dprInput) {
    const dpr = Number.isFinite(dprInput) && dprInput > 0 ? dprInput : 1;
    // Hide grid if cell size is extremely small
    const cellSize = Number(this.viewport.cellSize);
    if (cellSize < 4) {
      return;
    }
    // Use configured grid color for grid lines, default to gray
    gridCtx.strokeStyle = this.options.gridColor || '#888';
    gridCtx.lineWidth = 1 / dpr;
    gridCtx.globalAlpha = 1;
    gridCtx.beginPath();

    const offsetX = Number(this.viewport.offsetX);
    const offsetY = Number(this.viewport.offsetY);
    const width = Number(this.viewport.width);
    const height = Number(this.viewport.height);
    let gridLineOffset = Number(this.options.gridLineOffset);
    if (!Number.isFinite(gridLineOffset)) {
      gridLineOffset = 0;
    }
    gridLineOffset /= dpr;
    const centerX = width / 2;
    const centerY = height / 2;

    if (!cellSize || Number.isNaN(cellSize) || cellSize <= 0) {
      return;
    }
    if (Number.isNaN(offsetX) || Number.isNaN(offsetY) || Number.isNaN(width) || Number.isNaN(height)) {
      return;
    }

    const computedOffset = {
      x: offsetX * cellSize - centerX,
      y: offsetY * cellSize - centerY
    };
    // Normalize to positive remainders in [0, cellSize)
    const startX = ((-computedOffset.x % cellSize) + cellSize) % cellSize;
    const startY = ((-computedOffset.y % cellSize) + cellSize) % cellSize;

    if (Number.isNaN(startX) || Number.isNaN(startY)) {
      return;
    }

    for (let x = startX; x < width; x += cellSize) {
      const xPos = x + gridLineOffset;
      gridCtx.moveTo(xPos, 0);
      gridCtx.lineTo(xPos, height);
    }
    for (let y = startY; y < height; y += cellSize) {
      const yPos = y + gridLineOffset;
      gridCtx.moveTo(0, yPos);
      gridCtx.lineTo(width, yPos);
    }
  }

  _drawGridCache() {
    if (this.ctx && typeof this.ctx.drawImage === CONST_FUNCTION) {
      const width = this.gridCacheCssWidth || this.viewport.width;
      const height = this.gridCacheCssHeight || this.viewport.height;
      this.ctx.drawImage(this.gridCache, 0, 0, width, height);
    } else if (this.ctx && typeof this.ctx.fillRect === CONST_FUNCTION) {
      this.ctx.fillStyle = this.options.backgroundColor;
      this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    }
  }

  /**
   * Draw live cells
   */
  drawCells(liveCells) {
    const drawCell = (cellX, cellY) => {
      const screenPos = this.cellToScreen(cellX, cellY);

      if (
        screenPos.x + this.viewport.cellSize < 0 ||
        screenPos.x >= this.viewport.width ||
        screenPos.y + this.viewport.cellSize < 0 ||
        screenPos.y >= this.viewport.height
      ) {
        return;
      }

      const cellColor = this.getCellColor(cellX, cellY);
      this.ctx.fillStyle = cellColor;
      if (globalThis.DEBUG_COLOR_SCHEME) {
        console.log(`[GameRenderer] Drawing cell (${cellX},${cellY}) with color:`, cellColor);
      }
      this.ctx.fillRect(
        screenPos.x,
        screenPos.y,
        this.viewport.cellSize,
        this.viewport.cellSize
      );
    };

    if (typeof liveCells?.forEachCell === 'function') {
      liveCells.forEachCell(drawCell);
    } else if (typeof liveCells?.entries === 'function') {
      for (const [key] of liveCells.entries()) {
        const [cellX, cellY] = key.split(',').map(Number);
        if (Number.isFinite(cellX) && Number.isFinite(cellY)) {
          drawCell(cellX, cellY);
        }
      }
    }
  }

  /**
   * Draw a single cell at screen coordinates
   */
  drawCellAt(screenX, screenY, color = CONST_FFFFFF) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, this.viewport.cellSize, this.viewport.cellSize);
  }

  /**
   * Draw cells from an array of {x, y} coordinates
   */
  drawCellArray(cells, color = CONST_FFFFFF) {
    if (!cells || cells.length === 0) return;
    
    this.ctx.fillStyle = color;
    for (const cell of cells) {
      const screenPos = this.cellToScreen(cell.x, cell.y);
      
      // Viewport culling
      if (screenPos.x + this.viewport.cellSize < 0 || 
          screenPos.x >= this.viewport.width ||
          screenPos.y + this.viewport.cellSize < 0 || 
          screenPos.y >= this.viewport.height) {
        continue;
      }
      
      // Use exact positions/sizes to avoid cumulative rounding drift
      this.ctx.fillRect(
        screenPos.x,
        screenPos.y,
        this.viewport.cellSize,
        this.viewport.cellSize
      );
    }
  }

  /**
   * Draw a line between two cell coordinates
   */
  drawLine(startCell, endCell, color = CONST_FFFFFF, lineWidth = 1) {
    const startPos = this.cellToScreen(startCell.x, startCell.y);
    const endPos = this.cellToScreen(endCell.x, endCell.y);
    
    // Adjust to center of cells
    const startCenterX = startPos.x + this.viewport.cellSize / 2;
    const startCenterY = startPos.y + this.viewport.cellSize / 2;
    const endCenterX = endPos.x + this.viewport.cellSize / 2;
    const endCenterY = endPos.y + this.viewport.cellSize / 2;
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(startCenterX, startCenterY);
    this.ctx.lineTo(endCenterX, endCenterY);
    this.ctx.stroke();
  }

  /**
   * Draw a rectangle outline
   */
  drawRect(topLeftCell, bottomRightCell, color = CONST_FFFFFF, lineWidth = 1) {
    const topLeft = this.cellToScreen(topLeftCell.x, topLeftCell.y);
    const bottomRight = this.cellToScreen(bottomRightCell.x + 1, bottomRightCell.y + 1);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(
      topLeft.x, 
      topLeft.y, 
      bottomRight.x - topLeft.x, 
      bottomRight.y - topLeft.y
    );
  }

  /**
   * Main render method - draws everything
   */
  /* eslint-disable-next-line complexity */
  render(liveCells, colorScheme = null, overlay = null) {
    // Store colorScheme for use in getCellColor. The model is the single source.
    // If null, retain previous currentColorScheme; if still missing, use a minimal local fallback.
    const effectiveColorScheme = colorScheme || this.currentColorScheme || { background: '#000000', getCellColor: () => '#ffffff' };
    this.currentColorScheme = effectiveColorScheme;

    // Keep renderer background/grid options in sync with the active color scheme
    // This avoids relying on external callers to remember updating renderer options.
    const desiredBackground = effectiveColorScheme.background || effectiveColorScheme.backgroundColor || this.options.backgroundColor;
    const desiredGrid = Object.hasOwn(effectiveColorScheme, 'gridColor')
      ? effectiveColorScheme.gridColor
      : this.options.gridColor;
    if (desiredBackground !== this.options.backgroundColor || desiredGrid !== this.options.gridColor) {
      this.updateOptions({ backgroundColor: desiredBackground, gridColor: desiredGrid });
    }

    // Defensive: reset transform and ensure background is filled to avoid
    // exposing any underlying container pixels during rapid resizes.
    try {
      const dpr = window.devicePixelRatio || 1;
      if (this.ctx && typeof this.ctx.setTransform === CONST_FUNCTION) this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (this.ctx && typeof this.ctx.scale === CONST_FUNCTION) this.ctx.scale(dpr, dpr);
      if (this.ctx && typeof this.ctx.fillRect === CONST_FUNCTION) {
        const prev = this.ctx.fillStyle;
        this.ctx.fillStyle = this.options.backgroundColor;
        // fill in CSS pixel coordinates (context is scaled by DPR)
        this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
        this.ctx.fillStyle = prev;
      }
    } catch (e) {
      // Non-fatal; continue to draw normally
    }

    // Draw grid background
    this.drawGrid();

    // Optional debug: report render vs DOM sizes when enabled
    try {
      if (window.GOL_DEBUG_CANVAS) {
        const rect = this.canvas.getBoundingClientRect && this.canvas.getBoundingClientRect();
        globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify({ phase: 'render', viewport: { ...this.viewport }, rect, backingW: this.canvas.width, backingH: this.canvas.height, overlay: !!overlay }));
      }
    } catch (e) {}

    // Draw live cells
    this.drawCells(liveCells);

    // Draw overlay if provided
    if (overlay) {
      // Legacy support: class instance with draw(renderer)
      if (typeof overlay.draw === 'function') {
        overlay.draw(this);
      } else if (overlay.type) {
        this.drawOverlayDescriptor(overlay);
      }
    }

  }

  /**
   * Force an immediate resize of the renderer (bypass debounce) and
   * optionally emit a small log entry. This does not schedule a render.
   */
  forceResize(width, height) {
    try {
      this._doResizeImmediate(width, height);
      try { globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify({ phase: 'forceResize', width, height })); } catch (e) {}
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn('[GameRenderer] forceResize failed', e);
    }
  }



  /**
   * Clear all caches
   */
  clearCaches() {
    this.colorCache.clear();
    this._invalidateGridCache();
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      viewport: { ...this.viewport },
      colorCacheSize: this.colorCache.size,
      hasGridCache: !!this.gridCache,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * Dump current canvas/debug state for in-browser inspection and testing.
   * Returns an object and also pushes it into the on-page log buffer.
   */
  dumpCanvasState() {
    const rect = this.canvas.getBoundingClientRect && this.canvas.getBoundingClientRect();
    const state = {
      viewport: { ...this.viewport },
      backingWidth: this.canvas.width,
      backingHeight: this.canvas.height,
      styleWidth: this.canvas.style.width,
      styleHeight: this.canvas.style.height,
      clientRect: rect,
      devicePixelRatio: window.devicePixelRatio || 1,
      pendingResize: !!this._pendingResizeTimer,
      pendingResizeArgs: this._pendingResizeArgs || null
    };
    try { globalThis.__GOL_PUSH_CANVAS_LOG__?.(JSON.stringify({ phase: 'dumpCanvasState', state })); } catch (e) {}
    return state;
  }
}

/**
 * Overlay base class for tool rendering
 */
export class RenderOverlay {
  constructor(options = {}) {
    this.options = options;
  }

  // Override in subclasses
  draw(renderer) {
    // Default implementation does nothing
  }
}

/**
 * Erase overlay for shape preview
 */
export class EraseOverlay extends RenderOverlay {
  constructor(cells, showText = true) {
    super();
    this.cells = cells;
    this.showText = showText;
  }

  draw(renderer) {
    if (this.cells && this.cells.length > 0) {
      renderer.drawCellArray(this.cells, '#000');
    }
    if (this.showText) {
      const ctx = renderer.ctx;
      const w = renderer.canvas.width / (window.devicePixelRatio || 1);
      const h = renderer.canvas.height / (window.devicePixelRatio || 1);
      ctx.save();
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('Erasing Shape Overlay', w / 2, h / 2);
      ctx.restore();
    }
  }
}

/**
 * Shape preview overlay
 */
export class ShapePreviewOverlay extends RenderOverlay {
  constructor(cells, position, options = {}) {
    super(options);
    this.cells = cells;
    this.position = position;
    this.alpha = options.alpha || 0.6;
    this.color = options.color || '#4CAF50';
  }

  draw(renderer) {
    if (!this.cells || !this.position) return;
    
    renderer.ctx.save();
    renderer.ctx.globalAlpha = this.alpha;
    
    const shapeCells = this.cells.map(cell => ({
      x: this.position.x + (cell.x || cell[0] || 0),
      y: this.position.y + (cell.y || cell[1] || 0)
    }));
    
    renderer.drawCellArray(shapeCells, this.color);
    
    renderer.ctx.restore();
  }
}

/**
 * Line preview overlay
 */
export class LinePreviewOverlay extends RenderOverlay {
  constructor(startCell, endCell, options = {}) {
    super(options);
    this.startCell = startCell;
    this.endCell = endCell;
    this.color = options.color || 'rgba(255,255,255,0.6)';
    this.lineWidth = options.lineWidth || Math.max(1, Math.min(4, (options.cellSize || 1) / 6));
  }

  draw(renderer) {
    if (!this.startCell || !this.endCell) return;
    
    renderer.drawLine(this.startCell, this.endCell, this.color, this.lineWidth);
  }
}

/**
 * Rectangle preview overlay  
 */
export class RectPreviewOverlay extends RenderOverlay {
  constructor(startCell, endCell, options = {}) {
    super(options);
    this.startCell = startCell;
    this.endCell = endCell;
    this.color = options.color || 'rgba(255,255,255,0.6)';
    this.lineWidth = options.lineWidth || 2;
  }

  draw(renderer) {
    if (!this.startCell || !this.endCell) return;
    
    const topLeft = {
      x: Math.min(this.startCell.x, this.endCell.x),
      y: Math.min(this.startCell.y, this.endCell.y)
    };
    const bottomRight = {
      x: Math.max(this.startCell.x, this.endCell.x),
      y: Math.max(this.startCell.y, this.endCell.y)
    };
    
    renderer.drawRect(topLeft, bottomRight, this.color, this.lineWidth);
  }
}

/**
 * Tool overlay that delegates to the tool's drawOverlay method
 */
export class ToolOverlay extends RenderOverlay {
  constructor(tool, toolState, cellSize, options = {}) {
    super(options);
    this.tool = tool;
    this.toolState = toolState;
    this.cellSize = cellSize;
  }

  draw(renderer) {
    if (!this.tool?.drawOverlay || !this.toolState) return;
    
    // Create a compatible offset object for legacy tools
    const centerX = renderer.viewport.width / 2;
    const centerY = renderer.viewport.height / 2;
    const offset = {
      x: renderer.viewport.offsetX * renderer.viewport.cellSize - centerX,
      y: renderer.viewport.offsetY * renderer.viewport.cellSize - centerY
    };
    
    // Call the tool's drawOverlay method with legacy parameters
    this.tool.drawOverlay(renderer.ctx, this.toolState, this.cellSize, offset);
  }
}