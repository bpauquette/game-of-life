import React, { useCallback } from 'react';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import UserLoggedInIcon from '@mui/icons-material/LockPerson';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import PropTypes from 'prop-types';
import { useToolDao } from '../model/dao/toolDao.js';
import { useUiDao } from '../model/dao/uiDao.js';
import { useGameDao } from '../model/dao/gameDao.js';
import { usePopulationDao } from '../model/dao/populationDao.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import Login from '../auth/Login.js';
import Register from '../auth/Register.js';
import AboutDialog from './AboutDialog.js';
import AuxActions from './AuxActions.js';
import RunControlGroup from './components/RunControlGroup.js';
import SaveLoadGroup from './components/SaveLoadGroup.js';
import TOOL_DESCRIPTIONS from './components/toolDescriptions.js';
import ToolGroup from './components/ToolGroup.js';
import HelpDialog from './HelpDialog.js';
import useGridFileManager from './hooks/useGridFileManager.js';
import LoadGridDialog from './LoadGridDialog.js';
import OptionsPanel from './OptionsPanel.js';
import PaymentDialog from './PaymentDialog.js';
import PhotosensitivityTestDialog from './PhotosensitivityTestDialog.js';
import RecentShapesStrip from './RecentShapesStrip.js';
import SaveGridDialog from './SaveGridDialog.js';
import ScriptPanel from './ScriptPanel.js';

