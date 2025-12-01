import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { rotateShape } from '../../model/shapeTransforms';
import ShapePreview from './ShapePreview';

// Thumbnail size is now passed as a prop for flexibility
const DEFAULT_THUMBNAIL_SIZE = 64;
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
  onSwitchToShapesTool,
  onStartPaletteDrag,
  title,
  thumbnailSize = DEFAULT_THUMBNAIL_SIZE,
  zoom = 1
}) {
  const tRef = useRef();
  // Drag-to-place ghost logic
  const startDrag = (e) => {
    if (e && typeof e.button === 'number' && e.button !== 0) return;
    try { e.preventDefault(); } catch (err) {}
    if (typeof onSelect === 'function') onSelect();
    if (typeof onSwitchToShapesTool === 'function') onSwitchToShapesTool();

    // Remove default drag image
    if (e.dataTransfer) {
      e.dataTransfer.setDragImage(new Image(), 0, 0);
    }

    // Create a new SVG ghost scaled to zoom
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    ghost.style.transform = 'translate(-50%, -50%) scale(' + zoom + ')';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.9';
    ghost.style.zIndex = 20000;
    ghost.style.width = `${thumbnailSize * zoom}px`;
    ghost.style.height = `${thumbnailSize * zoom}px`;
    ghost.innerHTML = `<svg width="${thumbnailSize}" height="${thumbnailSize}" viewBox="0 0 ${thumbnailSize} ${thumbnailSize}" style="width:100%;height:100%;border-radius:${SHAPE_BORDER_RADIUS}px;background:#181818;"><g>${getShapeCells(shape).map(cell => {
      const x = Array.isArray(cell) ? cell[0] : (cell?.x ?? 0);
      const y = Array.isArray(cell) ? cell[1] : (cell?.y ?? 0);
      return `<rect x='${x}' y='${y}' width='1' height='1' fill='${colorScheme?.getCellColor?.(x, y) || DEFAULT_SHAPE_COLOR}'/>`;
    }).join('')}</g></svg>`;
    document.body.appendChild(ghost);

    let cleanupControllerDrag = null;
    try {
      if (typeof onStartPaletteDrag === 'function') {
        cleanupControllerDrag = onStartPaletteDrag(shape, e, ghost);
      }
    } catch (err) {
      cleanupControllerDrag = null;
    }

    const onMove = (ev) => {
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top = `${ev.clientY}px`;
    };

    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      try {
        if (typeof cleanupControllerDrag === 'function') {
          try { cleanupControllerDrag(); } catch (err) { /* ignore cleanup errors */ }
        }
      } catch (err) {
        // swallow
      } finally {
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
  };
  return (
    <div style={{
      border: `3px solid ${selected ? SELECTED_BORDER_COLOR : '#3ad6ff'}`,
      borderRadius: SHAPE_BORDER_RADIUS,
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      width: 130,
      height: 110,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: selected ? '#222' : '#181818',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
      margin: 0,
      position: 'relative',
      overflow: 'visible'
    }}>
      {/* Label above shape, centered */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#fff',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 110,
          margin: '0 auto 8px auto'
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
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
              justifyContent: 'center',
              width: thumbnailSize,
              height: thumbnailSize,
              boxSizing: 'border-box',
              position: 'relative'
            }}
            onClick={onSelect}
            onPointerDown={startDrag}
          title={title}
          onMouseEnter={(e) => {
            if (!selected) {
              e.currentTarget.querySelector('svg').style.borderColor = SHAPE_BORDER_HOVER_COLOR;
            }
          }}
          onMouseLeave={(e) => {
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
        {/* Centered rotate button */}
        {typeof onRotate === 'function' && (
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
              marginLeft: 8,
              height: 32,
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ⟳90
          </button>
        )}
        {/* Drag from thumbnail to canvas to place; onPointerDown starts drag */}
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
  onSwitchToShapesTool: PropTypes.func,
  onStartPaletteDrag: PropTypes.func,
  title: PropTypes.string
};

ShapeSlot.defaultProps = {
  colorScheme: {},
  selected: false,
  title: '',
  onRotate: null
};

export default ShapeSlot;
