import React, { useState } from 'react';
import PropTypes from 'prop-types';
import OptionsPanel from './OptionsPanel';
import ToolStatus from './ToolStatus';
import SaveGridDialog from './SaveGridDialog';
import LoadGridDialog from './LoadGridDialog';
import useGridFileManager from './hooks/useGridFileManager';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
// icons used inside RunControlGroup
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
// tool icons moved to ToolGroupOverlay
// Save/Load icons moved to SaveLoadGroup component
// OvalIcon used in ToolGroupOverlay
import HelpDialog from './HelpDialog';
import AboutDialog from './AboutDialog';
import RunControlGroup from './components/RunControlGroup';
import SaveLoadGroup from './components/SaveLoadGroup';
import ToolGroup from './components/ToolGroup';

// UI Layout Constants  
const CONTROL_SPACING = 1;
// ShapePaletteDialog is rendered by the parent (GameOfLife)

// Tool toggles moved to top-middle overlay component

// RunControls moved to a standalone, visually distinct component (RunControlGroup)

// Save/Load moved to a standalone, visually distinct component (SaveLoadGroup)

function AuxButtons({ setShowChart, openHelp, openAbout, openOptions, onCenterViewport }) {
  return (
    <>
      <IconButton size="small" onClick={() => setShowChart(true)} aria-label="chart" data-testid="toggle-chart"><BarChartIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={openHelp} aria-label="help"><Tooltip title="Help"><HelpIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={openAbout} aria-label="about"><Tooltip title="About"><InfoIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={openOptions} aria-label="options" data-testid="options-icon-button"><SettingsIcon fontSize="small" /></IconButton>
    </>
  );
}
AuxButtons.propTypes = {
  setShowChart: PropTypes.func.isRequired,
  openHelp: PropTypes.func.isRequired,
  openAbout: PropTypes.func.isRequired,
  openOptions: PropTypes.func.isRequired,
  onCenterViewport: PropTypes.func
};

// Status chips moved to the bottom status panel (see GameOfLifeApp)

function ControlsDialogs({
  optionsOpen,
  handleOk,
  handleCancel,
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
  randomRectPercent,
  setRandomRectPercent,
  enableAdaCompliance,
  setEnableAdaCompliance,
  helpOpen,
  closeHelp,
  aboutOpen,
  closeAbout,
  saveDialogOpen,
  closeSaveGrid,
  onSaveGrid,
  gridLoading,
  gridError,
  liveCellsCount,
  generation,
  loadDialogOpen,
  closeLoadGrid,
  onLoadGrid,
  onDeleteGrid,
  grids,
  loadingGrids,
  setUseHashlife,
  setHashlifeMaxRun,
  setHashlifeCacheSize,
  clearHashlifeCache
}) {
  return (
    <>
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
          setUseHashlife={setUseHashlife}
          setHashlifeMaxRun={setHashlifeMaxRun}
          setHashlifeCacheSize={setHashlifeCacheSize}
          clearHashlifeCache={clearHashlifeCache}
          randomRectPercent={randomRectPercent}
          setRandomRectPercent={setRandomRectPercent}
          enableAdaCompliance={enableAdaCompliance}
          setEnableAdaCompliance={setEnableAdaCompliance}
          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
      )}

      <HelpDialog open={helpOpen} onClose={closeHelp} />
      <AboutDialog open={aboutOpen} onClose={closeAbout} />

      <SaveGridDialog
        open={saveDialogOpen}
        onClose={closeSaveGrid}
        onSave={onSaveGrid}
        loading={gridLoading}
        error={gridError}
        liveCellsCount={liveCellsCount}
        generation={generation}
      />

      <LoadGridDialog
        open={loadDialogOpen}
        onClose={closeLoadGrid}
        onLoad={onLoadGrid}
        onDelete={onDeleteGrid}
        grids={grids}
        loading={gridLoading}
        error={gridError}
        loadingGrids={loadingGrids}
      />
    </>
  );
}
ControlsDialogs.propTypes = {
  optionsOpen: PropTypes.bool.isRequired,
  handleOk: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
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
  randomRectPercent: PropTypes.number,
  setRandomRectPercent: PropTypes.func,
  enableAdaCompliance: PropTypes.bool,
  setEnableAdaCompliance: PropTypes.func,
  helpOpen: PropTypes.bool.isRequired,
  closeHelp: PropTypes.func.isRequired,
  aboutOpen: PropTypes.bool.isRequired,
  closeAbout: PropTypes.func.isRequired,
  saveDialogOpen: PropTypes.bool.isRequired,
  closeSaveGrid: PropTypes.func.isRequired,
  onSaveGrid: PropTypes.func.isRequired,
  gridLoading: PropTypes.bool,
  gridError: PropTypes.any,
  liveCellsCount: PropTypes.number.isRequired,
  generation: PropTypes.number.isRequired,
  loadDialogOpen: PropTypes.bool.isRequired,
  closeLoadGrid: PropTypes.func.isRequired,
  onLoadGrid: PropTypes.func.isRequired,
  onDeleteGrid: PropTypes.func.isRequired,
  grids: PropTypes.array,
  loadingGrids: PropTypes.bool
};

