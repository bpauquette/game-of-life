import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import logger from '../controller/utils/logger';
import {
  getBaseUrl,
  fetchShapes,
  fetchShapeById,
  createShape,
  checkBackendHealth, deleteShapeById
} from '../utils/backendApi';
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
import DeleteIcon from '@mui/icons-material/Delete';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import Typography from '@mui/material/Typography';
import ShapePreview from './components/ShapePreview';
import SearchBar from './components/SearchBar';
import LinearProgress from '@mui/material/LinearProgress';

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
const PREVIEW_BOX_SIZE = 72;
const PREVIEW_SVG_SIZE = 64;
const PREVIEW_BORDER_OPACITY = 0.06;
const PREVIEW_BORDER_RADIUS = 6;
const SPACE_BETWEEN = 'space-between';
const FOOTER_ROW_STYLE = { display: 'flex', justifyContent: SPACE_BETWEEN, alignItems: 'center', marginTop: 8 };
// When the full catalog is large, avoid rendering thousands of items at once.
const MAX_RENDER_ITEMS = 200;
// Helper: derive a reliable cell count from a shape object. Some shapes
// may include `cells` (array), `pattern` (array), or `liveCells`.
// Older code used `cellsCount` which may be absent when shapes are
// loaded/cached, so prefer actual arrays when available.
function getShapeCellCount(s) {
  if (!s) return 0;
  if (Number.isInteger(s.cellsCount) && s.cellsCount > 0) return s.cellsCount;
  if (Array.isArray(s.cells)) return s.cells.length;
  if (Array.isArray(s.pattern)) return s.pattern.length;
  if (Array.isArray(s.liveCells)) return s.liveCells.length;
  return 0;
}
// (previous GRID_LINE_OFFSET removed — unused in this module)

// Transition component for Snackbar - moved outside to avoid recreation on each render
const SlideUpTransition = (props) => <Slide {...props} direction="up" />;

// Helper: fetch all pages of shapes from the backend (used by the
// full-catalog downloader). Returns { all, reqCount, totalReqTime }.
async function fetchAllShapes(base, page) {
  let offsetLocal = 0;
  let all = [];
  let reqCount = 0;
  let totalReqTime = 0;
  while (true) {
    const reqStart = Date.now();
    const out = await fetchShapes(base, '', page, offsetLocal);
    const reqMs = Date.now() - reqStart;
    reqCount += 1;
    totalReqTime += reqMs;
    if (!out.ok) {
      throw new Error(`Fetch shapes failed: ${out.status}`);
    }
    all = all.concat(out.items || []);
    if (all.length >= (out.total || 0) || (out.items || []).length === 0) break;
    offsetLocal += page;
  }
  return { all, reqCount, totalReqTime };
}

// fetchShapes now imported from backendApi.js

// Note: network-driven search paths were removed. The UI assumes the
// full catalog will be cached before the Shapes tool becomes active,
// so all searching/filtering happens client-side against the cached
// catalog. This keeps the dialog logic simple and predictable.

// Helper: filter a cached catalog by query
function filterCachedCatalogItems(catalog, q) {
  const qLower = String(q || '').trim().toLowerCase();
  if (!qLower) return catalog.slice();
  // Search only on the shape's name (explicit requirement).
  return catalog.filter(item => {
    const name = String(item.name || '').toLowerCase();
    return name.includes(qLower);
  });
}

