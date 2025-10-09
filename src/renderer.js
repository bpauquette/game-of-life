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
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Grid
  ctx.strokeStyle = '#202020';
  ctx.beginPath();
  let startX = (-off.x * s) % s;
  if (startX < 0) startX += s;
  for (let x = startX; x < width; x += s) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  let startY = (-off.y * s) % s;
  if (startY < 0) startY += s;
  for (let y = startY; y < height; y += s) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  // Alive cells
  liveCellsRef.current.forEach((_, key) => {
    const [cx, cy] = key.split(',').map(Number);
    const sx = (cx - off.x) * s;
    const sy = (cy - off.y) * s;
    if (sx + s < 0 || sx >= width || sy + s < 0 || sy >= height) return;

    const hue = (cx * 53 + cy * 97) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(s), Math.ceil(s));
  });
}