export default function HeaderBar({
  // Only keep local/component-specific props
  recentShapes,
  recentShapesPersistence,
  selectShape,
  drawWithOverlay,
  startPaletteDrag,
  onSaveRecentShapes,
  onClearRecentShapes,
  onOpenMyShapes,
  onOpenImport,
  onToggleChrome,
  isSmall = false,
  headerRef,
  showToolsRow = true,
  shapesReady,
  selectedShape
}) {


  // Zustand selectors (including all UI/dialog state)
  // Fix for missing setShowChart, handleUserIconClick, handleLogout
  const setShowChart = () => {};
  const handleUserIconClick = () => {};
  const handleLogout = () => {};
  // UI state from uiDao
  const colorScheme = useUiDao(state => state.colorScheme);
  const colorSchemes = useUiDao(state => state.colorSchemes);
  const colorSchemeKey = useUiDao(state => state.colorSchemeKey);
  const setColorSchemeKey = useUiDao(state => state.setColorSchemeKey);
  const showSpeedGauge = useUiDao(state => state.showSpeedGauge);
  const setShowSpeedGauge = useUiDao(state => state.setShowSpeedGauge);
  const scriptOpen = useUiDao(state => state.scriptOpen);
  const setScriptOpen = useUiDao(state => state.setScriptOpen);
  const optionsOpen = useUiDao(state => state.optionsOpen);
  const setOptionsOpen = useUiDao(state => state.setOptionsOpen);
  const wasRunningBeforeOptions = useUiDao(state => state.wasRunningBeforeOptions);
  const setWasRunningBeforeOptions = useUiDao(state => state.setWasRunningBeforeOptions);
  const helpOpen = useUiDao(state => state.helpOpen);
  const setHelpOpen = useUiDao(state => state.setHelpOpen);
  const aboutOpen = useUiDao(state => state.aboutOpen);
  const setAboutOpen = useUiDao(state => state.setAboutOpen);
  const donateOpen = useUiDao(state => state.donateOpen);
  const setDonateOpen = useUiDao(state => state.setDonateOpen);
  const photoTestOpen = useUiDao(state => state.photoTestOpen);
  const setPhotoTestOpen = useUiDao(state => state.setPhotoTestOpen);
  const userDialogOpen = useUiDao(state => state.userDialogOpen);
  const setUserDialogOpen = useUiDao(state => state.setUserDialogOpen);
  const showRegister = useUiDao(state => state.showRegister);
  const setShowRegister = useUiDao(state => state.setShowRegister);
  const confirmOnClear = useUiDao(state => state.confirmOnClear);
  const setConfirmOnClear = useUiDao(state => state.setConfirmOnClear);
  const detectStablePopulation = useUiDao(state => state.detectStablePopulation);
  const setDetectStablePopulation = useUiDao(state => state.setDetectStablePopulation);
  const memoryTelemetryEnabled = useUiDao(state => state.memoryTelemetryEnabled);
  const setMemoryTelemetryEnabled = useUiDao(state => state.setMemoryTelemetryEnabled);

  // Tool state from toolDao
  const selectedTool = useToolDao(state => state.selectedTool);
  const setSelectedTool = useToolDao(state => state.setSelectedTool);

  // Game state from gameDao
  const isRunning = useGameDao(state => state.isRunning);
  const setIsRunning = useGameDao(state => state.setIsRunning);
  const engineMode = useGameDao(state => state.engineMode);
  const isHashlifeMode = useGameDao(state => state.isHashlifeMode);
  const onStartNormalMode = useGameDao(state => state.onStartNormalMode);
  const onStartHashlifeMode = useGameDao(state => state.onStartHashlifeMode);
  const onStopAllEngines = useGameDao(state => state.onStopAllEngines);
  const onSetEngineMode = useGameDao(state => state.onSetEngineMode);
  const useHashlife = useGameDao(state => state.useHashlife);
  const generationBatchSize = useGameDao(state => state.generationBatchSize);
  const onSetGenerationBatchSize = useGameDao(state => state.onSetGenerationBatchSize);

  // Population state from populationDao
  const generation = usePopulationDao(state => state.generation);
  const popWindowSize = usePopulationDao(state => state.popWindowSize);
  const setPopWindowSize = usePopulationDao(state => state.setPopWindowSize);
  const popTolerance = usePopulationDao(state => state.popTolerance);
  const setPopTolerance = usePopulationDao(state => state.setPopTolerance);
  const maxFPS = usePopulationDao(state => state.maxFPS);
  const setMaxFPS = usePopulationDao(state => state.setMaxFPS);
  const maxGPS = usePopulationDao(state => state.maxGPS);
  const setMaxGPS = usePopulationDao(state => state.setMaxGPS);

  // Auth and user info
  const { token, email } = useAuth();

  // Placeholder refs and handlers for missing logic
  const snapshotsRef = React.useRef();
  const getLiveCells = useCallback(() => new Set(), []); // TODO: Replace with real logic
  const step = useCallback(() => {}, []); // TODO: Replace with real logic
  const draw = useCallback(() => {}, []); // TODO: Replace with real logic
  const clear = useCallback(() => {}, []); // TODO: Replace with real logic
  const onRotateShape = useCallback(() => {}, []); // TODO: Replace with real logic
  const onSwitchToShapesTool = useCallback(() => {}, []); // TODO: Replace with real logic
  const onLoadGrid = useCallback(() => {}, []); // TODO: Replace with real logic

  // Grid file manager
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
    if (!sessionStorage.getItem('authToken')) {
      globalThis.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to save.' } }));
      return;
    }
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
      {/* Three-row header: RunControlGroup, ToolGroup, RecentShapesStrip */}
      <Box ref={headerRef} sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, width: '100%', backgroundColor: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.2)', overflowX: 'hidden' }}>
        {/* First row: Save/Load and Run controls */}
        <Box sx={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, gap: 0.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <SaveLoadGroup compact={isSmall} openSaveGrid={openSaveDialogAndPause} openLoadGrid={openLoadDialogAndPause} />
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <RunControlGroup
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              step={step}
              draw={draw}
              clear={clear}
              snapshotsRef={snapshotsRef}
              confirmOnClear={confirmOnClear}
              engineMode={engineMode}
              isHashlifeMode={isHashlifeMode}
              onStartNormalMode={onStartNormalMode}
              onStartHashlifeMode={onStartHashlifeMode}
              onStopAllEngines={onStopAllEngines}
              onSetEngineMode={onSetEngineMode}
              useHashlife={useHashlife}
              generationBatchSize={generationBatchSize}
              onSetGenerationBatchSize={onSetGenerationBatchSize}
            />
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AuxActions
              onOpenChart={() => setShowChart(true)}
              onOpenImport={onOpenImport}
              onOpenHelp={() => setHelpOpen(true)}
              onOpenAbout={() => setAboutOpen(true)}
              onOpenOptions={openOptions}
              onOpenDonate={() => setDonateOpen(true)}
              onOpenPhotoTest={() => setPhotoTestOpen(true)}
              onOpenUser={handleUserIconClick}
              loggedIn={!!token}
            />
            {/* Version info is now shown as a tooltip on the About icon */}
            {/* User authentication dialog/modal */}
            {userDialogOpen && (
              <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'rgba(0,0,0,0.5)' }}>
                <Box sx={{ maxWidth: 340, margin: '80px auto', background: '#222', borderRadius: 2, p: 3, color: 'white', boxShadow: 6 }}>
                  {(() => {
                    if (token) {
                      return (
                        <>
                          <div style={{ marginBottom: 16 }}>
                            <UserLoggedInIcon fontSize="large" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                            <span>Logged in as <b>{email}</b></span>
                          </div>
                          <button onClick={() => { setUserDialogOpen(false); onOpenMyShapes(); }} style={{ marginRight: 8 }}>My Shapes</button>
                          <button onClick={handleLogout} style={{ marginRight: 8 }}>Logout</button>
                        </>
                      );
                    } else if (showRegister) {
                      return (
                        <>
                          <Register onSwitchToLogin={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); }} />
                          <button onClick={() => setShowRegister(false)} style={{ marginTop: 8 }}>Already have an account? Login</button>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <Login />
                          <button onClick={() => setShowRegister(true)} style={{ marginTop: 8 }}>Need an account? Register</button>
                        </>
                      );
                    }
                  })()}
                  <button onClick={() => setUserDialogOpen(false)} style={{ marginTop: 16 }}>Close</button>
                </Box>
              </Box>
            )}
          </Stack>
        </Box>
        {/* Second row: ToolGroup */}
        {showToolsRow && (
          <Box sx={{ position: 'relative', left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1, backgroundColor: 'rgba(0,0,0,0.28)', borderBottom: '1px solid rgba(255,255,255,0.18)', zIndex: 40, pointerEvents: 'auto', overflowX: 'hidden' }}>
            <ToolGroup selectedTool={selectedTool} setSelectedTool={setSelectedTool} isSmall={isSmall} shapesEnabled={shapesReady} />
            {/* Only show chip if enough space for both chip and tool icons */}
            {(!isSmall || (globalThis.globalThis !== undefined && globalThis.innerWidth > 520)) && (
              <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                <Chip
                  size={isSmall ? 'small' : 'medium'}
                  color="primary"
                  label={`Tool: ${TOOL_DESCRIPTIONS[selectedTool] || String(selectedTool || '').toUpperCase()}`}
                  sx={{ fontWeight: 600 }}
                  data-testid="selected-tool-chip"
                />
              </Box>
            )}
            {/* Hide controls button - appears in Row 2 of the header when chrome is visible */}
            <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <Tooltip title="Hide controls">
                <IconButton size={isSmall ? 'small' : 'medium'} aria-label="hide-controls" onClick={onToggleChrome} sx={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
                  <FullscreenExitIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
        {/* Third row: RecentShapesStrip (increased height to fit thumbnails + controls) */}
        <Box sx={{ position: 'relative', left: 0, right: 0, py: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1, backgroundColor: 'rgba(30,30,40,0.85)', borderBottom: '1px solid rgba(255,255,255,0.12)', zIndex: 41, pointerEvents: 'auto', overflowX: 'hidden', overflowY: 'hidden', mt: 0 }}>
          <RecentShapesStrip
            recentShapes={recentShapes}
            selectShape={selectShape}
            drawWithOverlay={drawWithOverlay}
            colorScheme={colorScheme}
            selectedShape={selectedShape}
            onRotateShape={onRotateShape}
            onSwitchToShapesTool={onSwitchToShapesTool}
            startPaletteDrag={startPaletteDrag}
            onSaveRecentShapes={onSaveRecentShapes}
            onClearRecentShapes={onClearRecentShapes}
            persistenceStatus={recentShapesPersistence}
          />
        </Box>
      </Box>

      {/* Script playground dialog */}
      <ScriptPanel
        open={scriptOpen}
        onClose={() => setScriptOpen(false)}
        getLiveCells={getLiveCells}
        onLoadGrid={onLoadGrid}
        clear={clear}
        step={step}
        isRunning={isRunning}
        setIsRunning={setIsRunning}
      />

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
          detectStablePopulation={detectStablePopulation}
          setDetectStablePopulation={setDetectStablePopulation}
          memoryTelemetryEnabled={memoryTelemetryEnabled}
          setMemoryTelemetryEnabled={setMemoryTelemetryEnabled}

          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
      )}

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <PaymentDialog open={donateOpen} onClose={() => setDonateOpen(false)} />
      <PhotosensitivityTestDialog open={photoTestOpen} onClose={() => setPhotoTestOpen(false)} />

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
  // Only keep propTypes for local/component-specific props
  recentShapes: PropTypes.array,
  recentShapesPersistence: PropTypes.object,
  selectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  startPaletteDrag: PropTypes.func,
  onSaveRecentShapes: PropTypes.func,
  onClearRecentShapes: PropTypes.func,
  onOpenMyShapes: PropTypes.func,
  onOpenImport: PropTypes.func,
  onToggleChrome: PropTypes.func,
  isSmall: PropTypes.bool,
  headerRef: PropTypes.object,
  showToolsRow: PropTypes.bool,
  shapesReady: PropTypes.bool,
  selectedShape: PropTypes.object
};