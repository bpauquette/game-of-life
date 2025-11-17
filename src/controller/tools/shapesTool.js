/* eslint-disable */
import { makeShapePreviewOverlay } from '../../overlays/overlayTypes';


const SHAPE_PREVIEW_ALPHA = 0.6;
const SHAPE_PREVIEW_STROKE_ALPHA = 0.8;
const STROKE_WIDTH = 1;
const PREVIEW_FILL_COLOR = '#4CAF50';
const PREVIEW_STROKE_COLOR = '#2E7D32';
const PLACEMENT_INDICATOR_COLOR = '#FF5722';
const GRID_SNAP_INDICATOR_SIZE = 4;

export const shapesTool = {
  getOverlay(toolState) {
    const sel = toolState.selectedShapeData;
    const last = toolState.last;
    if (!sel) {
      // No selected shape
      return null;
    }
    if (!last) {
      // No cursor position yet
      return null;
    }
    let cells = [];
    if (Array.isArray(sel)) {
      cells = sel;
    } else if (sel && Array.isArray(sel.cells)) {
      cells = sel.cells;
    } else if (sel && Array.isArray(sel.pattern)) {
      cells = sel.pattern;
    } else {
      return null;
    }
    if (!cells.length) {
      return null;
    }
    return makeShapePreviewOverlay(cells, last, {
      alpha: SHAPE_PREVIEW_ALPHA,
      color: PREVIEW_FILL_COLOR,
    });
  },
  onMouseDown(toolState, x, y) {
    toolState.start = { x, y };
    toolState.last = { x, y };
    toolState.dragging = true;
  },

  onMouseMove(toolState, x, y) {
    toolState.last = { x, y };
  },

  onMouseUp(toolState, x, y, setCellAlive, placeShape) {
    const last = toolState.last || (x === undefined ? null : { x, y });
    if (last && placeShape) {
      placeShape(last.x, last.y);
    } else {
      // Missing last/handler
    }
    toolState.start = null;
    toolState.last = null;
    toolState.dragging = false;
  },

  drawOverlay(ctx, toolState, cellSize, computedOffset, colorScheme) {
    try {
      const sel = toolState.selectedShapeData;
      const last = toolState.last;
      if (!sel || !last) return;
      // Normalize cells from different formats
      let cells = [];
      if (Array.isArray(sel)) {
        cells = sel;
      } else if (sel && Array.isArray(sel.cells)) {
        cells = sel.cells;
      } else if (sel && Array.isArray(sel.pattern)) {
        cells = sel.pattern;
      } else { return; }
      if (!cells.length) { return; }
      ctx.save();
      // Draw placement grid indicator (crosshair at placement point)
      this.drawPlacementIndicator(ctx, last, cellSize, computedOffset);
      // Draw shape preview with enhanced visibility
      this.drawShapePreview(ctx, cells, last, cellSize, computedOffset);
      ctx.restore();
    } catch (error) {
       console.log.error(error.message)
    }
  },

  drawPlacementIndicator(ctx, position, cellSize, computedOffset) {
    const centerX = position.x * cellSize - computedOffset.x + cellSize / 2;
    const centerY = position.y * cellSize - computedOffset.y + cellSize / 2;
    
    ctx.strokeStyle = PLACEMENT_INDICATOR_COLOR;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    
    // Draw crosshair
    const crossSize = cellSize * 0.3;
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();
    
    // Draw corner indicators for the cell
    const halfCell = cellSize / 2;
    const cornerSize = GRID_SNAP_INDICATOR_SIZE;
    ctx.strokeStyle = PLACEMENT_INDICATOR_COLOR;
    ctx.lineWidth = 1;
    
    const drawCorner = (x, y) => {
      ctx.strokeRect(x - cornerSize/2, y - cornerSize/2, cornerSize, cornerSize);
    };
    
    drawCorner(centerX - halfCell, centerY - halfCell); // Top-left
    drawCorner(centerX + halfCell, centerY - halfCell); // Top-right
    drawCorner(centerX - halfCell, centerY + halfCell); // Bottom-left
    drawCorner(centerX + halfCell, centerY + halfCell); // Bottom-right
  },

  drawShapePreview(ctx, cells, position, cellSize, computedOffset) {
    // Draw shape cells with improved visibility
    ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
    
    for (const cell of cells) {
      const cx = cell?.x ?? (Array.isArray(cell) ? cell[0] : 0);
      const cy = cell?.y ?? (Array.isArray(cell) ? cell[1] : 0);
      
      const drawX = (position.x + cx) * cellSize - computedOffset.x;
      const drawY = (position.y + cy) * cellSize - computedOffset.y;
      
      // Fill the cell
      ctx.fillStyle = PREVIEW_FILL_COLOR;
      ctx.fillRect(drawX, drawY, cellSize, cellSize);
      
      // Add stroke for better definition
      ctx.globalAlpha = SHAPE_PREVIEW_STROKE_ALPHA;
      ctx.strokeStyle = PREVIEW_STROKE_COLOR;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.strokeRect(drawX, drawY, cellSize, cellSize);
      ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
    }
  }
};
