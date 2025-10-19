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

  // Grid
  ctx.strokeStyle = GRID_COLOR;
  ctx.beginPath();
  let startX = (-off.x * s) % s;
  if (startX < 0) startX += s;
  for (let x = startX; x < width; x += s) {
    ctx.moveTo(x + GRID_LINE_OFFSET, 0);
    ctx.lineTo(x + GRID_LINE_OFFSET, height);
  }
  let startY = (-off.y * s) % s;
  if (startY < 0) startY += s;
  for (let y = startY; y < height; y += s) {
    ctx.moveTo(0, y + GRID_LINE_OFFSET);
    ctx.lineTo(width, y + GRID_LINE_OFFSET);
  }
  ctx.stroke();

  // Alive cells
  for (const [key] of liveCellsRef.current.entries()) {
    const [cx, cy] = key.split(',').map(Number);
    const sx = (cx - off.x) * s;
    const sy = (cy - off.y) * s;
    if (sx + s < 0 || sx >= width || sy + s < 0 || sy >= height) continue;

    const hue = (cx * HUE_MULTIPLIER_X + cy * HUE_MULTIPLIER_Y) % HUE_MAX;
    ctx.fillStyle = `hsl(${hue}, ${CELL_SATURATION}%, ${CELL_LIGHTNESS}%)`;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(s), Math.ceil(s));
  }
}
