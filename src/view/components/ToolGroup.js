import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../context/GameContext.js';
import PropTypes from 'prop-types';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import RubberEraserIcon from './icons/RubberEraserIcon.js';
import TOOL_DESCRIPTIONS from './toolDescriptions.js';
// icons are imported above from @mui/icons-material
import OvalIcon from '../components/OvalIcon.js';
import { Widgets as WidgetsIcon, Edit as EditIcon, CropSquare as CropSquareIcon, RadioButtonUnchecked as RadioButtonUncheckedIcon, Casino as CasinoIcon, Colorize as ColorizeIcon, HorizontalRule as HorizontalRuleIcon, Mouse as MouseIcon } from '@mui/icons-material';

// ToolGroup groups the primary tools into a single, reusable control
export default function ToolGroup({ isSmall = false }) {
  const { selectedTool, requestToolChange } = useGameContext();
  // On small screens (mobile portrait) hide less-essential tools to
  // preserve space and avoid accidental taps. When the device is rotated
  // sideways (landscape) show them again.
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof globalThis !== 'undefined' && globalThis.matchMedia) {
      return globalThis.matchMedia('(orientation: portrait)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.matchMedia) return undefined;
    const mq = globalThis.matchMedia('(orientation: portrait)');
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
      onChange={(_, v) => v && requestToolChange(v)}
      sx={{
        '& .MuiToggleButton-root': {
          minWidth: 44,
          minHeight: 44,
          borderColor: 'rgba(255,255,255,0.25)',
          transition: 'background-color 120ms ease-out, transform 120ms ease-out',
          backgroundColor: 'rgba(0,0,0,0.25)'
        },
        '& .MuiToggleButton-root:hover': {
          backgroundColor: 'rgba(255,255,255,0.08)'
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
      <ToggleButton value="toggle" aria-label="toggle" disableRipple>
        <Tooltip title={TOOL_DESCRIPTIONS.toggle}>
          <MouseIcon fontSize={isSmall ? 'medium' : 'small'} />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="draw" aria-label="draw" disableRipple>
        <Tooltip title={TOOL_DESCRIPTIONS.draw}>
          <EditIcon fontSize={isSmall ? 'medium' : 'small'} />
        </Tooltip>
      </ToggleButton>
    {!hideOptionalTools && (
      <ToggleButton value="erase" aria-label="erase" disableRipple>
        <Tooltip title={TOOL_DESCRIPTIONS.erase}>
          <RubberEraserIcon fontSize={isSmall ? 'medium' : 'small'} />
        </Tooltip>
      </ToggleButton>
    )}
      <ToggleButton value="line" aria-label="line" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.line}><HorizontalRuleIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="rect" aria-label="rect" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.rect}><CropSquareIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="square" aria-label="square" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.square}><CropSquareIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="circle" aria-label="circle" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.circle}><RadioButtonUncheckedIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="oval" aria-label="oval" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.oval}><OvalIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  {!hideOptionalTools && <ToggleButton value="randomRect" aria-label="randomRect" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.randomRect}><CasinoIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>}
  <ToggleButton value="capture" aria-label="capture" disableRipple><Tooltip title={TOOL_DESCRIPTIONS.capture}><ColorizeIcon fontSize={isSmall ? 'medium' : 'small'} /></Tooltip></ToggleButton>
  <ToggleButton value="shapes" aria-label="shapes" disableRipple onClick={() => { if (selectedTool === 'shapes') requestToolChange('shapes'); }}>
    <Tooltip title={TOOL_DESCRIPTIONS.shapes}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <WidgetsIcon fontSize={isSmall ? 'medium' : 'small'} />
      </span>
    </Tooltip>
  </ToggleButton>
    </ToggleButtonGroup>
  );
}

ToolGroup.propTypes = {
  isSmall: PropTypes.bool
};
