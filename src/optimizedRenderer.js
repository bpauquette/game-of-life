// optimizedRenderer.js
// High-performance renderer with dirty region tracking, color caching, and selective redraws

// Rendering constants
const GRID_LINE_OFFSET = 0.5;
const GRID_COLOR = '#202020';
const BACKGROUND_COLOR = 'black';
const HUE_MULTIPLIER_X = 53;
const HUE_MULTIPLIER_Y = 97;
const HUE_MAX = 360;
const CELL_SATURATION = 80;
const CELL_LIGHTNESS = 55;

// Performance optimizations
const COLOR_CACHE = new Map();
const MAX_COLOR_CACHE_SIZE = 10000;
let lastLiveCells = new Map();
let lastCellSize = 0;
let lastOffset = { x: 0, y: 0 };
let gridCanvas = null;
let gridContext = null;

/**
 * Pre-compute and cache HSL color for a cell position
 */
function getCachedCellColor(x, y) {
  const key = `${x},${y}`;
  let color = COLOR_CACHE.get(key);
  
  if (!color) {
    const hue = (x * HUE_MULTIPLIER_X + y * HUE_MULTIPLIER_Y) % HUE_MAX;
    color = `hsl(${hue}, ${CELL_SATURATION}%, ${CELL_LIGHTNESS}%)`;
    
    // Prevent cache from growing too large
    if (COLOR_CACHE.size >= MAX_COLOR_CACHE_SIZE) {
      // Clear 25% of cache when it gets too big
      const entries = Array.from(COLOR_CACHE.entries());
      for (let i = 0; i < entries.length / 4; i++) {
        COLOR_CACHE.delete(entries[i][0]);
      }
    }
    
    COLOR_CACHE.set(key, color);
  }
  
  return color;
}

/**
 * Create or update cached grid background using center-based coordinate system
 */
function renderGridToCache(width, height, cellSizePx, offsetRef) {
  const offset = offsetRef.current;
  
  if (!gridCanvas || 
      gridCanvas.width !== width || 
      gridCanvas.height !== height ||
      lastCellSize !== cellSizePx ||
      lastOffset.x !== offset.x ||
      lastOffset.y !== offset.y) {
    
    // Create or resize grid canvas
    if (!gridCanvas) {
      gridCanvas = document.createElement('canvas');
      gridContext = gridCanvas.getContext('2d');
    }
    
    gridCanvas.width = width;
    gridCanvas.height = height;
    
    // Clear and draw grid
    gridContext.fillStyle = BACKGROUND_COLOR;
    gridContext.fillRect(0, 0, width, height);
    
    gridContext.strokeStyle = GRID_COLOR;
    gridContext.beginPath();
    
    // Use the same grid calculation as original renderer
    let startX = (-offset.x * cellSizePx) % cellSizePx;
    if (startX < 0) startX += cellSizePx;
    for (let x = startX; x < width; x += cellSizePx) {
      gridContext.moveTo(x + GRID_LINE_OFFSET, 0);
      gridContext.lineTo(x + GRID_LINE_OFFSET, height);
    }
    
    let startY = (-offset.y * cellSizePx) % cellSizePx;
    if (startY < 0) startY += cellSizePx;
    for (let y = startY; y < height; y += cellSizePx) {
      gridContext.moveTo(0, y + GRID_LINE_OFFSET);
      gridContext.lineTo(width, y + GRID_LINE_OFFSET);
    }
    
    gridContext.stroke();
    
    // Update cache tracking
    lastCellSize = cellSizePx;
    lastOffset = { ...offset };
  }
  
  return gridCanvas;
}

/**
 * Calculate which cells have changed between frames
 */
function getDirtyCells(currentLiveCells, previousLiveCells) {
  const dirtyCells = new Set();
  
  // Find cells that are newly alive
  for (const [key] of currentLiveCells.entries()) {
    if (!previousLiveCells.has(key)) {
      dirtyCells.add(key);
    }
  }
  
  // Find cells that just died
  for (const [key] of previousLiveCells.entries()) {
    if (!currentLiveCells.has(key)) {
      dirtyCells.add(key);
    }
  }
  
  return dirtyCells;
}

/**
 * Draw only the cells that have changed using center-based coordinates
 */
function drawDirtyCells(ctx, dirtyCells, currentLiveCells, cellSizePx, computedOffset, width, height) {
  for (const key of dirtyCells) {
    const [cx, cy] = key.split(',').map(Number);
    const sx = cx * cellSizePx - computedOffset.x;
    const sy = cy * cellSizePx - computedOffset.y;
    
    // Skip cells outside viewport
    if (sx + cellSizePx < 0 || sx >= width || sy + cellSizePx < 0 || sy >= height) {
      continue;
    }
    
    if (currentLiveCells.has(key)) {
      // Draw live cell
      ctx.fillStyle = getCachedCellColor(cx, cy);
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cellSizePx), Math.ceil(cellSizePx));
    } else {
      // Clear dead cell by redrawing background
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cellSizePx), Math.ceil(cellSizePx));
      
      // Redraw grid lines for this cell
      ctx.strokeStyle = GRID_COLOR;
      ctx.beginPath();
      
      // Vertical line on left edge
      const gridX = Math.floor(sx) + GRID_LINE_OFFSET;
      if (gridX >= 0 && gridX <= width) {
        ctx.moveTo(gridX, Math.floor(sy));
        ctx.lineTo(gridX, Math.floor(sy) + Math.ceil(cellSizePx));
      }
      
      // Horizontal line on top edge
      const gridY = Math.floor(sy) + GRID_LINE_OFFSET;
      if (gridY >= 0 && gridY <= height) {
        ctx.moveTo(Math.floor(sx), gridY);
        ctx.lineTo(Math.floor(sx) + Math.ceil(cellSizePx), gridY);
      }
      
      ctx.stroke();
    }
  }
}

