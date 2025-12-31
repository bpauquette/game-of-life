import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import DialogActions from '@mui/material/DialogActions';
import { Save as SaveIcon, FolderOpen as LoadIcon, PlayArrow as RunIcon } from '@mui/icons-material';

// Tiny turtle-like scripting language interpreter
// Commands (one per line):
// PENUP | PENDOWN
// FORWARD n
// BACK n
// LEFT deg | RIGHT deg
// GOTO x y
// RECT w h   -> draw filled rectangle at current position
// CAPTURE name -> save current drawn cells as a named shape
// SELECT_TOOL name -> dispatch select tool event

function parseNumber(tok) {
  const v = Number(tok);
  return Number.isFinite(v) ? v : 0;
}

function runScript(text, opts = {}) {
  // opts.onStep: function(cellsSet) called after each command that modifies drawing
  const onStep = typeof opts.onStep === 'function' ? opts.onStep : null;
  const emitStepEvent = (cellsSet) => {
    try {
      const cells = Array.from(cellsSet).map(s => {
        const [cx, cy] = String(s).split(',').map(Number);
        return { x: cx, y: cy };
      });
      try { window.dispatchEvent(new CustomEvent('gol:script:step', { detail: { cells } })); } catch (e) {}
    } catch (e) {}
  };
  const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const state = {
    x: 0,
    y: 0,
    dir: 0, // degrees, 0 = right
    penDown: true,
    cells: new Set()
  };

  const addCell = (cx, cy) => {
    state.cells.add(`${Math.round(cx)},${Math.round(cy)}`);
    if (onStep) onStep(new Set(state.cells));
    emitStepEvent(state.cells);
  };

  const addRect = (w, h) => {
    const sx = Math.round(state.x);
    const sy = Math.round(state.y);
    for (let rx = 0; rx < w; rx++) {
      for (let ry = 0; ry < h; ry++) {
        addCell(sx + rx, sy + ry);
      }
    }
    if (onStep) onStep(new Set(state.cells));
    emitStepEvent(state.cells);
  };

  const addSquare = (s) => addRect(s, s);

  const addCircle = (r) => {
    const cx = Math.round(state.x);
    const cy = Math.round(state.y);
    const rr = Math.max(0, Math.round(r));
    for (let dx = -rr; dx <= rr; dx++) {
      for (let dy = -rr; dy <= rr; dy++) {
        if (dx * dx + dy * dy <= rr * rr) addCell(cx + dx, cy + dy);
      }
    }
        if (onStep) onStep(new Set(state.cells));
        emitStepEvent(state.cells);
  };

  const addRandomRect = (minW, maxW, minH, maxH, count = 1) => {
    const clamped = Math.max(1, Math.round(count));
    for (let i = 0; i < clamped; i++) {
      const w = Math.max(1, Math.round(minW + Math.random() * (Math.max(1, maxW - minW))));
      const h = Math.max(1, Math.round(minH + Math.random() * (Math.max(1, maxH - minH))));
      const offsetX = Math.round((Math.random() - 0.5) * Math.max(1, w));
      const offsetY = Math.round((Math.random() - 0.5) * Math.max(1, h));
      const saveX = state.x;
      const saveY = state.y;
      state.x = saveX + offsetX;
      state.y = saveY + offsetY;
      addRect(w, h);
      state.x = saveX;
      state.y = saveY;
    }
    if (onStep) onStep(new Set(state.cells));
    emitStepEvent(state.cells);
  };

  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const cmd = parts[0].toUpperCase();
    if (cmd === 'PENUP') { state.penDown = false; }
    else if (cmd === 'PENDOWN') { state.penDown = true; }
    else if (cmd === 'FORWARD' || cmd === 'FD') {
      const n = parseNumber(parts[1] || 0);
      const rad = (state.dir * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      for (let i = 0; i < Math.max(1, Math.round(n)); i++) {
        state.x += dx;
        state.y += dy;
        if (state.penDown) addCell(state.x, state.y);
      }
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
    } else if (cmd === 'BACK' || cmd === 'BK') {
      const n = parseNumber(parts[1] || 0);
      const rad = (state.dir * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      for (let i = 0; i < Math.max(1, Math.round(n)); i++) {
        state.x -= dx;
        state.y -= dy;
        if (state.penDown) addCell(state.x, state.y);
      }
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
    } else if (cmd === 'LEFT' || cmd === 'LT') {
      const d = parseNumber(parts[1] || 0);
      state.dir = (state.dir - d) % 360;
    } else if (cmd === 'RIGHT' || cmd === 'RT') {
      const d = parseNumber(parts[1] || 0);
      state.dir = (state.dir + d) % 360;
    } else if (cmd === 'GOTO' || cmd === 'SET') {
      state.x = parseNumber(parts[1] || 0);
      state.y = parseNumber(parts[2] || 0);
      if (state.penDown) addCell(state.x, state.y);
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
    } else if (cmd === 'RECT') {
      const w = Math.max(1, Math.round(parseNumber(parts[1] || 1)));
      const h = Math.max(1, Math.round(parseNumber(parts[2] || 1)));
      addRect(w, h);
    } else if (cmd === 'CAPTURE') {
      const name = parts.slice(1).join(' ') || `shape-${Date.now()}`;
      // flush capture via event
      const cells = Array.from(state.cells).map(s => {
        const [cx, cy] = s.split(',').map(Number);
        return { x: cx, y: cy };
      });
      const shape = {
        id: `script-${Date.now()}`,
        name,
        width: 0,
        height: 0,
        cells
      };
      // dispatch event
      try {
        window.dispatchEvent(new CustomEvent('gol:script:capture', { detail: { shape } }));
      } catch (e) {}
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
    } else if (cmd === 'SELECT_TOOL') {
      const tool = parts.slice(1).join(' ');
      try { window.dispatchEvent(new CustomEvent('gol:script:selectTool', { detail: { tool } })); } catch (e) {}
    } else if (cmd === 'PLACE' || cmd === 'PLACE_SHAPE') {
      // PLACE <idOrName> x y
      const idOrName = parts[1];
      const px = parseNumber(parts[2] || 0);
      const py = parseNumber(parts[3] || 0);
      try { window.dispatchEvent(new CustomEvent('gol:script:placeShape', { detail: { idOrName, x: px, y: py } })); } catch (e) {}
    } else if (cmd === 'SQUARE') {
      const s = Math.max(1, Math.round(parseNumber(parts[1] || 1)));
      addSquare(s);
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
    } else if (cmd === 'CIRCLE') {
      const r = Math.max(0, Math.round(parseNumber(parts[1] || 1)));
      addCircle(r);
    } else if (cmd === 'RANDRECT' || cmd === 'RANDOM_RECT') {
      // RANDRECT minW maxW minH maxH [count]
      const minW = Math.max(1, Math.round(parseNumber(parts[1] || 1)));
      const maxW = Math.max(minW, Math.round(parseNumber(parts[2] || minW)));
      const minH = Math.max(1, Math.round(parseNumber(parts[3] || 1)));
      const maxH = Math.max(minH, Math.round(parseNumber(parts[4] || minH)));
      const count = Math.max(1, Math.round(parseNumber(parts[5] || 1)));
      addRandomRect(minW, maxW, minH, maxH, count);
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
    } else {
      // unknown command - ignore
    }
  }

  return state;
}

export default function ScriptPanel({ open, onClose }) {
  const [text, setText] = useState(() => {
    try { return localStorage.getItem('gol_script_last') || 'PENDOWN\nRECT 4 3\nCAPTURE demo\n'; } catch (e) { return '';} 
  });
  const [runMessage, setRunMessage] = useState(null);
  const [runError, setRunError] = useState(null);

  // Clear messages when panel is closed
  React.useEffect(() => {
    if (!open) {
      setRunMessage(null);
      setRunError(null);
    }
  }, [open]);

  // Listen for application-level script errors (e.g., model apply failures)
  React.useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const err = detail.error || String(detail) || 'Unknown script error';
        setRunError(String(err));
      } catch (e) {
        setRunError('Unknown script error');
      }
    };
    window.addEventListener('gol:script:error', handler);
    return () => window.removeEventListener('gol:script:error', handler);
  }, []);

  const handleRun = useCallback(() => {
    setRunError(null);
    setRunMessage(null);
    try {
      const result = runScript(text);
      // Save last script
      localStorage.setItem('gol_script_last', text);
      // Optionally save drawn cells snapshot
      // Show success message in-panel
      setRunMessage('Script executed — shapes captured will appear in Recent Shapes (if supported).');
    } catch (e) {
      setRunError(String(e));
    }
  }, [text]);

  const handleSave = useCallback(() => {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gol_script.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }, [text]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => setText(String(reader.result || ''));
      reader.readAsText(f);
    };
    input.click();
  }, []);

  // Simple in-memory Game of Life stepper to allow demo runs inside ScriptPanel
  const stepGOL = useCallback((cellsSet) => {
    const neighbors = new Map();
    const addNeighbor = (k) => neighbors.set(k, (neighbors.get(k) || 0) + 1);
    for (const s of cellsSet) {
      const [x, y] = s.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        addNeighbor(`${x + dx},${y + dy}`);
      }
    }
    const next = new Set();
    for (const [k, count] of neighbors.entries()) {
      const alive = cellsSet.has(k);
      if (alive && (count === 2 || count === 3)) next.add(k);
      if (!alive && count === 3) next.add(k);
    }
    return next;
  }, []);

  const runUntilSteady = useCallback((startSet, maxSteps = 1000) => {
    let seen = new Map();
    let current = new Set(startSet);
    for (let step = 0; step < maxSteps; step++) {
      const key = Array.from(current).sort().join('|');
      if (seen.has(key)) return { steady: true, steps: step, final: current };
      seen.set(key, step);
      const next = stepGOL(current);
      // detect identical
      const nxtKey = Array.from(next).sort().join('|');
      if (nxtKey === key) return { steady: true, steps: step + 1, final: next };
      current = next;
    }
    return { steady: false, steps: maxSteps, final: current };
  }, [stepGOL]);

  const runSquareGrowthDemo = useCallback(async (maxSize = 8) => {
    return new Promise((resolve) => {
      const handler = (ev) => {
        try {
          const detail = ev && ev.detail ? ev.detail : {};
          if (detail.error) {
            setRunError('Square Growth demo failed: ' + detail.error);
            resolve({ error: detail.error });
          } else if (detail.results) {
            const results = detail.results;
            setRunMessage('Square growth demo results:\n' + results.map(r => `size=${r.size} -> steady=${r.steady}, steps=${r.steps}, finalCells=${r.finalCount}`).join('\n'));
            resolve({ results });
          } else {
            resolve({});
          }
        } catch (e) { resolve({ error: String(e) }); }
        try { window.removeEventListener('gol:script:runResult', handler); } catch (e) {}
      };
      window.addEventListener('gol:script:runResult', handler);
      try {
        window.dispatchEvent(new CustomEvent('gol:script:runUntilSteady', { detail: { type: 'squareGrowth', maxSize } }));
      } catch (e) { window.removeEventListener('gol:script:runResult', handler); resolve({ error: String(e) }); }
    });
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Script Playground</DialogTitle>
      <DialogContent>
        {runError && <Alert severity="error" sx={{ mb: 1 }}>{runError}</Alert>}
        {runMessage && <Alert severity="info" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{runMessage}</Alert>}
        <Box sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', height: 300, fontFamily: 'monospace', fontSize: 13, background: '#0b0b0d', color: '#dfe' }} />
          <Box sx={{ mt: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 8 }}>Commands: PENUP, PENDOWN, FORWARD n, BACK n, LEFT deg, RIGHT deg, GOTO x y, RECT w h, CAPTURE name, SELECT_TOOL name</div>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<LoadIcon />} onClick={handleLoad}>Load</Button>
        <Button startIcon={<SaveIcon />} onClick={handleSave}>Save</Button>
        <Button startIcon={<RunIcon />} variant="contained" onClick={handleRun}>Run</Button>
        <Button onClick={() => runSquareGrowthDemo(8)}>Run Square Growth Demo</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

ScriptPanel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
};
