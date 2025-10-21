// Rendering constants
const GRID_LINE_OFFSET = 0.5;
const GRID_COLOR = '#202020';
const BACKGROUND_COLOR = 'black';
const HUE_MULTIPLIER_X = 53;
const HUE_MULTIPLIER_Y = 97;
const HUE_MAX = 360;
const CELL_SATURATION = 80;
const CELL_LIGHTNESS = 55;

/**
 * Draws grid + alive cells using:
 *  - offsetRef (cells)
 *  - cellSizePx (pixels per cell)
 *  - liveCellsRef (Map of "x,y")
 */
export function drawScene(ctx, { liveCellsRef, offsetRef, cellSizePx }) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const s = cellSizePx;          
  const off = offsetRef.current;

  // Clear
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Grid - use center-based coordinate system
  ctx.strokeStyle = GRID_COLOR;
  ctx.beginPath();
  
  // Calculate grid starting position using center-based coordinates
  const gridOffsetX = -computedOffset.x % s;
  const gridOffsetY = -computedOffset.y % s;
  
  // Vertical lines
  for (let x = gridOffsetX; x < width; x += s) {
    ctx.moveTo(Math.floor(x) + GRID_LINE_OFFSET, 0);
    ctx.lineTo(Math.floor(x) + GRID_LINE_OFFSET, height);
  }
  
  // Horizontal lines
  for (let y = gridOffsetY; y < height; y += s) {
    ctx.moveTo(0, Math.floor(y) + GRID_LINE_OFFSET);
    ctx.lineTo(width, Math.floor(y) + GRID_LINE_OFFSET);
  }
  ctx.stroke();

  // Alive cells - use center-based coordinate system like optimized renderer
  const centerX = width / 2;
  const centerY = height / 2;
  const computedOffset = {
    x: off.x * s - centerX,
    y: off.y * s - centerY
  };
  
  for (const [key] of liveCellsRef.current.entries()) {
    const [cx, cy] = key.split(',').map(Number);
    const sx = cx * s - computedOffset.x;
    const sy = cy * s - computedOffset.y;
    if (sx + s < 0 || sx >= width || sy + s < 0 || sy >= height) continue;

    const hue = (cx * HUE_MULTIPLIER_X + cy * HUE_MULTIPLIER_Y) % HUE_MAX;
    ctx.fillStyle = `hsl(${hue}, ${CELL_SATURATION}%, ${CELL_LIGHTNESS}%)`;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(s), Math.ceil(s));
  }
}
