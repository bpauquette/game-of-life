import React from 'react';
import PropTypes from 'prop-types';
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

// ToolGroup groups the primary tools into a single, reusable control
export default function ToolGroup({ selectedTool, setSelectedTool, isSmall = false }) {
  return (
    <ToggleButtonGroup
      value={selectedTool}
      exclusive
      size={isSmall ? 'medium' : 'small'}
      color="primary"
      onChange={(_, v) => v && setSelectedTool(v)}
      sx={{
        '& .MuiToggleButton-root': {
          minWidth: 44,
          minHeight: 44,
          borderColor: 'rgba(255,255,255,0.25)'
        },
        '& .MuiToggleButton-root.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'black',
          borderColor: 'primary.light',
          transform: 'scale(1.08)',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.25) inset',
        },
        '& .MuiToggleButton-root.Mui-selected:hover': {
          bgcolor: 'primary.main',
        }
      }}
    >
      <ToggleButton value="draw" aria-label="draw"><Tooltip title="Freehand draw"><BrushIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="line" aria-label="line"><Tooltip title="Line tool"><LineAxisIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="rect" aria-label="rect"><Tooltip title="Rectangle tool"><CropSquareIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="circle" aria-label="circle"><Tooltip title="Circle tool"><RadioButtonUncheckedIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="oval" aria-label="oval"><Tooltip title="Oval tool"><OvalIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="randomRect" aria-label="randomRect"><Tooltip title="Random rect"><CasinoIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="capture" aria-label="capture"><Tooltip title="Capture area as shape"><ColorizeIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
    </ToggleButtonGroup>
  );
}

ToolGroup.propTypes = {
  selectedTool: PropTypes.string,
  setSelectedTool: PropTypes.func.isRequired,
  isSmall: PropTypes.bool
};
