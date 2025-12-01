import { useState, useCallback, useRef, useEffect } from 'react';
import logger from '../../controller/utils/logger';

// Worker setup
let shapeWorker;
let pendingWorkerRequests = new Map();
function getShapeWorker() {
  if (!shapeWorker) {
    try {
      // Load worker from public directory
      shapeWorker = new Worker('/workers/shapeWorker.js');
      shapeWorker.onmessage = (e) => {
        const { type, shapeId, result, key } = e.data;
        if (type === 'normalized' && pendingWorkerRequests.has(shapeId)) {
          pendingWorkerRequests.get(shapeId).resolve(result);
          pendingWorkerRequests.delete(shapeId);
        } else if (type === 'key' && pendingWorkerRequests.has(shapeId)) {
          pendingWorkerRequests.get(shapeId).resolve(key);
          pendingWorkerRequests.delete(shapeId);
        }
      };
    } catch (error) {
      logger.warn('Could not create shape worker:', error);
      return null;
    }
  }
  return shapeWorker;
}

function normalizeRecentShapeWorker(shape) {
  return new Promise((resolve) => {
    const worker = getShapeWorker();
    if (worker) {
      worker.postMessage({ type: 'normalize', shape });
      pendingWorkerRequests.set(shape.id, { resolve });
    } else {
      // Fallback: resolve with the original shape if worker is unavailable
      resolve(shape);
    }
  });
}

const MAX_RECENT_SHAPES = 20;
const RECENTS_STORAGE_KEY = 'gol_recentShapes_v1';
const RECENTS_STORAGE_VERSION = 1;

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const extractCells = (shape) => {
  if (!shape) return [];
  if (Array.isArray(shape.cells)) return shape.cells;
  if (Array.isArray(shape.pattern)) return shape.pattern;
  if (Array.isArray(shape.liveCells)) return shape.liveCells;
  return [];
};

const hasShapeCells = (shape) => {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
};

