import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import BarChartIcon from '@mui/icons-material/BarChart';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
// ToolGroup now lives in the LeftSidebar alongside RecentShapesStrip
import SaveLoadGroup from './components/SaveLoadGroup';
import RunControlGroup from './components/RunControlGroup';
import ToolGroup from './components/ToolGroup';
import OptionsPanel from './OptionsPanel';
import HelpDialog from './HelpDialog';
import AboutDialog from './AboutDialog';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import SaveGridDialog from './SaveGridDialog';
import LoadGridDialog from './LoadGridDialog';
import useGridFileManager from './hooks/useGridFileManager';

// Tool toggles extracted into ToolGroup component

function AuxActions({ onOpenChart, onOpenHelp, onOpenAbout, onOpenOptions }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <IconButton size="small" onClick={onOpenChart} aria-label="chart" data-testid="toggle-chart"><BarChartIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={onOpenHelp} aria-label="help"><Tooltip title="Help"><HelpIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={onOpenAbout} aria-label="about"><Tooltip title="About"><InfoIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={onOpenOptions} aria-label="options" data-testid="options-icon-button"><SettingsIcon fontSize="small" /></IconButton>
    </Stack>
  );
}
AuxActions.propTypes = {
  onOpenChart: PropTypes.func.isRequired,
  onOpenHelp: PropTypes.func.isRequired,
  onOpenAbout: PropTypes.func.isRequired,
  onOpenOptions: PropTypes.func.isRequired
};

