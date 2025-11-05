import React from 'react';
import PropTypes from 'prop-types';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PopulationChart from './PopulationChart';
import SpeedGauge from './SpeedGauge';

/**
 * StatisticsPanel: shows PopulationChart and Performance Gauge together.
 * Appears as a floating panel with its own close button.
 */
export default function StatisticsPanel({
  open,
  onClose,
  history,
  isRunning,
  gameRef
}) {
  if (!open) return null;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 1200,
        bgcolor: 'rgba(0,0,0,0.85)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 1,
        p: 1.5,
        minWidth: 720,
        maxWidth: '90vw'
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', color: 'primary.light' }}>
          Statistics
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close-statistics" sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: '1 1 auto' }}>
          <PopulationChart history={history} isRunning={isRunning} position={{}} />
        </Box>
        <Box sx={{ flex: '0 0 auto' }}>
          <SpeedGauge isVisible embedded gameRef={gameRef} />
        </Box>
      </Box>
    </Paper>
  );
}

StatisticsPanel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  history: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isRunning: PropTypes.bool,
  gameRef: PropTypes.object
};
