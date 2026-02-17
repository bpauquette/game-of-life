import logger from '../utils/logger.js';
import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes.js';
const tokenOr = (name, fallback) => {
  try {
    const root = globalThis.document?.documentElement;
    if (!root) return fallback;
    const v = globalThis.getComputedStyle(root).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  } catch (e) {
    return fallback;
  }
};
// Rectangular area capture tool for shapes catalog
// Uses eyedropper metaphor for sampling/capturing patterns from the grid

// Visual constants for capture tool
const SELECTION_STROKE_COLOR = tokenOr('--accent-success', 'rgba(0, 255, 136, 0.8)');
const SELECTION_FILL_COLOR = tokenOr('--warning-surface', 'rgba(0, 255, 136, 0.1)');
const CAPTURED_CELL_COLOR = tokenOr('--accent-warning', 'rgba(255, 255, 0, 0.6)');
const SELECTION_LINE_WIDTH = 2;
const DASH_PATTERN = [5, 5];

const getBounds = (start, x, y) => ({
  minX: Math.min(start.x, x),
  maxX: Math.max(start.x, x),
  minY: Math.min(start.y, y),
  maxY: Math.max(start.y, y),
});

const buildPreviewPerimeter = ({ minX, maxX, minY, maxY }) => {
  const preview = [];
  for (let px = minX; px <= maxX; px++) {
    preview.push([px, minY], [px, maxY]);
  }
  for (let py = minY + 1; py < maxY; py++) {
    preview.push([minX, py], [maxX, py]);
  }
  return preview;
};

const forEachLiveCell = (liveCells, callback) => {
  if (typeof liveCells?.forEachCell === 'function') {
    liveCells.forEachCell(callback);
    return;
  }
  if (typeof liveCells?.entries === 'function') {
    for (const [key] of liveCells.entries()) {
      const [cellX, cellY] = String(key).split(',').map(Number);
      if (Number.isFinite(cellX) && Number.isFinite(cellY)) {
        callback(cellX, cellY);
      }
    }
  }
};

const isWithinBounds = (cellX, cellY, bounds) =>
  cellX >= bounds.minX && cellX <= bounds.maxX && cellY >= bounds.minY && cellY <= bounds.maxY;

const collectCapturedCells = (liveCells, bounds) => {
  const captured = [];
  forEachLiveCell(liveCells, (cellX, cellY) => {
    if (isWithinBounds(cellX, cellY, bounds)) {
      captured.push([cellX, cellY]);
    }
  });
  return captured;
};

const collectNormalizedCells = (liveCells, bounds) => {
  const normalized = [];
  forEachLiveCell(liveCells, (cellX, cellY) => {
    if (isWithinBounds(cellX, cellY, bounds)) {
      normalized.push({
        x: cellX - bounds.minX,
        y: cellY - bounds.minY,
      });
    }
  });
  return normalized;
};

const resetSelectionState = (toolState) => {
  toolState.start = null;
  toolState.end = null;
  toolState.preview = [];
  toolState.capturedCells = [];
};

const buildCaptureData = (capturedCells, bounds) => ({
  cells: capturedCells,
  width: bounds.maxX - bounds.minX + 1,
  height: bounds.maxY - bounds.minY + 1,
  originalBounds: bounds,
  cellCount: capturedCells.length,
});

export const captureTool = {
  getOverlay(toolState /*, cellSize */) {
    // Provide a descriptor overlay so GameRenderer can draw it during main render
    if (!toolState.start || !toolState.end) return null;
    const cells = Array.isArray(toolState.preview) ? toolState.preview : [];
    // Use a subtle greenish highlight similar to the tool's canvas overlay
    return makeCellsHighlightOverlay(cells, { color: 'rgba(0,255,136,0.28)', alpha: 0.6 });
  },
  onMouseDown(toolState, x, y) {
    // Start rectangle selection
    toolState.start = { x, y };
    toolState.end = { x, y };
    toolState.preview = [];
    toolState.capturedCells = [];
  },

  onMouseMove(toolState, x, y, setCellAlive, getLiveCells) {
    if (!toolState.start) return;

    toolState.end = { x, y };
    const bounds = getBounds(toolState.start, x, y);
    toolState.preview = buildPreviewPerimeter(bounds);

    if (getLiveCells) {
      toolState.capturedCells = collectCapturedCells(getLiveCells(), bounds);
    }
  },

  onMouseUp(toolState, x, y, setCellAlive, getLiveCells, tool) {
    if (!toolState.start) return;

    const bounds = getBounds(toolState.start, x, y);
    let capturedCells = [];
    if (getLiveCells) {
      capturedCells = collectNormalizedCells(getLiveCells(), bounds);
    }

    const captureData = buildCaptureData(capturedCells, bounds);
    logger.debug('Capture tool generated data:', captureData);
    resetSelectionState(toolState);

    if (tool?.onCaptureComplete) {
      try {
        tool.onCaptureComplete(captureData);
      } catch (e) {
        logger.error('onCaptureComplete handler threw:', e);
      }
    } else {
      // Demote to debug by default
      logger.debug('Captured shape:', captureData);
    }
  },

  drawOverlay(ctx, toolState, cellSize, offset) {
    if (!toolState.start || !toolState.end) return;

    const minX = Math.min(toolState.start.x, toolState.end.x);
    const maxX = Math.max(toolState.start.x, toolState.end.x);
    const minY = Math.min(toolState.start.y, toolState.end.y);
    const maxY = Math.max(toolState.start.y, toolState.end.y);

    // Calculate screen coordinates
    const screenMinX = minX * cellSize - offset.x;
    const screenMinY = minY * cellSize - offset.y;
    const screenMaxX = (maxX + 1) * cellSize - offset.x;
    const screenMaxY = (maxY + 1) * cellSize - offset.y;

    ctx.save();

    // Draw selection rectangle with dashed border
    ctx.strokeStyle = SELECTION_STROKE_COLOR;
    ctx.lineWidth = SELECTION_LINE_WIDTH;
    ctx.setLineDash(DASH_PATTERN);
    ctx.strokeRect(
      screenMinX, 
      screenMinY, 
      screenMaxX - screenMinX,
      screenMaxY - screenMinY
    );

    // Fill selection area with semi-transparent overlay
    ctx.fillStyle = SELECTION_FILL_COLOR;
    ctx.fillRect(
      screenMinX, 
      screenMinY, 
      screenMaxX - screenMinX,
      screenMaxY - screenMinY
    );

    // Highlight captured cells
    if (toolState.capturedCells && toolState.capturedCells.length > 0) {
      ctx.fillStyle = CAPTURED_CELL_COLOR;
      for (const [cellX, cellY] of toolState.capturedCells) {
        const screenX = cellX * cellSize - offset.x;
        const screenY = cellY * cellSize - offset.y;
        ctx.fillRect(screenX, screenY, cellSize, cellSize);
      }
    }

    // Draw cell count indicator
    if (toolState.capturedCells) {
      const cellCount = toolState.capturedCells.length;
      const text = `${cellCount} cells`;

      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;

      // Position text near the selection
      const textX = screenMinX;
      const textY = screenMinY - 8;

      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
    }

    ctx.restore();
  }
};
