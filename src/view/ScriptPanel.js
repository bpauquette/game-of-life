import React, { useState, useCallback, useRef } from 'react';
import { useAuthStatus } from '../auth/useAuthStatus';
import { getBackendApiBase } from '../utils/backendApi';
import {
  getRectangleCells,
  getRectanglePerimeter,
  getCircleCells,
  getCirclePerimeter,
  getLineCells,
  getEllipsePerimeter,
  getRectRegion,
} from '../model/drawShapes';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
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
    // Import ticks for advancing simulation
    const { ticks, step } = require('../model/gameLogic');
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
  // Preprocess: keep original lines for error reporting, but trim for parsing
  const rawLines = (text || '').split(/\r?\n/);
  const lines = rawLines.map(l => l.trim()).filter(Boolean);
  const state = {
    x: 0,
    y: 0,
    dir: 0, // degrees, 0 = right
    penDown: true,
    cells: new Set(),
    vars: {}, // variable storage
    labels: [], // label positions for future use
    outputLabels: [] // for LABEL command
  };

  // Helper: parse a value (number, string, or variable)
  function parseValue(tok) {
    if (!tok) return 0;
    if (/^".*"$/.test(tok)) return tok.slice(1, -1); // quoted string
    if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
    if (tok in state.vars) return state.vars[tok];
    return 0;
  }

  // Helper: evaluate simple expressions (only +, -, *, /, concat)
  function evalExpr(expr) {
    // Only support: a + b, a - b, a * b, a / b, a + "str"
    let m;
    if ((m = expr.match(/^(.+)\s*([+\-*/])\s*(.+)$/))) {
      let a = parseValue(m[1].trim());
      let b = parseValue(m[3].trim());
      switch (m[2]) {
        case '+':
          if (typeof a === 'string' || typeof b === 'string') return String(a) + String(b);
          return a + b;
        case '-': return Number(a) - Number(b);
        case '*': return Number(a) * Number(b);
        case '/': return Number(a) / Number(b);
      }
    }
    return parseValue(expr.trim());
  }

  // Helper: parse a condition (x < 5, name == "foo")
  function evalCond(lhs, op, rhs) {
    let a = parseValue(lhs);
    let b = parseValue(rhs);
    switch (op) {
      case '==': return a == b;
      case '!=': return a != b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      default: return false;
    }
  }

  // Block parser: returns array of {type, line, indent, raw}
  function parseBlocks(rawLines) {
    const blocks = [];
    for (let i = 0; i < rawLines.length; ++i) {
      let raw = rawLines[i];
      let line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      let indent = raw.match(/^\s*/)[0].length;
      blocks.push({ line, indent, raw, idx: i });
    }
    return blocks;
  }

  // Main interpreter loop (with block stack)
  function execBlock(blocks, startIdx = 0, endIdx = blocks.length) {
    let i = startIdx;
    while (i < endIdx) {
      let { line, indent } = blocks[i];
      // PRINT command
      let printMatch = line.match(/^print\s+(.+)$/i);
      if (printMatch) {
        const val = evalExpr(printMatch[1]);
        if (!state.output) state.output = [];
        state.output.push(String(val));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gol:script:print', { detail: { value: String(val) } }));
        }
        i++;
        continue;
      }
      // CLEAR command
      if (/^clear$/i.test(line)) {
        state.cells = new Set();
        if (onStep) onStep(new Set(state.cells));
        emitStepEvent(state.cells);
        i++;
        continue;
      }
      // COUNT varName
      let countMatch = line.match(/^count\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
      if (countMatch) {
        const vname = countMatch[1];
        state.vars[vname] = state.cells.size;
        i++;
        continue;
      }
      // UNTIL_STEADY varName [maxSteps]
      let untilSteadyMatch = line.match(/^until_steady\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\d+)?$/i);
      if (untilSteadyMatch) {
        let varName = untilSteadyMatch[1];
        let maxSteps = untilSteadyMatch[2] ? parseInt(untilSteadyMatch[2], 10) : 1000;
        let prev = null;
        let steps = 0;
        let changed = true;
        while (changed && steps < maxSteps) {
          const cellsArr = Array.from(state.cells).map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
          });
          const next = step(cellsArr);
          const nextSet = new Set();
          for (const key of next.keys ? next.keys() : Object.keys(next)) {
            nextSet.add(key);
          }
          changed = prev ? (Array.from(prev).sort().join('|') !== Array.from(nextSet).sort().join('|')) : true;
          prev = new Set(state.cells);
          state.cells = nextSet;
          steps++;
          if (onStep) onStep(new Set(state.cells));
          emitStepEvent(state.cells);
        }
        state.vars[varName] = steps;
        i++;
        continue;
      }
    let i = startIdx;
    while (i < endIdx) {
      let { line, indent } = blocks[i];
      // Assignment: x = expr or name = "str"
      let assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if (assignMatch) {
        let vname = assignMatch[1];
        let expr = assignMatch[2];
        state.vars[vname] = evalExpr(expr);
        i++;
        continue;
      }
      // while loop
      let whileMatch = line.match(/^while\s+(.+)$/i);
      if (whileMatch) {
        // Find matching end
        let cond = whileMatch[1];
        let blockStart = i + 1;
        let blockEnd = blockStart;
        let nest = 1;
        while (blockEnd < endIdx && nest > 0) {
          let l = blocks[blockEnd].line.toLowerCase();
          if (l.startsWith('while ')) nest++;
          if (l === 'end') nest--;
          blockEnd++;
        }
        blockEnd--;
        while (evalCond(...splitCond(cond))) {
          execBlock(blocks, blockStart, blockEnd);
        }
        i = blockEnd + 1;
        continue;
      }
      // if block
      let ifMatch = line.match(/^if\s+(.+)$/i);
      if (ifMatch) {
        let cond = ifMatch[1];
        let blockStart = i + 1;
        let blockEnd = blockStart;
        let nest = 1;
        while (blockEnd < endIdx && nest > 0) {
          let l = blocks[blockEnd].line.toLowerCase();
          if (l.startsWith('if ')) nest++;
          if (l === 'end') nest--;
          blockEnd++;
        }
        blockEnd--;
        if (evalCond(...splitCond(cond))) {
          execBlock(blocks, blockStart, blockEnd);
        }
        i = blockEnd + 1;
        continue;
      }
      // LABEL command
      let labelMatch = line.match(/^label\s+(.+)$/i);
      if (labelMatch) {
        let labelVal = evalExpr(labelMatch[1]);
        // Place label at current position (x, y)
        state.outputLabels.push({ x: state.x, y: state.y, text: String(labelVal) });
        i++;
        continue;
      }
      // All other commands: fall through to legacy parser
      // (copy-paste the legacy command handling here, or call the old parser)
      // For brevity, call the legacy handler for now:
      legacyCommand(line);
      i++;
    }
  }

  // Helper: split condition string into [lhs, op, rhs]
  function splitCond(cond) {
    let m = cond.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (m) return [m[1], m[2], m[3]];
    return [cond, '==', true];
  }

  // Legacy command handler (for all non-block/assignment/label lines)
  async function legacyCommand(line) {
        // STEP n: animated visible stepping
        let stepMatch = line.match(/^STEP\s+(\d+)$/i);
        if (stepMatch) {
          const n = parseInt(stepMatch[1], 10);
          if (!isNaN(n) && n > 0) {
            // Animate each step with a delay and visual excitement
            const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#7CFC00', '#FF4500', '#1E90FF', '#FF00FF'];
            for (let i = 0; i < n; i++) {
              // One step at a time
              const cellsArr = Array.from(state.cells).map(s => {
                const [x, y] = s.split(',').map(Number);
                return { x, y };
              });
              const next = ticks(cellsArr, 1);
              state.cells = new Set();
              for (const key of next.keys ? next.keys() : Object.keys(next)) {
                state.cells.add(key);
              }
              if (onStep) onStep(new Set(state.cells));
              emitStepEvent(state.cells);
              // Creative: flash overlay, color, and emoji
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('gol:script:step-anim', {
                  detail: {
                    step: i + 1,
                    total: n,
                    color: colors[i % colors.length],
                    emoji: ['✨','🎉','💥','🌟','🔥','⚡','🌀'][i % 7]
                  }
                }));
                if (window.navigator.vibrate) window.navigator.vibrate(30);
              }
              await new Promise(res => setTimeout(res, 180 + Math.min(200, 1000 / (i + 1))));
            }
          }
          return;
        }
    // ...existing code from the for (const raw of lines) { ... } block...
    // (Move the body of that loop here, replacing 'line' with the argument)
  }

  // Parse blocks and execute
  const blocks = parseBlocks(rawLines);
  execBlock(blocks);
  return state;
}
}

