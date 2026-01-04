import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import PropTypes from 'prop-types';
// Optimized MUI imports for tree shaking
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import SaveIcon from '@mui/icons-material/Save';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VisibilityIcon from '@mui/icons-material/Visibility';

import languageDefinition from './languageDefinition';
import { parseBlocks, execBlock, splitCond, legacyCommand } from './scriptingInterpreter';
import { useAuthStatus } from '../auth/useAuthStatus';
import { getBackendApiBase } from '../utils/backendApi';
import DebugPanel from './DebugPanel';

// Dynamically import Monaco Editor to reduce initial bundle size
const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

// Script templates for quick start
const SCRIPT_TEMPLATES = {
  'Conway Glider': `# Conway's Glider Pattern
PENDOWN
GOTO 1 0
# Create glider pattern
RECT 1 1
GOTO 2 1
RECT 1 1
GOTO 0 2
RECT 1 1
GOTO 1 2
RECT 1 1
GOTO 2 2
RECT 1 1
# Watch it glide!
STEP 20`,
  'Geometric Shapes': `# Showcase all drawing tools
PENDOWN
# Draw a line
LINE 0 0 10 5
# Draw oval
OVAL 15 0 25 8
# Draw square perimeter
GOTO 30 0
SQUARE 6
# Draw rectangle outline
RECTPERIMETER 40 0 50 8
STEP 15`,
  'Random Garden': `# Random life garden with counting
PENDOWN
COUNT start_count
LABEL "Starting with " + start_count + " cells"
# Create random scattered patterns
GOTO 5 5
RANDRECT 1 3 1 3 15
# Add some structure
LINE 0 10 20 10
OVAL 5 15 15 20
COUNT pattern_count
LABEL "Added " + (pattern_count - start_count) + " new cells"
# Let it evolve
STEP 50
COUNT final_count
LABEL "Final: " + final_count + " cells"`,
  'Spiral Drawing': `# Draw a spiral pattern
PENDOWN
GOTO 10 10
size = 1
angle = 0
i = 0
WHILE i < 15
  # Draw square at current position
  SQUARE size
  # Move and rotate
  FORWARD size
  RIGHT 90
  size = size + 1
  i = i + 1
END
STEP 25`,
  'Interactive Demo': `# Comprehensive pattern demo
PENDOWN
CLEAR
COUNT start
LABEL "Demo started with " + start + " cells"
# Create base structures
RECTPERIMETER 0 0 10 10
LINE 5 5 15 15
OVAL 20 5 30 15
# Add random elements
GOTO 35 5
RANDRECT 1 2 1 2 20
# Final count and evolution
COUNT total
LABEL "Created " + total + " cells total"
STEP 30
COUNT evolved
LABEL "Evolved to " + evolved + " cells"`
};

