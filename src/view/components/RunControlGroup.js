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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { PlayArrow as PlayArrowIcon, Stop as StopIcon, SkipNext as SkipNextIcon, DeleteSweep as DeleteSweepIcon, Lightbulb as LightbulbIcon } from '@mui/icons-material';
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
  // Engine mode props (Hashlife UI disabled; always normal)
  engineMode = 'normal',
  isHashlifeMode = false,
  onStartNormalMode,
  onStopAllEngines
}) {

  
  const STEADY_STATE_PERIOD_INITIAL_LOCAL = 0;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pulse = keyframes`
    0% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0.7; transform: scale(1); }
  `;

  const handleConfirmClear = useCallback(() => {
    clear();
    draw();
    if (snapshotsRef) snapshotsRef.current = [];
    if (setSteadyInfo) setSteadyInfo({ steady: false, period: STEADY_STATE_PERIOD_INITIAL_LOCAL, popChanging: false });
    setConfirmOpen(false);
  }, [clear, draw, snapshotsRef, setSteadyInfo]);

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
        {/* Engine selection and Hashlife controls are temporarily disabled; UI
            always uses the normal engine. */}
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
          isRunning ? 'Stop normal' : 'Start normal simulation'
        }>
          <IconButton
            size="small"
            aria-label={isRunning ? 'stop' : 'start'}
            color={isRunning ? 'error' : 'primary'}
            onClick={() => {
              if (isRunning) {
                onStopAllEngines?.();
              } else {
                onStartNormalMode?.();
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
        
        {/* Engine mode indicator */}
        {isRunning && (
          <Tooltip title="Engine: normal">
            <Box sx={{ 
              px: 0.5, 
              py: 0.25, 
              borderRadius: 0.5, 
              backgroundColor: 
                'rgba(255, 193, 7, 0.3)',
              fontSize: '0.6rem',
              fontWeight: 'bold',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              NORM
            </Box>
          </Tooltip>
        )}

        <Tooltip title="Clear grid">
          <IconButton
            size="small"
            aria-label="clear"
            onClick={() => {
              if (confirmOnClear) {
                setConfirmOpen(true);
              } else {
                // immediate clear without confirmation
                clear();
                draw();
                if (snapshotsRef) snapshotsRef.current = [];
                if (setSteadyInfo) setSteadyInfo({ steady: false, period: STEADY_STATE_PERIOD_INITIAL_LOCAL, popChanging: false });
                // UI-level session reset: clear population history and any cached
                // stability/performance state so charts and gauges start fresh.
                try {
                  if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('gol:sessionCleared'));
                  }
                } catch {
                  // ignore if CustomEvent/window is unavailable (e.g. tests)
                }
              }
            }}
          >
            <DeleteSweepIcon fontSize="small" />
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
  onSetGenerationBatchSize: PropTypes.func
};
