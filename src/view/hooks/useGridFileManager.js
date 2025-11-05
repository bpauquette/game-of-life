import { useState, useCallback, useRef } from 'react';
import logger from '../../controller/utils/logger';

/**
 * Hook for managing grid file operations (save/load)
 */
const useGridFileManager = (config = {}) => {
  const { 
    // If not explicitly provided, derive from the current window location so mobile clients don't hit localhost
    backendBase = process.env.REACT_APP_BACKEND_BASE || null,
    getLiveCells = null,
    generation = 0 
  } = config;
  const [savedGrids, setSavedGrids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const abortControllerRef = useRef(null);
  const inFlightSaveRef = useRef(null);

  // Helper to get base URL consistently
  const getBaseUrl = useCallback(() => {
    if (typeof backendBase === 'string' && backendBase.length > 0) {
      return backendBase;
    }
    const loc = globalThis.window?.location;
    const port = process.env.REACT_APP_BACKEND_PORT || '55000';
    if (loc && loc.hostname) {
      const protocol = loc.protocol || 'http:';
      const host = loc.hostname; // works on phone: uses Windows LAN IP
      return `${protocol}//${host}:${port}`;
    }
    // Last resort (dev-only fallback)
    return `http://127.0.0.1:${port}`;
  }, [backendBase]);

  // Convert live cells to serializable format
  const serializeLiveCells = useCallback((liveCells) => {
    if (!liveCells || typeof liveCells.entries !== 'function') {
      return [];
    }
    
    const cells = [];
    for (const [key, value] of liveCells.entries()) {
      if (value) {
        const [x, y] = key.split(',').map(Number);
        cells.push({ x, y });
      }
    }
    return cells;
  }, []);

  // Convert serialized cells back to live cells format
  const deserializeLiveCells = useCallback((cells) => {
    const liveCells = new Map();
    if (Array.isArray(cells)) {
      for (const cell of cells) {
        const key = `${cell.x},${cell.y}`;
        liveCells.set(key, true);
      }
    }
    return liveCells;
  }, []);

  // Load list of saved grids
  const loadGridsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const base = getBaseUrl();
      const url = new URL('/v1/grids', base);
      url.searchParams.set('_ts', String(Date.now()));
      
      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok === false) {
        throw new Error(`Failed to load grids: ${response.status}`);
      }
      
      const grids = await response.json();
      logger.info('Loaded grids from backend:', grids.length, 'grids');
      setSavedGrids(grids);
    } catch (error_) {
      if (error_.name !== 'AbortError') {
        logger.error('Failed to load grids:', error_.message);
        setError('Failed to load saved grids');
      }
    } finally {
      setLoading(false);
    }
  }, [getBaseUrl]);

  // Save current grid state
  const saveGrid = useCallback(async (name, description = '') => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Grid name is required');
    }

    setLoading(true);
    setError(null);

    try {
      const liveCells = getLiveCells();
      const cells = serializeLiveCells(liveCells);
      
      const gridData = {
        name: name.trim(),
        description: description.trim(),
        liveCells: cells,
        generation: generation || 0
      };

  const base = getBaseUrl();
  const url = new URL('/v1/grids', base);
  url.searchParams.set('_ts', String(Date.now()));
      
      // Network robustness: retry on transient failures (connection closed, timeouts)
      const doPostWithRetry = async (attempts = 3, perAttemptTimeoutMs = 30000) => {
        let lastError;
        for (let i = 1; i <= attempts; i++) {
          // Abort previous attempt if still hanging
          if (inFlightSaveRef.current) {
            try { inFlightSaveRef.current.abort(); } catch (_) {}
          }
          const ac = new AbortController();
          inFlightSaveRef.current = ac;

          const timeoutId = setTimeout(() => {
            try { ac.abort(); } catch (_) {}
          }, perAttemptTimeoutMs);

          try {
            const response = await fetch(url.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
              body: JSON.stringify(gridData),
              signal: ac.signal,
              cache: 'no-store',
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
              // Try to read JSON to surface server-provided error details
              let errorText = `Failed to save grid: ${response.status}`;
              try {
                const data = await response.json();
                if (data && data.error) errorText = data.error;
                // Friendly message for payload-too-large
                if (response.status === 413) {
                  errorText = data?.error || 'Grid is too large to upload (413)';
                }
              } catch (_) {}
              throw new Error(errorText);
            }
            return response;
          } catch (e) {
            clearTimeout(timeoutId);
            lastError = e;
            const isAbort = e?.name === 'AbortError';
            const isNetwork = e && /Failed to fetch|NetworkError|TypeError/.test(String(e));
            // On final attempt or non-transient error, rethrow
            if (i === attempts || (!isAbort && !isNetwork)) {
              throw e;
            }
            // Backoff before retry
            const backoffMs = i * 500;
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
        }
        // Should not reach here
        throw lastError || new Error('Unknown error saving grid');
      };

      const response = await doPostWithRetry(3, 30000);

      if (response.ok === false) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save grid: ${response.status}`);
      }

      const savedGrid = await response.json();
      logger.info('Grid saved successfully:', savedGrid.id);
      
      // Refresh the grids list
      await loadGridsList();
      
      return savedGrid;
    } catch (error_) {
      logger.error('Failed to save grid:', error_.message);
      setError('Failed to save grid: ' + error_.message);
      throw error_;
    } finally {
      setLoading(false);
      // Clear any in-flight controller
      if (inFlightSaveRef.current) {
        try { inFlightSaveRef.current.abort(); } catch (_) {}
        inFlightSaveRef.current = null;
      }
    }
  }, [getLiveCells, serializeLiveCells, generation, getBaseUrl, loadGridsList]);

  // Load a grid by ID
  const loadGrid = useCallback(async (gridId) => {
    if (!gridId) {
      throw new Error('Grid ID is required');
    }

    setLoading(true);
    setError(null);

    try {
  const base = getBaseUrl();
  const url = new URL(`/v1/grids/${encodeURIComponent(gridId)}`, base);
  url.searchParams.set('_ts', String(Date.now()));
      
  const response = await fetch(url.toString(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });

      if (response.ok === false) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load grid: ${response.status}`);
      }

      const gridData = await response.json();
      const liveCells = deserializeLiveCells(gridData.liveCells);
      
      // Return grid data with deserialized live cells
      const result = {
        ...gridData,
        liveCells
      };
      
      logger.info('Grid loaded successfully:', gridData.name);
      return result;
    } catch (error_) {
      logger.error('Failed to load grid:', error_.message);
      setError('Failed to load grid: ' + error_.message);
      throw error_;
    } finally {
      setLoading(false);
    }
  }, [getBaseUrl, deserializeLiveCells]);

  // Delete a grid by ID
  const deleteGrid = useCallback(async (gridId) => {
    if (!gridId) {
      throw new Error('Grid ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const base = getBaseUrl();
      const url = new URL(`/v1/grids/${encodeURIComponent(gridId)}`, base);
      url.searchParams.set('_ts', String(Date.now()));
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok === false) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete grid: ${response.status}`);
      }

      logger.info('Grid deleted successfully:', gridId);
      
      // Refresh the grids list
      await loadGridsList();
      
    } catch (error_) {
      logger.error('Failed to delete grid:', error_.message);
      setError('Failed to delete grid: ' + error_.message);
      throw error_;
    } finally {
      setLoading(false);
    }
  }, [getBaseUrl, loadGridsList]);

  // Open save dialog
  const openSaveDialog = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  // Close save dialog
  const closeSaveDialog = useCallback(() => {
    setSaveDialogOpen(false);
  }, []);

  // Open load dialog
  const openLoadDialog = useCallback(async () => {
    logger.info('Opening load dialog and loading grids list...');
    setLoadDialogOpen(true);
    // Auto-load grids list when opening dialog
    await loadGridsList();
  }, [loadGridsList]);

  // Close load dialog
  const closeLoadDialog = useCallback(() => {
    setLoadDialogOpen(false);
  }, []);

  return {
    // State
    grids: savedGrids,
    loading,
    error,
    saveDialogOpen,
    loadDialogOpen,
    loadingGrids: loading,
    
    // Actions
    saveGrid,
    loadGrid,
    deleteGrid,
    loadGridsList,
    
    // Dialog controls
    openSaveDialog,
    closeSaveDialog,
    openLoadDialog,
    closeLoadDialog,
    
    // Utilities
    serializeLiveCells,
    deserializeLiveCells
  };
};

export default useGridFileManager;