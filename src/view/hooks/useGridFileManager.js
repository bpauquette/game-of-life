import { useState, useCallback, useRef } from 'react';
import logger from '../../controller/utils/logger';
import GridsDao from '../../model/dao/GridsDao';

/**
 * Hook for managing grid file operations (save/load)
 */
const useGridFileManager = (config = {}) => {
  const {
    getLiveCells = null,
    generation = 0
  } = config;
  const [savedGrids, setSavedGrids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  // Removed unused abortControllerRef
  const inFlightSaveRef = useRef(null);

  // Always use the correct base URL, never allow override
  // Always use the correct base URL, never allow override
  const getBackendApiBaseRef = useRef(null);
  if (!getBackendApiBaseRef.current) {
    getBackendApiBaseRef.current = require('../../utils/backendApi').getBackendApiBase;
  }
  // Removed unused getBaseUrl

  // Convert live cells to serializable format
  const serializeLiveCells = useCallback((liveCells) => {
    if (!liveCells) return [];

    const cells = [];
    if (typeof liveCells.forEachCell === 'function') {
      liveCells.forEachCell((x, y) => {
        cells.push({ x, y });
      });
      return cells;
    }

    if (typeof liveCells.entries === 'function') {
      for (const [key, value] of liveCells.entries()) {
        if (!value) continue;
        const [x, y] = key.split(',').map(Number);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          cells.push({ x, y });
        }
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
      const grids = await GridsDao.listGrids();
      logger.info('[useGridFileManager] Loaded grids from GridsDao:', grids.length, 'grids');
      setSavedGrids(grids);
    } catch (error_) {
      logger.error('Failed to load grids:', error_.message);
      setError('Failed to load saved grids');
    } finally {
      setLoading(false);
    }
  }, []);



  // Helper for performing a single POST request
  // Removed unused doPostGrid



  // Helper to abort and clear inFlightSaveRef
  const clearInFlightSave = useCallback(() => {
    if (inFlightSaveRef.current) {
      try { inFlightSaveRef.current.abort(); } catch (err) { logger.error('AbortController abort failed2:', err); }
      inFlightSaveRef.current = null;
    }
  }, []);

  const saveGrid = useCallback(
    async (name, description = '', publicFlag = false) => {
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
          generation: generation || 0,
          public: !!publicFlag,
        };
        const savedGrid = await GridsDao.saveGrid(gridData);
        logger.info('Grid saved successfully:', savedGrid.id);
        await loadGridsList();
        return savedGrid;
      } catch (error_) {
        logger.error('Failed to save grid:', error_.message);
        setError('Failed to save grid: ' + error_.message);
        throw error_;
      } finally {
        setLoading(false);
        clearInFlightSave();
      }
    },
    [getLiveCells, serializeLiveCells, generation, loadGridsList, clearInFlightSave]
  );

  // Load a grid by ID
  const loadGrid = useCallback(async (gridId) => {
    if (!gridId) {
      throw new Error('Grid ID is required');
    }
    setLoading(true);
    setError(null);
    try {
      const gridData = await GridsDao.getGrid(gridId);
      const liveCells = deserializeLiveCells(gridData.liveCells);
      const result = { ...gridData, liveCells };
      logger.info('[useGridFileManager] Grid loaded successfully:', gridData.name);
      return result;
    } catch (error_) {
      logger.error('Failed to load grid:', error_.message);
      setError('Failed to load grid: ' + error_.message);
      throw error_;
    } finally {
      setLoading(false);
    }
  }, [deserializeLiveCells]);

  // Delete a grid by ID
  const deleteGrid = useCallback(async (gridId) => {
    if (!gridId) {
      throw new Error('Grid ID is required');
    }
    setLoading(true);
    setError(null);
    try {
      await GridsDao.deleteGrid(gridId);
      logger.info('[useGridFileManager] Grid deleted successfully:', gridId);
      await loadGridsList();
    } catch (error_) {
      logger.error('Failed to delete grid:', error_.message);
      setError('Failed to delete grid: ' + error_.message);
      throw error_;
    } finally {
      setLoading(false);
    }
  }, [loadGridsList]);

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
    logger.debug('Opening load dialog and loading grids list...');
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