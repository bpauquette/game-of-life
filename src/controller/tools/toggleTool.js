// Toggle tool: left drag paints cells alive, right drag paints cells dead.
export const toggleTool = {
  onMouseDown(toolState, x, y, setCellAlive) {
    // Ignore duplicate mouse-down dispatches for the same gesture.
    // The controller pre-populates start/last before calling into tool handlers,
    // so we must not key off start/last here.
    if (toolState._toggleGestureActive) return;
    toolState._toggleGestureActive = true;

    toolState.start = { x, y };
    toolState.last = { x, y };
    toolState._toggledCells = new Set();
    this._paintCellOnce(toolState, x, y, setCellAlive);
  },

  onMouseMove(toolState, x, y, setCellAlive) {
    const last = toolState.last;
    if (!last) {
      toolState.last = { x, y };
      return;
    }
    const { x: lx, y: ly } = last;
    const dx = x - lx;
    const dy = y - ly;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    // Keep single-click behavior deterministic: onMouseDown already toggled once.
    if (steps === 0) return;

    // Start at 1 to avoid re-toggling the cell that was toggled on mouse down.
    for (let i = 1; i <= steps; i += 1) {
      const px = Math.round(lx + (dx * i) / steps);
      const py = Math.round(ly + (dy * i) / steps);
      this._paintCellOnce(toolState, px, py, setCellAlive);
    }

    toolState.last = { x, y };
  },

  onMouseUp(toolState) {
    toolState.start = null;
    toolState.last = null;
    delete toolState._toggleGestureActive;
    delete toolState._toggledCells;
  },

  drawOverlay() {
    // no-op
  },

  _paintCellOnce(toolState, x, y, setCellAlive) {
    const toggledCells = this._getToggledCells(toolState);
    const key = `${x},${y}`;
    if (toggledCells.has(key)) return;
    toggledCells.add(key);
    this._paintCell(toolState, x, y, setCellAlive);
  },

  _getToggledCells(toolState) {
    if (!(toolState._toggledCells instanceof Set)) {
      toolState._toggledCells = new Set();
    }
    return toolState._toggledCells;
  },

  _paintCell(toolState, x, y, setCellAlive) {
    if (typeof setCellAlive !== 'function') return;
    setCellAlive(x, y, toolState.drawAlive !== false);
  }
};
