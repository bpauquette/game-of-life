import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import ShapeSlot from './components/ShapeSlot';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import WidgetsIcon from '@mui/icons-material/Widgets';

// Constants for recent shapes strip

// Styling constants for enhanced appearance
const CONTAINER_BACKGROUND = 'rgba(0,0,0,0.7)';
const CONTAINER_BORDER = '1px solid rgba(255,255,255,0.1)';
const CONTAINER_SHADOW = '0 4px 12px rgba(0,0,0,0.4)';
const LABEL_COLOR = '#ffffff';
const SHAPE_BORDER_RADIUS = 8;

const RecentShapesStrip = ({ 
  recentShapes = [], 
  selectShape, 
  drawWithOverlay, 
  colorScheme = {},
  selectedShape = null,
  maxSlots = 8,
  onRotateShape,
  onSwitchToShapesTool,
  openPalette
}) => {
  const openShapesPalette = useCallback(() => {
    // Switch to shapes tool and open the palette for browsing
    try { onSwitchToShapesTool?.(); } catch {}
    try { openPalette?.(); } catch {}
  }, [onSwitchToShapesTool, openPalette]);
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          width: '100%',
          marginBottom: 8
        }}
      >
        <div 
          style={{
            fontSize: '12px',
            color: LABEL_COLOR,
            fontWeight: 500,
            opacity: 0.8
          }}
        >
          Recent Shapes
        </div>
        <Tooltip title="Shapes Catalog">
          <IconButton size="small" onClick={openShapesPalette} aria-label="shapes" data-testid="open-shapes-palette">
            <WidgetsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      {slots.map((shape, index) => (
        <ShapeSlot
          key={(shape && (shape.id || shape.name)) ? `${shape.id || shape.name}-${index}` : `slot-${index}`}
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
      ))}
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
  onSwitchToShapesTool: PropTypes.func,
  openPalette: PropTypes.func
};

export default RecentShapesStrip;