import React, { useCallback, useEffect, useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LockIcon from '@mui/icons-material/Lock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PublicIcon from '@mui/icons-material/Public';
import SaveIcon from '@mui/icons-material/Save';
import StopIcon from '@mui/icons-material/Stop';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';

import { useAuth } from '../auth/AuthProvider.js';
import { getBackendApiBase } from '../utils/backendApi.js';
import languageDefinition from './languageDefinition.js';
import { parseBlocks, execBlock } from './scriptingInterpreter.js';

const API_BASE = getBackendApiBase();

// Script templates for quick start
const SCRIPT_TEMPLATES = {
  'Basic Drawing': 'PENDOWN\nRECT 4 3\nGOTO 10 5\nRECT 2 2\n',
  'Conway Glider': '# Conway\'s Glider Pattern\nCLEAR\nPENDOWN\nGOTO 1 0\nRECT 1 1\nGOTO 2 1\nRECT 1 1\nGOTO 0 2\nRECT 1 1\nGOTO 1 2\nRECT 1 1\nGOTO 2 2\nRECT 1 1\n# Watch it evolve!\nSTEP 10',
  'Geometric Shapes': '# Showcase drawing tools\nCLEAR\nPENDOWN\n# Draw squares\nGOTO 5 5\nRECT 3 3\nGOTO 15 5\nRECT 2 4\n# Create patterns\nGOTO 25 5\nRECT 1 8\n',
  'Random Garden': '# Create scattered patterns\nCLEAR\nPENDOWN\n# Base structure\nGOTO 5 5\nRECT 5 1\nGOTO 5 10\nRECT 5 1\n# Add details\nGOTO 8 7\nRECT 2 2\n',
  'Steady Squares': '# Growing squares with UNTIL_STEADY\nCLEAR\nPENDOWN\nsize = 2\nWHILE size <= 100\n  CLEAR\n  # Center square at world origin (0,0)\n  offset = 0 - (size / 2)\n  GOTO offset offset\n  RECT size size\n  START\n  UNTIL_STEADY steps 100\n  STOP\n  size = size + 1\nEND\n',
  'Empty Script': '# Enter your commands here\nCLEAR\nPENDOWN\n'
};

// TabPanel component for organizing content
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`script-tabpanel-${index}`}
      aria-labelledby={`script-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Enhanced script panel with stability improvements
function SimpleScriptPanel({
  open,
  onClose,
  isRunning,
  setIsRunning
}) {
  // Core state
  const [script, setScript] = useState('PENDOWN\nRECT 4 3\nGOTO 10 5\nRECT 2 2\n');
  const [message, setMessage] = useState(null); // Fix: don't show success message on init
  const cancelRequested = React.useRef(false);
  const [debugLog, setDebugLog] = useState([]);
  const [executionProgress, setExecutionProgress] = useState({ current: 0, total: 0 });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [scriptRunning, setScriptRunning] = useState(false);
  // Script save/load state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cloudScripts, setCloudScripts] = useState([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // Added for tab selection
  const { token, hasSupportAccess } = useAuth();
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!hasSupportAccess && isPublic) {
      setIsPublic(false);
    }
  }, [hasSupportAccess, isPublic]);

  // Simple Conway step used for script execution (runs in worker-free mode)
  const lifeStep = useCallback((liveCells) => {
    const neighborCounts = new Map();
    const current = new Set();

    const markNeighbor = (x, y) => {
      const key = `${x},${y}`;
      neighborCounts.set(key, (neighborCounts.get(key) || 0) + 1);
    };

    liveCells.forEach((cell) => {
      const x = Number(cell.x ?? (Array.isArray(cell) ? cell[0] : 0));
      const y = Number(cell.y ?? (Array.isArray(cell) ? cell[1] : 0));
      current.add(`${x},${y}`);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          markNeighbor(x + dx, y + dy);
        }
      }
    });

    const next = new Set();
    for (const [key, count] of neighborCounts.entries()) {
      if (count === 3 || (count === 2 && current.has(key))) {
        next.add(key);
      }
    }
    return next;
  }, []);

  const dispatchEventSafe = useCallback((type, detail = {}) => {
    try {
      if (typeof globalThis?.dispatchEvent === 'function') {
        globalThis.dispatchEvent(new CustomEvent(type, { detail }));
      }
    } catch (e) {
      console.error('dispatchEvent failed', e);
    }
  }, []);

  // Stop running and clear the grid whenever the panel opens
  useEffect(() => {
    if (!open) return;
    cancelRequested.current = false;
    if (typeof setIsRunning === 'function') {
      setIsRunning(false);
    }
    dispatchEventSafe('gol:script:clearGrid');
  }, [dispatchEventSafe, open, setIsRunning]);
  
  // Load cloud scripts when panel opens
  const loadCloudScripts = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingScripts(true);
    try {
      const url = API_BASE.endsWith('/') ? API_BASE + 'v1/scripts/my' : API_BASE + '/v1/scripts/my';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCloudScripts(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoadingScripts(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (open && isAuthenticated) {
      loadCloudScripts();
    }
  }, [open, isAuthenticated, loadCloudScripts]);

  // Listen for debug events
  useEffect(() => {
    function onDebug(ev) {
      setDebugLog(log => [
        ...log,
        { ...ev.detail, timestamp: Date.now() }
      ].slice(-10000)); // Keep last 10000 entries to show long-running scripts
    }

    function onStepAnim(ev) {
      // Handle step animation events if needed
      console.log('Step animation:', ev.detail);
    }

    globalThis.addEventListener('gol:script:debug', onDebug);
    globalThis.addEventListener('gol:script:step-anim', onStepAnim);

    return () => {
      globalThis.removeEventListener('gol:script:debug', onDebug);
      globalThis.removeEventListener('gol:script:step-anim', onStepAnim);
    };
  }, []);
  
  // Clear debug log when panel is closed or script changes
  useEffect(() => {
    if (!open) {
      setDebugLog([]);
      setMessage(null); // Clear any messages when closing
      setExecutionProgress({ current: 0, total: 0 });
    }
  }, [open]);



  const handleCancel = useCallback(() => {
    cancelRequested.current = true;
    dispatchEventSafe('gol:script:stop', { reason: 'user' });
    if (typeof setIsRunning === 'function') {
      setIsRunning(false);
    }
    setMessage({ type: 'info', text: 'Cancel requested. Script will stop after the current operation.' });
  }, [dispatchEventSafe, setIsRunning]);

  const handleSaveScript = useCallback(async () => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to save scripts to the cloud' });
      return;
    }
    if (!scriptName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a script name' });
      return;
    }
    
    try {
      const url = API_BASE.endsWith('/') ? API_BASE + 'v1/scripts' : API_BASE + '/v1/scripts';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: scriptName,
          content: script,
          public: hasSupportAccess ? isPublic : false,
          meta: {}
        })
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Script "${scriptName}" saved successfully!` });
        setSaveDialogOpen(false);
        setScriptName('');
        loadCloudScripts();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: `Failed to save: ${error.error || 'Unknown error'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error saving script: ${error.message}` });
    }
  }, [isAuthenticated, token, scriptName, script, isPublic, hasSupportAccess, loadCloudScripts]);

  const handleLoadScript = useCallback((cloudScript) => {
    setScript(cloudScript.content);
    setMessage({ type: 'success', text: `Loaded "${cloudScript.name}"` });
  }, []);

  const handleDeleteScript = useCallback(async (scriptId) => {
    if (!isAuthenticated) return;
    
    try {
      const url = API_BASE.endsWith('/') ? API_BASE + `v1/scripts/${scriptId}` : API_BASE + `/v1/scripts/${scriptId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Script deleted' });
        loadCloudScripts();
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error deleting script: ${error.message}` });
    }
  }, [isAuthenticated, token, loadCloudScripts]);

  const handleClose = useCallback(() => {
    if (onClose) {
      // Allow closing even while a script is running; execution continues in background
      setTimeout(() => {
        onClose();
      }, 0);
    }
  }, [onClose]);

  const persistDraftLocally = useCallback((content) => {
    try {
      globalThis?.localStorage?.setItem('gol_script_autosave', content);
    } catch (e) {
      console.error('Failed to persist script draft to localStorage', e);
    }
  }, []);

  const autoSaveIfNeeded = useCallback(async (content) => {
    if (isAuthenticated) {
      // Auto-save to cloud with fallback name
      const name = scriptName?.trim() || 'Autosave Script';
      try {
        const url = API_BASE.endsWith('/') ? API_BASE + 'v1/scripts' : API_BASE + '/v1/scripts';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            content,
            public: hasSupportAccess ? isPublic : false,
            meta: { autosave: true }
          })
        });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          console.error('Autosave failed', error);
        }
      } catch (error) {
        console.error('Autosave error', error);
      }
    } else {
      persistDraftLocally(content);
    }
  }, [isAuthenticated, isPublic, persistDraftLocally, scriptName, token, hasSupportAccess]);

  const handleRun = useCallback(async () => {
    cancelRequested.current = false;
    setMessage(null);
    setExecutionProgress({ current: 0, total: 0 });
    setScriptRunning(true);

    const lines = script.split('\n').map(l => l.trim()).filter(Boolean);
    let blocks;
    try {
      blocks = parseBlocks(lines);
    } catch (error) {
      setScriptRunning(false);
      setMessage({ type: 'error', text: error.message || 'Failed to parse script' });
      return;
    }

    dispatchEventSafe('gol:script:clearGrid');
    dispatchEventSafe('gol:script:start', { script });
    if (typeof onClose === 'function') {
      onClose();
    }
    setExecutionProgress({ current: 0, total: blocks.length });

    const state = {
      cells: new Set(),
      vars: {},
      outputLabels: [],
      x: 0,
      y: 0,
      penDown: false
    };

    const onStep = (cellsSet) => {
      const cellsArr = Array.from(cellsSet).map((key) => {
        const [x, y] = String(key).split(',').map(Number);
        return { x, y };
      });
      dispatchEventSafe('gol:script:step', { cells: cellsArr });
    };

    const ticks = (liveCells) => lifeStep(liveCells || []);

    try {
      await execBlock(
        blocks,
        state,
        onStep,
        null,
        null,
        ticks,
        null,
        null,
        () => cancelRequested.current
      );

      // Final world push and progress completion
      onStep(state.cells);
      setExecutionProgress({ current: blocks.length, total: blocks.length });
      dispatchEventSafe('gol:script:end', { status: 'ok' });
      setMessage({ type: 'success', text: 'Script finished.' });
      await autoSaveIfNeeded(script);
    } catch (error) {
      dispatchEventSafe('gol:script:end', { status: 'error', error: String(error) });
      setMessage({ type: 'error', text: error.message || 'Script execution failed' });
    } finally {
      setScriptRunning(false);
    }
  }, [autoSaveIfNeeded, dispatchEventSafe, lifeStep, onClose, script]);

  return (
    
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        keepMounted={false}
        disableEscapeKeyDown={false}
        aria-labelledby="script-panel-title"
        aria-describedby="script-panel-description"
        disablePortal={false}
        disableRestoreFocus={false}
        disableAutoFocus={false}
        disableEnforceFocus={false}
        slotProps={{
          backdrop: {
            sx: { pointerEvents: 'none' }
          }
        }}
      >
        <DialogTitle id="script-panel-title">
          Enhanced Script Playground
          {scriptRunning && (
            <Chip 
              icon={<StopIcon />}
              label="Running..." 
              color="primary" 
              size="small" 
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent id="script-panel-description">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 500 }}>
            {/* Tab Bar */}
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              aria-label="Script panel tabs"
              sx={{ mb: 2 }}
            >
              <Tab label="Editor" id="script-tab-0" aria-controls="script-tabpanel-0" />
              <Tab label="Saved Scripts" id="script-tab-1" aria-controls="script-tabpanel-1" />
              <Tab label="Debug Log" id="script-tab-2" aria-controls="script-tabpanel-2" />
              <Tab label="Language Reference" id="script-tab-3" aria-controls="script-tabpanel-3" />
            </Tabs>
            {/* Execution Progress */}
            {scriptRunning && executionProgress.total > 0 && (
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                  Executing command {executionProgress.current} of {executionProgress.total}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(executionProgress.current / executionProgress.total) * 100} 
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
            
            {/* Messages */}
            {message && (
              <Alert severity={message.type}>{message.text}</Alert>
            )}
            
            {/* Editor Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="script-template-label" shrink>Script Template</InputLabel>
                  <Select
                    labelId="script-template-label"
                    id="script-template-select"
                    value={selectedTemplate}
                    label="Script Template"
                    onChange={e => {
                      const templateKey = e.target.value;
                      setSelectedTemplate(templateKey);
                      const template = SCRIPT_TEMPLATES[templateKey];
                      if (template) setScript(template);
                    }}
                    displayEmpty
                    renderValue={(value) => (value && SCRIPT_TEMPLATES[value] ? value : 'Select a template...')}
                  >
                    <MenuItem value="" disabled>Select a template...</MenuItem>
                    {Object.keys(SCRIPT_TEMPLATES).map(key => (
                      <MenuItem key={key} value={key}>{key}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <TextField
                  label="Script Editor"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  fullWidth
                  multiline
                  minRows={14}
                  maxRows={28}
                  disabled={scriptRunning}
                  placeholder="Enter script commands (for example: CLEAR, PENDOWN, RECT 4 3, STEP 10)"
                  inputProps={{ 'aria-label': 'Script editor' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {`Lines: ${script.split('\n').length}`}
                </Typography>
              </Box>
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ height: 300, overflow: 'auto' }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  My Saved Scripts {isAuthenticated && `(${cloudScripts.length})`}
                </Typography>
                {(() => {
                  if (!isAuthenticated) {
                    return <Alert severity="info">Please log in to save and load scripts from the cloud</Alert>;
                  }
                  if (loadingScripts) {
                    return <Typography>Loading scripts...</Typography>;
                  }
                  if (cloudScripts.length === 0) {
                    return <Typography color="text.secondary">No saved scripts yet. Save your first script!</Typography>;
                  }
                  return (
                    <List>
                      {cloudScripts.map((cloudScript) => (
                        <ListItem key={cloudScript.id} divider>
                          <ListItemText
                            primary={cloudScript.name}
                            secondary={
                              <>
                                {cloudScript.public ? (
                                  <Chip icon={<PublicIcon />} label="Public" size="small" sx={{ mr: 1 }} />
                                ) : (
                                  <Chip icon={<LockIcon />} label="Private" size="small" sx={{ mr: 1 }} />
                                )}
                                <span>{new Date(cloudScript.updatedAt).toLocaleDateString()}</span>
                              </>
                            }
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton edge="end" onClick={() => handleLoadScript(cloudScript)} title="Load script">
                              <FolderOpenIcon />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleDeleteScript(cloudScript.id)} title="Delete script">
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  );
                })()}
              </Box>
            </TabPanel>
            
            {/* Debug Log Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ height: 300, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 1, p: 1, bgcolor: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ color: 'var(--text-primary)' }}>Debug Log</Typography>
                {debugLog.length === 0 ? (
                  <Typography sx={{ color: 'var(--text-secondary)' }}>No debug messages yet. Run a script to see execution details.</Typography>
                ) : (
                  debugLog.map((entry, index) => (
                    <Box key={entry.timestamp || `${entry.type}-${entry.msg || entry.line || index}`}
                      sx={{ mb: 1, p: 1, bgcolor: 'var(--surface-3)', color: 'var(--text-primary)', borderRadius: 1, border: '1px solid var(--border-subtle)' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        <strong>{entry.type}:</strong> {entry.msg || entry.line || JSON.stringify(entry)}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </TabPanel>

            {/* Language Reference Tab */}
            <TabPanel value={activeTab} index={3}>
              <Box sx={{ height: 300, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 1, p: 2, bgcolor: 'var(--surface-1)', color: 'var(--text-primary)' }}>
                <Typography variant="h5" component="h2" gutterBottom>Language Reference</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Commands, syntax, and examples for the GOL scripting language.
                </Typography>
                <Box component="pre" sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', bgcolor: 'var(--surface-3)', color: 'var(--text-primary)', p: 2, borderRadius: 1, border: '1px solid var(--border-subtle)' }}>
                  {languageDefinition}
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button 
            onClick={handleCancel}
            color="error"
            variant="outlined"
            disabled={!scriptRunning}
            startIcon={<StopIcon />}
          >
            Cancel Script
          </Button>
          {isAuthenticated && (
            <Button
              startIcon={<SaveIcon />}
              onClick={() => setSaveDialogOpen(true)}
              disabled={isRunning}
            >
              Save to Cloud
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={handleRun}
            disabled={scriptRunning}
            startIcon={scriptRunning ? <StopIcon /> : <PlayArrowIcon />}
          >
            {scriptRunning ? 'Running...' : 'Run Script'}
          </Button>
        </DialogActions>
      
        {/* Save Script Dialog */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Save Script to Cloud</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Script Name"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                fullWidth
                autoFocus
                placeholder="My Awesome Script"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={!hasSupportAccess}
                    icon={<LockIcon />}
                    checkedIcon={<PublicIcon />}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isPublic ? <PublicIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                    <Typography>{isPublic ? 'Public (anyone can view)' : 'Private (only you can view)'}</Typography>
                  </Box>
                }
              />
              {!hasSupportAccess && (
                <Alert severity="info">
                  Private script saves are available. Support access is required to publish scripts publicly.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveScript}
              startIcon={<CloudUploadIcon />}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
    
  );
}


SimpleScriptPanel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  isRunning: PropTypes.bool,
  setIsRunning: PropTypes.func
};

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

export default SimpleScriptPanel;

