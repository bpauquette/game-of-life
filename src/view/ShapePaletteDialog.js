import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import logger from '../controller/utils/logger';
import {
  getBaseUrl,
  fetchShapeById,
  createShape,
  checkBackendHealth, deleteShapeById
} from '../utils/backendApi';
import { createNamesWorker, createHoverWorker, createFauxNamesWorker } from '../utils/workerFactories';
import { BUTTONS } from '../utils/Constants';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
// SearchBar provides TextField; moved to its own component
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { Delete as DeleteIcon } from '@mui/icons-material';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';
import { Close as CloseIcon, Undo as UndoIcon } from '@mui/icons-material';
import Typography from '@mui/material/Typography';
// Name-only palette: do not render previews or descriptions in the dialog
import SearchBar from './components/SearchBar';
import PreviewPanel from './components/PreviewPanel';

// PropTypes for internal components
ShapeListItem.propTypes = {
  s: PropTypes.object.isRequired,
  idx: PropTypes.number.isRequired,
  colorScheme: PropTypes.object,
  onSelect: PropTypes.func,
  onRequestDelete: PropTypes.func,
  onAddRecent: PropTypes.func.isRequired
};
BackendServerDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  backendError: PropTypes.string,
  backendStarting: PropTypes.bool,
  onRetry: PropTypes.func,
  onShowInstructions: PropTypes.func
};

ShapesList.propTypes = {
  items: PropTypes.array.isRequired,
  colorScheme: PropTypes.object,
  loading: PropTypes.bool,
  onSelect: PropTypes.func,
  onDeleteRequest: PropTypes.func,
  onAddRecent: PropTypes.func.isRequired,
};

FooterControls.propTypes = {
  total: PropTypes.number.isRequired,
  threshold: PropTypes.number.isRequired,
  canLoadMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  loading: PropTypes.bool
};

DeleteConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  shape: PropTypes.object,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func
};

SnackMessage.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string,
  details: PropTypes.string,
  canUndo: PropTypes.bool,
  onUndo: PropTypes.func,
  onClose: PropTypes.func,
};

// SearchBar propTypes are defined in its own component file.

// UI Constants
// No preview rendering in the name-only palette
const SPACE_BETWEEN = 'space-between';
const FOOTER_ROW_STYLE = { display: 'flex', justifyContent: SPACE_BETWEEN, alignItems: 'center', marginTop: 8 };
// Previously we capped rendering to avoid jank; remove that cap so the
// palette can load and display all names (worker will fetch pages 50 at a time).
// Helper: derive a reliable cell count from a shape object. Some shapes
// may include `cells` (array), `pattern` (array), or `liveCells`.
// Older code used `cellsCount` which may be absent when shapes are
// loaded/cached, so prefer actual arrays when available.
// Not needed for name-only dialog
// (previous GRID_LINE_OFFSET removed — unused in this module)

// Transition component for Snackbar - moved outside to avoid recreation on each render
const SlideUpTransition = (props) => <Slide {...props} direction="up" />;

// fetchShapes is imported from backendApi.js and used to query the
// backend for paged search results. We perform network-driven search
// and paging rather than relying on any client-side cached catalog.