export default function HeaderBar({
  // game controls
  isRunning,
  setIsRunning,
  step,
  draw,
  clear,
  snapshotsRef,
  setSteadyInfo,
  // dialogs + options
  colorSchemes,
  colorSchemeKey,
  setColorSchemeKey,
  popWindowSize,
  setPopWindowSize,
  popTolerance,
  setPopTolerance,
  showSpeedGauge,
  setShowSpeedGauge,
  maxFPS,
  setMaxFPS,
  maxGPS,
  setMaxGPS,
  // grid
  getLiveCells,
  onLoadGrid,
  generation,
  // app actions
  setShowChart,
  onToggleSidebar,
  isSidebarOpen,
  isSmall,
  // tools row
  selectedTool,
  setSelectedTool,
  showToolsRow = true
}) {
  // dialogs
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [wasRunningBeforeOptions, setWasRunningBeforeOptions] = useState(false);
  const [confirmOnClear, setConfirmOnClear] = useState(() => {
    try {
      const v = localStorage.getItem('confirmOnClear');
      return v == null ? true : v === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('confirmOnClear', String(confirmOnClear)); } catch {}
  }, [confirmOnClear]);

  const {
    saveGrid,
    loadGrid,
    deleteGrid,
    grids,
    loading: gridLoading,
    error: gridError,
    loadingGrids,
    saveDialogOpen,
    loadDialogOpen,
    openSaveDialog,
    closeSaveDialog,
    openLoadDialog,
    closeLoadDialog
  } = useGridFileManager({ getLiveCells, generation });

  // Stop simulation immediately when user initiates Save or Load
  const openSaveDialogAndPause = useCallback(() => {
    if (isRunning) setIsRunning(false);
    openSaveDialog();
  }, [isRunning, setIsRunning, openSaveDialog]);

  const openLoadDialogAndPause = useCallback(() => {
    if (isRunning) setIsRunning(false);
    openLoadDialog();
  }, [isRunning, setIsRunning, openLoadDialog]);

  const openOptions = () => {
    setWasRunningBeforeOptions(isRunning);
    if (isRunning) setIsRunning(false);
    setOptionsOpen(true);
  };
  const handleOk = () => { setOptionsOpen(false); if (wasRunningBeforeOptions) setIsRunning(true); };
  const handleCancel = () => { setOptionsOpen(false); if (wasRunningBeforeOptions) setIsRunning(true); };

  const handleSaveGrid = useCallback(async (name, description) => {
    // Pause simulation during save to capture a consistent snapshot and avoid contention
    const wasRunning = isRunning;
    try {
      if (wasRunning) setIsRunning(false);
      // Capture live cells just to display count in dialog; the hook will fetch its own copy too
      const liveCells = getLiveCells();
      await saveGrid(name, description, liveCells, generation);
    } finally {
      if (wasRunning) setIsRunning(true);
    }
  }, [getLiveCells, saveGrid, generation, isRunning, setIsRunning]);

  const handleLoadGrid = useCallback(async (gridId) => {
    const grid = await loadGrid(gridId);
    if (grid && onLoadGrid) onLoadGrid(grid.liveCells);
  }, [loadGrid, onLoadGrid]);

  return (
    <>
      <Box
        className="header-bar"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          gap: 0.5,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          zIndex: 30,
          overflowX: 'auto'
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          {isSmall && (
            <IconButton size="small" onClick={onToggleSidebar} aria-label="toggle-sidebar">
              <ViewSidebarIcon fontSize="small" />
            </IconButton>
          )}
          <SaveLoadGroup compact={isSmall} openSaveGrid={openSaveDialogAndPause} openLoadGrid={openLoadDialogAndPause} />
        </Stack>

        {/* Centered Run controls overlayed in the header */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'auto'
          }}
        >
          <RunControlGroup
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            step={step}
            draw={draw}
            clear={clear}
            snapshotsRef={snapshotsRef}
            setSteadyInfo={setSteadyInfo}
            confirmOnClear={confirmOnClear}
          />
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <AuxActions
            onOpenChart={() => setShowChart(true)}
            onOpenHelp={() => setHelpOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
            onOpenOptions={openOptions}
          />
        </Stack>
      </Box>

      {showToolsRow && (
        <Box
          className="tools-bar"
          sx={{
            position: 'fixed',
            top: 48,
            left: 0,
            right: 0,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1,
            backgroundColor: 'rgba(0,0,0,0.28)',
            borderBottom: '1px solid rgba(255,255,255,0.18)',
            zIndex: 40,
            pointerEvents: 'auto',
            overflowX: 'auto'
          }}
        >
          <ToolGroup selectedTool={selectedTool} setSelectedTool={setSelectedTool} isSmall={isSmall} />
        </Box>
      )}

      {optionsOpen && (
        <OptionsPanel
          colorSchemes={colorSchemes}
          colorSchemeKey={colorSchemeKey}
          setColorSchemeKey={setColorSchemeKey}
          popWindowSize={popWindowSize}
          setPopWindowSize={setPopWindowSize}
          popTolerance={popTolerance}
          setPopTolerance={setPopTolerance}
          showSpeedGauge={showSpeedGauge}
          setShowSpeedGauge={setShowSpeedGauge}
          maxFPS={maxFPS}
          setMaxFPS={setMaxFPS}
          maxGPS={maxGPS}
          setMaxGPS={setMaxGPS}
          confirmOnClear={confirmOnClear}
          setConfirmOnClear={setConfirmOnClear}
          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
      )}

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <SaveGridDialog
        open={saveDialogOpen}
        onClose={closeSaveDialog}
        onSave={handleSaveGrid}
        loading={gridLoading}
        error={gridError}
        liveCellsCount={getLiveCells().size}
        generation={generation}
      />

      <LoadGridDialog
        open={loadDialogOpen}
        onClose={closeLoadDialog}
        onLoad={handleLoadGrid}
        onDelete={deleteGrid}
        grids={grids}
        loading={gridLoading}
        error={gridError}
        loadingGrids={loadingGrids}
      />
    </>
  );
}

HeaderBar.propTypes = {
  isRunning: PropTypes.bool.isRequired,
  setIsRunning: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  snapshotsRef: PropTypes.object.isRequired,
  setSteadyInfo: PropTypes.func.isRequired,
  colorSchemes: PropTypes.object.isRequired,
  colorSchemeKey: PropTypes.string.isRequired,
  setColorSchemeKey: PropTypes.func.isRequired,
  popWindowSize: PropTypes.number.isRequired,
  setPopWindowSize: PropTypes.func.isRequired,
  popTolerance: PropTypes.number.isRequired,
  setPopTolerance: PropTypes.func.isRequired,
  showSpeedGauge: PropTypes.bool,
  setShowSpeedGauge: PropTypes.func,
  maxFPS: PropTypes.number,
  setMaxFPS: PropTypes.func,
  maxGPS: PropTypes.number,
  setMaxGPS: PropTypes.func,
  getLiveCells: PropTypes.func.isRequired,
  onLoadGrid: PropTypes.func.isRequired,
  generation: PropTypes.number.isRequired,
  setShowChart: PropTypes.func.isRequired,
  onToggleSidebar: PropTypes.func,
  isSidebarOpen: PropTypes.bool,
  isSmall: PropTypes.bool
};
