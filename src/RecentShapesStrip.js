import React from 'react';
import PropTypes from 'prop-types';

// Constants for recent shapes strip
const RECENT_SHAPES_THUMBNAIL_SIZE = 48;
const SHAPE_MARGIN_BOTTOM = 8;
const SHAPE_BORDER_RADIUS = 6;
const SHAPE_BORDER_COLOR = 'rgba(0,0,0,0.06)';
const GRID_STROKE_COLOR = 'rgba(255,255,255,0.02)';
const DEFAULT_SHAPE_COLOR = '#222';
const DEFAULT_SHAPE_SIZE = 8;
const ARRAY_X_INDEX = 0;
const ARRAY_Y_INDEX = 1;

const RecentShapesStrip = ({ 
  recentShapes = [], 
  selectShape, 
  drawWithOverlay, 
  colorScheme = {} 
}) => {
  const getShapeKey = (shape, index) => {
    if (shape && shape.id) return shape.id;
    if (shape && shape.name) return shape.name;
    // Generate a stable content-based key instead of using array index
    return JSON.stringify(shape);
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
    return shape?.name || shape?.meta?.name || (shape && shape.id) || `shape ${index}`;
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

  return (
    <>
      {recentShapes.map((shape, index) => {
        const key = getShapeKey(shape, index);
        const cells = getShapeCells(shape);
        const { width, height } = getShapeDimensions(cells);
        const title = getShapeTitle(shape, index);

        return (
          <div 
            key={key} 
            style={{ 
              marginBottom: SHAPE_MARGIN_BOTTOM, 
              cursor: 'pointer' 
            }} 
            onClick={() => handleShapeClick(shape)} 
            title={title}
          >
            <svg 
              width={RECENT_SHAPES_THUMBNAIL_SIZE} 
              height={RECENT_SHAPES_THUMBNAIL_SIZE} 
              viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`} 
              preserveAspectRatio="xMidYMid meet" 
              style={{ 
                background: colorScheme.background || 'transparent', 
                border: `1px solid ${SHAPE_BORDER_COLOR}`, 
                borderRadius: SHAPE_BORDER_RADIUS 
              }}
            >
              {renderGridBackground(width, height, key)}
              {renderShapeCells(cells, key, colorScheme)}
            </svg>
          </div>
        );
      })}
    </>
  );
};

RecentShapesStrip.propTypes = {
  recentShapes: PropTypes.array,
  selectShape: PropTypes.func.isRequired,
  drawWithOverlay: PropTypes.func.isRequired,
  colorScheme: PropTypes.object
};

export default RecentShapesStrip;