// GameRenderer.js
// Centralized rendering service for Conway's Game of Life
// Handles all canvas operations, coordinate transformations, and drawing

export class GameRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      backgroundColor: '#000000',
      gridColor: '#202020',
      gridLineOffset: 0.5,
      hueMultiplierX: 53,
      hueMultiplierY: 97,
      hueMax: 360,
      cellSaturation: 80,
      cellLightness: 55,
      ...options
    };
    
    // Rendering state
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      cellSize: 8,
      width: canvas.width,
      height: canvas.height
    };
    
    // Performance optimizations
    this.colorCache = new Map();
    this.gridCache = null;
    this.maxColorCacheSize = 10000;
    
    // Setup high-DPI rendering
    this.setupHighDPI();
  }

  /**
   * Setup high-DPI (retina) display support
   */
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.ctx.scale(dpr, dpr);
    
    // Update viewport
    this.viewport.width = rect.width;
    this.viewport.height = rect.height;
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
      this.gridCache = null;
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

  /**
   * Draw the grid (cached for performance)
   */
  drawGrid() {
    if (!this.gridCache) {
      // Create grid cache canvas
      this.gridCache = document.createElement('canvas');
      this.gridCache.width = this.viewport.width;
      this.gridCache.height = this.viewport.height;
      const gridCtx = this.gridCache.getContext('2d');
      
      // Draw background
      gridCtx.fillStyle = this.options.backgroundColor;
      gridCtx.fillRect(0, 0, this.viewport.width, this.viewport.height);
      
      // Draw grid lines
      gridCtx.strokeStyle = this.options.gridColor;
      gridCtx.beginPath();
      
      const centerX = this.viewport.width / 2;
      const centerY = this.viewport.height / 2;
      const computedOffset = {
        x: this.viewport.offsetX * this.viewport.cellSize - centerX,
        y: this.viewport.offsetY * this.viewport.cellSize - centerY
      };
      
      const startX = -computedOffset.x % this.viewport.cellSize;
      const startY = -computedOffset.y % this.viewport.cellSize;
      
      // Vertical lines
      for (let x = startX; x < this.viewport.width; x += this.viewport.cellSize) {
        gridCtx.moveTo(Math.floor(x) + this.options.gridLineOffset, 0);
        gridCtx.lineTo(Math.floor(x) + this.options.gridLineOffset, this.viewport.height);
      }
      
      // Horizontal lines
      for (let y = startY; y < this.viewport.height; y += this.viewport.cellSize) {
        gridCtx.moveTo(0, Math.floor(y) + this.options.gridLineOffset);
        gridCtx.lineTo(this.viewport.width, Math.floor(y) + this.options.gridLineOffset);
      }
      
      gridCtx.stroke();
    }
    
    // Draw cached grid
    this.ctx.drawImage(this.gridCache, 0, 0);
  }

  /**
   * Draw live cells
   */
  drawCells(liveCells) {
    for (const [key] of liveCells.entries()) {
      const [cellX, cellY] = key.split(',').map(Number);
      const screenPos = this.cellToScreen(cellX, cellY);
      
      // Viewport culling
      if (screenPos.x + this.viewport.cellSize < 0 || 
          screenPos.x >= this.viewport.width ||
          screenPos.y + this.viewport.cellSize < 0 || 
          screenPos.y >= this.viewport.height) {
        continue;
      }
      
      this.ctx.fillStyle = this.getCellColor(cellX, cellY);
      this.ctx.fillRect(
        Math.floor(screenPos.x), 
        Math.floor(screenPos.y), 
        Math.ceil(this.viewport.cellSize), 
        Math.ceil(this.viewport.cellSize)
      );
    }
  }

  /**
   * Draw a single cell at screen coordinates
   */
  drawCellAt(screenX, screenY, color = '#ffffff') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, this.viewport.cellSize, this.viewport.cellSize);
  }

  /**
   * Draw cells from an array of {x, y} coordinates
   */
  drawCellArray(cells, color = '#ffffff') {
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
      
      this.ctx.fillRect(
        Math.floor(screenPos.x), 
        Math.floor(screenPos.y), 
        Math.ceil(this.viewport.cellSize), 
        Math.ceil(this.viewport.cellSize)
      );
    }
  }

  /**
   * Draw a line between two cell coordinates
   */
  drawLine(startCell, endCell, color = '#ffffff', lineWidth = 1) {
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
  drawRect(topLeftCell, bottomRightCell, color = '#ffffff', lineWidth = 1) {
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
  render(liveCells, overlays = []) {
    // Draw grid background
    this.drawGrid();
    
    // Draw live cells
    this.drawCells(liveCells);
    
    // Draw overlays (tools, previews, etc.)
    for (const overlay of overlays) {
      overlay.draw(this);
    }
  }

  /**
   * Resize the canvas and update viewport
   */
  resize(width, height) {
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.viewport.width = width;
    this.viewport.height = height;
    
    this.setupHighDPI();
    this.gridCache = null; // Invalidate grid cache
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.colorCache.clear();
    this.gridCache = null;
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
    this.lineWidth = options.lineWidth || Math.max(1, Math.min(4, (options.cellSize || 8) / 6));
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