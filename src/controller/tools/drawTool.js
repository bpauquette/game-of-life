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

    if (steps === 0) {
      // Same position - just draw the single cell
      setCellAlive(x, y, true);
    } else {
      for (let i = 0; i <= steps; i++) {
        const px = Math.round(lx + (dx * i) / steps);
        const py = Math.round(ly + (dy * i) / steps);
        setCellAlive(px, py, true);
      }
    }

    toolState.last = { x, y };
  },

  // Called when mouse is released
  onMouseUp(toolState) {
    toolState.start = null;
    toolState.last = null;
  },

  // Optional: draw overlay (e.g., preview line)
  drawOverlay(_ctx, _toolState, _cellSize, _offset) {
    // Intentionally left blank to avoid drawing a persistent overlay line
    // Overlay preview was removed because it caused an unwanted white line artifact.
  },
};