function ScriptPanel({ open, onClose }) {
  // Debug log state
  console.log('[ScriptPanel] Render start');
  const [debugLog, setDebugLog] = useState([]);
    // Listen for debug events and update debugLog
    useEffect(() => {
      function onDebug(ev) {
        console.log('[ScriptPanel] gol:script:debug event:', ev.detail);
        setDebugLog(log => [
          ...log,
          ev.detail || { type: 'unknown', msg: 'Malformed debug event' }
        ].slice(-200)); // keep last 200 entries
      }
      window.addEventListener('gol:script:debug', onDebug);
      return () => window.removeEventListener('gol:script:debug', onDebug);
    }, []);

    // Clear debug log when panel is closed
    useEffect(() => {
      if (!open) setDebugLog([]);
      console.log('[ScriptPanel] useEffect [open] open:', open);
    }, [open]);
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
  // Enhanced features state
  const [activeTab, setActiveTab] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [scriptState, setScriptState] = useState({ cells: new Set(), vars: {}, outputLabels: [] });
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState({ current: 0, total: 0 });
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [currentLine, setCurrentLine] = useState(null);
  const [executionPaused, setExecutionPaused] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [useMonacoEditor, setUseMonacoEditor] = useState(true);
  const editorRef = useRef(null);
  
  // Load user's scripts from backend
  const loadCloudScripts = useCallback(async () => {
    if (!isAuthenticated) return;
    setCloudMessage(null);
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch(`${getBackendApiBase()}/api/v1/scripts/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load scripts');
      const data = await res.json();
      setCloudScripts(data.scripts || []);
    } catch (err) {
      setCloudMessage('Failed to load scripts: ' + err.message);
    }
  }, [isAuthenticated]);

  // Enhanced error handling with suggestions
  const getErrorSuggestion = useCallback((error) => {
    const msg = error.message || String(error);
    if (/unknown command/i.test(msg)) {
      return 'Check command spelling. Available: PENDOWN, PENUP, FORWARD, BACK, LEFT, RIGHT, GOTO, RECT, CIRCLE, STEP';
    }
    if (/missing/i.test(msg)) {
      return 'Check command syntax. Example: RECT 4 3, GOTO 5 5, STEP 10';
    }
    if (/NaN|not a number/i.test(msg)) {
      return 'All arguments must be numbers or valid variables';
    }
    return 'Check the language reference for correct syntax';
  }, []);

  const handleRun = useCallback(async () => {
    if (isExecuting) return;
    
    console.log('[ScriptPanel] Run button clicked');
    setRunMessage(null);
    setRunErrors([]);
    setIsExecuting(true);
    setExecutionProgress({ current: 0, total: 0 });
    
    const lines = (text || '').split(/\r?\n/);
    const errors = [];
    const totalLines = lines.filter(line => line.trim() && !line.trim().startsWith('#')).length;
    let processedLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      
      setCurrentLine(i);
      setExecutionProgress({ current: processedLines + 1, total: totalLines });
      
      // Check for breakpoints
      if (breakpoints.has(i) && !executionPaused) {
        setExecutionPaused(true);
        break;
      }
      
      try {
        console.log('[ScriptPanel] handleRun running line', i, ':', line);
        await legacyCommand(line, { cells: new Set(), vars: {}, outputLabels: [] }, null, null, null, null);
      } catch (err) {
        const suggestion = getErrorSuggestion(err);
        errors.push({ line: i, msg: err.message || String(err), help: suggestion });
        console.error('[ScriptPanel] handleRun error on line', i, ':', err);
      }
      
      processedLines++;
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    if (errors.length > 0) {
      setRunErrors(errors);
      if (textareaRef.current) {
        const ta = textareaRef.current;
        ta.scrollTop = errors[0].line * 18;
      }
    } else {
      try {
        console.log('[ScriptPanel] handleRun running full script');
        const blocks = parseBlocks(text.split(/\r?\n/));
        await execBlock(blocks, { cells: new Set(), vars: {}, outputLabels: [] }, null, null, null, null);
        setRunMessage('Script executed successfully — shapes captured will appear in Recent Shapes (if supported).');
        setTimeout(() => { if (onClose) onClose(); }, 500);
      } catch (e) {
        setRunErrors([{ line: null, msg: e.message || String(e), help: getErrorSuggestion(e) }]);
        console.error('[ScriptPanel] handleRun error running full script:', e);
      }
    }
    
    setIsExecuting(false);
    setCurrentLine(null);
    setExecutionPaused(false);
  }, [text, onClose, isExecuting, breakpoints, executionPaused, getErrorSuggestion]);

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

  const handleCloudSave = useCallback(async () => {
    if (!isAuthenticated) {
      setCloudMessage('Please log in to save scripts to cloud');
      return;
    }
    setCloudMessage(null);
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch(`${getBackendApiBase()}/api/v1/scripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: scriptName,
          content: text,
          public: isPublic
        })
      });
      if (!res.ok) throw new Error('Failed to save script');
      setCloudMessage('Script saved to cloud successfully!');
      await loadCloudScripts(); // Refresh the list
    } catch (err) {
      setCloudMessage('Failed to save script: ' + err.message);
    }
  }, [isAuthenticated, scriptName, text, isPublic, loadCloudScripts]);

  const handleCloudLoad = useCallback((script) => {
    if (script) {
      setScriptName(script.name || 'Loaded Script');
      setText(script.content || '');
      setCloudMessage(`Loaded script: ${script.name}`);
    }
  }, []);

  // Preview mode execution
  const handlePreview = useCallback(async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    setExecutionProgress({ current: 0, total: 0 });
    
    try {
      const lines = (text || '').split(/\r?\n/).filter(line => line.trim());
      const previewState = { cells: new Set(), vars: {}, outputLabels: [], x: 0, y: 0, penDown: false };
      
      setExecutionProgress({ current: 0, total: lines.length });
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        
        setCurrentLine(i);
        setExecutionProgress({ current: i + 1, total: lines.length });
        
        // Simple command execution for preview
        if (line.startsWith('PENDOWN')) previewState.penDown = true;
        else if (line.startsWith('GOTO')) {
          const [, x, y] = line.split(' ');
          previewState.x = parseInt(x) || 0;
          previewState.y = parseInt(y) || 0;
        }
        else if (line.startsWith('RECT') && previewState.penDown) {
          const [, w, h] = line.split(' ');
          const width = parseInt(w) || 1;
          const height = parseInt(h) || 1;
          for (let dx = 0; dx < width; dx++) {
            for (let dy = 0; dy < height; dy++) {
              previewState.cells.add(`${(previewState.x || 0) + dx},${(previewState.y || 0) + dy}`);
            }
          }
        }
        
        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setScriptState(previewState);
      setRunMessage(`Preview complete - ${previewState.cells.size} cells created`);
      
    } catch (error) {
      setRunMessage(`Preview error: ${error.message}`);
    } finally {
      setIsExecuting(false);
      setCurrentLine(null);
    }
  }, [text, isExecuting]);

  // Template selection
  const handleTemplateSelect = useCallback((templateName) => {
    if (templateName && SCRIPT_TEMPLATES[templateName]) {
      setText(SCRIPT_TEMPLATES[templateName]);
      setScriptName(templateName);
      setSelectedTemplate(templateName);
    }
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

  // Popout for language definition
  const [showLangDef, setShowLangDef] = useState(false);

  // Monaco Editor configuration
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    // Define GOL Script language
    monaco.languages.register({ id: 'golscript' });
    monaco.languages.setMonarchTokensProvider('golscript', {
      tokenizer: {
        root: [
          [/#.*$/, 'comment'],
          [/\b(PENDOWN|PENUP|FORWARD|BACK|LEFT|RIGHT|GOTO|RECT|RECTPERIMETER|SQUARE|CIRCLE|OVAL|LINE|RANDRECT|STEP|CAPTURE|COUNT|CLEAR|PRINT|IF|WHILE|END|LABEL)\b/, 'keyword'],
          [/\b(x|y|i|size|width|height|radius|angle)\b/, 'variable'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/".*?"/, 'string'],
          [/[=+\-*/<>!]=?/, 'operator'],
        ]
      }
    });
    
    // Set theme
    monaco.editor.defineTheme('golscript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'operator', foreground: 'D4D4D4' }
      ],
      colors: {
        'editor.background': '#0B0B0D'
      }
    });
    
    monaco.editor.setTheme('golscript-dark');
    
    // Add custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      handleRun();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      handlePreview();
    });
  }, [handleRun, handlePreview]);

  // Tab panel component
  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ width: '100%', height: '100%' }}>
      {value === index && children}
    </div>
  );

  console.log('[ScriptPanel] Render return');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
      
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Advanced Script Playground</Typography>
          <Box display="flex" gap={1}>
            <FormControlLabel
              control={<Switch checked={useMonacoEditor} onChange={(e) => setUseMonacoEditor(e.target.checked)} size="small" />}
              label="Enhanced Editor"
              style={{ margin: 0 }}
            />
            <Button size="small" variant="outlined" onClick={() => setShowLangDef(true)}>
              Language Reference
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent style={{ height: '80vh', padding: 0 }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Progress indicator */}
          {isExecuting && (
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Typography variant="body2">Executing...</Typography>
                {currentLine !== null && <Chip label={`Line ${currentLine + 1}`} size="small" color="primary" />}
                <Button size="small" onClick={() => setIsExecuting(false)}>Stop</Button>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={executionProgress.total > 0 ? (executionProgress.current / executionProgress.total) * 100 : 0}
              />
            </Box>
          )}
          
          {/* Main content tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Script Editor" />
              <Tab label="Preview & Debug" />
              <Tab label="Templates" />
            </Tabs>
          </Box>
          
          {/* Tab panels */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {/* Script Editor Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
                {/* Script metadata */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <label htmlFor="scriptName" style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>Script Name:</label>
                    <input
                      id="scriptName"
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
                        width: '100%',
                        marginTop: 4
                      }}
                      placeholder="Untitled Script"
                    />
                  </Box>
                  {isAuthenticated && (
                    <FormControlLabel
                      control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
                      label="Public"
                    />
                  )}
                </Box>
                
                {/* Code Editor */}
                <Box sx={{ flex: 1, border: runErrors.length > 0 ? '2px solid #e53935' : '1px solid #444', borderRadius: 1 }}>
                  {useMonacoEditor ? (
                    <Suspense fallback={
                      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography>Loading enhanced editor...</Typography>
                      </Box>
                    }>
                      <MonacoEditor
                        height="100%"
                        language="golscript"
                        value={text}
                        onChange={setText}
                        onMount={handleEditorDidMount}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: 'monospace',
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          glyphMargin: true,
                          folding: true,
                          automaticLayout: true
                        }}
                      />
                    </Suspense>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        background: '#0b0b0d',
                        color: '#dfe',
                        border: 'none',
                        outline: 'none',
                        padding: 8,
                        resize: 'none'
                      }}
                      placeholder="Write your GOL script here..."
                    />
                  )}
                </Box>
                
                {/* Error display */}
                {runErrors.length > 0 && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Script Errors:</Typography>
                    {runErrors.map((err, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          {err.line !== null ? `Line ${err.line + 1}: ` : ''}{err.msg}
                        </Typography>
                        {err.help && (
                          <Typography variant="caption" color="#ffb4b4">💡 {err.help}</Typography>
                        )}
                      </Box>
                    ))}
                  </Alert>
                )}
                
                {runMessage && (
                  <Alert severity="info" sx={{ mt: 1 }}>{runMessage}</Alert>
                )}
              </Box>
            </TabPanel>
            
            {/* Preview & Debug Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ height: '100%', display: 'flex', p: 2, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>Script State Preview</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Button 
                      variant="contained" 
                      startIcon={<VisibilityIcon />} 
                      onClick={handlePreview}
                      disabled={isExecuting}
                    >
                      Preview Script
                    </Button>
                  </Box>
                  
                  <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Current State:</Typography>
                    <Typography variant="body2">Live Cells: {scriptState.cells.size}</Typography>
                    <Typography variant="body2">Variables: {Object.keys(scriptState.vars).length}</Typography>
                    <Typography variant="body2">Position: ({scriptState.x || 0}, {scriptState.y || 0})</Typography>
                    <Typography variant="body2">Pen: {scriptState.penDown ? 'Down' : 'Up'}</Typography>
                  </Box>
                  
                  {Object.keys(scriptState.vars).length > 0 && (
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Variables:</Typography>
                      {Object.entries(scriptState.vars).map(([key, value]) => (
                        <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {key} = {JSON.stringify(value)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>Debug Panel</Typography>
                  <DebugPanel debugLog={debugLog} />
                </Box>
              </Box>
            </TabPanel>
            
            {/* Templates Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ height: '100%', p: 2 }}>
                <Typography variant="h6" gutterBottom>Script Templates</Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
                  Choose a template to get started quickly:
                </Typography>
                
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                  {Object.entries(SCRIPT_TEMPLATES).map(([name, code]) => (
                    <Box key={name} sx={{ 
                      p: 2, 
                      border: selectedTemplate === name ? '2px solid #1976d2' : '1px solid #444',
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: selectedTemplate === name ? 'rgba(25, 118, 210, 0.1)' : 'transparent'
                    }} onClick={() => handleTemplateSelect(name)}>
                      <Typography variant="subtitle1" gutterBottom>{name}</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                        {code.split('\n')[0].replace('#', '').trim()}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
                        {code.split('\n').filter(line => line.trim()).length} lines
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Box>

        {/* Popout dialog for language definition */}
        <Dialog open={showLangDef} onClose={() => setShowLangDef(false)} maxWidth="sm" fullWidth>
          <DialogTitle>GOL Script Language Reference</DialogTitle>
          <DialogContent>
            <pre style={{ fontFamily: 'monospace', fontSize: 14, background: '#18181b', color: '#dfe', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {languageDefinition}
            </pre>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowLangDef(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Cloud scripts display */}
        {isAuthenticated && cloudScripts.length > 0 && (
          <Box sx={{ position: 'absolute', top: 70, right: 20, width: 300, bgcolor: 'background.paper', p: 2, borderRadius: 1, boxShadow: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Your Cloud Scripts:</Typography>
            {cloudScripts.map(s => (
              <Box key={s.id} sx={{ mb: 1 }}>
                <Button size="small" onClick={() => handleCloudLoad(s)}>{s.name}</Button>
                {s.public && <Chip label="public" size="small" sx={{ ml: 1 }} />}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Button startIcon={<CloudDownloadIcon />} onClick={handleLoad}>Load File</Button>
          <Button startIcon={<SaveIcon />} onClick={handleSave}>Save File</Button>
          
          {isAuthenticated && (
            <>
              <Button variant="outlined" onClick={handleCloudSave}>Save to Cloud</Button>
              <Button variant="outlined" onClick={loadCloudScripts}>Load from Cloud</Button>
            </>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button 
            startIcon={<VisibilityIcon />} 
            variant="outlined" 
            onClick={handlePreview}
            disabled={isExecuting}
          >
            Preview
          </Button>
          
          <Button 
            startIcon={isExecuting ? <StopIcon /> : <PlayArrowIcon />} 
            variant="contained" 
            onClick={isExecuting ? () => setIsExecuting(false) : handleRun}
            color={isExecuting ? "error" : "primary"}
          >
            {isExecuting ? 'Stop' : 'Run'}
          </Button>
          
          <Button onClick={onClose}>Close</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

ScriptPanel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
};

export default ScriptPanel;