import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import BrushIcon from '@mui/icons-material/Brush';
import LineAxisIcon from '@mui/icons-material/ShowChart';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CasinoIcon from '@mui/icons-material/Casino';
import ColorizeIcon from '@mui/icons-material/Colorize';
import OvalIcon from '../components/OvalIcon';

// Top-center overlay grouping all draw/pick tools
export default function ToolGroupOverlay({ selectedTool, setSelectedTool }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        backgroundColor: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 1,
        px: 1,
        py: 0.5
      }}
      data-testid="tool-group-overlay"
      aria-label="Tool selection"
    >
      <ToggleButtonGroup
        value={selectedTool}
        exclusive
        size="small"
        onChange={(_, v) => v && setSelectedTool(v)}
      >
        <ToggleButton value="draw" aria-label="draw"><Tooltip title="Freehand draw"><BrushIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="line" aria-label="line"><Tooltip title="Line tool"><LineAxisIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="rect" aria-label="rect"><Tooltip title="Rectangle tool"><CropSquareIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="circle" aria-label="circle"><Tooltip title="Circle tool"><RadioButtonUncheckedIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="oval" aria-label="oval"><Tooltip title="Oval tool"><OvalIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="randomRect" aria-label="randomRect"><Tooltip title="Random rect"><CasinoIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="capture" aria-label="capture"><Tooltip title="Capture area as shape"><ColorizeIcon fontSize="small" /></Tooltip></ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

ToolGroupOverlay.propTypes = {
  selectedTool: PropTypes.string,
  setSelectedTool: PropTypes.func.isRequired
};
