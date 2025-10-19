// shapesTool.js — handles preview and placement of shapes selected from the
// Shape Palette. This tool uses the shared toolState object to store a
// non-reactive selectedShapeData and the preview anchor/last coordinates.
export const shapesTool = {
  onMouseDown(toolState, x, y) {
    toolState.start = { x, y };
    toolState.last = { x, y };
    toolState.dragging = true;
  },

  onMouseMove(toolState, x, y) {
    // update preview position
    toolState.last = { x, y };
  },

  // onMouseUp receives the helpers; placeShape will commit the shape into
  // the chunked game state. setCellAlive is unused but accepted for parity.
  onMouseUp(toolState, x, y, setCellAlive, placeShape) {
    const last = toolState.last || (x !== undefined ? { x, y } : null);
    if (last && placeShape) {
      placeShape(last.x, last.y);
    }
    // clear preview state
    toolState.start = null;
    toolState.last = null;
    toolState.dragging = false;
  },

  drawOverlay(ctx, toolState, cellSize, computedOffset, colorScheme) {
    try {
      const sel = toolState.selectedShapeData;
      const last = toolState.last;
      if (!sel || !last) return;

      // normalize cells: either an array of [x,y] pairs or an object { cells: [...] }
      let cells = [];
      if (Array.isArray(sel)) cells = sel;
      else if (sel && Array.isArray(sel?.cells)) cells = sel.cells;
      else return;

      if (!cells.length) return;

      ctx.save();
      ctx.globalAlpha = 0.45;
      const strokeW = Math.max(1, Math.min(2, Math.floor(cellSize * 0.06)));
      for (const c of cells) {
        const cx = c?.x ?? (Array.isArray(c) ? c[0] : 0);
        const cy = c?.y ?? (Array.isArray(c) ? c[1] : 0);
        const drawX = (last.x + cx) * cellSize - computedOffset.x;
        const drawY = (last.y + cy) * cellSize - computedOffset.y;
        try {
          ctx.fillStyle = (typeof colorScheme?.getCellColor === 'function') ? colorScheme.getCellColor(last.x + cx, last.y + cy) : '#222';
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('colorScheme.getCellColor failed', err);
          ctx.fillStyle = '#222';
        }
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
        // outline for visibility regardless of theme
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = strokeW;
        ctx.strokeRect(drawX, drawY, cellSize, cellSize);
        ctx.globalAlpha = 0.45;
      }
      ctx.restore();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('shapesTool.drawOverlay error', err);
    }
  }
};
