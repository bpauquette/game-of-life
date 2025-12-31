import React, { useState, useCallback, useDeferredValue, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import logger from '../controller/utils/logger';
import { createShape, deleteShapeById, checkBackendHealth } from '../utils/backendApi';
import SearchBar from './components/SearchBar';
import { fetchShapeById } from '../utils/backendApi';
import PreviewPanel from './components/PreviewPanel';
import { useShapePaletteSearch } from './hooks/useShapePaletteSearch';
import {
  ShapesList,
  FooterControls,
  DeleteConfirmDialog,
  SnackMessage,
  BackendServerDialog,
} from './components/shapePalette';
import ShapePaletteView from './ShapePaletteView';
import { useAuth } from '../auth/AuthProvider';

const LARGE_CATALOG_THRESHOLD = 1000;

const hasShapeCells = (shape) => {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
};

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {}, colorSchemeKey = 'bio', onAddRecent, prefetchOnMount = false, recentShapes = [], fetchShapes, checkBackendHealth }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
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
    deleteShape,
    createShapeInBackend
  } = useShapePaletteSearch({ open, backendBase, prefetchOnMount, fetchShapes, checkBackendHealth });

    // Local preview state for selected shape
    const [selectedShape, setSelectedShape] = useState(null);


  // ...existing code...
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
  const isInitialMobileLoad = loading && results.length === 0;

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
      const hydrate = hydrateShape || (async (s) => {
        if (!s?.id || hasShapeCells(s)) return s;
        logger.debug('[ShapePaletteDialog] safeAddRecent: fetching shape by id', { id: s.id, base: backendBase });
        const res = await fetchShapeById(s.id, backendBase);
        logger.debug('[ShapePaletteDialog] safeAddRecent: fetch result', { id: s.id, ok: !!res?.ok, hasData: !!res?.data, cellsLen: Array.isArray(res?.data?.cells) ? res.data.cells.length : null });
        return (res?.ok && res.data && hasShapeCells(res.data)) ? res.data : null;
      });
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
      const hydrate = hydrateShape || (async (s) => {
        if (!s?.id) return null;
        logger.debug('[ShapePaletteDialog] handleShapeSelect: fetching shape by id', { id: s.id, base: backendBase });
        const res = await fetchShapeById(s.id, backendBase);
        logger.debug('[ShapePaletteDialog] handleShapeSelect: fetch result', { id: s.id, ok: !!res?.ok, hasData: !!res?.data, cellsLen: Array.isArray(res?.data?.cells) ? res.data.cells.length : null });
        return (res?.ok && res.data && hasShapeCells(res.data)) ? res.data : null;
      });
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
        const outcome = await deleteShapeById(iid, backendBase);
        if (!outcome || !outcome.ok) throw new Error(outcome?.details || 'delete failed');
        return outcome;
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
      const createCb = createShapeInBackend || (async (s) => createShape(s, backendBase));
      const created = await createCb(shape);
      const toInsert = created && created.id ? created : shape;
      setResults(prev => [toInsert, ...prev]);
      setSnackMsg('Restored');
      setSnackUndoShape(null);
    } catch (err) {
      logger.error('Restore error:', err);
      setSnackMsg('Restore error');
    }
  }, [snackUndoShape, createShapeInBackend, setResults]);

  const handleSnackClose = useCallback(() => {
    setSnackOpen(false);
    setSnackMsg('');
    setSnackUndoShape(null);
  }, []);

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
      setInputValue={setInputValue}
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
      onLoadMore={() => {}}
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
  prefetchOnMount: PropTypes.bool
};

ShapePaletteDialog.defaultProps = {
  colorScheme: {}
};
