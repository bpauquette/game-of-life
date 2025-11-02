import React from 'react';
import PropTypes from 'prop-types';
import { rotateShape } from '../../model/shapeTransforms';

const RECENT_SHAPES_THUMBNAIL_SIZE = 48;
const SHAPE_MARGIN_BOTTOM = 12;
const SHAPE_BORDER_RADIUS = 8;
const SHAPE_BORDER_COLOR = 'rgba(255,255,255,0.15)';
const SHAPE_BORDER_HOVER_COLOR = 'rgba(255,255,255,0.3)';
const GRID_STROKE_COLOR = 'rgba(255,255,255,0.02)';
const DEFAULT_SHAPE_COLOR = '#222';
const DEFAULT_SHAPE_SIZE = 8;
const ARRAY_X_INDEX = 0;
const ARRAY_Y_INDEX = 1;

const SELECTED_BORDER_COLOR = '#00ff88';
const SELECTED_BORDER_WIDTH = '3px';
const SELECTED_BOX_SHADOW = '0 0 10px rgba(0, 255, 136, 0.6), inset 0 0 5px rgba(0, 255, 136, 0.2)';
const SELECTED_BACKGROUND_OVERLAY = 'rgba(0, 255, 136, 0.1)';

function getShapeCells(shape) {
  if (shape && Array.isArray(shape.cells)) return shape.cells;
  if (Array.isArray(shape)) return shape;
  return [];
}

function getShapeExtents(cells) {
  if (!cells || cells.length === 0) {
    return { minX: 0, minY: 0, maxX: DEFAULT_SHAPE_SIZE - 1, maxY: DEFAULT_SHAPE_SIZE - 1 };
  }
  // Initialize from first cell to avoid extra conditional checks
  const first = cells[0];
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
    const x = Array.isArray(c) ? c[ARRAY_X_INDEX] : (c.x ?? 0);
    const y = Array.isArray(c) ? c[ARRAY_Y_INDEX] : (c.y ?? 0);
    return { x: x - minX, y: y - minY };
  });
}

function renderGridBackground(width, height, shapeKey) {
  const rects = [];
  for (let cx = 0; cx < width; cx++) {
    for (let cy = 0; cy < height; cy++) {
      rects.push(
        <rect
          key={`g-${shapeKey}-${cx}-${cy}`}
          x={cx}
          y={cy}
          width={1}
          height={1}
          fill="transparent"
          stroke={GRID_STROKE_COLOR}
        />
      );
    }
  }
  return rects;
}

function ShapeSlot({
  shape,
  index,
  colorScheme,
  selected,
  onSelect,
  onRotate,
  title
}) {
  if (!shape) {
    const emptyKey = `empty-slot-${index}`;
    return (
      <div
        key={emptyKey}
        style={{
          marginBottom: SHAPE_MARGIN_BOTTOM,
          width: RECENT_SHAPES_THUMBNAIL_SIZE,
          height: RECENT_SHAPES_THUMBNAIL_SIZE,
          background: '#222',
          border: `1px dashed #555`,
          borderRadius: SHAPE_BORDER_RADIUS,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.4
        }}
        title="Empty slot"
      >
        <span style={{ color: '#888', fontSize: 18 }}>Empty</span>
      </div>
    );
  }

  const key = shape?.id ? `${shape.id}-${index}` : (shape?.name ? `${shape.name}-${index}` : `${index}`);
  const cells = getShapeCells(shape);
  const { minX, minY, maxX, maxY } = getShapeExtents(cells);
  const width = Math.max(1, (maxX - minX + 1));
  const height = Math.max(1, (maxY - minY + 1));
  const normalized = normalizeCellsForDisplay(cells);

  return (
    <div key={key} style={{ position: 'relative', marginBottom: SHAPE_MARGIN_BOTTOM }}>
      <button
        type="button"
        style={{
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          padding: 0,
          display: 'block'
        }}
        onClick={onSelect}
        title={title}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          if (!selected) {
            e.currentTarget.querySelector('svg').style.borderColor = SHAPE_BORDER_HOVER_COLOR;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          if (!selected) {
            e.currentTarget.querySelector('svg').style.borderColor = SHAPE_BORDER_COLOR;
          }
        }}
      >
        <svg
          width={RECENT_SHAPES_THUMBNAIL_SIZE}
          height={RECENT_SHAPES_THUMBNAIL_SIZE}
          viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            background: selected
              ? `linear-gradient(${SELECTED_BACKGROUND_OVERLAY}, ${SELECTED_BACKGROUND_OVERLAY}), ${colorScheme.background || '#1a1a1a'}`
              : colorScheme.background || '#1a1a1a',
            border: selected
              ? `${SELECTED_BORDER_WIDTH} solid ${SELECTED_BORDER_COLOR}`
              : `1px solid ${SHAPE_BORDER_COLOR}`,
            borderRadius: SHAPE_BORDER_RADIUS,
            boxShadow: selected ? SELECTED_BOX_SHADOW : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          {renderGridBackground(width, height, key)}
          {normalized.map((cell, i) => {
            const x = cell.x;
            const y = cell.y;
            const fillColor = colorScheme?.getCellColor?.(x, y) ?? DEFAULT_SHAPE_COLOR;
            return (
              <rect key={`c-${key}-${i}`} x={x} y={y} width={1} height={1} fill={fillColor} />
            );
          })}
        </svg>
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '16px',
              height: '16px',
              background: SELECTED_BORDER_COLOR,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#000',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10
            }}
          >
            ✓
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)',
            color: '#ffffff',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            maxWidth: `${RECENT_SHAPES_THUMBNAIL_SIZE}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
        >
          {title}
        </div>
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 2 }}>
        <button
          key={`rotate-90-${key}`}
          type="button"
          style={{
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0.8
          }}
          title="Rotate 90°"
          onClick={(e) => {
            e.stopPropagation();
            const rotatedCells = rotateShape(getShapeCells(shape), 90);
            const rotatedShape = { ...shape, cells: rotatedCells };
            onRotate(rotatedShape, index);
          }}
        >
          ⟳90
        </button>
      </div>
    </div>
  );
}

ShapeSlot.propTypes = {
  shape: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  index: PropTypes.number.isRequired,
  colorScheme: PropTypes.object,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onRotate: PropTypes.func.isRequired,
  title: PropTypes.string
};

ShapeSlot.defaultProps = {
  colorScheme: {},
  selected: false,
  title: ''
};

export default ShapeSlot;
