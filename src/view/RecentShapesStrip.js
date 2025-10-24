import React from 'react';
import PropTypes from 'prop-types';

// Constants for recent shapes strip
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

// Styling constants for enhanced appearance
const CONTAINER_BACKGROUND = 'rgba(0,0,0,0.7)';
const CONTAINER_BORDER = '1px solid rgba(255,255,255,0.1)';
const CONTAINER_SHADOW = '0 4px 12px rgba(0,0,0,0.4)';
const LABEL_BACKGROUND = 'rgba(0,0,0,0.8)';
const LABEL_COLOR = '#ffffff';
const LABEL_FONT_SIZE = '10px';
const LABEL_PADDING = '2px 6px';
const LABEL_BORDER_RADIUS = '4px';
const SELECTED_BORDER_COLOR = '#00ff88';
const SELECTED_BORDER_WIDTH = '3px';
const SELECTED_BOX_SHADOW = '0 0 10px rgba(0, 255, 136, 0.6), inset 0 0 5px rgba(0, 255, 136, 0.2)';
const SELECTED_BACKGROUND_OVERLAY = 'rgba(0, 255, 136, 0.1)';

const RecentShapesStrip = ({ 
  recentShapes = [], 
  selectShape, 
  drawWithOverlay, 
  colorScheme = {},
  selectedShape = null
}) => {
  const getShapeKey = (shape, index) => {
    // Always include the index to ensure uniqueness even when parent provides
    // duplicate ids. This avoids React duplicate key warnings while keeping
    // keys stable for the same array ordering.
    if (shape?.id) return `${shape.id}-${index}`;
    if (shape?.name) return `${shape.name}-${index}`;
    // Generate a stable content-based key instead of using array index
    try {
      return `${JSON.stringify(shape)}-${index}`;
    } catch (e) {
      return `shape-${index}`;
    }
  };

  const getShapeCells = (shape) => {
    if (shape && Array.isArray(shape.cells)) return shape.cells;
    if (Array.isArray(shape)) return shape;
    return [];
  };

  const getShapeDimensions = (cells) => {
    if (cells.length === 0) return { width: DEFAULT_SHAPE_SIZE, height: DEFAULT_SHAPE_SIZE };
    
    const width = cells.reduce((max, c) => {
      const x = Array.isArray(c) ? c[ARRAY_X_INDEX] : (c.x || 0);
      return Math.max(max, x);
    }, 0) + 1;
    
    const height = cells.reduce((max, c) => {
      const y = Array.isArray(c) ? c[ARRAY_Y_INDEX] : (c.y || 0);
      return Math.max(max, y);
    }, 0) + 1;
    
    return { width, height };
  };

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
      return false;
    }
  };

  const getCellCoordinates = (cell) => {
    return {
      x: Array.isArray(cell) ? cell[ARRAY_X_INDEX] : (cell.x || 0),
      y: Array.isArray(cell) ? cell[ARRAY_Y_INDEX] : (cell.y || 0)
    };
  };

  const renderGridBackground = (width, height, shapeKey) => {
    return Array.from({ length: width }).map((_, cx) => (
      Array.from({ length: height }).map((__, cy) => (
        <rect 
          key={`g-${shapeKey}-${cx}-${cy}`} 
          x={cx} 
          y={cy} 
          width={1} 
          height={1} 
          fill="transparent" 
          stroke={GRID_STROKE_COLOR} 
        />
      ))
    ));
  };

  const renderShapeCells = (cells, shapeKey, colorScheme) => {
    return cells.map((cell, index) => {
      const { x, y } = getCellCoordinates(cell);
      const fillColor = colorScheme?.getCellColor?.(x, y) ?? DEFAULT_SHAPE_COLOR;
      
      return (
        <rect 
          key={`c-${shapeKey}-${index}`} 
          x={x} 
          y={y} 
          width={1} 
          height={1} 
          fill={fillColor} 
        />
      );
    });
  };

  const handleShapeClick = (shape) => {
    selectShape(shape);
    drawWithOverlay();
  };

  if (recentShapes.length === 0) {
    return null;
  }

  return (
    <div 
      style={{
        background: CONTAINER_BACKGROUND,
        border: CONTAINER_BORDER,
        borderRadius: SHAPE_BORDER_RADIUS,
        boxShadow: CONTAINER_SHADOW,
        padding: '12px 8px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div 
        style={{
          fontSize: '12px',
          color: LABEL_COLOR,
          marginBottom: '8px',
          fontWeight: '500',
          textAlign: 'center',
          opacity: 0.8
        }}
      >
        Recent Shapes
      </div>
      {recentShapes.map((shape, index) => {
        const key = getShapeKey(shape, index);
        const cells = getShapeCells(shape);
        const { width, height } = getShapeDimensions(cells);
        const title = getShapeTitle(shape, index);

        return (
          <button 
            key={key} 
            type="button"
            style={{ 
              marginBottom: SHAPE_MARGIN_BOTTOM, 
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              background: 'transparent',
              border: 'none',
              padding: 0
            }} 
            onClick={() => handleShapeClick(shape)}
            title={title}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              if (!isShapeSelected(shape)) {
                e.currentTarget.querySelector('svg').style.borderColor = SHAPE_BORDER_HOVER_COLOR;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              if (!isShapeSelected(shape)) {
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
                background: isShapeSelected(shape)
                  ? `linear-gradient(${SELECTED_BACKGROUND_OVERLAY}, ${SELECTED_BACKGROUND_OVERLAY}), ${colorScheme.background || '#1a1a1a'}`
                  : colorScheme.background || '#1a1a1a',
                border: isShapeSelected(shape) 
                  ? `${SELECTED_BORDER_WIDTH} solid ${SELECTED_BORDER_COLOR}` 
                  : `1px solid ${SHAPE_BORDER_COLOR}`, 
                borderRadius: SHAPE_BORDER_RADIUS,
                boxShadow: isShapeSelected(shape) ? SELECTED_BOX_SHADOW : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {renderGridBackground(width, height, key)}
              {renderShapeCells(cells, key, colorScheme)}
            </svg>
            {isShapeSelected(shape) && (
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
                background: LABEL_BACKGROUND,
                color: LABEL_COLOR,
                fontSize: LABEL_FONT_SIZE,
                padding: LABEL_PADDING,
                borderRadius: LABEL_BORDER_RADIUS,
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
        );
      })}
    </div>
  );
};

RecentShapesStrip.propTypes = {
  recentShapes: PropTypes.array,
  selectShape: PropTypes.func.isRequired,
  drawWithOverlay: PropTypes.func.isRequired,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object
};

export default RecentShapesStrip;