import React, { useState } from 'react';
import PropTypes from 'prop-types';
import OptionsPanel from './OptionsPanel';
import ToolStatus from './ToolStatus';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import BrushIcon from '@mui/icons-material/Brush';
import LineAxisIcon from '@mui/icons-material/ShowChart';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CircleIcon from '@mui/icons-material/Circle';
import WidgetsIcon from '@mui/icons-material/Widgets';
import CasinoIcon from '@mui/icons-material/Casino';

// UI Layout Constants  
const CONTROL_SPACING = 1;
const TOOL_STATUS_MARGIN_LEFT = 12;
const STEADY_STATE_PERIOD_INITIAL = 0;
// ShapePaletteDialog is rendered by the parent (GameOfLife)

// Minimal, correct ControlsBar to replace corrupted file. Keep layout simple to avoid JSX nesting issues.
const ControlsBar = ({
  selectedTool,
  setSelectedTool,
  isRunning,
  setIsRunning,
  step,
  draw,
  clear,
  snapshotsRef,
  setSteadyInfo,
  setShowChart,
  getLiveCells,
  shapes,
  selectShape,
  drawWithOverlay,
  steadyInfo,
  toolStateRef,
  cursorCell,
  selectedShape,
  openPalette,
  // Options-related props (must be forwarded to OptionsPanel)
  colorSchemes,
  colorSchemeKey,
  setColorSchemeKey,
  popWindowSize,
  setPopWindowSize,
  popTolerance,
  setPopTolerance
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  // paletteOpen is now controlled by parent (GameOfLife)
  const [wasRunningBeforeOptions, setWasRunningBeforeOptions] = useState(false);

  const openOptions = () => {
    setWasRunningBeforeOptions(isRunning);
    if (isRunning) setIsRunning(false);
    setOptionsOpen(true);
  };
  const handleOk = () => {
    setOptionsOpen(false);
    if (wasRunningBeforeOptions) setIsRunning(true);
  };
  const handleCancel = () => {
    setOptionsOpen(false);
    if (wasRunningBeforeOptions) setIsRunning(true);
  };

  return (
    <div className="controls">
      <Stack direction="row" spacing={CONTROL_SPACING} alignItems="center">
        <ToggleButtonGroup
          value={selectedTool}
          exclusive
          size="small"
          onChange={(_, v) => v && setSelectedTool(v)}
        >
          <ToggleButton value="draw" aria-label="draw"><Tooltip title="Freehand draw"><BrushIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="line" aria-label="line"><Tooltip title="Line tool"><LineAxisIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="rect" aria-label="rect"><Tooltip title="Rectangle tool"><CropSquareIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="circle" aria-label="circle"><Tooltip title="Circle tool"><CircleIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="oval" aria-label="oval"><Tooltip title="Oval tool"><WidgetsIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="randomRect" aria-label="randomRect"><Tooltip title="Random rect"><CasinoIcon fontSize="small"/></Tooltip></ToggleButton>
          {/* Palette toggle: opens the ShapePaletteDialog while selected */}
          <ToggleButton value="shapes" aria-label="shapes" onClick={() => openPalette && openPalette()}><Tooltip title="Shapes"><WidgetsIcon fontSize="small"/></Tooltip></ToggleButton>
        </ToggleButtonGroup>

        <Button size="small" onClick={() => { step(); draw(); }}>Step</Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => setIsRunning(!isRunning)}
          startIcon={isRunning ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        <Button size="small" onClick={() => { clear(); draw(); snapshotsRef.current = []; setSteadyInfo({ steady: false, period: STEADY_STATE_PERIOD_INITIAL, popChanging: false }); }}>Clear</Button>

        <IconButton size="small" onClick={() => setShowChart(true)} aria-label="chart"><BarChartIcon fontSize="small"/></IconButton>
  {/* palette opener removed; use the palette toggle in the tool group instead */}
        
        <IconButton size="small" onClick={openOptions} aria-label="options"><SettingsIcon fontSize="small"/></IconButton>

  <Chip label={`Live Cells: ${getLiveCells().size}`} size="small" variant="outlined" />

        <div style={{ marginLeft: TOOL_STATUS_MARGIN_LEFT }}>
          <ToolStatus selectedTool={selectedTool} toolStateRef={toolStateRef} cursorCell={cursorCell} selectedShape={selectedShape} />
        </div>
      </Stack>

      {optionsOpen && (
        <OptionsPanel
          colorSchemes={colorSchemes}
          colorSchemeKey={colorSchemeKey}
          setColorSchemeKey={setColorSchemeKey}
          popWindowSize={popWindowSize}
          setPopWindowSize={setPopWindowSize}
          popTolerance={popTolerance}
          setPopTolerance={setPopTolerance}
          onOk={handleOk}
          onCancel={handleCancel}
        />
      )}
      
    </div>
  );
};

ControlsBar.propTypes = {
  selectedTool: PropTypes.string.isRequired,
  setSelectedTool: PropTypes.func.isRequired,
  isRunning: PropTypes.bool.isRequired,
  setIsRunning: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  snapshotsRef: PropTypes.object.isRequired,
  setSteadyInfo: PropTypes.func.isRequired,
  setShowChart: PropTypes.func.isRequired,
  getLiveCells: PropTypes.func.isRequired,
  shapes: PropTypes.array.isRequired,
  selectShape: PropTypes.func.isRequired,
  drawWithOverlay: PropTypes.func.isRequired,
  steadyInfo: PropTypes.string,
  toolStateRef: PropTypes.object.isRequired,
  cursorCell: PropTypes.object,
  selectedShape: PropTypes.object,
  openPalette: PropTypes.func.isRequired,
  colorSchemes: PropTypes.object.isRequired,
  colorSchemeKey: PropTypes.string.isRequired,
  setColorSchemeKey: PropTypes.func.isRequired,
  popWindowSize: PropTypes.number.isRequired,
  setPopWindowSize: PropTypes.func.isRequired,
  popTolerance: PropTypes.number.isRequired,
  setPopTolerance: PropTypes.func.isRequired
};

export default ControlsBar;

