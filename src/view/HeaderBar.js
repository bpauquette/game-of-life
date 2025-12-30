import React, { useState, useCallback, useEffect } from 'react';
import { FRONTEND_VERSION, FRONTEND_TIMESTAMP } from '../version';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { BarChart as BarChartIcon, Help as HelpIcon, Info as InfoIcon, Settings as SettingsIcon, CloudDownload as ImportIcon, Language as LanguageIcon, VolunteerActivism as DonateIcon } from '@mui/icons-material';
import { PsychologyAlt as UserIcon, LockPerson as UserLoggedInIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthProvider';
import Login from '../auth/Login';
import Register from '../auth/Register';
import SaveLoadGroup from './components/SaveLoadGroup';
import RunControlGroup from './components/RunControlGroup';
import ToolGroup from './components/ToolGroup';
import RecentShapesStrip from './RecentShapesStrip';
import Chip from '@mui/material/Chip';
import { FullscreenExit as FullscreenExitIcon } from '@mui/icons-material';
import TOOL_DESCRIPTIONS from './components/toolDescriptions';
import OptionsPanel from './OptionsPanel';
import HelpDialog from './HelpDialog';
import AboutDialog from './AboutDialog';
import SaveGridDialog from './SaveGridDialog';
import LoadGridDialog from './LoadGridDialog';
import useGridFileManager from './hooks/useGridFileManager';
import PaymentDialog from './PaymentDialog';

// Tool toggles extracted into ToolGroup component

function AuxActions({ onOpenChart, onOpenHelp, onOpenAbout, onOpenOptions, onOpenUser, onOpenImport, onOpenDonate, loggedIn }) {
  const openLifeWiki = () => {
    window.open('https://conwaylife.com/wiki/Main_Page', '_blank');
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <IconButton size="small" onClick={onOpenChart} aria-label="chart" data-testid="toggle-chart"><BarChartIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={onOpenImport} aria-label="import"><Tooltip title="Import Shape"><ImportIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={openLifeWiki} aria-label="lifewiki"><Tooltip title="LifeWiki"><LanguageIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={onOpenDonate} aria-label="donate"><Tooltip title="Donate"><DonateIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={onOpenHelp} aria-label="help"><Tooltip title="Help"><HelpIcon fontSize="small" /></Tooltip></IconButton>
      <Tooltip title={`Version: v${FRONTEND_VERSION}\nBuild: ${FRONTEND_TIMESTAMP}`.replace(/\n/g, '\u000A')} placement="bottom">
        <span>
          <IconButton size="small" onClick={onOpenAbout} aria-label="about"><InfoIcon fontSize="small" /></IconButton>
        </span>
      </Tooltip>
      <IconButton size="small" onClick={onOpenOptions} aria-label="options" data-testid="options-icon-button"><SettingsIcon fontSize="small" /></IconButton>
      {/* User profile icon to the right of settings */}
      <IconButton size="small" onClick={onOpenUser} aria-label="user-profile" data-testid="user-profile-icon">
        {loggedIn ? <UserLoggedInIcon fontSize="small" /> : <UserIcon fontSize="small" />}
      </IconButton>
    </Stack>
  );
}
AuxActions.propTypes = {
  onOpenChart: PropTypes.func.isRequired,
  onOpenImport: PropTypes.func.isRequired,
  onOpenHelp: PropTypes.func.isRequired,
  onOpenAbout: PropTypes.func.isRequired,
  onOpenOptions: PropTypes.func.isRequired,
  onOpenDonate: PropTypes.func
};

export default function HeaderBar({
  recentShapes,
  recentShapesPersistence,
  selectShape,
  drawWithOverlay,
  colorScheme,
  selectedShape,
  onRotateShape,
  onSwitchToShapesTool,
  startPaletteDrag,
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
  onToggleChrome,
  isSidebarOpen,
  isSmall,
  headerRef,
  shapesReady = false,
  // tools row
  selectedTool,
  setSelectedTool,
  showToolsRow = true,
  detectStablePopulation = false,
  setDetectStablePopulation,
  memoryTelemetryEnabled = false,
  setMemoryTelemetryEnabled,
  // Hashlife controls

  // Engine mode props
  engineMode,
  isHashlifeMode,
  onStartNormalMode,
  onStartHashlifeMode,
  onStopAllEngines,
  onSetEngineMode,
  useHashlife,
  // Hashlife batch size
  generationBatchSize,
  onSetGenerationBatchSize,
  onSaveRecentShapes,
  onClearRecentShapes,
  onOpenMyShapes,
  onOpenImport,
}) {
   // Auth state and handlers
  const { token, email, logout } = useAuth();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const handleUserIconClick = () => setUserDialogOpen(true);
  const handleLogout = () => { logout(); setUserDialogOpen(false); };
  // dialogs 
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [wasRunningBeforeOptions, setWasRunningBeforeOptions] = useState(false);

  // Listen for login required event
  useEffect(() => {
    const handleNeedLogin = () => {
      setUserDialogOpen(true);
      setShowRegister(false);
    };
    window.addEventListener('auth:needLogin', handleNeedLogin);
    return () => window.removeEventListener('auth:needLogin', handleNeedLogin);
  }, []);
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
    if (!sessionStorage.getItem('authToken')) {
      window.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to save.' } }));
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
      <Box ref={headerRef} sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, width: '100vw', backgroundColor: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
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
              setSteadyInfo={setSteadyInfo}
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
              onOpenUser={handleUserIconClick}
              loggedIn={!!token}
            />
            {/* Version info is now shown as a tooltip on the About icon */}
            {/* User authentication dialog/modal */}
            {userDialogOpen && (
              <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'rgba(0,0,0,0.5)' }}>
                <Box sx={{ maxWidth: 340, margin: '80px auto', background: '#222', borderRadius: 2, p: 3, color: 'white', boxShadow: 6 }}>
                  {token ? (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <UserLoggedInIcon fontSize="large" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        <span>Logged in as <b>{email}</b></span>
                      </div>
                      <button onClick={() => { setUserDialogOpen(false); onOpenMyShapes(); }} style={{ marginRight: 8 }}>My Shapes</button>
                      <button onClick={handleLogout} style={{ marginRight: 8 }}>Logout</button>
                    </>
                  ) : showRegister ? (
                    <>
                      <Register onSwitchToLogin={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); }} />
                      <button onClick={() => setShowRegister(false)} style={{ marginTop: 8 }}>Already have an account? Login</button>
                    </>
                  ) : (
                    <>
                      <Login />
                      <button onClick={() => setShowRegister(true)} style={{ marginTop: 8 }}>Need an account? Register</button>
                    </>
                  )}
                  <button onClick={() => setUserDialogOpen(false)} style={{ marginTop: 16 }}>Close</button>
                </Box>
              </Box>
            )}
          </Stack>
        </Box>
        {/* Second row: ToolGroup */}
        {showToolsRow && (
          <Box sx={{ position: 'relative', left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1, backgroundColor: 'rgba(0,0,0,0.28)', borderBottom: '1px solid rgba(255,255,255,0.18)', zIndex: 40, pointerEvents: 'auto', overflowX: 'auto' }}>
            <ToolGroup selectedTool={selectedTool} setSelectedTool={setSelectedTool} isSmall={isSmall} shapesEnabled={shapesReady} />
            {/* Only show chip if enough space for both chip and tool icons */}
            {(!isSmall || (globalThis.window !== undefined && window.innerWidth > 520)) && (
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
  <Box sx={{ position: 'relative', left: 0, right: 0, py: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1, backgroundColor: 'rgba(30,30,40,0.85)', borderBottom: '1px solid rgba(255,255,255,0.12)', zIndex: 41, pointerEvents: 'auto', overflowX: 'auto', overflowY: 'hidden', mt: 0 }}>
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
  recentShapes: PropTypes.array,
  recentShapesPersistence: PropTypes.object,
  selectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func,
  startPaletteDrag: PropTypes.func,
  onToggleChrome: PropTypes.func,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  selectedTool: PropTypes.string,
  setSelectedTool: PropTypes.func,
  shapesReady: PropTypes.bool,
  showToolsRow: PropTypes.bool,
  detectStablePopulation: PropTypes.bool,
  setDetectStablePopulation: PropTypes.func,
  memoryTelemetryEnabled: PropTypes.bool,
  setMemoryTelemetryEnabled: PropTypes.func,

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
  isSmall: PropTypes.bool,
  onSaveRecentShapes: PropTypes.func,
  onClearRecentShapes: PropTypes.func,
  onOpenMyShapes: PropTypes.func.isRequired,
  onOpenImport: PropTypes.func.isRequired,
  // Engine mode props
  engineMode: PropTypes.oneOf(['normal', 'hashlife']),
  isHashlifeMode: PropTypes.bool,
  onStartNormalMode: PropTypes.func,
  onStartHashlifeMode: PropTypes.func,
  onStopAllEngines: PropTypes.func,
  onSetEngineMode: PropTypes.func,
  useHashlife: PropTypes.bool,
  // Hashlife batch size
  generationBatchSize: PropTypes.number,
  onSetGenerationBatchSize: PropTypes.func,
};