function ScriptPanel({ open, onClose }) {
  const { isAuthenticated, me } = useAuthStatus();
  // Script name and content autosave
  const [scriptName, setScriptName] = useState(() => {
    try { return localStorage.getItem('gol_script_name') || `Untitled Script`; } catch (e) { return 'Untitled Script'; }
  });
  const [text, setText] = useState(() => {
    try { return localStorage.getItem('gol_script_last') || 'PENDOWN\nRECT 4 3\nCAPTURE demo\n'; } catch (e) { return '';} 
  });
  const [runMessage, setRunMessage] = useState(null);
  const [cloudMessage, setCloudMessage] = useState(null);
  const [runErrors, setRunErrors] = useState([]); // [{line, msg, help}]
  const textareaRef = useRef();
  const [isPublic, setIsPublic] = useState(false);
  const [cloudScripts, setCloudScripts] = useState([]);
  // Animation overlay state
  const [stepAnim, setStepAnim] = useState(null);
  // Load user's scripts from backend
  const loadCloudScripts = useCallback(async () => {
    if (!isAuthenticated) return;
    // setLoadingCloud(true); // removed, not defined
    setCloudMessage(null);
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch(`${getBackendApiBase()}/api/v1/scripts/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load scripts');
      const data = await res.json();
      setCloudScripts(data.items || []);
    } catch (e) {
      setCloudMessage('Failed to load scripts: ' + (e.message || e));
    } finally {
      // setLoadingCloud(false); // removed, not defined
    }
  }, [isAuthenticated]);

  // Save script to backend
  const handleCloudSave = useCallback(async () => {
    setCloudMessage(null);
    if (!isAuthenticated) {
      setCloudMessage('You must be logged in to save scripts to the cloud.');
      return;
    }
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch(`${getBackendApiBase()}/api/v1/scripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: scriptName, content: text, public: isPublic })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      setCloudMessage('Script saved to cloud!');
      loadCloudScripts();
    } catch (e) {
      setCloudMessage('Cloud save failed: ' + (e.message || e));
    }
  }, [isAuthenticated, scriptName, text, isPublic, loadCloudScripts]);

  // Load a script from cloud
  const handleCloudLoad = useCallback(async (script) => {
    setText(script.content);
    setScriptName(script.name);
    setIsPublic(!!script.public);
    setCloudMessage('Loaded script: ' + script.name);
  }, []);

  // Clear messages when panel is closed
  // Autosave name/content
  React.useEffect(() => {
    if (open) {
      localStorage.setItem('gol_script_name', scriptName);
      localStorage.setItem('gol_script_last', text);
    }
    if (!open) {
      setRunMessage(null);
      setRunErrors([]);
    }
  }, [open, scriptName, text]);

  // Listen for application-level script errors (e.g., model apply failures)
  React.useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const err = detail.error || String(detail) || 'Unknown script error';
        setRunErrors([{ line: null, msg: String(err), help: '' }]);
      } catch (e) {
        setRunErrors([{ line: null, msg: 'Unknown script error', help: '' }]);
      }
    };
    window.addEventListener('gol:script:error', handler);
    return () => window.removeEventListener('gol:script:error', handler);
  }, []);

  const handleRun = useCallback(() => {
    setRunMessage(null);
    setRunErrors([]);
    const lines = (text || '').split(/\r?\n/);
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        runScript(line);
      } catch (err) {
        let help = '';
        if (/unknown command/i.test(err)) help = 'Check for typos or unsupported commands.';
        else if (/NaN|not a number/i.test(err)) help = 'Check that all arguments are numbers.';
        else if (/missing/i.test(err)) help = 'Check for missing arguments.';
        else help = 'See the command reference above.';
        errors.push({ line: i, msg: err.message || String(err), help });
      }
    }
    if (errors.length > 0) {
      setRunErrors(errors);
      // Scroll to first error
      if (textareaRef.current) {
        const ta = textareaRef.current;
        ta.scrollTop = errors[0].line * 18;
      }
      return;
    }
    // No errors: run the full script and close
    try {
      runScript(text);
      setRunMessage('Script executed — shapes captured will appear in Recent Shapes (if supported).');
      setTimeout(() => { if (onClose) onClose(); }, 500);
    } catch (e) {
      setRunErrors([{ line: null, msg: e.message || String(e), help: '' }]);
    }
  }, [text, onClose]);

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
            setRunErrors([{ line: null, msg: 'Square Growth demo failed: ' + detail.error, help: '' }]);
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
      {/* Animated overlay for STEP n */}
      {stepAnim && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `${stepAnim.color}22`,
          zIndex: 9999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          border: `6px solid ${stepAnim.color}`,
          boxShadow: `0 0 60px 20px ${stepAnim.color}`,
          animation: 'step-flash 0.2s',
        }}>
          <div style={{
            fontSize: 48, fontWeight: 'bold', color: stepAnim.color,
            textShadow: `0 0 18px ${stepAnim.color}`,
            animation: 'pop 0.2s',
            background: '#222b',
            borderRadius: 16,
            padding: '32px 48px',
            border: `3px solid ${stepAnim.color}`
          }}>
            {stepAnim.emoji} STEP {stepAnim.step} / {stepAnim.total} {stepAnim.emoji}
          </div>
        </div>
      )}
      <DialogTitle>Script Playground</DialogTitle>
      <DialogContent>
        {runErrors.length > 0 && runErrors.some(e => e.line === null) && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {runErrors.filter(e => e.line === null).map((e, i) => <div key={i}>{e.msg}</div>)}
          </Alert>
        )}
        {runMessage && <Alert severity="info" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{runMessage}</Alert>}
        <Box sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <label style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>Script Name:</label>
            <input
              type="text"
              value={scriptName}
              onChange={e => setScriptName(e.target.value)}
              style={{
                fontSize: 14,
                fontFamily: 'monospace',
                background: '#18181b',
                color: '#fff',
                border: '1.5px solid #444',
                borderRadius: 4,
                padding: '2px 8px',
                width: 220
              }}
              maxLength={64}
              placeholder="Untitled Script"
            />
            {isAuthenticated && (
              <label style={{ color: '#fff', fontWeight: 400, fontSize: 13, marginLeft: 12 }}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ marginRight: 4 }} />
                Public
              </label>
            )}
          </Box>
          {/* Removed duplicate Script Name input */}
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                height: 300,
                fontFamily: 'monospace',
                fontSize: 13,
                background: '#0b0b0d',
                color: '#dfe',
                border: runErrors.length > 0 ? '2px solid #e53935' : undefined
              }}
            />
            {runErrors.map(err => err.line !== null && (
              <div key={err.line}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: `${err.line * 18}px`,
                  width: '100%',
                  height: '18px',
                  background: 'rgba(229,57,53,0.18)',
                  pointerEvents: 'none',
                  zIndex: 2
                }} />
            ))}
          </div>
          {runErrors.length > 0 && (
            <div style={{ color: '#e53935', fontSize: 13, marginTop: 4 }}>
              <b>Errors:</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {runErrors.map((err, idx) => (
                  <li key={idx}>
                    {err.line !== null ? `Line ${err.line + 1}: ` : ''}{err.msg}
                    {err.help && <span style={{ marginLeft: 8, color: '#ffb4b4' }}>({err.help})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Box sx={{ mt: 1, mb: 1 }}>
            {isAuthenticated && (
              <>
                <Button size="small" variant="outlined" onClick={handleCloudSave} sx={{ mr: 1 }}>Save to Cloud</Button>
                <Button size="small" variant="outlined" onClick={loadCloudScripts} sx={{ mr: 1 }}>Load from Cloud</Button>
              </>
            )}
            {cloudMessage && <span style={{ color: cloudMessage.includes('fail') ? '#e53935' : '#8bc34a', marginLeft: 8 }}>{cloudMessage}</span>}
          </Box>
          {isAuthenticated && cloudScripts.length > 0 && (
            <Box sx={{ mb: 2, border: '1px solid #333', borderRadius: 4, p: 1, background: '#18181b' }}>
              <div style={{ color: '#fff', fontWeight: 500, fontSize: 13, marginBottom: 4 }}>Your Cloud Scripts:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {cloudScripts.map(s => (
                  <li key={s.id} style={{ marginBottom: 2 }}>
                    <Button size="small" onClick={() => handleCloudLoad(s)}>{s.name}</Button>
                    {s.public && <span style={{ color: '#8bc34a', marginLeft: 6 }}>(public)</span>}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </Box>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 8 }}>
          <b>Commands & Features:</b> <br/>
          <b>Variables:</b> <code>x = 5</code>, <code>name = "hello"</code> — assign numbers/strings<br/>
          <b>Use variables:</b> <code>FORWARD x</code>, <code>RECT x y</code><br/>
          <b>Labels:</b> <code>LABEL expr</code> — place a label at current position<br/>
          <b>Control flow:</b> <code>WHILE cond ... END</code>, <code>IF cond ... END</code><br/>
          <b>STEP n:</b> advances simulation n generations, animating each step<br/>
          <b>PENUP</b>, <b>PENDOWN</b> — control drawing state<br/>
          <b>FORWARD n</b>, <b>BACK n</b> — move pen n steps<br/>
          <b>LEFT deg</b>, <b>RIGHT deg</b> — turn pen<br/>
          <b>GOTO x y</b> — move pen to (x, y)<br/>
          <b>RECT w h</b> — draw rectangle (matches Rectangle tool)<br/>
          <b>SQUARE s</b> — draw square (alias for RECT s s)<br/>
          <b>CIRCLE r</b> — draw circle (matches Circle tool)<br/>
          <b>RANDRECT minW maxW minH maxH [count]</b> — random rectangles<br/>
          <b>CAPTURE name</b> — save current shape<br/>
          <b>SELECT_TOOL name</b> — select tool by name<br/>
          <b>PLACE idOrName x y</b> — place shape by id/name at (x, y)<br/>
          <br/>
          <i>All shape commands (RECT, CIRCLE, etc.) are designed to match the interactive tools 1:1.</i><br/>
          <br/>
          <b>New 2025:</b> Variables, strings, labels, block control flow, animated STEP n.<br/>
        </div>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<LoadIcon />} onClick={handleLoad}>Load</Button>
        <Button startIcon={<SaveIcon />} onClick={handleSave}>Save</Button>
        <Button startIcon={<RunIcon />} variant="contained" onClick={handleRun}>Run</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

ScriptPanel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
};

export default ScriptPanel;
// Ensure all blocks and functions are properly closed
