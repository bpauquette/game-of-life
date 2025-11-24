import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Widgets as WidgetsIcon, Edit as EditIcon, Backspace as BackspaceIcon, CropSquare as CropSquareIcon, RadioButtonUnchecked as RadioButtonUncheckedIcon, Casino as CasinoIcon, Colorize as ColorizeIcon, HorizontalRule as HorizontalRuleIcon, Stop as StopIcon } from '@mui/icons-material';
import TOOL_DESCRIPTIONS from './toolDescriptions';
// icons are imported above from @mui/icons-material
import OvalIcon from '../components/OvalIcon';
// HorizontalRuleIcon is imported above as HorizontalRuleIcon from @mui/icons-material

// ToolGroup groups the primary tools into a single, reusable control
export default function ToolGroup({ selectedTool, setSelectedTool, isSmall = false, shapesEnabled = true }) {
  // On small screens (mobile portrait) hide less-essential tools to
  // preserve space and avoid accidental taps. When the device is rotated
  // sideways (landscape) show them again.
  const [isPortrait, setIsPortrait] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(orientation: portrait)').matches;
      }
    } catch (e) {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (ev) => setIsPortrait(ev.matches);
    try {
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
      else if (typeof mq.addListener === 'function') mq.addListener(handler);
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handler);
        else if (typeof mq.removeListener === 'function') mq.removeListener(handler);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const hideOptionalTools = isSmall && isPortrait;

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
  <ToggleButton value="shapes" aria-label="shapes" onClick={() => { if (selectedTool === 'shapes') setSelectedTool('shapes'); }}>
    <Tooltip title={TOOL_DESCRIPTIONS.shapes}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <WidgetsIcon fontSize={isSmall ? 'medium' : 'small'} />
      </span>
    </Tooltip>
  </ToggleButton>
  <ToggleButton value="draw" aria-label="draw"><Tooltip title={TOOL_DESCRIPTIONS.draw}><EditIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  {!hideOptionalTools && <ToggleButton value="eraser" aria-label="eraser"><Tooltip title={TOOL_DESCRIPTIONS.eraser}><BackspaceIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>}
      <ToggleButton value="line" aria-label="line"><Tooltip title={TOOL_DESCRIPTIONS.line}><HorizontalRuleIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="rect" aria-label="rect"><Tooltip title={TOOL_DESCRIPTIONS.rect}><CropSquareIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="square" aria-label="square"><Tooltip title={TOOL_DESCRIPTIONS.square}><StopIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="circle" aria-label="circle"><Tooltip title={TOOL_DESCRIPTIONS.circle}><RadioButtonUncheckedIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="oval" aria-label="oval"><Tooltip title={TOOL_DESCRIPTIONS.oval}><OvalIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  {!hideOptionalTools && <ToggleButton value="randomRect" aria-label="randomRect"><Tooltip title={TOOL_DESCRIPTIONS.randomRect}><CasinoIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>}
  <ToggleButton value="capture" aria-label="capture"><Tooltip title={TOOL_DESCRIPTIONS.capture}><ColorizeIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
    </ToggleButtonGroup>
  );
}

ToolGroup.propTypes = {
  selectedTool: PropTypes.string,
  setSelectedTool: PropTypes.func.isRequired,
  isSmall: PropTypes.bool
};
