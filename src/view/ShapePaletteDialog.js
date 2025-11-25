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
import {
  fetchShapeById,
  createShape,
  checkBackendHealth,
  deleteShapeById,
} from '../utils/backendApi';
import SearchBar from './components/SearchBar';
import PreviewPanel from './components/PreviewPanel';
import { useShapePaletteSearch } from './hooks/useShapePaletteSearch';
import {
  ShapesList,
  FooterControls,
  DeleteConfirmDialog,
  SnackMessage,
  BackendServerDialog,
} from './components/shapePalette';
import { useAuth } from '../auth/AuthProvider';

const LARGE_CATALOG_THRESHOLD = 1000;

const hasShapeCells = (shape) => {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
};

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {}, colorSchemeKey = 'bio', onAddRecent, prefetchOnMount = false, recentShapes = [] }) {
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
    retry
  } = useShapePaletteSearch({ open, backendBase, prefetchOnMount });

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

  const ensureShapeHasCells = useCallback(async (shape) => {
    if (!shape?.id || hasShapeCells(shape)) {
      console.log('[ensureShapeHasCells] Shape already has cells:', shape?.id, hasShapeCells(shape));
      return shape;
    }
    try {
      console.log('[ensureShapeHasCells] Fetching shape:', shape?.id);
      const res = await fetchShapeById(shape.id, backendBase);
      console.log('[ensureShapeHasCells] Fetch result:', res?.ok, res?.data ? 'has data' : 'no data');
      if (res?.ok && res.data) {
        const hasCells = hasShapeCells(res.data);
        console.log('[ensureShapeHasCells] Fetched shape has cells:', hasCells, res.data?.cells?.length);
        if (hasCells) {
          return res.data;
        } else {
          console.log('[ensureShapeHasCells] Fetched shape missing cells, rejecting');
        }
      } else {
        console.log('[ensureShapeHasCells] Fetch failed:', res);
      }
    } catch (err) {
      console.log('[ensureShapeHasCells] Fetch error:', err);
      logger.warn('[ShapePaletteDialog] failed to hydrate shape for recents:', err);
    }
    return null; // Return null if we can't get cells
  }, [backendBase]);

  const safeAddRecent = useCallback(async (shape) => {
    if (!shape) return;
    console.log('[safeAddRecent] Starting for shape:', shape?.id, shape?.name);
    try {
      const hydrated = await ensureShapeHasCells(shape);
      console.log('[safeAddRecent] Hydrated shape:', hydrated?.id, hydrated ? 'has cells: ' + hasShapeCells(hydrated) : 'null');
      if (!hydrated) {
        console.log('[safeAddRecent] No hydrated shape, showing error');
        setSnackMsg('Unable to load shape details');
        setSnackOpen(true);
        return;
      }
      // Check if shape is already in recents BEFORE adding
      const alreadyInRecents = recentShapes.some(s => s.id === hydrated.id);
      console.log('[safeAddRecent] Already in recents:', alreadyInRecents);
      if (alreadyInRecents) {
        setSnackMsg('Already in recents');
      } else {
        console.log('[safeAddRecent] Adding to recents:', hydrated.id, hydrated.cells?.length, 'cells');
        onAddRecent?.(hydrated);
        setSnackMsg('Shape added to recents');
      }
      setSnackOpen(true);
    } catch (e) {
      console.log('[safeAddRecent] Error:', e);
      logger.warn('onAddRecent failed:', e);
      setSnackMsg('Failed to add shape');
      setSnackOpen(true);
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

  // Hydrate shape details before updating preview panel
  const handleShapeSelect = useCallback(async (shape) => {
    if (!shape?.id || hasShapeCells(shape)) {
      setSelectedShape(shape);
      return;
    }
    try {
      const res = await fetchShapeById(shape.id, backendBase);
      if (res?.ok && res.data && hasShapeCells(res.data)) {
        setSelectedShape(res.data);
      } else {
        setSelectedShape(shape);
      }
    } catch (err) {
      logger.warn('[ShapePaletteDialog] failed to hydrate shape for preview:', err);
      setSelectedShape(shape);
    }
  }, [backendBase]);

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
        maxWidth={isMobile ? 'xs' : 'md'}
        fullWidth
        fullScreen={isMobile}
        data-testid="shapes-palette"
      >
        <DialogTitle>Insert shape from catalog</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 2, minHeight: 900 }}>
          {/* Hide the inline spinner to avoid a distracting persistent progress indicator.
            Loading state still controls network/cache behavior but we don't show
            the small spinner in the SearchBar to keep the UI calm. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <SearchBar value={inputValue} onChange={setInputValue} onClose={onClose} />
            <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1, p: 0 }}>
              <PreviewPanel preview={selectedShape} colorScheme={colorScheme} colorSchemeKey={colorSchemeKey} onAddRecent={onAddRecent} compact={true} maxSvgSize={80} />
            </Box>
          </Box>
          {/* Virtualized list keeps the palette responsive even with thousands of shapes */}
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 260,
              gap: isMobile ? 2 : 1,
              ...(isMobile && { maxHeight: 320, overflowY: 'auto' })
            }}
            data-testid="shapes-list-scroll"
          >
            <ShapesList
              items={shapesForRender}
              colorScheme={colorScheme}
              loading={loading}
              onSelect={handleShapeSelect}
              onDeleteRequest={handleDeleteRequest}
              onAddRecent={safeAddRecent}
              shapeSize={isMobile ? 64 : 40}
              showShapeNames={isMobile}
              user={user}
              backendBase={backendBase}
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
                  gap: 0.5,
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
