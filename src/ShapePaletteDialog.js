import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
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

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {} }){
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]); // metadata items
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const LARGE_CATALOG_THRESHOLD = 1000; // UI hint threshold
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
    try {
      if (typeof colorScheme.getCellColor === 'function') return colorScheme.getCellColor(x, y);
    } catch (e) {
      // ignore failures in color function
    }
    return colorScheme.cellColor || '#39ff14';
  };

  useEffect(()=>{ if(!open){ setQ(''); setResults([]); setLoading(false); } }, [open]);

  useEffect(()=>{
  if (timerRef.current) clearTimeout(timerRef.current);
  // When the dialog opens we want to show the catalog even before a
  // search term is entered. Previously the UI required 3+ chars which made
  // the catalog appear empty by default. We'll still debounce queries.
  setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
  const base = (typeof backendBase === 'string' && backendBase.length > 0) ? backendBase : '';
    // Use URL to avoid accidental double-slashes or missing slashes
    const fallbackOrigin = (typeof window !== 'undefined' && window.location && window.location.origin) ? String(window.location.origin) : 'http://localhost';
    const url = base ? new URL('/v1/shapes', base) : new URL(`/v1/shapes`, fallbackOrigin);
        url.searchParams.set('q', q);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('offset', String(offset));
        const res = await fetch(url.toString());
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.warn('Shape search returned non-OK status', res.status);
          setResults([]);
          setTotal(0);
        } else {
          let data = { items: [], total: 0 };
          try { data = await res.json(); } catch (parseErr) { /* ignore parse errors and treat as empty */ data = { items: [], total: 0 }; }
          const items = Array.isArray(data.items) ? data.items : [];
          setTotal(Number(data.total) || 0);
          // append when offset > 0 (load more), otherwise replace
          setResults(prev => (offset > 0 ? [...prev, ...items] : items));
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('shape search error', e);
        setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return ()=>{ if(timerRef.current) clearTimeout(timerRef.current); };
  }, [q, backendBase, offset, limit]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                const base = (typeof backendBase === 'string' && backendBase.length > 0) ? backendBase : ((typeof window !== 'undefined' && window.location && window.location.origin) ? String(window.location.origin) : 'http://localhost');
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
                // network error - fallback
                onSelectShape?.(s);
                onClose?.();
              }
            }}>
              <ListItemText primary={s.name || '(unnamed)'} secondary={`${s.width}×${s.height} — ${s.cellsCount||0} cells`} />
              <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); setToDelete(s); setConfirmOpen(true); }}>
                <DeleteIcon />
              </IconButton>
              <Box sx={{ ml: 1, width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={64} height={64} viewBox={`0 0 ${Math.max(1, s.width||1)} ${Math.max(1, s.height||1)}`} preserveAspectRatio="xMidYMid meet" style={{ background: colorScheme.background || 'transparent', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6 }}>
                  {Array.isArray(s.cells) && s.cells.length > 0 ? (
                    s.cells.map((c, idx) => (
                      <rect key={idx} x={c.x} y={c.y} width={1} height={1} fill={getCellColor(c.x, c.y)} />
                    ))
                  ) : (
                    // small empty placeholder grid
                    <g stroke="rgba(0,0,0,0.06)" fill="none">
                      {Array.from({length: Math.max(1, s.width||1)}).map((_, i) => (
                        <line key={`vx-${i}`} x1={i+0.5} y1={0} x2={i+0.5} y2={Math.max(1, s.height||1)} />
                      ))}
                      {Array.from({length: Math.max(1, s.height||1)}).map((_, j) => (
                        <line key={`hy-${j}`} x1={0} y1={j+0.5} x2={Math.max(1, s.width||1)} y2={j+0.5} />
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
              <Button onClick={() => { setOffset(prev => prev + limit); }} disabled={loading}>Load more</Button>
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
                  const base = (typeof backendBase === 'string' && backendBase.length > 0) ? backendBase : ((typeof window !== 'undefined' && window.location && window.location.origin) ? String(window.location.origin) : 'http://localhost');
                  const url = new URL(`/v1/shapes/${encodeURIComponent(id)}`, base);
                  const res = await fetch(url.toString(), { method: 'DELETE' });
                  if (!res.ok) {
                    // restore on failure
                    setResults(old);
                    // eslint-disable-next-line no-console
                    console.warn('Delete failed', res.status);
                    let bodyText = '';
                    try { bodyText = await res.text(); } catch (e) { bodyText = '<no body>'; }
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
                  // eslint-disable-next-line no-console
                  console.error('Delete error', err);
                  setSnackMsg('Delete error');
                  setSnackDetails(err && err.stack ? err.stack : String(err));
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
          TransitionComponent={(props) => <Slide {...props} direction="up" />}
        >
          <Alert
            onClose={() => { setSnackOpen(false); setSnackMsg(''); setSnackUndoShape(null); }}
            severity="info"
            action={snackUndoShape ? (
              <Button color="inherit" size="small" onClick={async () => {
                // re-add shape
                const shape = snackUndoShape;
                try {
                  const base = (typeof backendBase === 'string' && backendBase.length > 0) ? backendBase : ((typeof window !== 'undefined' && window.location && window.location.origin) ? String(window.location.origin) : 'http://localhost');
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
                  // eslint-disable-next-line no-console
                  console.error('Restore error', err);
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
  );
}
