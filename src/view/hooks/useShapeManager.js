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
  toolStateRef,
  drawWithOverlay,
  model,
  selectedTool,
  setSelectedTool,
  setSelectedShape
}) => {
  // Local state for shape management
  const [recentShapes, setRecentShapes] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const prevToolRef = useRef(null);

  // Removed aggressive sync of toolStateRef.current.selectedShapeData with selectedShape.
  // Tool state is now only updated on explicit selection (see selectShape).

  // Generate a unique key for shape identification and deduplication
  const generateShapeKey = useCallback((shape) => {
  if (shape?.id) return String(shape.id);
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
  // Helper for debug logging to reduce cognitive complexity
  const debugLog = useCallback((...args) => {
    if (typeof globalThis !== 'undefined' && globalThis.window && globalThis.console) {
      console.debug(...args);
    }
  }, []);

  const updateShapeState = useCallback((shape = null) => {
    debugLog('[useShapeManager] updateShapeState called:', shape);
    if (toolStateRef?.current) {
      debugLog('[useShapeManager] toolStateRef.current before:', toolStateRef.current);
    }
    if (model && typeof model.setSelectedShapeModel === 'function') {
      model.setSelectedShapeModel(shape);
    }
    // Back-compat: notify external setter if provided (tests expect this)
    if (typeof setSelectedShape === 'function') {
      setSelectedShape(shape ?? null);
    }
    if (toolStateRef?.current) {
      toolStateRef.current.selectedShapeData = shape;
      debugLog('[useShapeManager] toolStateRef.current.selectedShapeData set:', toolStateRef.current.selectedShapeData);
      // Strategic logging for preview position (last)
      const last = toolStateRef.current.last;
      if (!last || typeof last.x !== 'number' || typeof last.y !== 'number') {
        toolStateRef.current.last = { x: 0, y: 0 };
        debugLog('[useShapeManager] toolStateRef.current.last set to default:', toolStateRef.current.last);
      } else {
        debugLog('[useShapeManager] toolStateRef.current.last already set:', toolStateRef.current.last);
      }
    }
  }, [toolStateRef, debugLog, model, setSelectedShape]);

  // Centralized shape selection: updates shape state, recent list, and triggers redraw
  const selectShape = useCallback((shape) => {
    updateShapeState(shape);
    if (shape) {
      updateRecentShapesList(shape);
      // Ensure overlay preview position is set
      if (toolStateRef?.current) {
        toolStateRef.current.selectedShapeData = shape;
        // If last is missing or invalid, set to grid center
        if (!toolStateRef.current.last || typeof toolStateRef.current.last.x !== 'number' || typeof toolStateRef.current.last.y !== 'number') {
          toolStateRef.current.last = { x: 0, y: 0 };
        }
      }
    }
    drawWithOverlay();
  }, [updateShapeState, updateRecentShapesList, drawWithOverlay, toolStateRef]);

  // Open the shape palette and switch to shapes tool for previews
  const openPalette = useCallback(() => {
    if (model && typeof model.getSelectedTool === 'function') {
      prevToolRef.current = model.getSelectedTool();
      if (typeof model.setSelectedToolModel === 'function') {
        model.setSelectedToolModel('shapes');
      }
    }
    // Back-compat: mirror to external setter
    if (typeof setSelectedTool === 'function') {
      setSelectedTool('shapes');
    }
    setPaletteOpen?.(true);
  }, [model, setSelectedTool]);

  // Close the palette and optionally restore the previous tool
  const closePalette = useCallback((restorePrev = true) => {
    setPaletteOpen?.(false);
    if (restorePrev && prevToolRef.current && model && typeof model.setSelectedToolModel === 'function') {
      model.setSelectedToolModel(prevToolRef.current);
    }
    if (restorePrev && prevToolRef.current && typeof setSelectedTool === 'function') {
      setSelectedTool(prevToolRef.current);
    }
    prevToolRef.current = null;
  }, [model, setSelectedTool]);

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
    replaceRecentShapeAt: (index, shape) => {
      setRecentShapes(prev => {
        if (index < 0 || index >= prev.length) return prev;
        const next = [...prev];
        next[index] = shape;
        return next;
      });
    },
    
    // Internal utilities (exposed for testing)
    generateShapeKey,
    updateRecentShapesList,
    updateShapeState
  };
};

export default useShapeManager;