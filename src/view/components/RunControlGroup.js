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
  onHashlifeBurst,
  confirmOnClear = true,
  // Engine mode props
  engineMode = 'normal',
  isHashlifeMode = false,
  isBurstRunning = false,
  onStartNormalMode,
  onStartHashlifeMode,
  onStopAllEngines,
  useHashlife = true
}) {
  // optional hashlife burst handler
  
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
        <Tooltip title={isBurstRunning ? 'Step disabled during hashlife burst' : 'Step once'}>
          <span>
            <IconButton 
              size="small" 
              aria-label="step" 
              disabled={isBurstRunning}
              onClick={() => { step(); draw(); }}
            >
              <SkipNextIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={
          isBurstRunning ? 'Stop hashlife burst' :
          isRunning ? `Stop ${engineMode} mode` : 
          `Start ${engineMode} mode`
        }>
          <IconButton
            size="small"
            aria-label={isRunning ? 'stop' : 'start'}
            color={isRunning ? 'error' : (engineMode === 'hashlife' ? 'secondary' : 'primary')}
            onClick={() => {
              if (isBurstRunning || isRunning) {
                onStopAllEngines?.();
              } else if (engineMode === 'normal') {
                onStartNormalMode?.();
              } else if (engineMode === 'hashlife') {
                onStartHashlifeMode?.();
              } else {
                setIsRunning(!isRunning);
              }
            }}
          >
            {isRunning ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Running indicator for quick glance status (mobile-friendly) */}
        <Tooltip title={
          isBurstRunning ? 'Hashlife burst running' :
          isRunning ? `Running (${engineMode} mode)` : 'Stopped'
        }>
          <LightbulbIcon
            fontSize="small"
            sx={{
              color: 
                isBurstRunning ? '#FF5722' : // Orange-red for hashlife burst
                isRunning && engineMode === 'hashlife' ? '#9C27B0' : // Purple for hashlife mode
                isRunning ? '#FFC107' : // Yellow for normal mode
                'rgba(255,255,255,0.35)', // Gray when stopped
              animation: (isRunning || isBurstRunning) ? `${pulse} 1.4s ease-in-out infinite` : 'none'
            }}
            aria-label={
              isBurstRunning ? 'hashlife-burst-indicator' :
              isRunning ? `${engineMode}-running-indicator` : 'stopped-indicator'
            }
          />
        </Tooltip>
        
        {/* Engine mode indicator */}
        {(isRunning || isBurstRunning) && (
          <Tooltip title={`Engine: ${isBurstRunning ? 'Hashlife Burst' : engineMode}`}>
            <Box sx={{ 
              px: 0.5, 
              py: 0.25, 
              borderRadius: 0.5, 
              backgroundColor: 
                isBurstRunning ? 'rgba(255, 87, 34, 0.3)' :
                engineMode === 'hashlife' ? 'rgba(156, 39, 176, 0.3)' : 
                'rgba(255, 193, 7, 0.3)',
              fontSize: '0.6rem',
              fontWeight: 'bold',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              {isBurstRunning ? 'BURST' : engineMode === 'hashlife' ? 'HASH' : 'NORM'}
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
        
        {/* Engine mode switching buttons */}
        {!isRunning && !isBurstRunning && (
          <>
            <Tooltip title={engineMode === 'normal' ? 'Switch to Hashlife mode' : 'Switch to Normal mode'}>
              <IconButton
                size="small"
                aria-label="switch-engine"
                color="inherit"
                onClick={() => {
                  if (engineMode === 'normal') {
                    onStartHashlifeMode?.();
                  } else {
                    onStartNormalMode?.();
                  }
                }}
              >
                <LightbulbIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {useHashlife && engineMode === 'hashlife' && (
              <Tooltip title="Start Hashlife burst (fast forward with occasional rendering)">
                <IconButton
                  size="small"
                  aria-label="hashlife-burst"
                  color="secondary"
                  onClick={() => onHashlifeBurst?.()}
                >
                  <SkipNextIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
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
  onHashlifeBurst: PropTypes.func,
  // Engine mode props
  engineMode: PropTypes.oneOf(['normal', 'hashlife']),
  isHashlifeMode: PropTypes.bool,
  isBurstRunning: PropTypes.bool,
  onStartNormalMode: PropTypes.func,
  onStartHashlifeMode: PropTypes.func,
  onStopAllEngines: PropTypes.func,
  useHashlife: PropTypes.bool
};
