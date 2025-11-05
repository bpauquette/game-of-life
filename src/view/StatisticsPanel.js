import React from 'react';
import PropTypes from 'prop-types';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
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
  // Hooks must be called unconditionally
  const isSmall = useMediaQuery('(max-width:900px)');

  if (!open) return null;

  const Content = (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', color: 'primary.light' }}>
          Statistics
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close-statistics" sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: isSmall ? 'column' : 'row' }}>
        <Box sx={{ flex: '0 0 auto' }}>
          <SpeedGauge isVisible embedded gameRef={gameRef} />
        </Box>
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <PopulationChart history={history} isRunning={isRunning} embedded />
        </Box>
      </Box>
    </>
  );

  if (isSmall) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            height: '65vh',
            bgcolor: 'rgba(0,0,0,0.9)',
            color: '#fff',
            borderTopLeftRadius: 1,
            borderTopRightRadius: 1,
            p: 1.5
          }
        }}
      >
        <Box sx={{ width: '100%' }}>
          {/* Handle bar */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Box sx={{ width: 36, height: 4, bgcolor: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(65vh - 20px)', overflow: 'auto' }}>
            {Content}
          </Box>
        </Box>
      </Drawer>
    );
  }

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
      {Content}
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
