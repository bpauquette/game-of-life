import { useState, useCallback, useRef } from "react";
import logger from "../../controller/utils/logger";

/**
 * Hook for managing grid file operations (save/load)
 */
const useGridFileManager = (config = {}) => {
  const {
    backendBase = process.env.REACT_APP_BACKEND_BASE ||
      "http://localhost:55000",
    getLiveCells = null,
    generation = 0,
  } = config;
  const [savedGrids, setSavedGrids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const abortControllerRef = useRef(null);

  // Helper to get base URL consistently
  const getBaseUrl = useCallback(() => {
    if (typeof backendBase === "string" && backendBase.length > 0) {
      return backendBase;
    }
    const fallbackOrigin = globalThis.window?.location?.origin
      ? String(globalThis.window.location.origin)
      : "http://localhost:3000";
    return fallbackOrigin.replace("3000", "55000"); // Default backend port
  }, [backendBase]);

  // Convert live cells to serializable format
  const serializeLiveCells = useCallback((liveCells) => {
    if (!liveCells || typeof liveCells.entries !== "function") {
      return [];
    }

    const cells = [];
    for (const [key, value] of liveCells.entries()) {
      if (value) {
        const [x, y] = key.split(",").map(Number);
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
      const url = new URL("/v1/grids", base);

      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
      });

      if (response.ok === false) {
        throw new Error(`Failed to load grids: ${response.status}`);
      }

      const grids = await response.json();
      logger.info("Loaded grids from backend:", grids.length, "grids");
      setSavedGrids(grids);
    } catch (error_) {
      if (error_.name !== "AbortError") {
        logger.error("Failed to load grids:", error_.message);
        setError("Failed to load saved grids");
      }
    } finally {
      setLoading(false);
    }
  }, [getBaseUrl]);

  // Save current grid state
  const saveGrid = useCallback(
    async (name, description = "") => {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new Error("Grid name is required");
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
        };

        const base = getBaseUrl();
        const url = new URL("/v1/grids", base);

        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(gridData),
        });

        if (response.ok === false) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to save grid: ${response.status}`,
          );
        }

        const savedGrid = await response.json();
        logger.info("Grid saved successfully:", savedGrid.id);

        // Refresh the grids list
        await loadGridsList();

        return savedGrid;
      } catch (error_) {
        logger.error("Failed to save grid:", error_.message);
        setError("Failed to save grid: " + error_.message);
        throw error_;
      } finally {
        setLoading(false);
      }
    },
    [getLiveCells, serializeLiveCells, generation, getBaseUrl, loadGridsList],
  );

  // Load a grid by ID
  const loadGrid = useCallback(
    async (gridId) => {
      if (!gridId) {
        throw new Error("Grid ID is required");
      }

      setLoading(true);
      setError(null);

      try {
        const base = getBaseUrl();
        const url = new URL(`/v1/grids/${encodeURIComponent(gridId)}`, base);

        const response = await fetch(url.toString());

        if (response.ok === false) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to load grid: ${response.status}`,
          );
        }

        const gridData = await response.json();
        const liveCells = deserializeLiveCells(gridData.liveCells);

        // Return grid data with deserialized live cells
        const result = {
          ...gridData,
          liveCells,
        };

        logger.info("Grid loaded successfully:", gridData.name);
        return result;
      } catch (error_) {
        logger.error("Failed to load grid:", error_.message);
        setError("Failed to load grid: " + error_.message);
        throw error_;
      } finally {
        setLoading(false);
      }
    },
    [getBaseUrl, deserializeLiveCells],
  );

  // Delete a grid by ID
  const deleteGrid = useCallback(
    async (gridId) => {
      if (!gridId) {
        throw new Error("Grid ID is required");
      }

      setLoading(true);
      setError(null);

      try {
        const base = getBaseUrl();
        const url = new URL(`/v1/grids/${encodeURIComponent(gridId)}`, base);

        const response = await fetch(url.toString(), {
          method: "DELETE",
        });

        if (response.ok === false) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to delete grid: ${response.status}`,
          );
        }

        logger.info("Grid deleted successfully:", gridId);

        // Refresh the grids list
        await loadGridsList();
      } catch (error_) {
        logger.error("Failed to delete grid:", error_.message);
        setError("Failed to delete grid: " + error_.message);
        throw error_;
      } finally {
        setLoading(false);
      }
    },
    [getBaseUrl, loadGridsList],
  );

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
    logger.info("Opening load dialog and loading grids list...");
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
    deserializeLiveCells,
  };
};

export default useGridFileManager;
