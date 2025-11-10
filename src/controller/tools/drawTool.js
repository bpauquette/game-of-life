// Freehand drawing tool
export const drawTool = {
  // Called when mouse is pressed down
  onMouseDown(toolState, x, y) {
    toolState.start = { x, y };
    toolState.last = { x, y };
    // Set cell alive on mouseDown for single cell draws
    if (toolState.setCellAlive) {
      toolState.setCellAlive(x, y, true);
    }
  },
  onMouseMove(toolState, x, y, setCellAlive, isCellAlive = () => false) {
    const drawToggleMode = JSON.parse(globalThis.localStorage.getItem('drawToggleMode') || 'false');
    if (drawToggleMode) {
      // Original toggle mode
      const { x: lx, y: ly } = toolState.last || { x, y };
      const dx = x - lx;
      const dy = y - ly;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      if (steps === 0) {
        const alive = isCellAlive(x, y);
        setCellAlive(x, y, !alive);
      } else {
        for (let i = 0; i <= steps; i++) {
          const px = Math.round(lx + (dx * i) / steps);
          const py = Math.round(ly + (dy * i) / steps);
          const alive = isCellAlive(px, py);
          setCellAlive(px, py, !alive);
        }
      }
      toolState.last = { x, y };
    } else {
      // New draw mode: always set cells alive as mouse moves, connected line
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
    }
  },
  onMouseUp(toolState, ...args) {
    toolState.start = null;
    toolState.last = null;
  },
  drawOverlay() {
    // No overlay for draw tool in either mode
  }
};
