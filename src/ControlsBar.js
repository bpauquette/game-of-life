import React, { useState } from 'react';
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
  shapesMenuOpen,
  setShapesMenuOpen,
  shapesMenuPos,
  setShapesMenuPos,
  shapesMenuRef,
  setSelectedShape,
  drawWithOverlay,
  steadyInfo,
  toolStateRef,
  cursorCell,
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
      <Stack direction="row" spacing={1} alignItems="center">
        <ToggleButtonGroup
          value={selectedTool}
          exclusive
          size="small"
          onChange={(_, v) => v && setSelectedTool(v)}
        >
          <ToggleButton value="draw" aria-label="draw"><Tooltip title="Freehand draw"><BrushIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="line" aria-label="line"><Tooltip title="Line tool"><LineAxisIcon fontSize="small"/></Tooltip></ToggleButton>
          <ToggleButton value="rect" aria-label="rect"><Tooltip title="Rectangle tool">rect</Tooltip></ToggleButton>
          <ToggleButton value="circle" aria-label="circle"><Tooltip title="Circle tool">circle</Tooltip></ToggleButton>
          <ToggleButton value="oval" aria-label="oval"><Tooltip title="Oval tool">oval</Tooltip></ToggleButton>
          <ToggleButton value="randomRect" aria-label="randomRect"><Tooltip title="Random rect">rnd</Tooltip></ToggleButton>
          <ToggleButton value="shapes" aria-label="shapes"><Tooltip title="Shapes menu">shp</Tooltip></ToggleButton>
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
        <Button size="small" onClick={() => { clear(); draw(); snapshotsRef.current = []; setSteadyInfo({ steady: false, period: 0, popChanging: false }); }}>Clear</Button>

        <IconButton size="small" onClick={() => setShowChart(true)} aria-label="chart"><BarChartIcon fontSize="small"/></IconButton>

        <IconButton size="small" onClick={openOptions} aria-label="options"><SettingsIcon fontSize="small"/></IconButton>

        <Chip label={`Live: ${getLiveCells().size}`} size="small" variant="outlined" />

        <div style={{ marginLeft: 12 }}>
          <ToolStatus selectedTool={selectedTool} toolStateRef={toolStateRef} cursorCell={cursorCell} />
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

export default ControlsBar;

