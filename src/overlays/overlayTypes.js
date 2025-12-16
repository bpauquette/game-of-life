// Overlay descriptor types and factories
// Pure data overlays decouple controller/tools from the view/renderer

export const OVERLAY_TYPES = {
  SHAPE_PREVIEW: 'shapePreview',
  CELLS_HIGHLIGHT: 'cellsHighlight',
  SHAPE_PREVIEW_WITH_CROSSHAIRS: 'shapePreviewWithCrosshairs',
  // Future: LINE_PREVIEW: 'linePreview', RECT_PREVIEW: 'rectPreview', etc.
};

/**
 * Create a shape preview overlay descriptor
 * @param {Array<{x:number,y:number}>} cells relative cells of the shape (origin at 0,0)
 * @param {{x:number,y:number}} origin grid cell where the preview is anchored
 * @param {{color?:string, alpha?:number}} style optional style
 * @returns {{type:string, cells:Array, origin:Object, style:Object}}
 */
export function makeShapePreviewOverlay(cells, origin, style = {}) {
  // Normalize cells to objects {x, y} to ensure renderer compatibility
  const normalizedCells = Array.isArray(cells)
    ? cells.map((c) => (Array.isArray(c) ? { x: c[0], y: c[1] } : { x: c?.x ?? 0, y: c?.y ?? 0 }))
    : [];

  const normalizedOrigin = origin
    ? { x: origin.x, y: origin.y }
    : null;

  return {
    type: OVERLAY_TYPES.SHAPE_PREVIEW,
    cells: normalizedCells,
    origin: normalizedOrigin,
    style: {
      color: style.color,
      alpha: typeof style.alpha === 'number' ? style.alpha : 0.6,
      getCellColor: style.getCellColor,
    },
  };
}

/**
 * Create a simple absolute-cells highlight overlay descriptor
 * @param {Array<{x:number,y:number}>} cells absolute grid cells to draw
 * @param {{color?:string, alpha?:number}} style optional style
 * @returns {{type:string, cells:Array, style:Object}}
 */
export function makeCellsHighlightOverlay(cells, style = {}) {
  return {
    type: OVERLAY_TYPES.CELLS_HIGHLIGHT,
    cells: Array.isArray(cells)
      ? cells.map(c => (Array.isArray(c) ? { x: c[0], y: c[1] } : { x: c.x, y: c.y }))
      : [],
    style: {
      color: style.color || 'rgba(255,255,255,0.12)',
      alpha: typeof style.alpha === 'number' ? style.alpha : 0.6,
    },
  };
}

/**
 * Create a shape preview overlay with crosshairs descriptor
 * @param {Array<{x:number,y:number}>} cells relative cells of the shape (origin at 0,0)
 * @param {{x:number,y:number}} origin grid cell where the preview is anchored
 * @param {{x:number,y:number}} cursor grid cell where crosshairs are drawn
 * @param {{color?:string, alpha?:number}} style optional style
 * @returns {{type:string, cells:Array, origin:Object, cursor:Object, style:Object}}
 */
export function makeShapePreviewWithCrosshairsOverlay(cells, origin, cursor, style = {}) {
  // Normalize cells to objects {x, y} to ensure renderer compatibility
  const normalizedCells = Array.isArray(cells)
    ? cells.map((c) => (Array.isArray(c) ? { x: c[0], y: c[1] } : { x: c?.x ?? 0, y: c?.y ?? 0 }))
    : [];

  return {
    type: OVERLAY_TYPES.SHAPE_PREVIEW_WITH_CROSSHAIRS,
    cells: normalizedCells,
    origin: origin ? { x: origin.x, y: origin.y } : { x: 0, y: 0 },
    cursor: cursor ? { x: cursor.x, y: cursor.y } : { x: 0, y: 0 },
    style: {
      color: style.color,
      alpha: typeof style.alpha === 'number' ? style.alpha : 0.6,
      getCellColor: style.getCellColor,
    },
  };
}
