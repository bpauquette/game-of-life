import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import WidgetsIcon from '@mui/icons-material/Widgets';
import TOOL_DESCRIPTIONS from './toolDescriptions';
import EditIcon from '@mui/icons-material/Edit';
import BackspaceIcon from '@mui/icons-material/Backspace';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CasinoIcon from '@mui/icons-material/Casino';
import ColorizeIcon from '@mui/icons-material/Colorize';
import OvalIcon from '../components/OvalIcon';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';

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
      {/* Shapes tool first, to the left of Draw */}
  <ToggleButton value="shapes" aria-label="shapes"><Tooltip title={TOOL_DESCRIPTIONS.shapes}><WidgetsIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="draw" aria-label="draw"><Tooltip title={TOOL_DESCRIPTIONS.draw}><EditIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="eraser" aria-label="eraser"><Tooltip title={TOOL_DESCRIPTIONS.eraser}><BackspaceIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
      <ToggleButton value="line" aria-label="line"><Tooltip title={TOOL_DESCRIPTIONS.line}><HorizontalRuleIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="rect" aria-label="rect"><Tooltip title={TOOL_DESCRIPTIONS.rect}><CropSquareIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="circle" aria-label="circle"><Tooltip title={TOOL_DESCRIPTIONS.circle}><RadioButtonUncheckedIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="oval" aria-label="oval"><Tooltip title={TOOL_DESCRIPTIONS.oval}><OvalIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="randomRect" aria-label="randomRect"><Tooltip title={TOOL_DESCRIPTIONS.randomRect}><CasinoIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="capture" aria-label="capture"><Tooltip title={TOOL_DESCRIPTIONS.capture}><ColorizeIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
    </ToggleButtonGroup>
  );
}

ToolGroup.propTypes = {
  selectedTool: PropTypes.string,
  setSelectedTool: PropTypes.func.isRequired,
  isSmall: PropTypes.bool
};