// Small presentational: per-shape list item with preview and delete affordance
function ShapeListItem({ s, idx, colorScheme, onSelect, onRequestDelete, onAddRecent, onHover }) {
  // Use a stable timestamp for any debug color sampling
  const tRef = useRef(Date.now());
  const getCellColor = (x, y) => colorScheme?.getCellColor?.(x, y, tRef.current) ?? '#4a9';
  const keyBase = s.id || 'shape';
  // Debug sample: log first cell color for palette preview
  try {
    const first = Array.isArray(s.cells) && s.cells.length > 0 ? s.cells[0] : null;
    if (first) {
      const fx = first.x ?? first[0];
      const fy = first.y ?? first[1];
      const sampleColor = getCellColor(fx, fy);
      // Avoid spamming console in normal runs. Enable detailed preview
      // diagnostics by setting globalThis.__GOL_PREVIEW_DEBUG__ = true in
      // the dev console or test harness.
          if (globalThis.__GOL_PREVIEW_DEBUG__) logger.debug('[ShapePaletteDialog] palette-sample', { id: s.id || s.name, x: fx, y: fy, color: sampleColor });
    }
  } catch (e) {
    // Log the error instead of silently swallowing it so issues can be diagnosed.
    logger.warn('[ShapePaletteDialog] preview sample failed:', e);
  }
  return (
      <ListItem key={`${keyBase}-${idx}`} disablePadding>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <IconButton
            aria-label="Add to Recent"
            size="small"
            sx={{ mr: 1, color: '#388e3c', bgcolor: 'rgba(56,142,60,0.08)', borderRadius: 1 }}
            onMouseEnter={() => onHover?.(s?.id)}
            onMouseLeave={() => onHover?.(null)}
                onClick={(e) => {
              e.stopPropagation();
              // Defer the onAddRecent call to the next macrotask so the click
              // handler returns immediately and any heavier work runs asynchronously.
              // Using setTimeout 0 avoids running heavy work in the current
              // microtask checkpoint which can still block paint.
              setTimeout(() => onAddRecent(s), 0);
            }}
            data-testid={`add-recent-btn-${keyBase}`}
          >
            <Tooltip title="Add to Recent Shapes" placement="left">
              <span>
                <svg width={20} height={20} viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }}>
                  <circle cx={10} cy={10} r={9} fill="#388e3c" opacity={0.15} />
                  <path d="M6 10h8M10 6v8" stroke="#388e3c" strokeWidth={2} strokeLinecap="round" />
                </svg>
              </span>
            </Tooltip>
          </IconButton>
          <ListItemButton onClick={() => onSelect(s)} sx={{ flex: 1 }} onMouseEnter={() => onHover?.(s?.id)} onMouseLeave={() => onHover?.(null)}>
            <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5, fontFamily: 'monospace' }}
              data-testid="shape-label"
            >
              {s.name || '(unnamed)'}
            </Typography>
            {/* Name-only dialog: no description or preview shown here */}
          </Box>
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(s);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </ListItemButton>
        </Box>
      </ListItem>
  );
}

