/* eslint-disable complexity */
import React from 'react';
import PropTypes from 'prop-types';

const GRID_LINE_OFFSET = 0.5;

function getShapeCells(shape) {
  if (shape && Array.isArray(shape.cells)) return shape.cells;
  if (Array.isArray(shape)) return shape;
  return [];
}

function getShapeExtents(cells) {
  const DEFAULT_SHAPE_SIZE = 8;
  if (!cells || cells.length === 0) {
    return { minX: 0, minY: 0, maxX: DEFAULT_SHAPE_SIZE - 1, maxY: DEFAULT_SHAPE_SIZE - 1 };
  }
  const first = cells[0];
  const ARRAY_X_INDEX = 0;
  const ARRAY_Y_INDEX = 1;
  let baseX = Array.isArray(first) ? first[ARRAY_X_INDEX] : (first.x ?? 0);
  let baseY = Array.isArray(first) ? first[ARRAY_Y_INDEX] : (first.y ?? 0);
  let minX = baseX;
  let minY = baseY;
  let maxX = baseX;
  let maxY = baseY;
  for (let i = 1; i < cells.length; i++) {
    const c = cells[i];
    const x = Array.isArray(c) ? c[ARRAY_X_INDEX] : (c.x ?? 0);
    const y = Array.isArray(c) ? c[ARRAY_Y_INDEX] : (c.y ?? 0);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

// Helper: sample a few cell colors and compare/store them globally to detect mismatches
// Debug helper removed — will log a simple first-cell sample in the component to keep complexity low

// Inline grid rendering is done directly in the component return; helper removed to avoid unused symbol

/* eslint-disable-next-line complexity */
function ShapePreviewComponent({
  shape,
  colorScheme = {},
  boxSize = 72,
  svgSize = 64,
  borderRadius = 6,
  borderOpacity = 0.06,
  defaultCellColor = '#222',
  t,
  selected = false,
  selectedBorderWidth = '3px',
  selectedBorderColor = '#00ff88',
  selectedBoxShadow = '0 0 10px rgba(0, 255, 136, 0.6), inset 0 0 5px rgba(0, 255, 136, 0.2)',
  selectedBackgroundOverlay = 'rgba(0, 255, 136, 0.1)'
  , source = 'unknown'
}) {
  const cells = getShapeCells(shape);
  const { minX, minY, maxX, maxY } = getShapeExtents(cells);
  // Use shape's own extents for grid size
  const w = Math.max(1, (maxX - minX + 1));
  const h = Math.max(1, (maxY - minY + 1));
  // Center shape in grid: offset all cells so shape is centered in viewBox
  let offsetX = 0, offsetY = 0;
  if (cells.length > 0) {
    offsetX = Math.floor((w - (maxX - minX + 1)) / 2) - minX;
    offsetY = Math.floor((h - (maxY - minY + 1)) / 2) - minY;
  }
  const centeredCells = cells.map(c => {
    const x = Array.isArray(c) ? c[0] : (c.x ?? 0);
    const y = Array.isArray(c) ? c[1] : (c.y ?? 0);
    return { x: x + offsetX, y: y + offsetY };
  });

  const time = t || Date.now();

  // Use the passed colorScheme prop directly. If it's missing the expected
  // API (getCellColor) we'll warn once — don't silently fall back to globals.
  let effectiveColorScheme = colorScheme;
  try {
    if (!effectiveColorScheme || typeof effectiveColorScheme.getCellColor !== 'function') {
      if (!globalThis.__shapePreview_warnedMissingScheme) globalThis.__shapePreview_warnedMissingScheme = new Set();
      const seenKey = (shape?.id || shape?.name || '<unknown>');
      if (!globalThis.__shapePreview_warnedMissingScheme.has(seenKey)) {
        globalThis.__shapePreview_warnedMissingScheme.add(seenKey);
        console.warn('[ShapePreview] missing or invalid colorScheme prop for shape', { id: seenKey, provided: effectiveColorScheme });
      }
    }
  } catch (e) {
    // ignore
  }

  const hasCells = cells.length > 0;

  // --- Debugging/check: compare color outputs across different render sources (palette vs recent)
  // To avoid spamming the console, debugging is gated behind a flag and each unique
  // shape+scheme+second is only recorded once. Enable by setting `globalThis.__GOL_PREVIEW_DEBUG__ = true`
  try {
    const DEBUG = Boolean(globalThis?.__GOL_PREVIEW_DEBUG__);
  if (DEBUG) {
      const first = (cells || [])[0];
      if (first) {
        const origX = Array.isArray(first) ? first[0] : (first.x ?? 0);
        const origY = Array.isArray(first) ? first[1] : (first.y ?? 0);
  const color = effectiveColorScheme?.getCellColor?.(origX, origY, time) ?? defaultCellColor;
        const idKey = shape?.id || shape?.name || `${origX},${origY}`;
  const schemeName = effectiveColorScheme?.name || effectiveColorScheme?.id || 'unnamed-scheme';
        const globalKey = `${schemeName}::${idKey}::${Math.floor(time / 1000)}`; // bucket by second
        if (!globalThis.__shapePreviewColors) globalThis.__shapePreviewColors = new Map();
        const prev = globalThis.__shapePreviewColors.get(globalKey);
        if (prev && prev.source !== source) {
          // Only log when there's a mismatch
          if (prev.color !== color) {
            console.warn('[ShapePreview] color mismatch detected', { shape: idKey, scheme: schemeName, prevSource: prev.source, curSource: source, prev: prev.color, cur: color });
          } else {
            console.debug('[ShapePreview] color match', { shape: idKey, scheme: schemeName, source });
          }
        } else if (!prev) {
          // store first-seen (compact)
          globalThis.__shapePreviewColors.set(globalKey, { source, color });
          // also log compact identification info to help debugging when enabled
          try {
            const funcInfo = colorScheme?.getCellColor ? String(colorScheme.getCellColor).slice(0, 120) : 'no-getCellColor';
            console.debug('[ShapePreview] getCellColor-call', { source, scheme: schemeName, id: idKey, x: origX, y: origY, time, funcPreview: funcInfo });
          } catch (e) {
            console.debug('[ShapePreview] getCellColor debug failed', e);
          }
        }
      }
    }
  } catch (err) {
    // avoid breaking rendering
    if (typeof console !== 'undefined' && console.error) console.error('ShapePreview debug error', err);
  }

  // Use shape's own extents for viewBox
  const viewW = w;
  const viewH = h;

  return (
    <svg
      width={boxSize}
      height={boxSize}
      viewBox={`0 0 ${viewW} ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
      data-shape-id={shape?.id || shape?.name}
      data-preview-source={source}
      style={{
        background: selected
          ? `linear-gradient(${selectedBackgroundOverlay}, ${selectedBackgroundOverlay}), ${colorScheme.background || '#1a1a1a'}`
          : colorScheme.background || '#1a1a1a',
        border: 'none',
        borderRadius,
        boxShadow: selected ? selectedBoxShadow : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {!hasCells ? (
        <g stroke={`rgba(0,0,0,${borderOpacity})`} fill="none">
          {Array.from({ length: Math.max(1, w) }, (_, i) => (
            <line key={`v-${i}`} x1={i + GRID_LINE_OFFSET} y1={0} x2={i + GRID_LINE_OFFSET} y2={Math.max(1, h)} />
          ))}
          {Array.from({ length: Math.max(1, h) }, (_, j) => (
            <line key={`h-${j}`} x1={0} y1={j + GRID_LINE_OFFSET} x2={Math.max(1, w)} y2={j + GRID_LINE_OFFSET} />
          ))}
        </g>
      ) : (
        centeredCells.map((cell, i) => {
          // draw at centered coordinates but ask colorScheme for the original coordinates
          const original = cells[i];
          const origX = Array.isArray(original) ? original[0] : (original.x ?? 0);
          const origY = Array.isArray(original) ? original[1] : (original.y ?? 0);
          const x = cell.x;
          const y = cell.y;
          const fillColor = colorScheme?.getCellColor?.(origX, origY, time) ?? defaultCellColor;
          // Add data-testid for integration tests
          const testIdBase = shape?.id || shape?.name;
          const testId = testIdBase ? `${testIdBase}-rect` : undefined;
          return <rect key={`c-${i}`} x={x} y={y} width={1} height={1} fill={fillColor} data-testid={testId} />;
        })
      )}
    </svg>
  );
}

const ShapePreview = React.memo(ShapePreviewComponent, (prev, next) => {
  // Shallow compare by stable identifiers but also ensure the underlying shape data
  // shares the same reference. Rotation updates reuse the same id/name, so relying
  // solely on identifiers prevented React from re-rendering the preview.
  const idPrev = prev.shape?.id || prev.shape?.name;
  const idNext = next.shape?.id || next.shape?.name;
  const sameShapeRef = prev.shape === next.shape;
  const sameArrayShape = Array.isArray(prev.shape) && Array.isArray(next.shape) && prev.shape === next.shape;
  const sameCellsRef = prev.shape?.cells && next.shape?.cells && prev.shape.cells === next.shape.cells;
  const shapeStable = sameShapeRef || sameArrayShape || sameCellsRef;

  if (!shapeStable) {
    return false; // shape object or its cells changed (e.g., after rotation)
  }

  return (
    idPrev === idNext &&
    prev.colorScheme === next.colorScheme &&
    prev.boxSize === next.boxSize &&
    ((prev.selected || false) === (next.selected || false))
  );
});

ShapePreview.propTypes = {
  shape: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  colorScheme: PropTypes.object,
  boxSize: PropTypes.number,
  svgSize: PropTypes.number,
  borderRadius: PropTypes.number,
  borderOpacity: PropTypes.number,
  defaultCellColor: PropTypes.string,
  t: PropTypes.number,
  selected: PropTypes.bool
};

export default ShapePreview;
