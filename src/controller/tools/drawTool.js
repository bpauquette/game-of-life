// Freehand drawing tool
export const drawTool = {
  // Called when mouse is pressed down
  onMouseDown(toolState, x, y, setCellAlive) {
    toolState.start = { x, y };
    toolState.last = { x, y };
    // Draw immediately so single-click paint works.
    if (typeof setCellAlive === 'function') {
      setCellAlive(x, y, true);
    }
  },
  onMouseMove(toolState, x, y, setCellAlive) {
    const { x: lx, y: ly } = toolState.last || { x, y };
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
  onMouseUp(toolState) {
    toolState.start = null;
    toolState.last = null;
  },
  drawOverlay() {
    // No overlay for draw tool in either mode
  }
};
