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
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';

export default function ShapePaletteDialog({ open, onClose, onSelectShape, backendBase, colorScheme = {} }){
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackUndoShape, setSnackUndoShape] = useState(null);
  const [snackDetails, setSnackDetails] = useState(null); // temporary debug details
  const [deletingId, setDeletingId] = useState(null);
  const timerRef = useRef(null);

  useEffect(()=>{ if(!open){ setQ(''); setResults([]); setLoading(false); } }, [open]);

  useEffect(()=>{
    if(timerRef.current) clearTimeout(timerRef.current);
    if(!q || q.length < 3){ setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async ()=>{
      try{
        const base = backendBase || '';
        const url = `${base}/v1/shapes?q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data || []);
      }catch(e){
        console.error('shape search error', e);
        setResults([]);
      }finally{ setLoading(false); }
    }, 300);
    return ()=>{ if(timerRef.current) clearTimeout(timerRef.current); };
  }, [q, backendBase]);

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
            <ListItem key={s.id} button onClick={() => { onSelectShape && onSelectShape(s); onClose && onClose(); }}>
              <ListItemText primary={s.name || s.meta?.name || '(unnamed)'} secondary={`${s.width}×${s.height} — ${s.cells?.length||0} cells`} />
              <Box sx={{ ml: 1, width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => { onSelectShape && onSelectShape(s); onClose && onClose(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelectShape && onSelectShape(s); onClose && onClose(); } }}
                  sx={{ cursor: 'pointer', borderRadius: 1 }}
                  aria-label={`select ${s.name}`}
                >
                  <svg
                    width={64}
                    height={64}
                    viewBox={`0 0 ${Math.max(1, s.width)} ${Math.max(1, s.height)}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ background: colorScheme.background || 'transparent', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6 }}
                  >
                    {Array.from({ length: s.width || 0 }).map((_, cx) => (
                      Array.from({ length: s.height || 0 }).map((__, cy) => (
                        <rect key={`rg-${cx}-${cy}`} x={cx} y={cy} width={1} height={1} fill="transparent" stroke="rgba(255,255,255,0.02)" />
                      ))
                    ))}
                    {(s.cells || []).map((c, idx) => (
                      <rect key={idx} x={c.x} y={c.y} width={1} height={1} fill={
                        typeof (colorScheme.getCellColor) === 'function' ? colorScheme.getCellColor(c.x, c.y) : '#222'
                      } />
                    ))}
                  </svg>
                </Box>
                </Box>
              <Box sx={{ ml: 1 }}>
                <IconButton size="small" onClick={(ev) => {
                  ev.stopPropagation();
                  setToDelete(s);
                  setConfirmOpen(true);
                }} aria-label={`delete ${s.name}`}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            </ListItem>
          ))}
          {(!loading && results.length===0 && q.length>=3) && (
            <ListItem><ListItemText primary="No shapes found" /></ListItem>
          )}
        </List>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button onClick={onClose}>Close</Button>
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
              setDeletingId(id);
              try{
                const base = backendBase || '';
                const res = await fetch(`${base}/v1/shapes/${encodeURIComponent(id)}`, { method: 'DELETE' });
                if(!res.ok){
                  // restore on failure
                  setResults(old);
                  console.error('Delete failed', res.status);
                  // capture response body for debugging
                  let bodyText = '';
                  try{ bodyText = await res.text(); }catch(e){ bodyText = '<no body>'; }
                  const details = `DELETE ${base}/v1/shapes/${encodeURIComponent(id)}\nStatus: ${res.status}\nBody: ${bodyText}`;
                  setSnackMsg('Delete failed');
                  setSnackDetails(details);
                  setSnackOpen(true);
                } else {
                  // success
                  setSnackMsg('Shape deleted');
                  setSnackUndoShape(old.find(x=>x.id===id) || null);
                  setSnackDetails(null);
                  setSnackOpen(true);
                }
              }catch(err){
                setResults(old);
                console.error('Delete error', err);
                setSnackMsg('Delete error');
                setSnackDetails(err && err.stack ? err.stack : String(err));
                setSnackOpen(true);
              } finally {
                setDeletingId(null);
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
                try{
                  const base = backendBase || '';
                  const res = await fetch(`${base}/v1/shapes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shape) });
                  if(res.ok){
                    // append back to results
                    setResults(prev => [shape, ...prev]);
                    setSnackMsg('Restored');
                    setSnackUndoShape(null);
                  } else {
                    setSnackMsg('Restore failed');
                  }
                }catch(err){
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
