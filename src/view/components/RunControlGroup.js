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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
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
  confirmOnClear = true
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
        <Tooltip title="Step once">
          <IconButton size="small" aria-label="step" onClick={() => { step(); draw(); }}>
            <SkipNextIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={isRunning ? 'Stop' : 'Start'}>
          <IconButton
            size="small"
            aria-label={isRunning ? 'stop' : 'start'}
            color={isRunning ? 'error' : 'primary'}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Running indicator for quick glance status (mobile-friendly) */}
        <Tooltip title={isRunning ? 'Running' : 'Stopped'}>
          <LightbulbIcon
            fontSize="small"
            sx={{
              color: isRunning ? '#FFC107' : 'rgba(255,255,255,0.35)',
              animation: isRunning ? `${pulse} 1.4s ease-in-out infinite` : 'none'
            }}
            aria-label={isRunning ? 'running-indicator' : 'stopped-indicator'}
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
                clear();
                draw();
                if (snapshotsRef) snapshotsRef.current = [];
                if (setSteadyInfo) setSteadyInfo({ steady: false, period: STEADY_STATE_PERIOD_INITIAL_LOCAL, popChanging: false });
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
  setSteadyInfo: PropTypes.func.isRequired
};
