 
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

function normalizeCellsForDisplay(cells) {
  if (!cells || cells.length === 0) return [];
  const { minX, minY } = getShapeExtents(cells);
  return cells.map(c => {
    const ARRAY_X_INDEX = 0;
    const ARRAY_Y_INDEX = 1;
    const x = Array.isArray(c) ? c[ARRAY_X_INDEX] : (c.x ?? 0);
    const y = Array.isArray(c) ? c[ARRAY_Y_INDEX] : (c.y ?? 0);
    return { x: x - minX, y: y - minY };
  });
}

// Helper: sample a few cell colors and compare/store them globally to detect mismatches
// Debug helper removed — will log a simple first-cell sample in the component to keep complexity low

// Inline grid rendering is done directly in the component return; helper removed to avoid unused symbol

 

function validateColorScheme(colorScheme, shape) {
  let effectiveColorScheme = colorScheme;
  if (!effectiveColorScheme || typeof effectiveColorScheme.getCellColor !== 'function') {
    if (!globalThis.__shapePreview_warnedMissingScheme) globalThis.__shapePreview_warnedMissingScheme = new Set();
    const seenKey = (shape?.id || shape?.name || '<unknown>');
    if (!globalThis.__shapePreview_warnedMissingScheme.has(seenKey)) {
      globalThis.__shapePreview_warnedMissingScheme.add(seenKey);
      console.warn('[ShapePreview] missing or invalid colorScheme prop for shape', { id: seenKey, provided: effectiveColorScheme });
    }
  }
  return effectiveColorScheme;
}

function getFirstCellInfo(cells) {
  const first = (cells || [])[0];
  if (!first) return null;
  const origX = Array.isArray(first) ? first[0] : (first.x ?? 0);
  const origY = Array.isArray(first) ? first[1] : (first.y ?? 0);
  return { origX, origY };
}

function getSchemeName(colorScheme) {
  return colorScheme?.name || colorScheme?.id || 'unnamed-scheme';
}

function getIdKey(shape, origX, origY) {
  return shape?.id || shape?.name || `${origX},${origY}`;
}

function getGlobalKey(schemeName, idKey, time) {
  return `${schemeName}::${idKey}::${Math.floor(time / 1000)}`;
}

function logColorMatchOrMismatch(prev, color, idKey, schemeName, source) {
  if (prev.color === color) {
    console.debug('[ShapePreview] color match', { shape: idKey, scheme: schemeName, source });
  } else {
    console.warn('[ShapePreview] color mismatch detected', { shape: idKey, scheme: schemeName, prevSource: prev.source, curSource: source, prev: prev.color, cur: color });
  }
}

function logGetCellColorCall(colorScheme, source, schemeName, idKey, origX, origY, time) {
  try {
    const funcInfo = colorScheme?.getCellColor ? String(colorScheme.getCellColor).slice(0, 120) : 'no-getCellColor';
    console.debug('[ShapePreview] getCellColor-call', { source, scheme: schemeName, id: idKey, x: origX, y: origY, time, funcPreview: funcInfo });
  } catch (e) {
    console.debug('[ShapePreview] getCellColor debug failed', e);
  }
}

function debugShapePreview({ cells, colorScheme, shape, time, defaultCellColor, source }) {
  try {
    if (!globalThis?.__GOL_PREVIEW_DEBUG__) return;
    const cellInfo = getFirstCellInfo(cells);
    if (!cellInfo) return;
    const { origX, origY } = cellInfo;
    const color = colorScheme?.getCellColor?.(origX, origY, time) ?? defaultCellColor;
    const idKey = getIdKey(shape, origX, origY);
    const schemeName = getSchemeName(colorScheme);
    const globalKey = getGlobalKey(schemeName, idKey, time);
    if (!globalThis.__shapePreviewColors) globalThis.__shapePreviewColors = new Map();
    const prev = globalThis.__shapePreviewColors.get(globalKey);
    if (prev && prev.source !== source) {
      logColorMatchOrMismatch(prev, color, idKey, schemeName, source);
    } else if (!prev) {
      globalThis.__shapePreviewColors.set(globalKey, { source, color });
      logGetCellColorCall(colorScheme, source, schemeName, idKey, origX, origY, time);
    }
  } catch (err) {
    if (typeof console !== 'undefined' && console.error) console.error('ShapePreview debug error', err);
  }
}

