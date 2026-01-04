import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

import { parseBlocks, execBlock } from './scriptingInterpreter';
import languageDefinition from './languageDefinition';

// Script templates for quick start
const SCRIPT_TEMPLATES = {
  'Basic Drawing': 'PENDOWN\nRECT 4 3\nGOTO 10 5\nRECT 2 2\n',
  'Conway Glider': '# Conway\'s Glider Pattern\nCLEAR\nPENDOWN\nGOTO 1 0\nRECT 1 1\nGOTO 2 1\nRECT 1 1\nGOTO 0 2\nRECT 1 1\nGOTO 1 2\nRECT 1 1\nGOTO 2 2\nRECT 1 1\n# Watch it evolve!\nSTEP 10',
  'Geometric Shapes': '# Showcase drawing tools\nCLEAR\nPENDOWN\n# Draw squares\nGOTO 5 5\nRECT 3 3\nGOTO 15 5\nRECT 2 4\n# Create patterns\nGOTO 25 5\nRECT 1 8\n',
  'Random Garden': '# Create scattered patterns\nCLEAR\nPENDOWN\n# Base structure\nGOTO 5 5\nRECT 5 1\nGOTO 5 10\nRECT 5 1\n# Add details\nGOTO 8 7\nRECT 2 2\n',
  'Steady Squares': '# Growing squares with UNTIL_STEADY\nCLEAR\nPENDOWN\nsize = 2\nWHILE size <= 10\n  CLEAR\n  GOTO 5 5\n  RECT size size\n  START\n  UNTIL_STEADY steps 100\n  STOP\n  size = size + 2\nEND\n',
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
  getLiveCells,
  onLoadGrid,
  clear,
  step,
  isRunning,
  setIsRunning
}) {
  // Core state
  const [script, setScript] = useState('PENDOWN\nRECT 4 3\nGOTO 10 5\nRECT 2 2\n');
  const [message, setMessage] = useState(null); // Fix: don't show success message on init
  const [running, setRunning] = useState(false);
  
  // Enhanced features state
  const [activeTab, setActiveTab] = useState(0);
  const [debugLog, setDebugLog] = useState([]);
  const [executionProgress, setExecutionProgress] = useState({ current: 0, total: 0 });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Listen for debug events
  useEffect(() => {
    function onDebug(ev) {
      setDebugLog(log => [
        ...log,
        { ...ev.detail, timestamp: Date.now() }
      ].slice(-50)); // Keep last 50 entries
    }
    
    function onStepAnim(ev) {
      // Handle step animation events if needed
      console.log('Step animation:', ev.detail);
    }
    
    window.addEventListener('gol:script:debug', onDebug);
    window.addEventListener('gol:script:step-anim', onStepAnim);
    
    return () => {
      window.removeEventListener('gol:script:debug', onDebug);
      window.removeEventListener('gol:script:step-anim', onStepAnim);
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

  // Template selection handler
  const handleTemplateChange = useCallback((template) => {
    if (template && SCRIPT_TEMPLATES[template]) {
      setScript(SCRIPT_TEMPLATES[template]);
      setSelectedTemplate(template);
      setMessage(null);
      setDebugLog([]);
    }
  }, []);

  const handleRun = useCallback(async () => {
    if (running) return;
    
    setRunning(true);
    setMessage(null);
    setDebugLog([]);
    
    try {
      // STEP 1: Syntax validation only - parse blocks to check for errors
      const blocks = parseBlocks(script.split(/\r?\n/));
      
      // If we get here, syntax is valid - close panel immediately
      if (onClose) {
        onClose();
      }
      
      // STEP 2: Execute asynchronously in background after panel closes
      // Small delay to ensure panel close animation completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Remember if simulation was running before script
      const wasRunningBeforeScript = isRunning;
      
      // Get current game state
      const currentCells = getLiveCells ? getLiveCells() : new Set();
      
      // eslint-disable-next-line no-console
      console.log('[SimpleScriptPanel] Starting script execution with', Array.from(currentCells || []).length, 'existing cells');
      
      // Initialize script state with current game cells
      const scriptState = {
        cells: new Set(Array.from(currentCells).map(cell => {
          if (typeof cell === 'object' && cell.x !== undefined && cell.y !== undefined) {
            return `${cell.x},${cell.y}`;
          }
          return String(cell);
        })),
        vars: {},
        outputLabels: [],
        x: 0,
        y: 0,
        wasRunningBeforeScript,
        needsSimulationPause: false
      };
      
      // Define callbacks for script execution
      const onStepCallback = (cells) => {
        if (onLoadGrid && cells) {
          // Convert Set of "x,y" strings to array of {x, y} objects
          const cellArray = Array.from(cells).map(cellStr => {
            const [x, y] = String(cellStr).split(',').map(Number);
            return { x, y };
          }).filter(cell => !isNaN(cell.x) && !isNaN(cell.y));
          onLoadGrid(cellArray);
        }
      };
      
      const emitStepEvent = (cells) => {
        // Update the main grid with new cell state
        onStepCallback(cells);
      };
      
      // Game step function for STEP commands
      const gameTicks = (cellsArray, generations) => {
        if (step) {
          // Run the specified number of generations
          for (let i = 0; i < generations; i++) {
            step();
          }
          // Return current state after stepping
          const newCells = getLiveCells ? getLiveCells() : new Set();
          const cellMap = new Map();
          Array.from(newCells).forEach(cell => {
            if (typeof cell === 'object' && cell.x !== undefined && cell.y !== undefined) {
              cellMap.set(`${cell.x},${cell.y}`, true);
            } else {
              cellMap.set(String(cell), true);
            }
          });
          return cellMap;
        }
        return new Map();
      };
      
      // Execute script - animation will show on main grid
      await execBlock(blocks, scriptState, onStepCallback, emitStepEvent, step, gameTicks, setIsRunning, onLoadGrid);
      
      // Update the final state to the main grid
      if (onLoadGrid) {
        const finalCells = Array.from(scriptState.cells).map(cellStr => {
          const [x, y] = String(cellStr).split(',').map(Number);
          return { x, y };
        }).filter(cell => !isNaN(cell.x) && !isNaN(cell.y));
        // eslint-disable-next-line no-console
        console.log('[SimpleScriptPanel] Final call to onLoadGrid with', finalCells.length, 'cells');
        onLoadGrid(finalCells);
      }
      
      // eslint-disable-next-line no-console
      console.log('[SimpleScriptPanel] Script executed successfully');
    } catch (error) {
      // Syntax error or execution error - show error in panel (don't close)
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setRunning(false);
    }
  }, [script, running, onClose, getLiveCells, onLoadGrid, step, isRunning, setIsRunning]);

  const handleClose = useCallback(() => {
    if (!running && onClose) {
      // Ensure focus is properly managed when closing
      setTimeout(() => {
        onClose();
      }, 0);
    }
  }, [onClose, running]);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      keepMounted={false}
      disableEscapeKeyDown={running}
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
        {running && (
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
          {/* Execution Progress */}
          {running && executionProgress.total > 0 && (
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
          
          {/* Template Selector */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Load Template</InputLabel>
              <Select
                value={selectedTemplate}
                label="Load Template"
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={running}
              >
                {Object.keys(SCRIPT_TEMPLATES).map(template => (
                  <MenuItem key={template} value={template}>{template}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Main Content Tabs */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              aria-label="script panel tabs"
            >
              <Tab label="Script Editor" />
              <Tab label="Debug Log" disabled={running} />
              <Tab label="Language Docs" />
            </Tabs>
            
            {/* Script Editor Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Enter drawing commands. Available: CLEAR, PENDOWN, PENUP, GOTO x y, RECT w h, START, STOP, STEP n
                </Typography>
                
                <TextField
                  multiline
                  rows={12}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  disabled={running}
                  variant="outlined"
                  fullWidth
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      fontFamily: 'monospace',
                      fontSize: '14px'
                    }
                  }}
                  placeholder="Enter your script commands here..."
                />
              </Box>
            </TabPanel>
            
            {/* Debug Log Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ height: 300, overflow: 'auto', border: 1, borderColor: 'grey.700', borderRadius: 1, p: 1, bgcolor: '#0b1224', color: '#e5e7eb' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#e5e7eb' }}>Debug Log</Typography>
                {debugLog.length === 0 ? (
                  <Typography sx={{ color: '#cbd5f5' }}>No debug messages yet. Run a script to see execution details.</Typography>
                ) : (
                  debugLog.map((entry, index) => (
                    <Box key={index} sx={{ mb: 1, p: 1, bgcolor: '#111827', color: '#e5e7eb', borderRadius: 1, border: '1px solid #1f2937' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#e5e7eb' }}>
                        <strong>{entry.type}:</strong> {entry.msg || entry.line || JSON.stringify(entry)}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </TabPanel>

            {/* Language Reference Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ height: 300, overflow: 'auto', border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom>Language Reference</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Commands, syntax, and examples for the GOL scripting language.
                </Typography>
                <Box component="pre" sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', bgcolor: '#0f172a', color: '#e2e8f0', p: 2, borderRadius: 1, border: '1px solid #1f2937' }}>
                  {languageDefinition}
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button 
          variant="contained" 
          onClick={handleRun}
          disabled={running}
          startIcon={running ? <StopIcon /> : <PlayArrowIcon />}
        >
          {running ? 'Running...' : 'Run Script'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SimpleScriptPanel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  getLiveCells: PropTypes.func,
  onLoadGrid: PropTypes.func,
  clear: PropTypes.func,
  step: PropTypes.func,
  isRunning: PropTypes.bool,
  setIsRunning: PropTypes.func
};

export default SimpleScriptPanel;