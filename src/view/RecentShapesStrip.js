import PropTypes from 'prop-types';
import ShapeSlot from './components/ShapeSlot';


const RecentShapesStrip = ({ 
  recentShapes = [], 
  selectShape, 
  drawWithOverlay, 
  colorScheme = {},
  selectedShape = null,
  maxSlots = 8,
  onRotateShape,
  onSwitchToShapesTool
}) => {
  const getShapeTitle = (shape, index) => {
    return shape?.name || shape?.meta?.name || shape?.id || `shape ${index}`;
  };

  const isShapeSelected = (shape) => {
    if (!selectedShape || !shape) return false;
    // Prefer direct id comparison when available
    if (shape.id && selectedShape.id) return shape.id === selectedShape.id;
    if (shape.name && selectedShape.name) return shape.name === selectedShape.name;
    // Fallback to content comparison for robustness
    try {
      return JSON.stringify(shape) === JSON.stringify(selectedShape);
    } catch (e) {
      // Log the error to aid debugging while safely returning a non-selected result
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Failed to compare shapes for selection check:', e);
      }
      return false;
    }
  };

  const handleShapeClick = (shape) => {
    // Guarantee controller/model is updated for overlays
    if (globalThis.gameController && typeof globalThis.gameController.setSelectedShape === 'function') {
      globalThis.gameController.setSelectedShape(shape);
    } else if (typeof selectShape === 'function') {
      selectShape(shape);
    }
    drawWithOverlay();
    if (typeof onSwitchToShapesTool === 'function') {
      onSwitchToShapesTool();
    }
  };

  // Always show maxSlots slots, fill with empty boxes if needed
  const slots = Array.from({ length: maxSlots }, (_, i) => recentShapes[i] || null);

 
 
  return (
    <div
      style={{
        position: 'relative',
        left: 0,
        width: '100vw',
        zIndex: 41,
        pointerEvents: 'auto',
        opacity: 1,
        background: '#222',
        borderRadius: 0,
        boxShadow: 'none',
        padding: '10px 8px 6px 8px',
        maxWidth: '100vw',
        overflowX: 'auto',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slots.map((shape, index) => {
          // Use a stable key: shape.id, shape.name, or fallback to 'empty-slot-index'
          const slotKey = shape
            ? (shape.id || shape.name || `shape-${index}`)
            : `empty-slot-${index}`;
          return (
            <div key={slotKey} style={{ minWidth: 64, maxWidth: 96, flexShrink: 0 }}>
              <ShapeSlot
                shape={shape}
                index={index}
                colorScheme={colorScheme}
                selected={isShapeSelected(shape)}
                title={getShapeTitle(shape, index)}
                onSelect={() => handleShapeClick(shape)}
                onRotate={(rotatedShape, i) => {
                  if (typeof onRotateShape === 'function') {
                    onRotateShape(rotatedShape, i, { inPlace: true });
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

RecentShapesStrip.propTypes = {
  recentShapes: PropTypes.array,
  selectShape: PropTypes.func.isRequired,
  drawWithOverlay: PropTypes.func.isRequired,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object,
  maxSlots: PropTypes.number,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func
};

export default RecentShapesStrip;