const normalizeRecentShape = (shape) => {
  // Memoization cache (keyed by shape id + cell positions to handle rotations)
  if (!normalizeRecentShape._cache) normalizeRecentShape._cache = new Map();
  const cache = normalizeRecentShape._cache;
  // Clear cache if it gets too large to prevent memory issues
  if (cache.size > 200) cache.clear();
  const sourceCells = extractCells(shape);
  // Include actual cell positions in cache key to distinguish rotated versions
  const cellsKey = sourceCells.length > 0 ? JSON.stringify(sourceCells.slice(0, 10)) : 'empty';
  let key = (shape?.id || shape?.name || 'unnamed') + '::' + cellsKey;
  if (cache.has(key)) return cache.get(key);
  if (!shape) return shape;
  if (!sourceCells.length) return shape;

  // Offload normalization to worker for all shapes
  if (typeof window !== 'undefined' && window.Worker) {
    normalizeRecentShapeWorker(shape).then((result) => {
      cache.set(key, result);
    });
    return shape;
  }
  // Fallback to main thread if worker not available
  let minX = Infinity;
  let minY = Infinity;
  const absoluteCells = sourceCells.map((cell) => {
    const x = Array.isArray(cell) ? cell[0] : (cell?.x ?? 0);
    const y = Array.isArray(cell) ? cell[1] : (cell?.y ?? 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    return { x, y };
  });
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;
  const normalized = absoluteCells.map(({ x, y }) => [x - minX, y - minY]);
  if (!normalized.length) return shape;
  const xs = normalized.map(([x]) => x);
  const ys = normalized.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  const result = {
    ...shape,
    cells: normalized,
    width: width || shape.width,
    height: height || shape.height,
    meta: {
      ...shape.meta,
      width: width || shape.meta?.width,
      height: height || shape.meta?.height,
      cellCount: sourceCells.length
    }
  };
  cache.set(key, result);
  return result;
};

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
  const initialLoadRef = useRef(false);
  const lastPersistedFingerprintRef = useRef(null);
  const [persistenceState, setPersistenceState] = useState({
    lastSavedAt: null,
    loadedFromStorage: false,
    error: null,
    hasSavedState: false,
    isDirty: false
  });

  // Helper for debug logging to reduce cognitive complexity
  const debugLog = useCallback((...args) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(...args);
    }
  }, []);

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
  const cells = extractCells(shape);
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

  const computeFingerprint = useCallback((shapes = []) => {
    if (!Array.isArray(shapes) || shapes.length === 0) return '';
    return shapes.map((shape) => generateShapeKey(shape)).join('|');
  }, [generateShapeKey]);

  // Update the recent shapes list, maintaining uniqueness and max length
  const updateRecentShapesList = useCallback((newShape) => {
    debugLog('[updateRecentShapesList] Updating with shape:', newShape?.id, newShape?.name, 'has cells:', hasShapeCells(newShape), newShape?.cells?.length);
    const normalized = normalizeRecentShape(newShape);
    debugLog('[updateRecentShapesList] Normalized shape has cells:', hasShapeCells(normalized), normalized?.cells?.length);
    setRecentShapes(prev => {
      const newKey = generateShapeKey(normalized);
      // If shape already exists, do not change order
      if (prev.some(shape => generateShapeKey(shape) === newKey)) {
        return prev;
      }
      // Insert new shape at the leftmost position
      return [normalized, ...prev].slice(0, MAX_RECENT_SHAPES);
    });
  }, [generateShapeKey, debugLog]);

  useEffect(() => {
    setPersistenceState(prev => {
      const fingerprint = computeFingerprint(recentShapes);
      const hasFingerprint = !!lastPersistedFingerprintRef.current;
      const shouldBeDirty = recentShapes.length === 0
        ? false
        : !hasFingerprint || fingerprint !== lastPersistedFingerprintRef.current;
      if (prev.isDirty === shouldBeDirty) return prev;
      return { ...prev, isDirty: shouldBeDirty };
    });
  }, [recentShapes, computeFingerprint]);

  // Update shape state in both game state and tool state

  const getCursorFromModel = useCallback((targetModel) => {
    if (!targetModel || typeof targetModel.getCursorPosition !== 'function') {
      return null;
    }
    const cursor = targetModel.getCursorPosition();
    if (!cursor || typeof cursor.x !== 'number' || typeof cursor.y !== 'number') {
      return null;
    }
    return { x: cursor.x, y: cursor.y };
  }, []);

  const ensureToolCursor = useCallback((ref, fallback) => {
    if (!ref?.current) return;
    const last = ref.current.last;
    if (!last || typeof last.x !== 'number' || typeof last.y !== 'number') {
      ref.current.last = fallback || { x: 0, y: 0 };
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
      const cursor = getCursorFromModel(targetModel);
      ensureToolCursor(toolStateRef, cursor);
      debugLog('[useShapeManager] toolStateRef.current.last ensured:', toolStateRef.current.last);
    }
  }, [toolStateRef, debugLog, model, setSelectedShape, getCursorFromModel, ensureToolCursor]);

  // Centralized shape selection: updates shape state, recent list, and triggers redraw
  const selectShape = useCallback((shape) => {
    updateShapeState(shape);
    if (shape) {
      updateRecentShapesList(shape);
      // Ensure overlay preview position is set
      if (toolStateRef?.current) {
        toolStateRef.current.selectedShapeData = shape;
        const targetModel = (typeof model === 'function') ? model() : model;
        const cursor = getCursorFromModel(targetModel);
        ensureToolCursor(toolStateRef, cursor);
      }
    }
    drawWithOverlay();
  }, [updateShapeState, updateRecentShapesList, drawWithOverlay, toolStateRef, model, getCursorFromModel, ensureToolCursor]);

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

  const persistRecentShapes = useCallback(() => {
    if (!canUseLocalStorage()) return false;
    try {
      const normalized = (recentShapes || []).map(normalizeRecentShape).filter(Boolean).slice(0, MAX_RECENT_SHAPES);
      const payload = {
        version: RECENTS_STORAGE_VERSION,
        savedAt: Date.now(),
        shapes: normalized
      };
      window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(payload));
      const fingerprint = computeFingerprint(normalized);
      lastPersistedFingerprintRef.current = fingerprint || null;
      setPersistenceState(prev => ({
        ...prev,
        lastSavedAt: payload.savedAt,
        hasSavedState: normalized.length > 0,
        error: null,
        isDirty: false
      }));
      return true;
    } catch (e) {
      setPersistenceState(prev => ({ ...prev, error: e?.message || String(e) }));
      return false;
    }
  }, [recentShapes, computeFingerprint]);

  const restorePersistedRecentShapes = useCallback(() => {
    if (!canUseLocalStorage()) return { restored: false };
    try {
      const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY);
      if (!raw) {
        setPersistenceState(prev => ({ ...prev, hasSavedState: false }));
        return { restored: false };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== RECENTS_STORAGE_VERSION || !Array.isArray(parsed.shapes)) {
        setPersistenceState(prev => ({ ...prev, hasSavedState: false }));
        return { restored: false };
      }
      const normalized = parsed.shapes.map(normalizeRecentShape).filter(Boolean).slice(0, MAX_RECENT_SHAPES);
      if (!normalized.length) {
        setPersistenceState(prev => ({ ...prev, hasSavedState: false }));
        return { restored: false };
      }
      const fingerprint = computeFingerprint(normalized);
      lastPersistedFingerprintRef.current = fingerprint || null;
      setRecentShapes(prev => {
        if (!prev || prev.length === 0) return normalized;
        const seen = new Set();
        const combined = [...normalized, ...prev];
        const result = [];
        for (const shape of combined) {
          const key = generateShapeKey(shape);
          if (seen.has(key)) continue;
          seen.add(key);
          result.push(shape);
          if (result.length >= MAX_RECENT_SHAPES) break;
        }
        return result;
      });
      setPersistenceState(prev => ({
        ...prev,
        hasSavedState: true,
        loadedFromStorage: true,
        lastSavedAt: parsed.savedAt || parsed.timestamp || Date.now(),
        error: null,
        isDirty: false
      }));
      return { restored: true, shapes: normalized };
    } catch (e) {
      setPersistenceState(prev => ({ ...prev, error: e?.message || String(e) }));
      return { restored: false, error: e };
    }
  }, [computeFingerprint, generateShapeKey]);

  const clearPersistedRecentShapes = useCallback(() => {
    if (!canUseLocalStorage()) return false;
    try {
      window.localStorage.removeItem(RECENTS_STORAGE_KEY);
      lastPersistedFingerprintRef.current = null;
      setPersistenceState(prev => ({
        ...prev,
        hasSavedState: false,
        lastSavedAt: null,
        isDirty: recentShapes.length > 0,
        error: null
      }));
      return true;
    } catch (e) {
      setPersistenceState(prev => ({ ...prev, error: e?.message || String(e) }));
      return false;
    }
  }, [recentShapes.length]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    if (!canUseLocalStorage()) return;
    restorePersistedRecentShapes();
  }, [restorePersistedRecentShapes]);

  const clearRecentShapes = useCallback(() => {
    setRecentShapes([]);
    try {
      clearPersistedRecentShapes();
    } finally {
      lastPersistedFingerprintRef.current = null;
      setPersistenceState(prev => ({
        ...prev,
        hasSavedState: false,
        lastSavedAt: null,
        isDirty: false,
        error: null
      }));
    }
  }, [clearPersistedRecentShapes]);

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
      const normalized = normalizeRecentShape(shape);
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
      debugLog('[addRecentShape] Adding shape:', shape?.id, shape?.name, 'has cells:', hasShapeCells(shape), shape?.cells?.length);
      if (!shape) return;
      try {
        const normalized = normalizeRecentShape(shape);
        const stubSource = normalized || shape;
        const stubMeta = stubSource?.meta || shape.meta;
        // Fast optimistic update: insert a small stub immediately so the UI
        // responds without waiting for any heavier processing. The full
        // shape (with cells) is reconciled on the next microtask.
        const stubCells = Array.isArray(stubSource?.cells)
          ? stubSource.cells
          : extractCells(stubSource);
        debugLog('[addRecentShape] stubCells length:', stubCells.length, 'from', Array.isArray(stubSource?.cells) ? 'cells' : 'extractCells');
        const stub = {
          id: stubSource?.id,
          name: stubSource?.name || stubMeta?.name,
          width: stubSource?.width || stubMeta?.width,
          height: stubSource?.height || stubMeta?.height,
          // preserve a minimal preview-friendly meta so RecentShapesStrip can render quickly
          meta: stubMeta ? { width: stubMeta.width, height: stubMeta.height, cellCount: stubMeta.cellCount } : undefined,
          // include cell data immediately so thumbnails never render empty while awaiting async normalization
          cells: Array.isArray(stubCells)
            ? stubCells.map(cell => (Array.isArray(cell) ? [...cell] : [cell?.x ?? 0, cell?.y ?? 0]))
            : []
        };
        debugLog('[addRecentShape] Created stub with cells:', stub.cells.length);
        setRecentShapes(prev => {
          const newKey = generateShapeKey(stub);
          // If shape already exists, do not change order
          if (prev.some(s => generateShapeKey(s) === newKey)) {
            return prev;
          }
          // Insert new shape at the leftmost position
          return [stub, ...prev].slice(0, MAX_RECENT_SHAPES);
        });

        // Defer the full update (which may be slightly heavier) to the next
        // macrotask so the click handler returns immediately and the
        // browser has a chance to paint. Using setTimeout avoids blocking
        // the current microtask checkpoint which can still delay paint.
        setTimeout(() => {
          try { updateRecentShapesList(normalized || shape); } catch (e) { /* swallow */ }
        }, 0);
      } catch (e) {
        // Fallback to the original behavior on unexpected errors
        updateRecentShapesList(shape);
      }
    },
    
    // Internal utilities (exposed for testing)
    generateShapeKey,
    updateRecentShapesList,
    updateShapeState,
    persistRecentShapes,
    restorePersistedRecentShapes,
    clearPersistedRecentShapes,
    clearRecentShapes,
    persistenceState
  };
};

export default useShapeManager;