// Small presentational: per-shape list item with preview and delete affordance
function ShapeListItem({ s, idx, colorScheme, onSelect, onRequestDelete, onAddRecent }) {
  // Use a stable timestamp for animated schemes (e.g., Spectrum) to avoid flicker across rerenders
  const tRef = useRef(Date.now());
  const getCellColor = (x, y) => colorScheme?.getCellColor?.(x, y, tRef.current) ?? '#4a9';
  const w = Math.max(1, s.width || 1);
  const h = Math.max(1, s.height || 1);
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
      if (globalThis.__GOL_PREVIEW_DEBUG__) {
        logger.debug('[ShapePaletteDialog] palette-sample', { id: s.id || s.name, x: fx, y: fy, color: sampleColor });
      }
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
          <ListItemButton onClick={() => onSelect(s)} sx={{ flex: 1 }}>
            <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5, fontFamily: 'monospace' }}
              data-testid="shape-label"
            >
              {s.name || '(unnamed)'}
            </Typography>
            {s.description && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 0.5 }} data-testid="shape-description">
                {s.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {`${w}×${h} — ${getShapeCellCount(s)} cells`}
            </Typography>
          </Box>
          <Box sx={{ ml: 1, width: PREVIEW_BOX_SIZE, height: PREVIEW_BOX_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShapePreview
              shape={s}
              colorScheme={colorScheme}
              boxSize={PREVIEW_SVG_SIZE}
              borderRadius={PREVIEW_BORDER_RADIUS}
              borderOpacity={PREVIEW_BORDER_OPACITY}
              t={tRef.current}
              source={'palette'}
            />
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
function ShapesList({ items, colorScheme, loading, onSelect, onDeleteRequest, onAddRecent }) {
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

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {}, onAddRecent, prefetchOnMount = false }){
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]); // metadata items
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const LARGE_CATALOG_THRESHOLD = 1000; // UI hint threshold
  const [cachedCatalog, setCachedCatalog] = useState(null);
  const [caching, setCaching] = useState(false);
  // Consider IDB available if idbCatalog provides the API (allows tests to mock it)
  // No IndexedDB usage in the frontend; we rely on the backend and an in-memory cache.
  // We no longer persist the catalog to IndexedDB; keep a lightweight
  // in-memory progress state for UI feedback during network fetches.
  const [cacheProgress, setCacheProgress] = useState({ done: 0, total: 0 });
  // When we finish a full catalog cache, briefly skip the next automatic
  // client-side paging/filter run so the UI can show the full cached list
  // (otherwise the useEffect paging logic will immediately slice it to the
  // first page). This is intentionally short-lived and only suppresses the
  // very next local filter run.
  const skipNextLocalFilterRef = useRef(false);
  // No localStorage usage; CACHE_KEY removed

  // No IndexedDB persistence: the download helper will fetch and populate
  // the in-memory cachedCatalog only.
  
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
  const timerRef = useRef(null);
  const [initialCacheLoaded, setInitialCacheLoaded] = useState(false);
  const loadStartRef = useRef(null);
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
        logger.warn('[ShapePaletteDialog] Fallback: onSelectShape called with metadata only');
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

  useEffect(()=>{ if(!open){ setQ(''); setResults([]); setLoading(false); } }, [open]);

  // Track when the dialog is opened so we can time how long loading cached
  // shapes into the palette takes. start time is set when `open` becomes true.
  useEffect(() => {
    if (open) {
      loadStartRef.current = Date.now();
    } else {
      loadStartRef.current = null;
    }
  }, [open]);
  
  
  // On mount, read any existing cached catalog (in-memory or IndexedDB).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mem = (typeof globalThis !== 'undefined') ? globalThis.__GOL_SHAPES_CACHE__ : null;
        if (mounted && Array.isArray(mem) && mem.length > 0) {
          setCachedCatalog(mem);
          setResults(mem);
          setTotal(mem.length);
          return;
        }
        // If no global cache is present, initialCacheLoaded is still true
        // so the loader can kick off a fetch when the palette opens.
      } catch (e) {
        logger.debug('Error reading in-memory cache on mount', e);
      } finally {
        if (mounted) setInitialCacheLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [limit]);

  // (clear cache UI removed — caching is managed by the loader)

  // Download entire catalog and store in localStorage
  const downloadCatalogToLocal = useCallback(async () => {
    setCaching(true);
    try {
    const startTs = Date.now();
    const base = getBaseUrl(backendBase);
    const page = 200;
    // Fetch all paged shapes via helper
    const { all, reqCount, totalReqTime } = await fetchAllShapes(base, page);
    setCachedCatalog(all);
      // No IndexedDB persistence: the catalog is kept in-memory only.
      // Timing info
      const totalMs = Date.now() - startTs;
      const avgReqMs = reqCount > 0 ? Math.round(totalReqTime / reqCount) : 0;
  // Cache completion is useful for debugging but noisy in regular runs — use debug
  logger.debug(`[ShapePaletteDialog] Cached ${all.length} shapes in ${totalMs}ms (avg req ${avgReqMs}ms, ${reqCount} reqs)`);
      setSnackMsg(`Cached ${all.length} shapes in ${(totalMs / 1000).toFixed(1)}s`);
      setSnackDetails(`Requests: ${reqCount}, avg ${avgReqMs}ms`);
      setSnackOpen(true);
  // update UI: show the full cached catalog (the Shapes tool is
  // disabled until the cache is ready, so we don't need partial states)
  setResults(all);
  setTotal(all.length);
  setOffset(0);
  // Prevent the automatic client-side paging/filter run (which would
  // immediately slice results back to the first page) from running once
  // after we've explicitly shown the full cached catalog.
  skipNextLocalFilterRef.current = true;
    } catch (err) {
      logger.error('Failed to download catalog:', err);
      setSnackMsg('Failed to cache catalog');
      setSnackDetails(String(err));
      setSnackOpen(true);
    } finally {
      setCaching(false);
      setLoading(false);
    }
  }, [backendBase]);

  // If caller requests prefetch, start caching as soon as the component mounts
  useEffect(() => {
    if (prefetchOnMount && initialCacheLoaded && !cachedCatalog && !caching) {
      // fire-and-forget; downloadCatalogToLocal will set caching state
      downloadCatalogToLocal().catch((e) => logger.warn('Prefetch failed:', e?.message));
    }
  }, [prefetchOnMount, cachedCatalog, caching, downloadCatalogToLocal, initialCacheLoaded]);

  // Auto-download entire catalog the first time the dialog is opened.
  useEffect(() => {
    // noop here; loading will be handled by the blocking loader dialog when necessary
  }, [open, cachedCatalog, caching, downloadCatalogToLocal, initialCacheLoaded]);

  // Show a blocking loader dialog when the component is opened and there's no cached catalog.
  const showLoader = open && initialCacheLoaded && !cachedCatalog;

  // Kick off download when loader dialog becomes visible.
  useEffect(() => {
    if (showLoader && !caching) {
      downloadCatalogToLocal().catch((e) => logger.warn('Loader auto-download failed:', e?.message));
    }
  }, [showLoader, caching, downloadCatalogToLocal]);

  // loader flow handled in the render below; do not early-return to keep hooks order stable
  // Simplified search: the Shapes tool is disabled until the full
  // catalog is cached, so only perform client-side filtering. This
  // avoids partial/network-driven states and keeps the component lean.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    // shorter debounce for more responsive typing
    timerRef.current = setTimeout(() => {
      if (Array.isArray(cachedCatalog) && cachedCatalog.length > 0) {
        try {
          const filtered = filterCachedCatalogItems(cachedCatalog, q);
          setResults(filtered);
          setTotal(filtered.length);
        } catch (e) {
          logger.warn('Local catalog filter failed:', e?.message);
          setResults([]);
          setTotal(0);
        }
      } else {
        // No cached catalog yet; show empty results. The loader dialog
        // (shown elsewhere) will fetch the full catalog before the
        // shapes tool becomes clickable.
        setResults([]);
        setTotal(0);
      }
      setLoading(false);
    }, 150);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q, cachedCatalog]);

  return (
    <>
      {/* Loader dialog shown when opening and no cached catalog exists */}
      {showLoader && (
        <Dialog open={true} disableEscapeKeyDown maxWidth="sm" fullWidth data-testid="catalog-loader">
          <DialogTitle>Downloading full catalog</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 3 }}>
            <div style={{ fontWeight: 600 }}>Downloading full shapes catalog…</div>
            {cacheProgress?.total > 0 && (
              <div style={{ width: '100%', marginTop: 8 }}>
                <LinearProgress variant="determinate" value={(cacheProgress.done / Math.max(1, cacheProgress.total)) * 100} />
                <div style={{ display: 'flex', justifyContent: SPACE_BETWEEN, marginTop: 6 }}>
                  <small>{cacheProgress.done}/{cacheProgress.total}</small>
                  <small>{Math.round((cacheProgress.done / Math.max(1, cacheProgress.total)) * 100)}%</small>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

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
  <SearchBar value={q} onChange={setQ} loading={false} onClose={onClose} />
          {caching && cacheProgress?.total > 0 && (
            <div style={{ marginTop: 8 }}>
              <LinearProgress variant="determinate" value={(cacheProgress.done / Math.max(1, cacheProgress.total)) * 100} />
              <div style={{ display: 'flex', justifyContent: SPACE_BETWEEN, fontSize: 12, marginTop: 4 }}>
                <span>Downloading catalog: {cacheProgress.done}/{cacheProgress.total}</span>
                <span>{Math.round((cacheProgress.done / Math.max(1, cacheProgress.total)) * 100)}%</span>
              </div>
            </div>
          )}
          <div style={{ overflow: 'auto', flex: 1, minHeight: 120 }} data-testid="shapes-list-scroll">
            {/* Render only up to MAX_RENDER_ITEMS to avoid jank when the
                filtered result set is large. Always show a brief hint when
                results are capped and the user can refine their query. */}
            {(() => {
              const tooMany = Array.isArray(results) && results.length > MAX_RENDER_ITEMS;
              const display = tooMany ? results.slice(0, MAX_RENDER_ITEMS) : results;
              return (
                <>
                  <ShapesList
                    items={display}
                    colorScheme={colorScheme}
                    loading={loading}
                    onSelect={handleShapeSelect}
                    onDeleteRequest={(shape) => { setToDelete(shape); setConfirmOpen(true); }}
                    onAddRecent={onAddRecent}
                  />
                  {tooMany && (
                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>
                      Showing first {MAX_RENDER_ITEMS} of {results.length} matches. Refine your search to narrow results.
                    </div>
                  )}
                </>
              );
            })()}
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
  onAddRecent: PropTypes.func
};

ShapePaletteDialog.defaultProps = {
  colorScheme: {}
};