// Minimal, correct ControlsBar composed of smaller pieces
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
  generation,
  // Grid management props
  onLoadGrid,
  // Viewport helpers
  onCenterViewport,
  // Options-related props (must be forwarded to OptionsPanel)
  colorSchemes,
  colorSchemeKey,
  setColorSchemeKey,
  randomRectPercent,
  setRandomRectPercent,
  popWindowSize,
  setPopWindowSize,
  popTolerance,
  setPopTolerance,
  // Performance props
  showSpeedGauge,
  setShowSpeedGauge,
  maxFPS,
  setMaxFPS,
  maxGPS,
  setMaxGPS,
  // ADA compliance props
  enableAdaCompliance,
  setEnableAdaCompliance,

  // Optional model to drive ToolStatus observer
  model
  ,
  // Engine control callbacks (forwarded to RunControlGroup)
  onStartNormalMode,
  onStopAllEngines,
  onStartHashlifeMode,
  onSetEngineMode,
  useHashlife,
  generationBatchSize,
  onSetGenerationBatchSize
}) => {
  // Options dialog open state
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // paletteOpen is now controlled by parent (GameOfLife)
  const [wasRunningBeforeOptions, setWasRunningBeforeOptions] = useState(false);

  // Grid file management
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
  } = useGridFileManager({
    getLiveCells,
    generation
  });

  const handleOpenSave = () => {
    if (!sessionStorage.getItem('authToken')) {
      window.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to save.' } }));
    } else {
      openSaveDialog();
    }
  };

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

  const openHelp = () => setHelpOpen(true);
  const closeHelp = () => setHelpOpen(false);
  const openAbout = () => setAboutOpen(true);
  const closeAbout = () => setAboutOpen(false);

  // Grid management handlers
  const handleSaveGrid = async (name, description) => {
    const liveCells = getLiveCells();
    await saveGrid(name, description, liveCells, generation);
  };

  const handleLoadGrid = async (gridId) => {
    const grid = await loadGrid(gridId);
    if (grid && onLoadGrid) {
      onLoadGrid(grid.liveCells);
    }
  };


  // Remove unused variable warning for openSaveGrid
  // (openSaveGrid is not used, so we simply do not declare it if not needed)

  const openLoadGrid = () => {
    openLoadDialog();
  };


  return (
    <div className="controls">
      <Stack direction="row" spacing={CONTROL_SPACING} alignItems="center">
        {/* Order: Save/Load (far left) -> Start/Stop/Clear -> Tool toggles -> Aux */}
  <SaveLoadGroup openSaveGrid={handleOpenSave} openLoadGrid={openLoadGrid} />

        <RunControlGroup
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          step={step}
          draw={draw}
          clear={clear}
          snapshotsRef={snapshotsRef}
          setSteadyInfo={setSteadyInfo}
          onStartNormalMode={onStartNormalMode}
          onStartHashlifeMode={onStartHashlifeMode}
          onStopAllEngines={onStopAllEngines}
          onSetEngineMode={onSetEngineMode}
          useHashlife={useHashlife}
          generationBatchSize={generationBatchSize}
          onSetGenerationBatchSize={onSetGenerationBatchSize}

        />

        {/* Tool toggles: put them back here, with Shapes first */}
        <ToolGroup
          selectedTool={selectedTool}
          setSelectedTool={(tool) => {
            try { setSelectedTool(tool); } catch {}
            if (tool === 'shapes') {
              try { openPalette?.(); } catch {}
            }
          }}
          isSmall={false}
        />

        <AuxButtons
          setShowChart={setShowChart}
          openHelp={openHelp}
          openAbout={openAbout}
          openOptions={openOptions}
          onCenterViewport={onCenterViewport}
        />

        <ToolStatus
          steadyInfo={steadyInfo}
          toolStateRef={toolStateRef}
          cursorCell={cursorCell}
          selectedTool={selectedTool}
          selectedShape={selectedShape}
          model={model}
        />
      </Stack>

      <ControlsDialogs
        optionsOpen={optionsOpen}
        handleOk={handleOk}
        handleCancel={handleCancel}
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
        randomRectPercent={randomRectPercent}
        setRandomRectPercent={setRandomRectPercent}
        enableAdaCompliance={enableAdaCompliance}
        setEnableAdaCompliance={setEnableAdaCompliance}
        helpOpen={helpOpen}
        closeHelp={closeHelp}
        aboutOpen={aboutOpen}
        closeAbout={closeAbout}
        saveDialogOpen={saveDialogOpen}
        closeSaveGrid={closeSaveDialog}
        onSaveGrid={handleSaveGrid}
        gridLoading={gridLoading}
        gridError={gridError}
        liveCellsCount={getLiveCells().size}
        generation={generation}
        loadDialogOpen={loadDialogOpen}
        closeLoadGrid={closeLoadDialog}
        onLoadGrid={handleLoadGrid}
        onDeleteGrid={deleteGrid}
        grids={grids}
        loadingGrids={loadingGrids}

      />
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
  generation: PropTypes.number.isRequired,
  onLoadGrid: PropTypes.func.isRequired,
  onCenterViewport: PropTypes.func,
  colorSchemes: PropTypes.object.isRequired,
  colorSchemeKey: PropTypes.string.isRequired,
  setColorSchemeKey: PropTypes.func.isRequired,
  randomRectPercent: PropTypes.number,
  setRandomRectPercent: PropTypes.func,
  // Performance props
  showSpeedGauge: PropTypes.bool,
  setShowSpeedGauge: PropTypes.func,
  maxFPS: PropTypes.number,
  setMaxFPS: PropTypes.func,
  maxGPS: PropTypes.number,
  setMaxGPS: PropTypes.func,
  // ADA compliance props
  enableAdaCompliance: PropTypes.bool,
  setEnableAdaCompliance: PropTypes.func,
  // Engine control callbacks
  onStartNormalMode: PropTypes.func,
  onStartHashlifeMode: PropTypes.func,
  onStopAllEngines: PropTypes.func,
  onSetEngineMode: PropTypes.func,
  useHashlife: PropTypes.bool,
  generationBatchSize: PropTypes.number,
  onSetGenerationBatchSize: PropTypes.func,
  popWindowSize: PropTypes.number.isRequired,
  setPopWindowSize: PropTypes.func.isRequired,
  popTolerance: PropTypes.number.isRequired,
  setPopTolerance: PropTypes.func.isRequired,

  // Optional model for tool state observation
  model: PropTypes.object
};

export default ControlsBar;

