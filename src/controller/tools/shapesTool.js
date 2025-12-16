/* eslint-disable */
import { getShapeCells, getCenteredOrigin } from '../../utils/shapeGeometry';
import { makeShapePreviewWithCrosshairsOverlay } from '../../overlays/overlayTypes';

export const shapesTool = {
  getOverlay(toolState, colorScheme) {
    const sel = toolState?.selectedShapeData;
    const last = toolState?.last;
    if (!sel || !last) return null;
    
    const cells = getShapeCells(sel);
    if (!cells?.length) return null;
    
    const origin = getCenteredOrigin(last, cells);
    const cursor = last
      ? { x: last.x, y: last.y, fx: (typeof last.fx === 'number' ? last.fx : last.x), fy: (typeof last.fy === 'number' ? last.fy : last.y) }
      : { x: 0, y: 0, fx: 0, fy: 0 };
    return makeShapePreviewWithCrosshairsOverlay(
      cells,
      origin,
      cursor,
      {
        color: typeof colorScheme?.getCellColor === 'function'
          ? colorScheme.getCellColor(0, 0)
          : colorScheme?.cellColor || '#4CAF50',
        alpha: 0.6,
      }
    );
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
    const sel = toolState?.selectedShapeData;
    const last = toolState.last || (x === undefined ? null : { x, y });
    if (last && sel && placeShape) {
      // Place at the centered origin (where overlay is drawn)
      const cells = getShapeCells(sel);
      const origin = getCenteredOrigin(last, cells);
      placeShape(origin.x, origin.y);
    } else if (last && placeShape) {
      // Fallback: place at last
      placeShape(last.x, last.y);
    }
    toolState.start = null;
    toolState.last = null;
    toolState.dragging = false;
  },
};
