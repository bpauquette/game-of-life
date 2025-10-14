// Freehand drawing tool
export const drawTool = {
  // Called when mouse is pressed down
  onMouseDown(toolState, x, y) {
    toolState.start = { x, y };
    toolState.last = { x, y };
  },

  // Called on mouse move while pressing
  onMouseMove(toolState, x, y, setCellAlive) {
    if (!toolState.last) return;

    const { x: lx, y: ly } = toolState.last;
    // Draw a line from last to current (simple Bresenham could be added)
    const dx = x - lx;
    const dy = y - ly;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= steps; i++) {
      const px = Math.round(lx + (dx * i) / steps);
      const py = Math.round(ly + (dy * i) / steps);
      setCellAlive(px, py, true);
    }

    toolState.last = { x, y };
  },

  // Called when mouse is released
  onMouseUp(toolState) {
    toolState.start = null;
    toolState.last = null;
  },

  // Optional: draw overlay (e.g., preview line)
  drawOverlay(ctx, toolState, cellSize, offset) {
    if (toolState.start && toolState.last) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toolState.start.x * cellSize - offset.x, toolState.start.y * cellSize - offset.y);
      ctx.lineTo(toolState.last.x * cellSize - offset.x, toolState.last.y * cellSize - offset.y);
      ctx.stroke();
    }
  }
};
