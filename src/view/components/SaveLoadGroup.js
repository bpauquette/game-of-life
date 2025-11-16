import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Save as SaveIcon, FolderOpen as FolderOpenIcon } from '@mui/icons-material';

// Visually distinct grouping for Load (left) and Save (right)
// Adds a compact mode for small screens to avoid crowding the header
export default function SaveLoadGroup({ openSaveGrid, openLoadGrid, compact = false }) {
  return (
    <Box
      sx={{
        px: compact ? 0.5 : 1,
        py: compact ? 0.25 : 0.75,
        borderRadius: compact ? 0.5 : 1,
        border: compact ? 'none' : '1px solid rgba(255,255,255,0.2)',
        backgroundColor: compact ? 'transparent' : 'rgba(0,0,0,0.25)'
      }}
      data-testid="save-load-group"
      aria-label="Load and Save controls"
    >
      {compact ? (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
          <Tooltip title="Load saved grid state">
            <IconButton size="small" onClick={openLoadGrid} aria-label="load-grid">
              <FolderOpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save current grid state">
            <IconButton size="small" onClick={openSaveGrid} aria-label="save-grid">
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
          <Tooltip title="Load saved grid state">
            <Button size="small" variant="outlined" onClick={openLoadGrid} startIcon={<FolderOpenIcon fontSize="small" />} sx={{ minWidth: 0, px: 1 }}>
              Load
            </Button>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Save current grid state">
            <Button size="small" variant="contained" onClick={openSaveGrid} startIcon={<SaveIcon fontSize="small" />} sx={{ minWidth: 0, px: 1 }}>
              Save
            </Button>
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
}

SaveLoadGroup.propTypes = {
  openSaveGrid: PropTypes.func.isRequired,
  openLoadGrid: PropTypes.func.isRequired,
  compact: PropTypes.bool
};