function renderGridLines(w, h, borderOpacity) {
  return (
    <g stroke={`rgba(0,0,0,${borderOpacity})`} fill="none">
      {Array.from({ length: Math.max(1, w) }, (_, i) => (
        <line key={`v-${i}`} x1={i + GRID_LINE_OFFSET} y1={0} x2={i + GRID_LINE_OFFSET} y2={Math.max(1, h)} />
      ))}
      {Array.from({ length: Math.max(1, h) }, (_, j) => (
        <line key={`h-${j}`} x1={0} y1={j + GRID_LINE_OFFSET} x2={Math.max(1, w)} y2={j + GRID_LINE_OFFSET} />
      ))}
    </g>
  );
}

function renderCells(normalized, cells, colorScheme, time, defaultCellColor) {
  return normalized.map((cell, i) => {
    const original = cells[i];
    const origX = Array.isArray(original) ? original[0] : (original.x ?? 0);
    const origY = Array.isArray(original) ? original[1] : (original.y ?? 0);
    const x = cell.x;
    const y = cell.y;
    const fillColor = colorScheme?.getCellColor?.(origX, origY, time) ?? defaultCellColor;
    // Use original coordinates for key to avoid array index
    const key = `c-${origX},${origY}`;
    return <rect key={key} x={x} y={y} width={1} height={1} fill={fillColor} />;
  });
}

export default function ShapePreview({
  shape,
  colorScheme = {},
  boxSize = 72,
  borderRadius = 6,
  borderOpacity = 0.06,
  defaultCellColor = '#222',
  selected = false,
  selectedBorderWidth = '3px',
  selectedBorderColor = '#00ff88',
  selectedBoxShadow = '0 0 10px rgba(0, 255, 136, 0.6), inset 0 0 5px rgba(0, 255, 136, 0.2)',
  selectedBackgroundOverlay = 'rgba(0, 255, 136, 0.1)',
  source = 'unknown'
}) {
  const cells = getShapeCells(shape);
  const { minX, minY, maxX, maxY } = getShapeExtents(cells);
  const w = (shape && (shape.width || shape.w || shape.meta?.width)) || Math.max(1, (maxX - minX + 1));
  const h = (shape && (shape.height || shape.h || shape.meta?.height)) || Math.max(1, (maxY - minY + 1));
  const normalized = cells && cells.length > 0 ? normalizeCellsForDisplay(cells) : [];
  // Removed time: ShapePreview is now fully pure and deterministic.
  const effectiveColorScheme = validateColorScheme(colorScheme, shape);
  const hasCells = normalized.length > 0;
  debugShapePreview({ cells, colorScheme: effectiveColorScheme, shape, defaultCellColor, source });

  return (
    <svg
      width={boxSize}
      height={boxSize}
      viewBox={`0 0 ${Math.max(1, w)} ${Math.max(1, h)}`}
      preserveAspectRatio="xMidYMid meet"
      data-shape-id={shape?.id || shape?.name}
      data-preview-source={source}
      style={{
        background: selected
          ? `linear-gradient(${selectedBackgroundOverlay}, ${selectedBackgroundOverlay}), ${colorScheme.background || '#1a1a1a'}`
          : colorScheme.background || '#1a1a1a',
        border: selected
          ? `${selectedBorderWidth} solid ${selectedBorderColor}`
          : `1px solid rgba(0,0,0,${borderOpacity})`,
        borderRadius,
        boxShadow: selected ? selectedBoxShadow : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {!hasCells
        ? renderGridLines(w, h, borderOpacity)
        : renderCells(normalized, cells, effectiveColorScheme, defaultCellColor)
      }
    </svg>
  );
}

ShapePreview.propTypes = {
  shape: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  colorScheme: PropTypes.object,
  boxSize: PropTypes.number,
  svgSize: PropTypes.number,
  borderRadius: PropTypes.number,
  borderOpacity: PropTypes.number,
  defaultCellColor: PropTypes.string,
  selected: PropTypes.bool,
  selectedBorderWidth: PropTypes.string,
  selectedBorderColor: PropTypes.string,
  selectedBoxShadow: PropTypes.string,
  selectedBackgroundOverlay: PropTypes.string,
  source: PropTypes.string
};
