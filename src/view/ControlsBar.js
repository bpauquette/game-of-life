import React, { useState } from 'react';
import PropTypes from 'prop-types';
import OptionsPanel from './OptionsPanel.js';
import ToolStatus from './ToolStatus.js';
import SaveGridDialog from './SaveGridDialog.js';
import LoadGridDialog from './LoadGridDialog.js';
import useGridFileManager from './hooks/useGridFileManager.js';
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
import HelpDialog from './HelpDialog.js';
import AboutDialog from './AboutDialog.js';
import PrivacyPolicyDialog from './PrivacyPolicyDialog.js';
import ReleaseNotesDialog from './ReleaseNotesDialog.js';
import RunControlGroup from './components/RunControlGroup.js';
import SaveLoadGroup from './components/SaveLoadGroup.js';
import ToolGroup from './components/ToolGroup.js';

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
  helpOpen,
  closeHelp,
  aboutOpen,
  closeAbout,
  openReleaseNotes,
  releaseNotesOpen,
  closeReleaseNotes,
  openPrivacyPolicy,
  privacyPolicyOpen,
  closePrivacyPolicy,
  saveDialogOpen,
  closeSaveGrid,
  onSaveGrid,
  gridLoading,
  gridError,
  liveCellsCount,
  generation,
  hasDonated,
  loadDialogOpen,
  closeLoadGrid,
  onLoadGrid,
  onDeleteGrid,
  grids,
  loadingGrids
}) {
  return (
    <>
      {optionsOpen && (
        <OptionsPanel
          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
      )}

      <HelpDialog open={helpOpen} onClose={closeHelp} />
      <AboutDialog
        open={aboutOpen}
        onClose={closeAbout}
        onOpenReleaseNotes={openReleaseNotes}
        onOpenPrivacy={openPrivacyPolicy}
      />
      <ReleaseNotesDialog open={releaseNotesOpen} onClose={closeReleaseNotes} />
      <PrivacyPolicyDialog open={privacyPolicyOpen} onClose={closePrivacyPolicy} />

      <SaveGridDialog
        open={saveDialogOpen}
        onClose={closeSaveGrid}
        onSave={onSaveGrid}
        loading={gridLoading}
        error={gridError}
        liveCellsCount={liveCellsCount}
        generation={generation}
        hasDonated={hasDonated}
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
  helpOpen: PropTypes.bool.isRequired,
  closeHelp: PropTypes.func.isRequired,
  aboutOpen: PropTypes.bool.isRequired,
  closeAbout: PropTypes.func.isRequired,
  openReleaseNotes: PropTypes.func.isRequired,
  releaseNotesOpen: PropTypes.bool.isRequired,
  closeReleaseNotes: PropTypes.func.isRequired,
  openPrivacyPolicy: PropTypes.func.isRequired,
  privacyPolicyOpen: PropTypes.bool.isRequired,
  closePrivacyPolicy: PropTypes.func.isRequired,
  saveDialogOpen: PropTypes.bool.isRequired,
  closeSaveGrid: PropTypes.func.isRequired,
  onSaveGrid: PropTypes.func.isRequired,
  gridLoading: PropTypes.bool,
  gridError: PropTypes.any,
  liveCellsCount: PropTypes.number.isRequired,
  generation: PropTypes.number.isRequired,
  hasDonated: PropTypes.bool,
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
  resetToGenerationZero,
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
  hasDonated = false,
  // Grid management props
  onLoadGrid,
  // Viewport helpers
  onCenterViewport,

  // Optional model to drive ToolStatus observer
  model,
  setUseHashlife,
  setHashlifeMaxRun,
  setHashlifeCacheSize,
  clearHashlifeCache,
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
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
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
    if (sessionStorage.getItem('authToken')) {
      openSaveDialog();
    } else {
      globalThis.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to save.' } }));
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
  const handleSaveGrid = async (name, description, isPublic) => {
    await saveGrid(name, description, isPublic);
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
          resetToGenerationZero={resetToGenerationZero}
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
            try { setSelectedTool(tool); } catch (e) { console.warn('Exception caught in setSelectedTool:', e); }
            if (tool === 'shapes') {
              try { openPalette?.(); } catch (e) { console.warn('Exception caught in openPalette:', e); }
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
        helpOpen={helpOpen}
        closeHelp={closeHelp}
        aboutOpen={aboutOpen}
        closeAbout={closeAbout}
        openReleaseNotes={() => setReleaseNotesOpen(true)}
        releaseNotesOpen={releaseNotesOpen}
        closeReleaseNotes={() => setReleaseNotesOpen(false)}
        openPrivacyPolicy={() => setPrivacyPolicyOpen(true)}
        privacyPolicyOpen={privacyPolicyOpen}
        closePrivacyPolicy={() => setPrivacyPolicyOpen(false)}
        saveDialogOpen={saveDialogOpen}
        closeSaveGrid={closeSaveDialog}
        onSaveGrid={handleSaveGrid}
        gridLoading={gridLoading}
        gridError={gridError}
        liveCellsCount={getLiveCells().size}
        generation={generation}
        hasDonated={hasDonated}
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
      setUseHashlife: PropTypes.func,
      setHashlifeMaxRun: PropTypes.func,
      setHashlifeCacheSize: PropTypes.func,
      clearHashlifeCache: PropTypes.func,
  selectedTool: PropTypes.string.isRequired,
  setSelectedTool: PropTypes.func.isRequired,
  isRunning: PropTypes.bool.isRequired,
  setIsRunning: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  resetToGenerationZero: PropTypes.func,
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
  hasDonated: PropTypes.bool,
  onLoadGrid: PropTypes.func.isRequired,
  onCenterViewport: PropTypes.func,
  // Engine control callbacks
  onStartNormalMode: PropTypes.func,
  onStartHashlifeMode: PropTypes.func,
  onStopAllEngines: PropTypes.func,
  onSetEngineMode: PropTypes.func,
  useHashlife: PropTypes.bool,
  generationBatchSize: PropTypes.number,
  onSetGenerationBatchSize: PropTypes.func,

  // Optional model for tool state observation
  model: PropTypes.object,
};

export default ControlsBar;

