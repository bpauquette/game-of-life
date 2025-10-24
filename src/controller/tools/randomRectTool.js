import logger from '../utils/logger';

// Randomize cells within a dragged rectangle. Commits on mouseup.
export const randomRectTool = {
  // Optionally accept a probability in state.prob (0..1)
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    // initialize preview array for tests and UI
    state.preview = [];
    if (state.prob == null) state.prob = 0.5;
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    // Update last position and compute preview rectangle
    state.last = { x, y };
    const pts = computeRect(state.start.x, state.start.y, x, y);
    state.preview = pts;
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    
    // Use final mouse position to compute the rectangle
    const pts = computeRect(state.start.x, state.start.y, x, y);
    
    // For large rectangles, warn and potentially limit size
    if (pts.length > 10000) {
      logger.warn(`Cancelling randomRect - too large (${pts.length} cells)`);
      state.start = null;
      state.last = null;
      return;
    }
    
    const p = Math.max(0, Math.min(1, state.prob ?? 0.5));
    
    // Apply all updates
    for (const point of pts) {
      const px = point[0];
      const py = point[1];
      const shouldBeAlive = Math.random() < p;
      setCellAlive(px, py, shouldBeAlive);
    }
    
    // Clear state
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    if (!(state?.preview?.length)) return;

    // semi-transparent white fill similar to other tools
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const pt of state.preview) {
      const px = pt[0] * cellSize - offset.x;
      const py = pt[1] * cellSize - offset.y;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }
};

const computeRect = (x0, y0, x1, y1) => {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  
  const pts = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      pts.push([x, y]);
    }
  }
  
  return pts;
}
