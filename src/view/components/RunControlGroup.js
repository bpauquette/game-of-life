import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { PlayArrow as PlayArrowIcon, Stop as StopIcon, SkipNext as SkipNextIcon, DeleteSweep as DeleteSweepIcon, Lightbulb as LightbulbIcon, RestartAlt as RestartAltIcon } from '@mui/icons-material';
import { keyframes } from '@emotion/react';

// A visually distinct grouping for stepping and run controls
export default function RunControlGroup({
  isRunning,
  setIsRunning,
  step,
  draw,
  clear,
  snapshotsRef,
  setSteadyInfo,
  confirmOnClear = true,
  resetToGenerationZero = null,
  // Engine mode props
  engineMode = 'normal',
  onStartNormalMode,
  onStartHashlifeMode,
  onStopAllEngines,
  onSetEngineMode
}) {

  
  const STEADY_STATE_PERIOD_INITIAL_LOCAL = 0;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pulse = keyframes`
    0% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0.7; transform: scale(1); }
  `;

  const handleConfirmClear = useCallback(() => {
    // Always stop the simulation when clearing the grid
    try {
      setIsRunning(false);
    } catch (e) {
      // ignore if setter is unavailable in tests
      console.warn('setIsRunning(false) failed in handleConfirmClear:', e);
    }
    clear();
    draw();
    if (snapshotsRef) snapshotsRef.current = [];
    if (setSteadyInfo) setSteadyInfo({ steady: false, period: STEADY_STATE_PERIOD_INITIAL_LOCAL, popChanging: false });
    setConfirmOpen(false);
  }, [clear, draw, snapshotsRef, setSteadyInfo, setIsRunning]);

  return (
    <Box
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(0,0,0,0.25)'
      }}
      data-testid="run-control-group"
      aria-label="Run controls"
    >

      <Stack direction="row" spacing={0.5} alignItems="center">
        {/* Engine selection dropdown */}
        <Tooltip title="Select simulation engine">
          <Box>
            <select
              aria-label="Engine mode"
              value={engineMode}
              onChange={e => {
                if (typeof onSetEngineMode === 'function') {
                  onSetEngineMode(e.target.value);
                }
              }}
              style={{
                fontSize: '0.9rem',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #888',
                background: '#222',
                color: '#fff',
                marginRight: 8,
                minWidth: 90
              }}
              data-testid="engine-mode-select"
            >
              <option value="normal">Normal</option>
              <option value="hashlife">Hashlife</option>
            </select>
          </Box>
        </Tooltip>

        {/* Step button - only for normal engine */}
        {engineMode === 'normal' && (
          <Tooltip title="Step once">
            <span>
              <IconButton 
                size="small" 
                aria-label="step" 
                disabled={false}
                onClick={async () => { 
                  try {
                    console.debug('[RunControlGroup] Step button clicked');
                    await step(); 
                    draw(); 
                  } catch (error) {
                    console.error('Step failed:', error);
                  }
                }}
              >
                <SkipNextIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Universal Play/Pause button */}
        <Tooltip title={
          isRunning ? 'Stop simulation' : `Start ${engineMode === 'hashlife' ? 'hashlife' : 'normal'} simulation`
        }>
          <IconButton
            size="small"
            aria-label={isRunning ? 'stop' : 'start'}
            color={isRunning ? 'error' : 'primary'}
            onClick={() => {
              try {
                console.debug('[RunControlGroup] play button clicked', {
                  isRunning,
                  engineMode,
                  hasStartNormal: !!onStartNormalMode,
                  hasStartHashlife: !!onStartHashlifeMode,
                  hasStop: !!onStopAllEngines
                });
              } catch (e) { console.warn('Debug log failed:', e); }
              if (isRunning) {
                if (typeof onStopAllEngines === 'function') {
                  onStopAllEngines();
                } else {
                  try { setIsRunning(false); } catch (e) { console.warn('setIsRunning(false) failed:', e); }
                }
              } else {
                const startHandler = engineMode === 'hashlife' ? onStartHashlifeMode : onStartNormalMode;
                if (typeof startHandler === 'function') {
                  startHandler();
                } else {
                  try { setIsRunning(true); } catch (e) { console.warn('setIsRunning(true) failed:', e); }
                }
              }
            }}
          >
            {isRunning ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>
        </Tooltip>



        {/* Running indicator for quick glance status (mobile-friendly) */}
        <Tooltip
          title={isRunning ? 'Running (normal mode)' : 'Stopped'}
        >
          <LightbulbIcon
            fontSize="small"
            sx={{
              color:
                isRunning ? '#FFC107' : // Yellow when running
                'rgba(255,255,255,0.35)', // Gray when stopped
              animation: isRunning ? `${pulse} 1.4s ease-in-out infinite` : 'none'
            }}
            aria-label={
              isRunning ? `${engineMode}-running-indicator` : 'stopped-indicator'
            }
          />
        </Tooltip>
        
        <Tooltip title="Clear grid">
          <IconButton
            size="small"
            aria-label="clear"
            onClick={() => {
              if (confirmOnClear) {
                setConfirmOpen(true);
              } else {
                // immediate clear without confirmation
                try {
                  setIsRunning(false);
                } catch (e) {
                  // ignore if setter is unavailable in tests
                  console.warn('setIsRunning(false) failed:', e);
                }
                clear();
                draw();
                if (snapshotsRef) snapshotsRef.current = [];
                if (setSteadyInfo) setSteadyInfo({ steady: false, period: STEADY_STATE_PERIOD_INITIAL_LOCAL, popChanging: false });
                // UI-level session reset: clear population history and any cached
                // stability/performance state so charts and gauges start fresh.
                try {
                  if (typeof globalThis.dispatchEvent === 'function') {
                    globalThis.dispatchEvent(new CustomEvent('gol:sessionCleared'));
                  }
                } catch (e) {
                  // ignore if CustomEvent/globalThis is unavailable (e.g. tests)
                  console.warn('globalThis.dispatchEvent failed:', e);
                }
              }
            }}
          >
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset to generation 0 pattern">
          <IconButton
            size="small"
            aria-label="reset-to-generation-zero"
            onClick={() => {
              try {
                setIsRunning(false);
              } catch (e) {
                console.warn('setIsRunning(false) failed:', e);
              }
              if (typeof resetToGenerationZero === 'function') {
                resetToGenerationZero();
                return;
              }
              clear();
              draw();
            }}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
      </Stack>

      {/* Clear confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Clear grid?</DialogTitle>
        <DialogContent>
          Are you sure you want to clear the current grid? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmClear} color="error" autoFocus>
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

RunControlGroup.propTypes = {
  isRunning: PropTypes.bool.isRequired,
  setIsRunning: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  snapshotsRef: PropTypes.object.isRequired,
  setSteadyInfo: PropTypes.func.isRequired,
  // Engine mode props
  engineMode: PropTypes.oneOf(['normal', 'hashlife']),
  isHashlifeMode: PropTypes.bool,
  onStartNormalMode: PropTypes.func,
  onStartHashlifeMode: PropTypes.func,
  onStopAllEngines: PropTypes.func,
  onSetEngineMode: PropTypes.func,
  useHashlife: PropTypes.bool,
  // Hashlife batch size
  generationBatchSize: PropTypes.number,
  onSetGenerationBatchSize: PropTypes.func,
  confirmOnClear: PropTypes.bool,
  resetToGenerationZero: PropTypes.func
};
