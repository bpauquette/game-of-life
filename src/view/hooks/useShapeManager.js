import { useState, useCallback, useRef } from 'react';
import logger from '../../controller/utils/logger';

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
  // Prefer stable cheap keys: use id when available, fall back to name/meta and
  // a compact sample of the cells. Avoid full JSON.stringify on the entire
  // shape (which can be large) because that can block the main thread when
  // shapes contain many cells. Keep keys small and fast to compute.
  if (shape?.id) return String(shape.id);
  if (typeof shape === 'string') return shape;
  let keyParts = [];
  if (shape?.name) keyParts.push(`n:${String(shape.name)}`);
  if (shape?.meta && (shape.meta.width || shape.meta.height || shape.meta.cellCount)) {
    if (shape.meta.width) keyParts.push(`w:${shape.meta.width}`);
    if (shape.meta.height) keyParts.push(`h:${shape.meta.height}`);
    if (shape.meta.cellCount) keyParts.push(`c:${shape.meta.cellCount}`);
  }
  const cells = Array.isArray(shape.cells) ? shape.cells : (Array.isArray(shape.pattern) ? shape.pattern : []);
  if (Array.isArray(cells) && cells.length > 0) {
    keyParts.push(`len:${cells.length}`);
    // include a small sample of first few cells to reduce collisions
    const sampleCount = Math.min(4, cells.length);
    for (let i = 0; i < sampleCount; i++) {
      const c = cells[i];
      const x = Array.isArray(c) ? c[0] : (c?.x ?? 0);
      const y = Array.isArray(c) ? c[1] : (c?.y ?? 0);
      keyParts.push(`${x},${y}`);
    }
  }
  const key = keyParts.join('|');
  return key || JSON.stringify({ name: shape?.name || '', len: (cells && cells.length) || 0 });
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
    // Route debug logging through the centralized logger so it's gated by log level
    if (logger && typeof logger.debug === 'function') {
      logger.debug(...args);
    }
  }, []);

  const updateShapeState = useCallback((shape = null) => {
    debugLog('[useShapeManager] updateShapeState called:', shape);
    if (toolStateRef?.current) {
      debugLog('[useShapeManager] toolStateRef.current before:', toolStateRef.current);
    }
    // model may be a direct model object or a getter function (to handle late-binding)
    const targetModel = (typeof model === 'function') ? model() : model;
    if (targetModel && typeof targetModel.setSelectedShapeModel === 'function') {
      targetModel.setSelectedShapeModel(shape);
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
    const targetModel = (typeof model === 'function') ? model() : model;
    if (targetModel && typeof targetModel.getSelectedTool === 'function') {
      prevToolRef.current = targetModel.getSelectedTool();
      if (typeof targetModel.setSelectedToolModel === 'function') {
        targetModel.setSelectedToolModel('shapes');
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
    const targetModel = (typeof model === 'function') ? model() : model;
    if (restorePrev && prevToolRef.current && targetModel && typeof targetModel.setSelectedToolModel === 'function') {
      targetModel.setSelectedToolModel(prevToolRef.current);
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
      // Normalize shape cell coordinates so stored shapes use a top-left
      // anchored coordinate system (minX/minY === 0). This ensures the
      // visual preview (which normalizes for display) matches placement.
      const normalizeShape = (s) => {
        if (!s) return s;
        const cells = Array.isArray(s.cells) ? s.cells : (Array.isArray(s.pattern) ? s.pattern : []);
        if (!Array.isArray(cells) || cells.length === 0) return s;
        let minX = Infinity; let minY = Infinity;
        for (const c of cells) {
          const x = Array.isArray(c) ? c[0] : (c?.x ?? 0);
          const y = Array.isArray(c) ? c[1] : (c?.y ?? 0);
          if (x < minX) minX = x;
          if (y < minY) minY = y;
        }
        if (!Number.isFinite(minX)) minX = 0;
        if (!Number.isFinite(minY)) minY = 0;
        const normalized = cells.map(c => {
          const x = Array.isArray(c) ? c[0] : (c?.x ?? 0);
          const y = Array.isArray(c) ? c[1] : (c?.y ?? 0);
          return [x - minX, y - minY];
        });
        const next = { ...s, cells: normalized };
        try {
          const xs = normalized.map(c => c[0]);
          const ys = normalized.map(c => c[1]);
          next.width = Math.max(...xs) - Math.min(...xs) + 1;
          next.height = Math.max(...ys) - Math.min(...ys) + 1;
          if (next.meta) {
            next.meta = { ...next.meta, width: next.width, height: next.height };
          }
        } catch (e) {
          // ignore sizing errors
        }
        return next;
      };

      const normalized = normalizeShape(shape);
      setRecentShapes(prev => {
        if (index < 0 || index >= prev.length) return prev;
        const next = [...prev];
        next[index] = normalized;
        return next;
      });
      return normalized;
    },
    // Add a recent shape programmatically
    addRecentShape: (shape) => {
      if (!shape) return;
      try {
        // Fast optimistic update: insert a small stub immediately so the UI
        // responds without waiting for any heavier processing. The full
        // shape (with cells) is reconciled on the next microtask.
        const stub = {
          id: shape.id,
          name: shape.name || shape.meta?.name,
          width: shape.width || shape.meta?.width,
          height: shape.height || shape.meta?.height,
          // preserve a minimal preview-friendly meta so RecentShapesStrip can render quickly
          meta: shape.meta ? { width: shape.meta.width, height: shape.meta.height } : undefined
        };
        setRecentShapes(prev => {
          const newKey = generateShapeKey(stub);
          const filtered = prev.filter(s => generateShapeKey(s) !== newKey);
          return [stub, ...filtered].slice(0, MAX_RECENT_SHAPES);
        });

        // Defer the full update (which may be slightly heavier) to the next
        // macrotask so the click handler returns immediately and the
        // browser has a chance to paint. Using setTimeout avoids blocking
        // the current microtask checkpoint which can still delay paint.
        setTimeout(() => {
          try { updateRecentShapesList(shape); } catch (e) { /* swallow */ }
        }, 0);
      } catch (e) {
        // Fallback to the original behavior on unexpected errors
        updateRecentShapesList(shape);
      }
    },
    
    // Internal utilities (exposed for testing)
    generateShapeKey,
    updateRecentShapesList,
    updateShapeState
  };
};

export default useShapeManager;