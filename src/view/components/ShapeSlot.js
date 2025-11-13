import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { rotateShape } from '../../model/shapeTransforms';
import ShapePreview from './ShapePreview';

const RECENT_SHAPES_THUMBNAIL_SIZE = 64; // match PREVIEW_SVG_SIZE used in ShapePaletteDialog
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
  title
}) {
  // Use a stable timestamp to avoid flicker with animated color schemes (e.g., Spectrum)
  const tRef = useRef(Date.now());
  // Debug sample: log first cell color for recent-strip preview
  try {
    const first = getShapeCells(shape)[0];
    if (first) {
      const fx = Array.isArray(first) ? first[0] : (first.x ?? 0);
      const fy = Array.isArray(first) ? first[1] : (first.y ?? 0);
      // Use the provided colorScheme prop directly. Warn once if it's invalid.
      const sampleColor = colorScheme?.getCellColor?.(fx, fy, tRef.current) ?? DEFAULT_SHAPE_COLOR;
      // Log compact function identity and time for debugging parity with palette previews
      const funcPreview = colorScheme?.getCellColor ? String(colorScheme.getCellColor).slice(0, 120) : 'no-getCellColor';
      // Reduce log noise: only emit detailed debug logs when the global
      // debug flag is enabled. Otherwise, warn once if the colorScheme is
      // missing getCellColor so upstream callers can be fixed.
      const DEBUG = Boolean(globalThis?.__GOL_PREVIEW_DEBUG__);
      if (DEBUG) {
        console.debug('[ShapeSlot] recent-sample', { id: shape?.id || shape?.name, x: fx, y: fy, color: sampleColor, time: tRef.current, funcPreview });
      } else if (!colorScheme?.getCellColor) {
        try {
          if (!globalThis.__shapeSlot_warnedMissingScheme) globalThis.__shapeSlot_warnedMissingScheme = new Set();
          const seenKey = shape?.id || shape?.name || `${index}`;
          if (!globalThis.__shapeSlot_warnedMissingScheme.has(seenKey)) {
            globalThis.__shapeSlot_warnedMissingScheme.add(seenKey);
            console.warn('[ShapeSlot] missing or invalid colorScheme prop for shape', { id: seenKey, provided: colorScheme });
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {
    /* ignore */
  }
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

  let key;
  if (shape?.id) {
    key = `${shape.id}-${index}`;
  } else if (shape?.name) {
    key = `${shape.name}-${index}`;
  } else {
    key = `${index}`;
  }
  

  return (
  <div key={key} style={{ position: 'relative', marginBottom: SHAPE_MARGIN_BOTTOM, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
          width: RECENT_SHAPES_BUTTON_WIDTH,
          // ensure button doesn't expand vertically and keeps thumbnail/title stacked
          boxSizing: 'border-box'
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
          boxSize={RECENT_SHAPES_THUMBNAIL_SIZE}
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
        </div>
      </button>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          key={`rotate-90-${key}`}
          type="button"
          style={{
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.06)',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0.95,
            minWidth: 46,
            textAlign: 'center'
          }}
          title="Rotate 90° (clockwise)"
          onClick={(e) => {
            e.stopPropagation();
            // Use 270° math rotation to achieve 90° clockwise in screen (y-down) coords
            const rotatedCells = rotateShape(getShapeCells(shape), 270);
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
