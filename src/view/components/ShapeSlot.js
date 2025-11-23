import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { rotateShape } from '../../model/shapeTransforms';
import ShapePreview from './ShapePreview';

// Thumbnail size is now passed as a prop for flexibility
const DEFAULT_THUMBNAIL_SIZE = 64;
const RECENT_SHAPES_BUTTON_WIDTH = 130; // Give label room to avoid ellipsis
const SHAPE_MARGIN_BOTTOM = 12;
// Match palette preview styling: subtle dark border and modest radius
const SHAPE_BORDER_RADIUS = 6; // match PREVIEW_BORDER_RADIUS in ShapePaletteDialog
const SHAPE_BORDER_COLOR = 'rgba(0,0,0,0.06)'; // match PREVIEW_BORDER_OPACITY in ShapePaletteDialog
const SHAPE_BORDER_HOVER_COLOR = 'rgba(255,255,255,0.3)';
const DEFAULT_SHAPE_COLOR = '#222';

const SELECTED_BORDER_COLOR = '#00ff88';

function getShapeCells(shape) {
  if (shape && Array.isArray(shape.cells)) return shape.cells;
  if (Array.isArray(shape)) return shape;
  return [];
}

// helper functions left minimal: only getShapeCells is required by rotate

function ShapeSlot({
    shape,
    index,
    colorScheme,
    selected,
    onSelect,
    onRotate,
    title,
    thumbnailSize = DEFAULT_THUMBNAIL_SIZE
  }) {
    const tRef = useRef();
    return (
      <div style={{
        border: `3px solid ${selected ? SELECTED_BORDER_COLOR : '#3ad6ff'}`,
        borderRadius: SHAPE_BORDER_RADIUS,
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        background: selected ? '#222' : '#181818',
        marginBottom: SHAPE_MARGIN_BOTTOM,
        minWidth: RECENT_SHAPES_BUTTON_WIDTH,
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
      }}>
        <button
          type="button"
          style={{
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: thumbnailSize,
            height: thumbnailSize,
            boxSizing: 'border-box',
            position: 'relative'
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
          <ShapePreview
            shape={shape}
            colorScheme={colorScheme}
            boxSize={thumbnailSize}
            borderRadius={SHAPE_BORDER_RADIUS}
            borderOpacity={0.06}
            defaultCellColor={DEFAULT_SHAPE_COLOR}
            t={tRef.current}
            selected={selected}
            source={'recent'}
          />
          {selected && (
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
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
        </button>
        <div style={{ flex: 1, marginLeft: 10 }}>
          <div
            style={{
              marginTop: 6,
              color: '#ffffff',
              fontSize: '11px',
              lineHeight: 1.2,
              padding: '0 4px',
              textAlign: 'center',
              wordBreak: 'break-word'
            }}
          >
            {title}
            {/* Show shape size below name */}
            {(() => {
              const cells = getShapeCells(shape);
              if (!cells.length) return null;
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const c of cells) {
                const x = Array.isArray(c) ? c[0] : (c.x ?? 0);
                const y = Array.isArray(c) ? c[1] : (c.y ?? 0);
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
              const width = maxX - minX + 1;
              const height = maxY - minY + 1;
              return (
                <div style={{ color: '#b3e6d6', fontSize: '10px', marginTop: 2 }}>
                  {width} x {height}
                </div>
              );
            })()}
          </div>
          <button
            key={`rotate-90-${index}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Use 270° math rotation to achieve 90° clockwise in screen (y-down) coords
              const rotatedCells = rotateShape(getShapeCells(shape), 270);
              const rotatedShape = { ...shape, cells: rotatedCells };
              onRotate(rotatedShape, index);
            }}
            title="Rotate 90° (clockwise)"
            style={{
              fontSize: 12,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.06)',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
              opacity: 0.95,
              minWidth: 46,
              textAlign: 'center',
              marginLeft: 6,
              height: 'fit-content',
              alignSelf: 'center',
              marginTop: 8
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