/**
 * Optimized scene drawing with selective updates using center-based coordinates
 */
export function drawSceneOptimized(ctx, { liveCellsRef, offsetRef, cellSizePx }, forceFullRedraw = false) {
  const startTime = performance.now();
  
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const currentLiveCells = liveCellsRef.current;
  const offset = offsetRef.current;
  
  // Calculate computed offset using center-based coordinate system (same as original)
  const centerX = width / 2;
  const centerY = height / 2;
  const computedOffset = {
    x: offset.x * cellSizePx - centerX,
    y: offset.y * cellSizePx - centerY
  };
  
  // Detect if we need a full redraw
  const sizeChanged = lastCellSize !== cellSizePx;
  const offsetChanged = lastOffset.x !== offset.x || lastOffset.y !== offset.y;
  const needsFullRedraw = forceFullRedraw || sizeChanged || offsetChanged || !lastLiveCells.size;
  
  if (needsFullRedraw) {
    // Full redraw - draw cached grid background
    const cachedGrid = renderGridToCache(width, height, cellSizePx, offsetRef);
    ctx.drawImage(cachedGrid, 0, 0);
    
    // Draw all live cells using center-based coordinates
    for (const [key] of currentLiveCells.entries()) {
      const [cx, cy] = key.split(',').map(Number);
      const sx = cx * cellSizePx - computedOffset.x;
      const sy = cy * cellSizePx - computedOffset.y;
      
      // Skip cells outside viewport
      if (sx + cellSizePx < 0 || sx >= width || sy + cellSizePx < 0 || sy >= height) continue;
      
      ctx.fillStyle = getCachedCellColor(cx, cy);
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cellSizePx), Math.ceil(cellSizePx));
    }
    
    lastLiveCells = new Map(currentLiveCells);
  } else {
    // Selective redraw - only update changed cells
    const dirtyCells = getDirtyCells(currentLiveCells, lastLiveCells);
    
    if (dirtyCells.size > 0) {
      drawDirtyCells(ctx, dirtyCells, currentLiveCells, cellSizePx, computedOffset, width, height);
      lastLiveCells = new Map(currentLiveCells);
    }
  }
  
  const renderTime = performance.now() - startTime;
  
  // Track performance if speed gauge is available
  if (window.speedGaugeTracker) {
    window.speedGaugeTracker(renderTime, renderTime);
  }
  
  return {
    renderTime,
    cellsRendered: needsFullRedraw ? currentLiveCells.size : getDirtyCells(currentLiveCells, lastLiveCells).size,
    fullRedraw: needsFullRedraw
  };
}

/**
 * Batch render multiple cells efficiently using center-based coordinates
 */
export function drawCellsBatch(ctx, cells, cellSizePx, offsetRef) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const offset = offsetRef.current;
  
  // Calculate computed offset
  const centerX = width / 2;
  const centerY = height / 2;
  const computedOffset = {
    x: offset.x * cellSizePx - centerX,
    y: offset.y * cellSizePx - centerY
  };
  
  // Group cells by color to minimize context switches
  const colorGroups = new Map();
  
  for (const cell of cells) {
    const cx = cell.x ?? cell[0];
    const cy = cell.y ?? cell[1];
    const sx = cx * cellSizePx - computedOffset.x;
    const sy = cy * cellSizePx - computedOffset.y;
    
    // Skip cells outside viewport
    if (sx + cellSizePx < 0 || sx >= width || sy + cellSizePx < 0 || sy >= height) {
      continue;
    }
    
    const color = getCachedCellColor(cx, cy);
    if (!colorGroups.has(color)) {
      colorGroups.set(color, []);
    }
    colorGroups.get(color).push({ sx: Math.floor(sx), sy: Math.floor(sy) });
  }
  
  // Draw each color group in batch
  for (const [color, positions] of colorGroups) {
    ctx.fillStyle = color;
    for (const pos of positions) {
      ctx.fillRect(pos.sx, pos.sy, Math.ceil(cellSizePx), Math.ceil(cellSizePx));
    }
  }
}

/**
 * Clear cached data when needed
 */
export function clearRenderCache() {
  COLOR_CACHE.clear();
  lastLiveCells.clear();
  lastCellSize = 0;
  lastOffset = { x: 0, y: 0 };
  if (gridCanvas) {
    gridCanvas.width = 0;
    gridCanvas.height = 0;
  }
}

/**
 * Get current cache statistics
 */
export function getRenderStats() {
  return {
    colorCacheSize: COLOR_CACHE.size,
    lastCellCount: lastLiveCells.size,
    gridCacheSize: gridCanvas ? gridCanvas.width * gridCanvas.height : 0
  };
}