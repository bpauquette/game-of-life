/* eslint-disable */
import { getShapeCells, getCenteredOrigin } from '../../utils/shapeGeometry';
import { makeShapePreviewWithCrosshairsOverlay } from '../../overlays/overlayTypes';
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
const SHAPE_OVERLAY_FALLBACK = tokenOr('--accent-success', '#4CAF50');

export const shapesTool = {
  getOverlay(toolState, colorSchemeOrCellSize, cursorFromModel) {
    const sel = toolState?.selectedShapeData;
    // ALWAYS use cursorFromModel (live mouse position) to ensure the shape
    // tracks correctly after shape switches, zooms, or when stationary.
    // toolState.last becomes stale and does not reflect viewport/shape changes.
    const cursor = cursorFromModel;
    // Only show overlay when mouse is down (dragging)
    if (!toolState?.dragging) return null;
    if (!sel || !cursor) return null;

    const cells = getShapeCells(sel);
    if (!cells?.length) return null;

    const anchorX = Number.isFinite(cursor.fx) ? cursor.fx : cursor.x;
    const anchorY = Number.isFinite(cursor.fy) ? cursor.fy : cursor.y;
    const origin = getCenteredOrigin({ x: anchorX, y: anchorY }, cells);
    const overlayCursor = {
      x: anchorX,
      y: anchorY,
      fx: Number.isFinite(cursor.fx) ? cursor.fx : anchorX,
      fy: Number.isFinite(cursor.fy) ? cursor.fy : anchorY,
    };
    const colorScheme = (colorSchemeOrCellSize && typeof colorSchemeOrCellSize === 'object' && !Number.isFinite(colorSchemeOrCellSize))
      ? colorSchemeOrCellSize
      : null;

    return makeShapePreviewWithCrosshairsOverlay(
      cells,
      origin,
      overlayCursor,
      {
        color: typeof colorScheme?.getCellColor === 'function'
          ? colorScheme.getCellColor(0, 0)
          : colorScheme?.cellColor || SHAPE_OVERLAY_FALLBACK,
        alpha: 0.6,
      }
    );
  },
  onMouseDown(toolState, x, y) {
    // Preserve fractional coords when available (fx/fy may be provided by callers)
    toolState.start = { x, y, ...(typeof toolState.start?.fx === 'number' ? { fx: toolState.start.fx } : {}) };
    toolState.last = { x, y, ...(typeof toolState.last?.fx === 'number' ? { fx: toolState.last.fx } : {}) };
    toolState.dragging = true;
  },

  onMouseMove(toolState, x, y) {
    toolState.last = { x, y, ...(typeof toolState.last?.fx === 'number' ? { fx: toolState.last.fx } : {}) };
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
    // Clear last and dragging to hide overlay and crosshairs on mouse up
    toolState.last = null;
    toolState.dragging = false;
  },
};
