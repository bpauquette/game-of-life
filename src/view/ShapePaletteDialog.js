import React, { useState, useCallback, useDeferredValue, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PropTypes from 'prop-types';
import { useUiDao } from '../model/dao/uiDao.js';
import logger from '../controller/utils/logger.js';
import ShapesDao from '../model/dao/ShapesDao.js';
import { useShapePaletteSearch } from './hooks/useShapePaletteSearch.js';
import ShapePaletteView from './ShapePaletteView.js';
import { useAuth } from '../auth/AuthProvider.js';
import { fetchShapeById } from '../utils/backendApi.js';

const LARGE_CATALOG_THRESHOLD = 1000;
const PAGE_SIZE = 10;

const hasShapeCells = (shape) => {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
};

const fetchHydratedShape = async (shape, backendBase, context) => {
  if (!shape?.id || hasShapeCells(shape)) return shape;
  logger.debug(`[ShapePaletteDialog] ${context}: fetching shape by id`, { id: shape.id, base: backendBase });
  try {
    const response = await fetchShapeById(shape.id, backendBase);
    const data = response?.data || null;
    logger.debug(`[ShapePaletteDialog] ${context}: fetch result`, {
      id: shape.id,
      ok: response?.ok,
      hasData: !!data,
      cellsLen: Array.isArray(data?.cells) ? data.cells.length : null,
    });
    if (response?.ok && data && hasShapeCells(data)) return data;
    return null;
  } catch (err) {
    logger.warn(`[ShapePaletteDialog] ${context}: fetch failed`, err);
    return null;
  }
};

const makeHydrator = (hydrateShape, backendBase, context) =>
  hydrateShape || ((shape) => fetchHydratedShape(shape, backendBase, context));

export default function ShapePaletteDialog({ open, onClose, backendBase, onAddRecent, prefetchOnMount = false, recentShapes = [], fetchShapes, checkBackendHealth }) {
  // UI state from uiDao
  const colorScheme = useUiDao(state => state.colorScheme);
  const colorSchemeKey = useUiDao(state => state.colorSchemeKey || 'bio');
  // Default fetchShapes to ShapesDao.listShapes if not provided
  const fetchShapesFn = fetchShapes || ShapesDao.listShapes;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [paging, setPaging] = useState(false);
  const {
    inputValue,
    setInputValue,
    results,
    setResults,
    displayedResults,
    loading,
    total,
    backendError,
    setBackendError,
    showBackendDialog,
    setShowBackendDialog,
    retry,
    hydrateShape,
    deleteShape
  } = useShapePaletteSearch({ open, backendBase, limit: PAGE_SIZE, page, prefetchOnMount, fetchShapes: fetchShapesFn, checkBackendHealth });

  // Track first successful load to avoid repeated loading overlays
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hasLoadedOnceRef.current = false;
    }
  }, [open]);
  useEffect(() => {
    if (results.length > 0 || !loading) {
      hasLoadedOnceRef.current = true;
    }
  }, [results, loading]);

  const handleSearchChange = useCallback((val) => {
    setPage(0);
    setInputValue(val);
  }, [setInputValue]);

  // Local preview state for selected shape
  const [selectedShape, setSelectedShape] = useState(null);


  const shapesForRender = useDeferredValue(
    useMemo(() => {
      // Sort shapes: user-owned shapes first, then system shapes
      const sorted = [...displayedResults].sort((a, b) => {
        const aIsUserOwned = user && a.userId === user.id;
        const bIsUserOwned = user && b.userId === user.id;
        
        if (aIsUserOwned && !bIsUserOwned) return -1;
        if (!aIsUserOwned && bIsUserOwned) return 1;
        return 0;
      });
      return sorted;
    }, [displayedResults, user])
  );
  const isInitialMobileLoad = loading && !hasLoadedOnceRef.current;

  const [backendStarting, setBackendStarting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackUndoShape, setSnackUndoShape] = useState(null);
  const [snackDetails, setSnackDetails] = useState(null);

  // hydration handled by hook: hydrateShape(id)

  const safeAddRecent = useCallback(async (shape) => {
    if (!shape) return;
    try {
      const hydrate = makeHydrator(hydrateShape, backendBase, 'safeAddRecent');
      const hydrated = await hydrate(shape);
      if (!hydrated) {
        setSnackMsg('Unable to load shape details');
        setSnackOpen(true);
        return;
      }
      const alreadyInRecents = recentShapes.some(s => s.id === hydrated.id);
      if (alreadyInRecents) {
        setSnackMsg('Already in recents');
      } else {
        onAddRecent?.(hydrated);
        setSnackMsg('Shape added to recents');
      }
      setSnackOpen(true);
    } catch (e) {
      logger.warn('onAddRecent failed:', e);
      setSnackMsg('Failed to add shape');
      setSnackOpen(true);
    }
  }, [onAddRecent, hydrateShape, recentShapes, backendBase]);

  const handleDeleteRequest = useCallback((shape) => {
    setToDelete(shape);
    setConfirmOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmOpen(false);
    setToDelete(null);
  }, []);

  // Hydrate shape details before updating preview panel (use hook)
  const handleShapeSelect = useCallback(async (shape) => {
    if (!shape?.id || hasShapeCells(shape)) {
      setSelectedShape(shape);
      return;
    }
    try {
      const hydrate = makeHydrator(hydrateShape, backendBase, 'handleShapeSelect');
      const hydrated = await hydrate(shape);
      setSelectedShape(hydrated || shape);
    } catch (err) {
      logger.warn('[ShapePaletteDialog] failed to hydrate shape for preview:', err);
      setSelectedShape(shape);
    }
  }, [hydrateShape, backendBase]);

  const handleDelete = useCallback(async (shape) => {
    if (!shape) return;
    const id = shape.id;
    const old = results.slice();
    setConfirmOpen(false);
    setToDelete(null);
    try {
      const del = deleteShape || (async (iid) => {
        await ShapesDao.deleteShape(iid);
        return true;
      });
      await del(id);
      setSnackMsg('Shape deleted');
      setSnackUndoShape(old.find(x => x.id === id) || null);
      setSnackDetails(null);
      setSnackOpen(true);
    } catch (err) {
      logger.warn('Delete failed:', err);
      setSnackMsg('Delete failed');
      setSnackDetails(err?.message || String(err));
      setSnackOpen(true);
    }
  }, [results, deleteShape]);

  const handleUndo = useCallback(async () => {
    const shape = snackUndoShape;
    if (!shape) return;
    try {
      const created = await ShapesDao.saveShape(shape);
      const toInsert = created && created.id ? created : shape;
      setResults(prev => [toInsert, ...prev]);
      setSnackMsg('Restored');
      setSnackUndoShape(null);
    } catch (err) {
      logger.error('Restore error:', err);
      setSnackMsg('Restore error');
    }
  }, [snackUndoShape, setResults]);

  const handleSnackClose = useCallback(() => {
    setSnackOpen(false);
    setSnackMsg('');
    setSnackUndoShape(null);
  }, []);

  const canPagePrev = page > 0;
  const canPageNext = ((page + 1) * PAGE_SIZE) < total;

  const goPrevPage = useCallback(() => {
    if (paging || loading || !canPagePrev) return;
    setPaging(true);
    setPage(p => Math.max(0, p - 1));
  }, [paging, loading, canPagePrev]);

  const goNextPage = useCallback(() => {
    if (paging || loading || !canPageNext) return;
    setPaging(true);
    setPage(p => p + 1);
  }, [paging, loading, canPageNext]);

  // Release paging lock once a load finishes
  useEffect(() => {
    if (!loading) setPaging(false);
  }, [loading]);

  const startBackendServer = async () => {
    setBackendStarting(true);
    setBackendError('');
    try {
      setBackendError(`To start the backend server, please run one of these commands in your terminal:

1. From the project root: npm run backend:start
2. From the backend directory: cd backend && npm start

The backend will start on the configured port.`);
    } catch (error) {
      logger.error('Backend start instructions shown:', error);
      setBackendError('Please start the backend manually: npm run backend:start');
    } finally {
      setBackendStarting(false);
    }
  };

  const retryBackendConnection = async () => {
    setBackendStarting(true);
    setBackendError('');
    try {
      const isHealthy = await checkBackendHealth(backendBase);
      if (isHealthy) {
        setShowBackendDialog(false);
        retry();
      } else {
        setBackendError(`Backend server is still not responding. Please make sure it's running.`);
      }
    } catch (error) {
      logger.warn('Backend health check failed:', error.message);
      setBackendError('Failed to connect to backend. Please ensure it\'s running.');
    } finally {
      setBackendStarting(false);
    }
  };

  return (
    <ShapePaletteView
      open={open}
      onClose={onClose}
      isMobile={isMobile}
      inputValue={inputValue}
      setInputValue={handleSearchChange}
      selectedShape={selectedShape}
      onSelectShape={handleShapeSelect}
      onAddRecent={safeAddRecent}
      shapesForRender={shapesForRender}
      loading={loading}
      isInitialMobileLoad={isInitialMobileLoad}
      onDeleteRequest={handleDeleteRequest}
      confirmOpen={confirmOpen}
      toDelete={toDelete}
      onDeleteCancel={handleDeleteCancel}
      onDeleteConfirm={handleDelete}
      total={total}
      threshold={LARGE_CATALOG_THRESHOLD}
      page={page}
      limit={PAGE_SIZE}
      canPagePrev={canPagePrev}
      canPageNext={canPageNext}
      onPrevPage={goPrevPage}
      onNextPage={goNextPage}
      paging={paging}
      snackOpen={snackOpen}
      snackMsg={snackMsg}
      snackDetails={snackDetails}
      snackUndoShape={snackUndoShape}
      onUndo={handleUndo}
      onSnackClose={handleSnackClose}
      showBackendDialog={showBackendDialog}
      backendError={backendError}
      backendStarting={backendStarting}
      onRetryBackend={retryBackendConnection}
      onBackendClose={() => setShowBackendDialog(false)}
      onShowBackendInstructions={startBackendServer}
      backendBase={backendBase}
      colorScheme={colorScheme}
      colorSchemeKey={colorSchemeKey}
      user={user}
    />
  );
}

ShapePaletteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSelectShape: PropTypes.func,
  backendBase: PropTypes.string,
  colorScheme: PropTypes.object,
  colorSchemeKey: PropTypes.string,
  onAddRecent: PropTypes.func,
  prefetchOnMount: PropTypes.bool,
  recentShapes: PropTypes.array,
  fetchShapes: PropTypes.func,
  checkBackendHealth: PropTypes.func,
};

ShapePaletteDialog.defaultProps = {
  colorScheme: {}
};
