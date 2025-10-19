import { useState, useCallback, useRef } from 'react';

const MAX_RECENT_SHAPES = 20;

/**
 * Custom hook for managing shape-related functionality in the Game of Life.
 * 
 * Handles:
 * - Shape selection and state management
 * - Recent shapes list maintenance  
 * - Shape palette open/close operations
 * - Tool state synchronization for shapes
 * 
 * @param {Object} params - Configuration object
 * @param {Object} params.selectedShape - Currently selected shape from game state
 * @param {Function} params.setSelectedShape - Function to update selected shape in game state
 * @param {string} params.selectedTool - Currently selected tool
 * @param {Function} params.setSelectedTool - Function to update selected tool
 * @param {Object} params.toolStateRef - Ref for tool state management
 * @param {Function} params.drawWithOverlay - Function to redraw canvas with overlays
 * 
 * @returns {Object} Shape manager interface
 */
export const useShapeManager = ({
  selectedShape,
  setSelectedShape,
  selectedTool,
  setSelectedTool,
  toolStateRef,
  drawWithOverlay
}) => {
  // Local state for shape management
  const [recentShapes, setRecentShapes] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const prevToolRef = useRef(null);

  // Generate a unique key for shape identification and deduplication
  const generateShapeKey = useCallback((shape) => {
    if (shape && shape.id) return String(shape.id);
    if (typeof shape === 'string') return shape;
    return JSON.stringify(shape);
  }, []);

  // Update the recent shapes list, maintaining uniqueness and max length
  const updateRecentShapesList = useCallback((newShape) => {
    setRecentShapes(prev => {
      const newKey = generateShapeKey(newShape);
      const filtered = prev.filter(shape => generateShapeKey(shape) !== newKey);
      return [newShape, ...filtered].slice(0, MAX_RECENT_SHAPES);
    });
  }, [generateShapeKey]);

  // Update shape state in both game state and tool state
  const updateShapeState = useCallback((shape) => {
    const normalizedShape = shape || null;
    setSelectedShape?.(normalizedShape);
    toolStateRef.current.selectedShapeData = normalizedShape;
  }, [setSelectedShape, toolStateRef]);

  // Centralized shape selection: updates shape state, recent list, and triggers redraw
  const selectShape = useCallback((shape) => {
    updateShapeState(shape);
    if (shape) {
      updateRecentShapesList(shape);
    }
    drawWithOverlay();
  }, [updateShapeState, updateRecentShapesList, drawWithOverlay]);

  // Open the shape palette and switch to shapes tool for previews
  const openPalette = useCallback(() => {
    prevToolRef.current = selectedTool;
    // activate shapes tool while the palette is open so previews work
    setSelectedTool && setSelectedTool('shapes');
    setPaletteOpen(true);
  }, [selectedTool, setSelectedTool]);

  // Close the palette and optionally restore the previous tool
  const closePalette = useCallback((restorePrev = true) => {
    setPaletteOpen(false);
    if (restorePrev && prevToolRef.current) {
      setSelectedTool && setSelectedTool(prevToolRef.current);
    }
    prevToolRef.current = null;
  }, [setSelectedTool]);

  // Helper to select a shape and close the palette in one action
  const selectShapeAndClosePalette = useCallback((shape) => {
    selectShape(shape);
    closePalette(false);
  }, [selectShape, closePalette]);

  return {
    // State
    recentShapes,
    paletteOpen,
    
    // Actions
    selectShape,
    openPalette,
    closePalette,
    selectShapeAndClosePalette,
    
    // Internal utilities (exposed for testing)
    generateShapeKey,
    updateRecentShapesList,
    updateShapeState
  };
};

export default useShapeManager;