// Backend server helper dialog
function BackendServerDialog({
  open,
  onClose,
  backendError,
  backendStarting,
  onRetry,
  onShowInstructions,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Backend Server Not Found</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          The shapes catalog backend server doesn't appear to be running. You need to start it to access the shapes catalog.
        </Typography>
        {backendError && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" component="pre" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {backendError}
            </Typography>
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          The backend provides access to a catalog of Conway's Game of Life patterns and shapes.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onRetry} variant="outlined" disabled={backendStarting} startIcon={backendStarting ? <CircularProgress size={16} /> : <UndoIcon />}>
          {backendStarting ? 'Checking...' : 'Retry Connection'}
        </Button>
        <Button onClick={onShowInstructions} variant="contained" disabled={backendStarting}>
          Show Instructions
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// SearchBar moved to its own component under ./components/SearchBar.js

// Presentational: list of shapes or empty state
function ShapesList({ items, colorScheme, loading, onSelect, onDeleteRequest, onAddRecent, onHover }) {
  return (
    <List dense>
      {items.map((s, idx) => (
        <ShapeListItem
          key={`${s.id || 'shape'}-${idx}`}
          s={s}
          idx={idx}
          colorScheme={colorScheme}
          onSelect={onSelect}
          onRequestDelete={onDeleteRequest}
          onAddRecent={onAddRecent}
          onHover={onHover}
        />
      ))}
      {(!loading && items.length === 0) && (
        <ListItem><ListItemText primary="No shapes found" /></ListItem>
      )}
    </List>
  );
}

// Presentational: footer with load more and close
function FooterControls({ total, threshold, canLoadMore, onLoadMore, loading }) {
  return (
    <div style={FOOTER_ROW_STYLE}>
      <div>
        {total > 0 && (
          <small>
            {total} shapes in catalog{total > threshold ? ' — large catalog, use search or paging' : ''}
          </small>
        )}
      </div>
      <div>
        {canLoadMore && (
          <Button onClick={onLoadMore} disabled={loading}>{BUTTONS.LOAD_MORE}</Button>
        )}
      </div>
    </div>
  );
}

// Presentational: delete confirmation
function DeleteConfirmDialog({ open, shape, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Delete shape?</DialogTitle>
      <DialogContent>
        Are you sure you want to delete <strong>{shape?.name || shape?.meta?.name || 'this shape'}</strong>? This cannot be undone.
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onConfirm(shape)} color="error">Delete</Button>
      </DialogActions>
    </Dialog>
  );
}

// Presentational: snackbar with optional UNDO
function SnackMessage({ open, message, details, canUndo, onUndo, onClose }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      slots={{ transition: SlideUpTransition }}
    >
      <Alert onClose={onClose} severity="info" action={canUndo ? (<Button color="inherit" size="small" onClick={onUndo}>UNDO</Button>) : null}>
        <div>
          <div>{message}</div>
          {details && (
            <pre style={{ margin: '8px 0 0 0', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {details}
            </pre>
          )}
        </div>
      </Alert>
    </Snackbar>
  );
}

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {}, colorSchemeKey = 'bio', onAddRecent, prefetchOnMount = false }){
  const [q, setQ] = useState('');
  // inputQ is the immediate value bound to the TextField. We debounce
  // propagation into `q` (which drives client-side filtering) so rapid
  // keystrokes don't synchronously re-filter a potentially very large
  // `results` array on every keypress.
  const [inputQ, setInputQ] = useState('');
  const [results, setResults] = useState([]); // metadata items (id + name)
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const LARGE_CATALOG_THRESHOLD = 1000; // UI hint threshold
  // No in-memory or IndexedDB caching: always fetch from backend for results.
  
  // Backend server management states
  const [showBackendDialog, setShowBackendDialog] = useState(false);
  const [backendStarting, setBackendStarting] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackUndoShape, setSnackUndoShape] = useState(null);
  const [snackDetails, setSnackDetails] = useState(null); // temporary debug details
  // timerRef not needed with server-side search/pagination
  const loadStartRef = useRef(null);
  const qRef = useRef('');
  const [hoveredShapeData, setHoveredShapeData] = useState(null);
  const hoverWorkerRef = useRef(null);
  const hoverDataRef = useRef(null);
  const hoverDebounceRef = useRef(null);
  const pendingHoverIdRef = useRef(null);

  useEffect(() => { hoverDataRef.current = hoveredShapeData; }, [hoveredShapeData]);

  
  //const handleAddRecent = useCallback(
  //(shape) => {
   // onAddRecent?.(shape);
  //},
  //[onAddRecent]
//);
  // Safe wrapper to add a shape to recent list without throwing
  const safeAddRecent = useCallback((s) => {
    try {
      onAddRecent?.(s);
    } catch (e) {
      logger.warn('onAddRecent failed:', e);
    }
  }, [onAddRecent]);

  // Use a web worker (or faux worker in tests) to fetch full shape data on hover

  // Hover worker creation is handled by `workerFactories.createHoverWorker`.

  const directFetchPreview = useCallback(async (id) => {
    try {
      const res = await fetch(`${getBaseUrl(backendBase)}/v1/shapes/${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const s = await res.json().catch(() => ({}));
      const desc = s.description || s.meta?.description || s.meta?.desc || '';
      const cells = Array.isArray(s.cells) ? s.cells : (Array.isArray(s.pattern) ? s.pattern : (Array.isArray(s.liveCells) ? s.liveCells : []));
      setHoveredShapeData({ id: s.id, name: s.name || s.meta?.name || '(unnamed)', description: desc, cells });
    } catch (err) {
      // ignore
    }
  }, [backendBase]);

  const handleHoverWorkerError = useCallback((worker, id, ev) => {
    try { logger.warn('[ShapePaletteDialog] hover worker error/fallback', ev); } catch (e) {}
    try { directFetchPreview(id); } catch (e) {}
    try { if (worker && typeof worker.terminate === 'function') worker.terminate(); } catch (e) {}
    if (hoverWorkerRef.current === worker) hoverWorkerRef.current = null;
  }, [directFetchPreview]);

  const attachHoverHandlers = useCallback((worker, id) => {
    // onmessage sets the preview; handle error messages (some faux workers
    // emit `type: 'error'` via onmessage) and delegate other failures to
    // the shared error handler.
    worker.onmessage = (ev) => {
      const d = ev.data || {};
      if (d.type === 'preview') {
        setHoveredShapeData(d.data || null);
      } else if (d.type === 'error') {
        // normalize into the same error flow used by onerror/onmessageerror
        handleHoverWorkerError(worker, id, { message: d.message || 'hover worker error' });
      }
    };
    worker.onerror = (ev) => handleHoverWorkerError(worker, id, ev);
    worker.onmessageerror = (ev) => handleHoverWorkerError(worker, id, ev);
    try {
      worker.postMessage({ type: 'start', id, base: getBaseUrl(backendBase) });
    } catch (e) {
      handleHoverWorkerError(worker, id, e);
    }
  }, [handleHoverWorkerError, backendBase]);

  const startHoverWorker = useCallback((id) => {
    if (!hoverWorkerRef.current) {
      try {
        hoverWorkerRef.current = createHoverWorker(getBaseUrl(backendBase));
          // Removed debug log
      } catch (e) {
        try { console.warn('[ShapePaletteDialog] createHoverWorker threw', e); } catch (ee) {}
      }
    }
    try {
      attachHoverHandlers(hoverWorkerRef.current, id);
    } catch (e) {
      try { console.warn('[ShapePaletteDialog] attachHoverHandlers failed, falling back to directFetchPreview', e); } catch (ee) {}
      directFetchPreview(id);
    }
  }, [directFetchPreview, backendBase, attachHoverHandlers]);

  const handleHover = useCallback((id) => {
    // Debounce and deduplicate hover requests to avoid rapid repeated fetches
    setHoveredShapeData(null);
    // clear any pending debounce
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
      hoverDebounceRef.current = null;
    }
    if (!id) {
      pendingHoverIdRef.current = null;
      if (hoverWorkerRef.current) {
        try { hoverWorkerRef.current.postMessage({ type: 'stop' }); } catch (_) {}
      }
      return;
    }
    // If the same id is already pending, do nothing
    if (pendingHoverIdRef.current === id) return;
    pendingHoverIdRef.current = id;
    // Small debounce to avoid fetching on very short mouseovers
    hoverDebounceRef.current = setTimeout(() => {
      hoverDebounceRef.current = null;
      // start worker (worker itself will ignore identical duplicate starts)
      startHoverWorker(id);
    }, 120);
  }, [startHoverWorker]);

  const handleShapeSelect = useCallback(async (shape) => {
    logger.debug('[ShapePaletteDialog] Shape selected:', shape);
    if (!shape?.id) {
      onSelectShape?.(shape);
      // Also add to recent when selecting a local/unsaved shape
      safeAddRecent(shape);
      onClose?.();
      return;
    }
    try {
      const res = await fetchShapeById(shape.id, backendBase);
  if (res.ok && res.data) {
  logger.debug('[ShapePaletteDialog] Fetched full shape data:', res.data);
        onSelectShape?.(res.data);
        safeAddRecent(res.data);
      } else {
          // Removed debug log
        onSelectShape?.(shape);
        safeAddRecent(shape);
      }
    } catch (err) {
      logger.warn('Failed to fetch full shape data, using metadata only:', err);
      onSelectShape?.(shape);
      safeAddRecent(shape);
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
  }, [results, backendBase]);

  const createShapeCb = useCallback(async (shape) => {
    return await createShape(shape, backendBase);
  }, [backendBase]);

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
  }, [snackUndoShape, createShapeCb]);

  // Start the backend server
  const startBackendServer = async () => {
    setBackendStarting(true);
    setBackendError('');
    
    try {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '55000';
      // Since we can't directly start the backend from the frontend,
      // we'll provide instructions and offer to retry the connection
      setBackendError(`To start the backend server, please run one of these commands in your terminal:

1. From the project root: npm run backend:start
2. From the backend directory: cd backend && npm start

The backend will start on port ${backendPort}.`);
      
      // Don't close the dialog, let user retry after starting manually
    } catch (error) {
      logger.error('Backend start instructions shown:', error);
      setBackendError(`Please start the backend manually: npm run backend:start`);
    } finally {
      setBackendStarting(false);
    }
  };

  // Retry connecting to backend
  const retryBackendConnection = async () => {
    setBackendStarting(true);
    setBackendError('');
    
    try {
      const isHealthy = await checkBackendHealth(backendBase);
      if (isHealthy) {
        setShowBackendDialog(false);
        // Retry the original search
        setLoading(true);
        setResults([]);
        setOffset(0);
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

  useEffect(()=>{ if(!open){ setQ(''); setResults([]); setLoading(false); setInputQ(''); } }, [open]);

  // Track when the dialog is opened so we can time how long loading cached
  // shapes into the palette takes. start time is set when `open` becomes true.
  useEffect(() => {
    if (open) loadStartRef.current = Date.now(); else loadStartRef.current = null;
  }, [open]);
  
  
  // Server-side paged name fetch is used below in the effect; no local namesCatalog stored.

  // Helper to fetch one page of names and update results (replace or append)
  // qRef allows us to reset offset on q changes and keep the main fetch
  // effect free of `q` in its dependency list, lowering complexity.
  useEffect(() => {
    // when q changes, update ref and reset paging to first page
      qRef.current = q;
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

    // Debounce input -> q to avoid expensive filtering on every keystroke.
    useEffect(() => {
      // If the immediate input matches the debounced q already, nothing to do
      if (inputQ === q) return undefined;
      const id = setTimeout(() => {
        setQ(inputQ);
      }, 200); // 200ms debounce is a good balance between responsiveness and work
      return () => clearTimeout(id);
    }, [inputQ, q]);

  // Worker-based incremental loader: fetch 50 names at a time in a Web Worker
  // to keep the UI responsive while the full catalog is downloaded.
  const workerRef = useRef(null);

  // Restart the names worker when the paging offset or backendBase changes while
  // the dialog is open. We intentionally do NOT restart on `q` so that typing
  // filters the already-loaded catalog client-side (avoids extra backend calls).
  useEffect(() => {
    if (!open) return; // only run when dialog is visible
    // startNamesWorker stops any existing worker before starting a new one
    startNamesWorker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, backendBase, open]);

  // Worker event handlers extracted to reduce cognitive complexity of
  // startNamesWorker. These are stable handlers that reference component
  // state setters via closure.
  /* eslint-disable-next-line sonarjs/cognitive-complexity */
  function handleWorkerMessage(ev) {
    try {
      const data = ev.data || {};
      if (data.type === 'page') {
        const items = Array.isArray(data.items) ? data.items : [];
        try {
          const missing = items.filter(it => !it || !it.id);
          if (missing && missing.length) {
            console.error('[ShapePaletteDialog] names worker page contains items without id:', missing.slice(0,5));
          }
        } catch (e) {}
        setResults(prev => [...(prev || []), ...items]);
        setTotal(prev => data.total || (prev || 0) + items.length);
      } else if (data.type === 'error') {
        const msg = `Shapes backend error: ${data.message}`;
        logger.warn('[ShapePaletteDialog] worker error:', data.message);
        setBackendError(msg);
        setShowBackendDialog(true);
        setLoading(false);
        stopNamesWorker();
      } else if (data.type === 'done') {
        setLoading(false);
        stopNamesWorker();
      }
    } catch (handlerErr) {
      logger.error('[ShapePaletteDialog] error handling worker message:', handlerErr);
      setBackendError(`Worker handler error: ${handlerErr?.message || String(handlerErr)}`);
      setShowBackendDialog(true);
      setLoading(false);
      stopNamesWorker();
    }
  }

  function handleWorkerError(errEvent) {
    logger.warn('[ShapePaletteDialog] worker runtime error:', errEvent);
    let message = 'Unknown worker error';
    try {
      if (errEvent && typeof errEvent === 'object') {
        message = errEvent.message || (errEvent.error && (errEvent.error.message || String(errEvent.error))) || String(errEvent);
        if (errEvent.filename) message += ` at ${errEvent.filename}:${errEvent.lineno || '?'}:${errEvent.colno || '?'} `;
      } else {
        message = String(errEvent);
      }
    } catch (ex) {
      message = String(errEvent);
    }
    setBackendError(`Worker error: ${message}`);
    setShowBackendDialog(true);
    setLoading(false);
    stopNamesWorker();
  }

  function handleWorkerMessageError(ev) {
    logger.warn('[ShapePaletteDialog] worker messageerror:', ev);
    setBackendError('Worker message error');
    setShowBackendDialog(true);
    setLoading(false);
    stopNamesWorker();
  }

  function stopNamesWorker() {
    try {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    } catch (e) {
      // ignore
    }
  }

  function startNamesWorker() {
    stopNamesWorker();
    setResults([]);
    setTotal(0);
    setLoading(true);
    const base = getBaseUrl(backendBase);
    const qParam = qRef.current || '';
    const pageSize = Number(limit) || 50;

    let worker = null;
    try {
      worker = createNamesWorker(base, qParam, pageSize);
    } catch (e) {
      logger.warn('[ShapePaletteDialog] createNamesWorker threw', e);
      worker = createFauxNamesWorker();
    }
    workerRef.current = worker;

    // Attach pre-extracted handlers to keep this function small.
    worker.onmessage = handleWorkerMessage;
    // If the real module worker fails to load or throws during init, the
    // worker.onerror handler will be invoked. Instead of surface a fatal
    // UI error immediately, try to fall back to a faux worker so the
    // incremental loader continues in-band.
    worker.onerror = (errEvent) => {
      logger.warn('[ShapePaletteDialog] worker runtime error, falling back to faux worker:', errEvent);
      try {
        // Create a faux worker and wire handlers
        const faux = createFauxNamesWorker();
        workerRef.current = faux;
        faux.onmessage = handleWorkerMessage;
        faux.onerror = handleWorkerError;
        faux.onmessageerror = handleWorkerMessageError;
        // Start the faux worker loop
        faux.postMessage({ type: 'start', base, q: qParam, limit: pageSize });
        return;
      } catch (createErr) {
        // If fallback also fails, surface original error normally.
        logger.error('[ShapePaletteDialog] faux worker creation failed:', createErr);
        handleWorkerError(errEvent);
      }
    };
    // Some environments do not support `onmessageerror` — assigning the
    // handler directly is safe (it will be ignored if unsupported).
    worker.onmessageerror = handleWorkerMessageError;

    // start the worker
    try {
      worker.postMessage({ type: 'start', base, q: qParam, limit: pageSize });
    } catch (postErr) {
      // Synchronous postMessage errors can happen (e.g., circular refs),
      // normalize and surface them via the same error handling path.
      logger.error('[ShapePaletteDialog] worker.postMessage failed:', postErr);
      if (worker.onerror) worker.onerror(postErr);
    }
  }

  // Names worker creation is handled by `workerFactories.createNamesWorker`.

  useEffect(() => {
    if (!open) {
      // ensure worker stopped and reset results when closed
      stopNamesWorker();
      setResults([]);
      setLoading(false);
      setTotal(0);
      return undefined;
    }
    // when opened, start background incremental load
    startNamesWorker();
    return () => {
      stopNamesWorker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, backendBase]);

  // Client-side filtering of the loaded results based on the search query `q`.
  const displayedResults = React.useMemo(() => {
    if (!q || q.trim().length === 0) return results;
    const ql = q.toLowerCase();
    return (results || []).filter(r => (r.name || '').toLowerCase().includes(ql));
  }, [results, q]);

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
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, padding: 2 }}>
      {/* Hide the inline spinner to avoid a distracting persistent progress indicator.
        Loading state still controls network/cache behavior but we don't show
        the small spinner in the SearchBar to keep the UI calm. */}
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
  <SearchBar value={inputQ} onChange={setInputQ} loading={false} onClose={onClose} onClear={() => { setResults([]); setInputQ(''); setQ(''); }} />
    <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1, p: 1 }}>
      <PreviewPanel preview={hoveredShapeData} colorScheme={colorScheme} colorSchemeKey={colorSchemeKey} />
    </Box>
  </Box>
          {/* Network-driven loading indicator is not shown inline; SearchBar shows minimal UI */}
          <div style={{ overflow: 'auto', flex: 1, minHeight: 120 }} data-testid="shapes-list-scroll">
            {/* Render only up to MAX_RENDER_ITEMS to avoid jank when the
                filtered result set is large. Always show a brief hint when
                results are capped and the user can refine their query. */}
            <ShapesList
              items={displayedResults}
              colorScheme={colorScheme}
              loading={loading}
              onSelect={handleShapeSelect}
              onDeleteRequest={(shape) => { setToDelete(shape); setConfirmOpen(true); }}
              onAddRecent={onAddRecent}
              onHover={handleHover}
            />
            <FooterControls
              total={total}
              threshold={LARGE_CATALOG_THRESHOLD}
              canLoadMore={offset + results.length < total}
              onLoadMore={() => { setOffset(prev => prev + limit); }}
              loading={loading}
            />
          </div>
          <DeleteConfirmDialog
            open={confirmOpen}
            shape={toDelete}
            onCancel={() => { setConfirmOpen(false); setToDelete(null); }}
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
        onClose={() => { setSnackOpen(false); setSnackMsg(''); setSnackUndoShape(null); }}
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
  onAddRecent: PropTypes.func
};

ShapePaletteDialog.defaultProps = {
  colorScheme: {}
};
