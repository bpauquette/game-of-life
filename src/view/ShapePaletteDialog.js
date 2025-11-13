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
import TextField from '@mui/material/TextField';
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
  onClose: PropTypes.func,
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

SearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

// UI Constants
const PREVIEW_BOX_SIZE = 72;
const PREVIEW_SVG_SIZE = 64;
const PREVIEW_BORDER_OPACITY = 0.06;
const PREVIEW_BORDER_RADIUS = 6;
const GRID_LINE_OFFSET = 0.5;

// Transition component for Snackbar - moved outside to avoid recreation on each render
const SlideUpTransition = (props) => <Slide {...props} direction="up" />;

// Enhanced: always check backend health if fetch error or status >= 500
const looksLikeConnectionError = async (err, checkBackendHealth) => {
  const msg = String(err?.message || err || '');
  if (
    msg.includes('fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ECONNREFUSED') ||
    err?.code === 'ECONNREFUSED' ||
    (err?.status && err.status >= 500)
  ) {
    return true;
  }
  // If error is ambiguous, do a backend health check
  if (typeof checkBackendHealth === 'function') {
    const healthy = await checkBackendHealth();
    return !healthy;
  }
  return false;
};

// fetchShapes now imported from backendApi.js

async function maybeHandleBackendDown(err, { checkBackendHealth, cancelRef, setLoading, setShowBackendDialog }) {
  if (!(await looksLikeConnectionError(err, checkBackendHealth))) return false;
  const healthy = await checkBackendHealth();
  if (healthy) return false;
  if (!cancelRef.cancelled) {
    setLoading(false);
    setShowBackendDialog(true);
  }
  return true;
}

// Orchestrate fetch + state updates with cancellation support
async function fetchAndUpdateShapes({
  backendBase,
  q,
  limit,
  offset,
  setResults,
  setTotal,
  setLoading,
  setShowBackendDialog,
  checkBackendHealth,
  cancelRef
}) {
  try {
    const base = getBaseUrl(backendBase);
    const out = await fetchShapes(base, q, limit, offset);
    if (cancelRef.cancelled) return;
    if (!out.ok) {
      logger.warn('Shape search returned non-OK status:', out.status);
      setResults([]);
      setTotal(0);
      // Fallback: show backend dialog if status >= 500 or no response
      if (out.status >= 500 || out.status === undefined) {
        setShowBackendDialog(true);
      }
      return;
    }
    setTotal(out.total);
    setResults((prev) => (offset > 0 ? [...prev, ...out.items] : out.items));
  } catch (err) {
    logger.error('Shape search error:', err);
    // Always log error and show a visible message if backend unreachable
    if (await maybeHandleBackendDown(err, { checkBackendHealth, cancelRef, setLoading, setShowBackendDialog })) {
      logger.error('Backend unreachable, showing dialog.');
      return;
    }
    if (!cancelRef.cancelled) {
      setResults([]);
      setShowBackendDialog(true);
      logger.error('Fallback: backend unreachable, dialog forced.');
    }
  } finally {
    if (!cancelRef.cancelled) setLoading(false);
  }
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
              onAddRecent(s);
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
              {`${w}×${h} — ${s.cellsCount || 0} cells`}
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

// Presentational: search input + spinner
function SearchBar({ value, onChange, loading }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <TextField
        label="Search shapes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        placeholder="Type 3+ chars to search"
        size="small"
      />
      {loading && <CircularProgress size={24} />}
    </div>
  );
}

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
function FooterControls({ total, threshold, canLoadMore, onLoadMore, onClose, loading }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
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
        <Button onClick={onClose}>Close</Button>
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

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {},onAddRecent  }){
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]); // metadata items
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const LARGE_CATALOG_THRESHOLD = 1000; // UI hint threshold
  
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
    logger.info('[ShapePaletteDialog] Shape selected:', shape);
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
        logger.info('[ShapePaletteDialog] Fetched full shape data:', res.data);
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
  
  useEffect(()=>{
    const cancelRef = { cancelled: false };
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(() => {
      fetchAndUpdateShapes({
        backendBase,
        q,
        limit,
        offset,
        setResults,
        setTotal,
        setLoading,
        setShowBackendDialog,
        checkBackendHealth,
        cancelRef
      });
    }, 300);
    return () => { cancelRef.cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q, backendBase, offset, limit]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="shapes-palette">
        <DialogTitle>Insert shape from catalog</DialogTitle>
        <DialogContent>
          <SearchBar value={q} onChange={setQ} loading={loading} />
          <ShapesList
            items={results}
            colorScheme={colorScheme}
            loading={loading}
            onSelect={handleShapeSelect}
            onDeleteRequest={(shape) => { setToDelete(shape); setConfirmOpen(true); }}
            onAddRecent={onAddRecent}
          />
          <FooterControls
            total={total}
            threshold={LARGE_CATALOG_THRESHOLD}
            canLoadMore={offset + results.length < total}
            onLoadMore={() => { setOffset(prev => prev + limit); }}
            onClose={onClose}
            loading={loading}
          />
          <DeleteConfirmDialog
            open={confirmOpen}
            shape={toDelete}
            onCancel={() => { setConfirmOpen(false); setToDelete(null); }}
            onConfirm={handleDelete}
          />
          <SnackMessage
            open={snackOpen}
            message={snackMsg}
            details={snackDetails}
            canUndo={!!snackUndoShape}
            onUndo={handleUndo}
            onClose={() => { setSnackOpen(false); setSnackMsg(''); setSnackUndoShape(null); }}
          />
        </DialogContent>
      </Dialog>

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
