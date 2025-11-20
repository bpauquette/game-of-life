/* eslint-disable */
import { getShapeCells, getCenteredOrigin } from '../../utils/shapeGeometry';


const SHAPE_PREVIEW_ALPHA = 0.6;
const SHAPE_PREVIEW_STROKE_ALPHA = 0.8;
const STROKE_WIDTH = 1;
const PREVIEW_FILL_COLOR = '#4CAF50';
const PREVIEW_STROKE_COLOR = '#2E7D32';
const PLACEMENT_INDICATOR_COLOR = '#FF5722';
const GRID_SNAP_INDICATOR_SIZE = 4;

export const shapesTool = {
  getOverlay(toolState) {
    return buildShapeOverlay(toolState);
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

  drawOverlay(ctx, toolState, cellSize, computedOffset) {
    // Legacy path for the old canvas manager (tests)
    const overlay = buildShapeOverlay(toolState);
    if (!overlay?.draw) return;
    const rendererAdapter = createLegacyRendererAdapter(ctx, cellSize, computedOffset);
    overlay.draw(rendererAdapter);
  },
};

function buildShapeOverlay(toolState) {
  const sel = toolState?.selectedShapeData;
  const last = toolState?.last;
  if (!sel || !last) return null;
  const cells = getShapeCells(sel);
  if (!cells?.length) return null;
  const origin = getCenteredOrigin(last, cells);
  const cursor = { x: last.x, y: last.y };
  return {
    draw(renderer) {
      try {
        drawPlacementIndicator(renderer, cursor);
        drawShapePreview(renderer, cells, origin);
      } catch (error) {
        if (typeof console !== 'undefined') {
          console.warn?.('shapesTool overlay draw failed', error);
        }
      }
    }
  };
}

function createLegacyRendererAdapter(ctx, cellSize, computedOffset) {
  return {
    ctx,
    viewport: { cellSize: cellSize ?? 0 },
    cellToScreen(cellX, cellY) {
      return {
        x: cellX * cellSize - (computedOffset?.x ?? 0),
        y: cellY * cellSize - (computedOffset?.y ?? 0)
      };
    }
  };
}

function drawPlacementIndicator(renderer, position) {
  const ctx = renderer?.ctx;
  const cellSize = renderer?.viewport?.cellSize;
  if (!ctx || !cellSize || !Number.isFinite(cellSize)) return;
  const screenPos = renderer.cellToScreen(position.x, position.y);
  if (!screenPos) return;
  const centerX = screenPos.x + cellSize / 2;
  const centerY = screenPos.y + cellSize / 2;

  ctx.save();
  ctx.strokeStyle = PLACEMENT_INDICATOR_COLOR;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;

  const crossSize = cellSize * 0.3;
  ctx.beginPath();
  ctx.moveTo(centerX - crossSize, centerY);
  ctx.lineTo(centerX + crossSize, centerY);
  ctx.moveTo(centerX, centerY - crossSize);
  ctx.lineTo(centerX, centerY + crossSize);
  ctx.stroke();

  const halfCell = cellSize / 2;
  const cornerSize = GRID_SNAP_INDICATOR_SIZE;
  ctx.lineWidth = 1;

  const drawCorner = (x, y) => {
    ctx.strokeRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
  };

  drawCorner(centerX - halfCell, centerY - halfCell);
  drawCorner(centerX + halfCell, centerY - halfCell);
  drawCorner(centerX - halfCell, centerY + halfCell);
  drawCorner(centerX + halfCell, centerY + halfCell);
  ctx.restore();
}

function drawShapePreview(renderer, cells, anchor) {
  const ctx = renderer?.ctx;
  const cellSize = renderer?.viewport?.cellSize;
  if (!ctx || !cellSize || !Number.isFinite(cellSize)) return;
  ctx.save();
  for (const cell of cells) {
    const { x: cx, y: cy } = normalizeCell(cell);
    const absoluteX = (anchor?.x ?? 0) + cx;
    const absoluteY = (anchor?.y ?? 0) + cy;
    const screenPos = renderer.cellToScreen(absoluteX, absoluteY);
    if (!screenPos) continue;

    ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
    ctx.fillStyle = PREVIEW_FILL_COLOR;
    ctx.fillRect(screenPos.x, screenPos.y, cellSize, cellSize);

    ctx.globalAlpha = SHAPE_PREVIEW_STROKE_ALPHA;
    ctx.strokeStyle = PREVIEW_STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.strokeRect(screenPos.x, screenPos.y, cellSize, cellSize);
  }
  ctx.restore();
}

function normalizeCell(cell) {
  if (!cell) return { x: 0, y: 0 };
  if (typeof cell.x === 'number' && typeof cell.y === 'number') {
    return { x: cell.x, y: cell.y };
  }
  if (Array.isArray(cell)) {
    const x = Number(cell[0]);
    const y = Number(cell[1]);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0
    };
  }
  return { x: 0, y: 0 };
}
