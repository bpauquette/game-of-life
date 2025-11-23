import React, { useState, useCallback, useDeferredValue } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import logger from '../controller/utils/logger';
import {
  fetchShapeById,
  createShape,
  checkBackendHealth,
  deleteShapeById,
} from '../utils/backendApi';
import SearchBar from './components/SearchBar';
import PreviewPanel from './components/PreviewPanel';
import { useShapePaletteSearch } from './hooks/useShapePaletteSearch';
import { useHoverPreview } from './hooks/useHoverPreview';
import {
  ShapesList,
  FooterControls,
  DeleteConfirmDialog,
  SnackMessage,
  BackendServerDialog,
} from './components/shapePalette';

const LARGE_CATALOG_THRESHOLD = 1000;

const hasShapeCells = (shape) => {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
};

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {}, colorSchemeKey = 'bio', onAddRecent, prefetchOnMount = false, recentShapes = [] }) {
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
    retry
  } = useShapePaletteSearch({ open, backendBase, prefetchOnMount });


  const { preview, handleHover } = useHoverPreview(backendBase);
  const previewForPanel = useDeferredValue(preview);
  const shapesForRender = useDeferredValue(displayedResults);
  const isInitialMobileLoad = loading && results.length === 0;

  const [backendStarting, setBackendStarting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackUndoShape, setSnackUndoShape] = useState(null);
  const [snackDetails, setSnackDetails] = useState(null);

  const ensureShapeHasCells = useCallback(async (shape) => {
    if (!shape?.id || hasShapeCells(shape)) return shape;
    try {
      const res = await fetchShapeById(shape.id, backendBase);
      if (res?.ok && res.data) {
        return res.data;
      }
    } catch (err) {
      logger.warn('[ShapePaletteDialog] failed to hydrate shape for recents:', err);
    }
    return shape;
  }, [backendBase]);

  const safeAddRecent = useCallback(async (shape) => {
    if (!shape) return;
    try {
      const hydrated = await ensureShapeHasCells(shape);
      // Check if shape is already in recents BEFORE adding
      const alreadyInRecents = recentShapes.some(s => s.id === hydrated.id);
      onAddRecent?.(hydrated);
      // After add, check again to confirm addition
      if (alreadyInRecents) {
        setSnackMsg('Already in recents');
      } else {
        setSnackMsg('Shape added to recents');
      }
      setSnackOpen(true);
    } catch (e) {
      logger.warn('onAddRecent failed:', e);
    }
  }, [onAddRecent, ensureShapeHasCells, recentShapes]);

  const handleDeleteRequest = useCallback((shape) => {
    setToDelete(shape);
    setConfirmOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmOpen(false);
    setToDelete(null);
  }, []);

  const handleShapeSelect = useCallback(async (shape) => {
    logger.debug('[ShapePaletteDialog] Shape selected:', shape);
    if (!shape?.id) {
      onSelectShape?.(shape);
      // Also add to recent when selecting a local/unsaved shape
      await safeAddRecent(shape);
      onClose?.();
      return;
    }
    try {
      const res = await fetchShapeById(shape.id, backendBase);
  if (res.ok && res.data) {
  logger.debug('[ShapePaletteDialog] Fetched full shape data:', res.data);
        onSelectShape?.(res.data);
        await safeAddRecent(res.data);
      } else {
          // Removed debug log
        onSelectShape?.(shape);
        await safeAddRecent(shape);
      }
    } catch (err) {
      logger.warn('Failed to fetch full shape data, using metadata only:', err);
      onSelectShape?.(shape);
      await safeAddRecent(shape);
    } finally {
      onClose?.();
    }
  }, [backendBase, onSelectShape, onClose, safeAddRecent]);

  const handleDelete = useCallback(async (shape) => {
    if (!shape) return;
    const id = shape.id;
    const old = results.slice();
    // optimistic removal
    setResults(results.filter(r => r.id !== id));
    setConfirmOpen(false);
    setToDelete(null);
    try {
      const outcome = await deleteShapeById(id, backendBase);
      if (outcome.ok) {
        setSnackMsg('Shape deleted');
        setSnackUndoShape(old.find(x => x.id === id) || null);
        setSnackDetails(null);
        setSnackOpen(true);
      } else {
        logger.warn('Delete failed:', outcome.status);
        setSnackMsg('Delete failed');
        setSnackDetails(outcome.details);
        setSnackOpen(true);
        // restore on failure
        setResults(old);
      }
    } catch (err) {
      setResults(old);
      logger.error('Delete error:', err);
      setSnackMsg('Delete error');
      setSnackDetails(err?.stack ?? String(err));
      setSnackOpen(true);
    }
  }, [results, backendBase, setResults]);

  const createShapeCb = useCallback(async (shape) => createShape(shape, backendBase), [backendBase]);

  const handleUndo = useCallback(async () => {
    const shape = snackUndoShape;
    if (!shape) return;
    try {
      const ok = await createShapeCb(shape);
      if (ok) {
        setResults(prev => [shape, ...prev]);
        setSnackMsg('Restored');
        setSnackUndoShape(null);
      } else {
        setSnackMsg('Restore failed');
      }
    } catch (err) {
      logger.error('Restore error:', err);
      setSnackMsg('Restore error');
    }
  }, [snackUndoShape, createShapeCb, setResults]);

  const handleSnackClose = useCallback(() => {
    setSnackOpen(false);
    setSnackMsg('');
    setSnackUndoShape(null);
  }, []);

  const startBackendServer = async () => {
    setBackendStarting(true);
    setBackendError('');
    try {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '55000';
      setBackendError(`To start the backend server, please run one of these commands in your terminal:

1. From the project root: npm run backend:start
2. From the backend directory: cd backend && npm start

The backend will start on port ${backendPort}.`);
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
        const backendPort = process.env.REACT_APP_BACKEND_PORT || '55000';
        setBackendError(`Backend server is still not responding. Please make sure it's running on port ${backendPort}.`);
      }
    } catch (error) {
      logger.warn('Backend health check failed:', error.message);
      setBackendError('Failed to connect to backend. Please ensure it\'s running.');
    } finally {
      setBackendStarting(false);
    }
  };

  return (
    <>

      {/* Intercept onClose to prevent closing while caching is in progress */}
      <Dialog
        open={open}
        onClose={onClose}
        disableEscapeKeyDown={false}
        maxWidth="sm"
        fullWidth
        data-testid="shapes-palette"
      >
        <DialogTitle>Insert shape from catalog</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, minHeight: 520 }}>
          {/* Hide the inline spinner to avoid a distracting persistent progress indicator.
            Loading state still controls network/cache behavior but we don't show
            the small spinner in the SearchBar to keep the UI calm. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SearchBar value={inputValue} onChange={setInputValue} onClose={onClose} />
            <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1, p: 1 }}>
              <PreviewPanel preview={previewForPanel} colorScheme={colorScheme} colorSchemeKey={colorSchemeKey} />
            </Box>
          </Box>
          {/* Virtualized list keeps the palette responsive even with thousands of shapes */}
          <Box sx={{ position: 'relative', flex: 1, minHeight: 260 }} data-testid="shapes-list-scroll">
            <ShapesList
              items={shapesForRender}
              colorScheme={colorScheme}
              loading={loading}
              onSelect={handleShapeSelect}
              onDeleteRequest={handleDeleteRequest}
              onAddRecent={safeAddRecent}
              onHover={handleHover}
            />
            {isInitialMobileLoad && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  bgcolor: 'rgba(0,0,0,0.35)',
                  borderRadius: 1,
                  textAlign: 'center',
                  px: 2
                }}
                aria-live="polite"
              >
                <CircularProgress size={32} thickness={4} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Loading shapes catalog…
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  This may take a few seconds on mobile networks. The list will populate automatically.
                </Typography>
              </Box>
            )}
          </Box>
          <FooterControls
            total={total}
            threshold={LARGE_CATALOG_THRESHOLD}
            canLoadMore={false}
            onLoadMore={() => {}}
            loading={loading}
          />
          <DeleteConfirmDialog
            open={confirmOpen}
            shape={toDelete}
            onCancel={handleDeleteCancel}
            onConfirm={handleDelete}
          />
        </DialogContent>
      </Dialog>

      {/* Global snackbar so the user sees cache completion even if loader was shown */}
      <SnackMessage
        open={snackOpen}
        message={snackMsg}
        details={snackDetails}
        canUndo={!!snackUndoShape}
        onUndo={handleUndo}
        onClose={handleSnackClose}
      />
      

      {/* Backend Server Start Dialog */}
      <BackendServerDialog
        open={showBackendDialog}
        onClose={() => setShowBackendDialog(false)}
        backendError={backendError}
        backendStarting={backendStarting}
        onRetry={retryBackendConnection}
        onShowInstructions={startBackendServer}
      />
    </>
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
