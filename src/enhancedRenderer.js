// enhancedRenderer.js
// Single unified renderer with performance optimizations but simplified architecture

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
let gridCache = {
  canvas: null,
  context: null,
  lastCellSize: 0,
  lastOffset: { x: 0, y: 0 },
  lastWidth: 0,
  lastHeight: 0
};

/**
 * Get cached HSL color for a cell position (significant performance improvement)
 */
function getCachedCellColor(x, y) {
  const key = `${x},${y}`;
  let color = COLOR_CACHE.get(key);
  
  if (!color) {
    const hue = (x * HUE_MULTIPLIER_X + y * HUE_MULTIPLIER_Y) % HUE_MAX;
    color = `hsl(${hue}, ${CELL_SATURATION}%, ${CELL_LIGHTNESS}%)`;
    
    // Prevent memory leaks - clear old entries when cache gets large
    if (COLOR_CACHE.size >= MAX_COLOR_CACHE_SIZE) {
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
 * Get cached grid background or create new one if parameters changed
 */
function getCachedGrid(width, height, cellSizePx, offset) {
  const needsUpdate = 
    !gridCache.canvas ||
    gridCache.lastWidth !== width ||
    gridCache.lastHeight !== height ||
    gridCache.lastCellSize !== cellSizePx ||
    gridCache.lastOffset.x !== offset.x ||
    gridCache.lastOffset.y !== offset.y;

  if (needsUpdate) {
    // Create or resize grid canvas
    if (!gridCache.canvas) {
      gridCache.canvas = document.createElement('canvas');
      gridCache.context = gridCache.canvas.getContext('2d');
    }

    gridCache.canvas.width = width;
    gridCache.canvas.height = height;
    const ctx = gridCache.context;

    // Clear background
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Draw grid using center-based coordinate system
    ctx.strokeStyle = GRID_COLOR;
    ctx.beginPath();

    const centerX = width / 2;
    const centerY = height / 2;
    const computedOffset = {
      x: offset.x * cellSizePx - centerX,
      y: offset.y * cellSizePx - centerY
    };

    // Calculate grid starting positions
    const gridOffsetX = -computedOffset.x % cellSizePx;
    const gridOffsetY = -computedOffset.y % cellSizePx;

    // Draw vertical grid lines
    for (let x = gridOffsetX; x < width; x += cellSizePx) {
      ctx.moveTo(Math.floor(x) + GRID_LINE_OFFSET, 0);
      ctx.lineTo(Math.floor(x) + GRID_LINE_OFFSET, height);
    }

    // Draw horizontal grid lines
    for (let y = gridOffsetY; y < height; y += cellSizePx) {
      ctx.moveTo(0, Math.floor(y) + GRID_LINE_OFFSET);
      ctx.lineTo(width, Math.floor(y) + GRID_LINE_OFFSET);
    }

    ctx.stroke();

    // Update cache tracking
    gridCache.lastWidth = width;
    gridCache.lastHeight = height;
    gridCache.lastCellSize = cellSizePx;
    gridCache.lastOffset = { ...offset };
  }

  return gridCache.canvas;
}

/**
 * Main rendering function - draws grid and cells with optimizations
 */
export function drawScene(ctx, { liveCellsRef, offsetRef, cellSizePx }) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const offset = offsetRef.current;
  const liveCells = liveCellsRef.current;

  // Draw cached grid background (major performance improvement)
  const gridCanvas = getCachedGrid(width, height, cellSizePx, offset);
  ctx.drawImage(gridCanvas, 0, 0);

  // Calculate center-based coordinate transformation
  const centerX = width / 2;
  const centerY = height / 2;
  const computedOffset = {
    x: offset.x * cellSizePx - centerX,
    y: offset.y * cellSizePx - centerY
  };

  // Draw live cells with viewport culling and color caching
  for (const [key] of liveCells.entries()) {
    const [cx, cy] = key.split(',').map(Number);
    const sx = cx * cellSizePx - computedOffset.x;
    const sy = cy * cellSizePx - computedOffset.y;

    // Skip cells outside viewport (performance optimization)
    if (sx + cellSizePx < 0 || sx >= width || sy + cellSizePx < 0 || sy >= height) {
      continue;
    }

    // Use cached color calculation (performance optimization)
    ctx.fillStyle = getCachedCellColor(cx, cy);
    ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cellSizePx), Math.ceil(cellSizePx));
  }
}

/**
 * Clear all caches - useful when switching contexts or cleaning up
 */
export function clearRenderCaches() {
  COLOR_CACHE.clear();
  gridCache = {
    canvas: null,
    context: null,
    lastCellSize: 0,
    lastOffset: { x: 0, y: 0 },
    lastWidth: 0,
    lastHeight: 0
  };
}