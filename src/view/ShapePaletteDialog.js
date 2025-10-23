import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import logger from '../controller/utils/logger';
import { BUTTONS } from '../utils/Constants';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import DialogActions from '@mui/material/DialogActions';
// IconButton/Delete icons were removed as we no longer render delete in metadata list
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import Typography from '@mui/material/Typography';

// UI Constants
const PREVIEW_BOX_SIZE = 72;
const PREVIEW_SVG_SIZE = 64;
const PREVIEW_BORDER_OPACITY = 0.06;
const PREVIEW_BORDER_RADIUS = 6;
const GRID_LINE_OFFSET = 0.5;

// Transition component for Snackbar - moved outside to avoid recreation on each render
const SlideUpTransition = (props) => <Slide {...props} direction="up" />;

// Helper function to resolve base URL consistently
const getBaseUrl = (backendBase) => {
  if (typeof backendBase === 'string' && backendBase.length > 0) {
    return backendBase;
  }
  return globalThis.window?.location?.origin 
    ? String(globalThis.window.location.origin) 
    : 'http://localhost';
}

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {} }){
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
  // deletingId removed; we track optimistic removal in local results
  const timerRef = useRef(null);

  // helper to pick a cell color for the small SVG preview
  const getCellColor = (x, y) => {
      return colorScheme?.getCellColor?.(x, y) ?? '#4a9';
  };

  // Check if backend is reachable
  const checkBackendHealth = useCallback(async () => {
    try {
      const base = getBaseUrl(backendBase);
      const healthUrl = new URL('/health', base);
      const response = await fetch(healthUrl.toString(), {
        method: 'GET',
        timeout: 3000 // 3 second timeout
      });
      return response.ok;
    } catch (error) {
      logger.warn('Backend health check failed:', error);
      return false;
    }
  }, [backendBase]);

  // Start the backend server
  const startBackendServer = async () => {
    setBackendStarting(true);
    setBackendError('');
    
    try {
      // Since we can't directly start the backend from the frontend,
      // we'll provide instructions and offer to retry the connection
      setBackendError(`To start the backend server, please run one of these commands in your terminal:

1. From the project root: npm run backend:start
2. From the backend directory: cd backend && npm start

The backend will start on port 55000.`);
      
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
      const isHealthy = await checkBackendHealth();
      if (isHealthy) {
        setShowBackendDialog(false);
        // Retry the original search
        setLoading(true);
        setResults([]);
        setOffset(0);
      } else {
        setBackendError('Backend server is still not responding. Please make sure it\'s running on port 55000.');
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
  let mounted = true;
  if (timerRef.current) clearTimeout(timerRef.current);
  // When the dialog opens we want to show the catalog even before a
  // search term is entered. Previously the UI required 3+ chars which made
  // the catalog appear empty by default. We'll still debounce queries.
  setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const base = getBaseUrl(backendBase);
        const url = new URL('/v1/shapes', base);
        url.searchParams.set('q', q);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('offset', String(offset));
        const res = await fetch(url.toString());
        if (res.ok === false) {
          logger.warn('Shape search returned non-OK status:', res.status);
          if (mounted) { setResults([]); setTotal(0); }
        } else {
          let data = { items: [], total: 0 };
          try { 
            data = await res.json(); 
          } catch (error_) { 
            logger.warn('Failed to parse JSON response:', error_.message);
            // data remains as default empty structure
          }
          const items = Array.isArray(data.items) ? data.items : [];
          if (mounted) {
            setTotal(Number(data.total) || 0);
            // append when offset > 0 (load more), otherwise replace
            setResults(prev => (offset > 0 ? [...prev, ...items] : items));
          }
        }
      } catch (e) {
        logger.error('Shape search error:', e);
        
        // Check if this is a connection error that might indicate backend is down
    if (e.message.includes('fetch') || e.message.includes('NetworkError') || 
      e.message.includes('ECONNREFUSED') || e.code === 'ECONNREFUSED') {
          // Backend might be down, offer to start it
          const isHealthy = await checkBackendHealth();
          if (!isHealthy) {
            if (mounted) setLoading(false);
            if (mounted) setShowBackendDialog(true);
            return; // Don't set empty results yet
          }
        }
        
        if (mounted) setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return ()=>{ if(timerRef.current) clearTimeout(timerRef.current); };
  }, [q, backendBase, offset, limit, checkBackendHealth]);

  return (
    <>
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="shapes-palette">
      <DialogTitle>Insert shape from catalog</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <TextField
            label="Search shapes"
            value={q}
            onChange={e=>setQ(e.target.value)}
            fullWidth
            placeholder="Type 3+ chars to search"
            size="small"
          />
          {loading && <CircularProgress size={24} />}
        </div>

        <List dense>
          {results.map(s => (
            <ListItem key={s.id} button onClick={async () => {
              // fetch full shape by id before returning selection
              try{
                const base = getBaseUrl(backendBase);
                const url = new URL(`/v1/shapes/${encodeURIComponent(s.id)}`, base);
                const res = await fetch(url.toString());
                if(res.ok){
                  const full = await res.json();
                  onSelectShape?.(full);
                  onClose?.();
                } else {
                  // fallback: pass metadata only
                  onSelectShape?.(s);
                  onClose?.();
                }
              }catch(err){
                logger.warn('Failed to fetch full shape data, using metadata only:', err);
                // network error - fallback to metadata
                onSelectShape?.(s);
                onClose?.();
              }
            }}>
              <ListItemText primary={s.name || '(unnamed)'} secondary={`${s.width}×${s.height} — ${s.cellsCount||0} cells`} />
              <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); setToDelete(s); setConfirmOpen(true); }}>
                <DeleteIcon />
              </IconButton>
              <Box sx={{ ml: 1, width: PREVIEW_BOX_SIZE, height: PREVIEW_BOX_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={PREVIEW_SVG_SIZE} height={PREVIEW_SVG_SIZE} viewBox={`0 0 ${Math.max(1, s.width||1)} ${Math.max(1, s.height||1)}`} preserveAspectRatio="xMidYMid meet" style={{ background: colorScheme.background || 'transparent', border: `1px solid rgba(0,0,0,${PREVIEW_BORDER_OPACITY})`, borderRadius: PREVIEW_BORDER_RADIUS }}>
                  {Array.isArray(s.cells) && s.cells.length > 0 ? (
                    s.cells.map((c) => (
                      <rect key={`${s.id || 'shape'}-${c.x},${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={getCellColor(c.x, c.y)} />
                    ))
                  ) : (
                    // small empty placeholder grid
                    <g stroke={`rgba(0,0,0,${PREVIEW_BORDER_OPACITY})`} fill="none">
                      {Array.from({length: Math.max(1, s.width||1)}, (_, i) => (
                        <line key={`v-${s.id || 'unknown'}-${i}`} x1={i+GRID_LINE_OFFSET} y1={0} x2={i+GRID_LINE_OFFSET} y2={Math.max(1, s.height||1)} />
                      ))}
                      {Array.from({length: Math.max(1, s.height||1)}, (_, j) => (
                        <line key={`h-${s.id || 'unknown'}-${j}`} x1={0} y1={j+GRID_LINE_OFFSET} x2={Math.max(1, s.width||1)} y2={j+GRID_LINE_OFFSET} />
                      ))}
                    </g>
                  )}
                </svg>
              </Box>
            </ListItem>
          ))}
          {(!loading && results.length===0) && (
            <ListItem><ListItemText primary="No shapes found" /></ListItem>
          )}
        </List>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div>
            {total > 0 && <small>{total} shapes in catalog{total > LARGE_CATALOG_THRESHOLD ? ' — large catalog, use search or paging' : ''}</small>}
          </div>
          <div>
            {offset + results.length < total && (
              <Button onClick={() => { setOffset(prev => prev + limit); }} disabled={loading}>{BUTTONS.LOAD_MORE}</Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Delete shape?</DialogTitle>
          <DialogContent>
            Are you sure you want to delete <strong>{toDelete?.name || toDelete?.meta?.name || 'this shape'}</strong>? This cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConfirmOpen(false); setToDelete(null); }}>Cancel</Button>
            <Button onClick={async () => {
              // perform delete with better UX
              if(!toDelete) return;
              const id = toDelete.id;
              const old = results.slice();
              // optimistic removal
              setResults(results.filter(r => r.id !== id));
              setConfirmOpen(false);
              setToDelete(null);
              // no-op: removed deletingId tracking
                try {
                  const base = getBaseUrl(backendBase);
                  const url = new URL(`/v1/shapes/${encodeURIComponent(id)}`, base);
                  const res = await fetch(url.toString(), { method: 'DELETE' });
                  if (res.ok === false) {
                    // restore on failure
                    logger.warn('Delete failed:', res.status);
                    let bodyText = '';
                    try { bodyText = await res.text(); } catch { bodyText = '<no body>'; }
                    const details = `DELETE ${url.toString()}\nStatus: ${res.status}\nBody: ${bodyText}`;
                    setSnackMsg('Delete failed');
                    setSnackDetails(details);
                    setSnackOpen(true);
                  } else {
                    setSnackMsg('Shape deleted');
                    setSnackUndoShape(old.find(x => x.id === id) || null);
                    setSnackDetails(null);
                    setSnackOpen(true);
                  }
                } catch (err) {
                  setResults(old);
                  logger.error('Delete error:', err);
                  setSnackMsg('Delete error');
                  setSnackDetails(err?.stack ?? String(err));
                  setSnackOpen(true);
                } finally {
                  // nothing to clear
                }
            }} color="error">Delete</Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={snackOpen}
          autoHideDuration={6000}
          onClose={() => { setSnackOpen(false); setSnackMsg(''); setSnackUndoShape(null); }}
          slots={{ transition: SlideUpTransition }}
        >
          <Alert
            onClose={() => { setSnackOpen(false); setSnackMsg(''); setSnackUndoShape(null); }}
            severity="info"
            action={snackUndoShape ? (
              <Button color="inherit" size="small" onClick={async () => {
                // re-add shape
                const shape = snackUndoShape;
                try {
                  const base = getBaseUrl(backendBase);
                  const url = new URL('/v1/shapes', base);
                  const res = await fetch(url.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shape) });
                  if (res.ok) {
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
              }}>UNDO</Button>
            ) : null}
          >
            <div>
              <div>{snackMsg}</div>
              {snackDetails && (
                <pre style={{ margin: '8px 0 0 0', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {snackDetails}
                </pre>
              )}
            </div>
          </Alert>
        </Snackbar>
      </DialogContent>
    </Dialog>
    
    {/* Backend Server Start Dialog */}
    <Dialog open={showBackendDialog} onClose={() => setShowBackendDialog(false)} maxWidth="sm">
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Backend Server Not Found</Typography>
          <IconButton onClick={() => setShowBackendDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          The shapes catalog backend server doesn't appear to be running. 
          You need to start it to access the shapes catalog.
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
        <Button onClick={() => setShowBackendDialog(false)}>
          Cancel
        </Button>
        <Button 
          onClick={retryBackendConnection} 
          variant="outlined" 
          disabled={backendStarting}
          startIcon={backendStarting ? <CircularProgress size={16} /> : <UndoIcon />}
        >
          {backendStarting ? 'Checking...' : 'Retry Connection'}
        </Button>
        <Button 
          onClick={startBackendServer} 
          variant="contained" 
          disabled={backendStarting}
        >
          Show Instructions
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

ShapePaletteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSelectShape: PropTypes.func,
  backendBase: PropTypes.string,
  colorScheme: PropTypes.object
};

ShapePaletteDialog.defaultProps = {
  colorScheme: {}
};
