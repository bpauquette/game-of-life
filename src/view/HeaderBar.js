  const [backendType, setBackendType] = React.useState(() => {
    try {
      const stored = globalThis.localStorage.getItem('backendType');
      if (stored === 'java' || stored === 'node') return stored;
    } catch {}
    return 'node';
  });
import React, { useState, useCallback, useEffect } from 'react';
import { FRONTEND_VERSION, FRONTEND_TIMESTAMP } from '../version';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { BarChart as BarChartIcon, Help as HelpIcon, Info as InfoIcon, Settings as SettingsIcon, CloudDownload as ImportIcon, Language as LanguageIcon, VolunteerActivism as DonateIcon } from '@mui/icons-material';
import CodeIcon from '@mui/icons-material/Code';
import BugReportIcon from '@mui/icons-material/BugReport';
import { PsychologyAlt as UserIcon, LockPerson as UserLoggedInIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthProvider';
import Login from '../auth/Login';
import Register from '../auth/Register';
import SaveLoadGroup from './components/SaveLoadGroup';
import RunControlGroup from './components/RunControlGroup';
import ToolGroup from './components/ToolGroup';
import RecentShapesStrip from './RecentShapesStrip';
import ScriptPanel from './ScriptPanel';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { FullscreenExit as FullscreenExitIcon } from '@mui/icons-material';
import TOOL_DESCRIPTIONS from './components/toolDescriptions';
import OptionsPanel from './OptionsPanel';
import HelpDialog from './HelpDialog';
import AboutDialog from './AboutDialog';
import PrivacyPolicyDialog from './PrivacyPolicyDialog';
import AccountManagementDialog from './AccountManagementDialog';
import SaveGridDialog from './SaveGridDialog';
import LoadGridDialog from './LoadGridDialog';
import useGridFileManager from './hooks/useGridFileManager';
import PaymentDialog from './PaymentDialog';
import PhotosensitivityTestDialog from './PhotosensitivityTestDialog';

// Tool toggles extracted into ToolGroup component

function AuxActions({ onOpenChart, onOpenHelp, onOpenAbout, onOpenOptions, onOpenUser, onOpenImport, onOpenDonate, onOpenPhotoTest, loggedIn, photosensitivityTesterEnabled, enableAdaCompliance }) {
  const openLifeWiki = () => {
    window.open('https://conwaylife.com/wiki/Main_Page', '_blank');
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title="Script Playground">
        <IconButton color="inherit" size="small" onClick={() => window.dispatchEvent(new CustomEvent('openScriptPanel'))} aria-label="script-playground"><CodeIcon fontSize="small" /></IconButton>
      </Tooltip>
      {photosensitivityTesterEnabled && enableAdaCompliance && (
        <Tooltip title="Photosensitivity Test">
          <IconButton color="inherit" size="small" onClick={onOpenPhotoTest} aria-label="photosensitivity-test"><BugReportIcon fontSize="small" /></IconButton>
        </Tooltip>
      )}
      <IconButton color="inherit" size="small" onClick={onOpenChart} aria-label="chart" data-testid="toggle-chart"><BarChartIcon fontSize="small" /></IconButton>
      <IconButton color="inherit" size="small" onClick={onOpenImport} aria-label="import"><Tooltip title="Import Shape"><ImportIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton color="inherit" size="small" onClick={openLifeWiki} aria-label="lifewiki"><Tooltip title="LifeWiki"><LanguageIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton color="inherit" size="small" onClick={onOpenDonate} aria-label="donate"><Tooltip title="Donate"><DonateIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton color="inherit" size="small" onClick={onOpenHelp} aria-label="help"><Tooltip title="Help"><HelpIcon fontSize="small" /></Tooltip></IconButton>
      <Tooltip title={`Version: v${FRONTEND_VERSION}\nBuild: ${FRONTEND_TIMESTAMP}`.replace(/\n/g, '\u000A')} placement="bottom">
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
          photosensitivityTesterEnabled={photosensitivityTesterEnabled}
          setPhotosensitivityTesterEnabled={setPhotosensitivityTesterEnabled}
          backendType={backendType}
          setBackendType={setBackendType}
          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
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
  enableAdaCompliance,
  setEnableAdaCompliance,
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
  // accessibility
  id,
  tabIndex,
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
  const { token, email, hasDonated, logout } = useAuth();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const handleUserIconClick = () => setUserDialogOpen(true);
  const handleLogout = () => { logout(); setUserDialogOpen(false); };
  // dialogs 
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [accountManagementOpen, setAccountManagementOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [photoTestOpen, setPhotoTestOpen] = useState(false);
  const [photosensitivityTesterEnabled, setPhotosensitivityTesterEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('photosensitivityTesterEnabled');
      if (stored === 'true' || stored === 'false') return stored === 'true';
    } catch {}
    return false; // default off per request
  });
  const [wasRunningBeforeOptions, setWasRunningBeforeOptions] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);

  // Listen for login required event
  useEffect(() => {
    const handleNeedLogin = () => {
      setUserDialogOpen(true);
      setShowRegister(false);
    };
    window.addEventListener('auth:needLogin', handleNeedLogin);
    return () => window.removeEventListener('auth:needLogin', handleNeedLogin);
  }, []);

  // Listen for script panel open event
  useEffect(() => {
    const handleOpenScriptPanel = () => {
      // Gate script panel: require login and donation
      if (!sessionStorage.getItem('authToken')) {
        window.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to use the script playground.' } }));
        return;
      }
      if (!hasDonated) {
        setDonateOpen(true);
        return;
      }
      setScriptOpen(true);
    };
    window.addEventListener('openScriptPanel', handleOpenScriptPanel);
    return () => window.removeEventListener('openScriptPanel', handleOpenScriptPanel);
  }, [hasDonated]);
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

  useEffect(() => {
    try { localStorage.setItem('photosensitivityTesterEnabled', photosensitivityTesterEnabled ? 'true' : 'false'); } catch {}
    if (!photosensitivityTesterEnabled) {
      setPhotoTestOpen(false);
    }
  }, [photosensitivityTesterEnabled]);

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
    // Gate save: require login and donation
    if (!sessionStorage.getItem('authToken')) {
      window.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to save.' } }));
      return;
    }
    if (!hasDonated) {
      setDonateOpen(true);
      return;
    }
    if (isRunning) setIsRunning(false);
    openSaveDialog();
  }, [isRunning, setIsRunning, openSaveDialog, hasDonated]);

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
      <Box
        ref={headerRef}
        id={id}
        tabIndex={tabIndex}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          width: '100%',
          backgroundColor: 'var(--header-surface)',
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-strong)',
          overflowX: 'hidden',
          backdropFilter: 'blur(6px)'
        }}
      >
        {/* First row: Save/Load and Run controls */}
        <Box sx={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, gap: 0.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'inherit' }}>
            <SaveLoadGroup compact={isSmall} openSaveGrid={openSaveDialogAndPause} openLoadGrid={openLoadDialogAndPause} />
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'inherit' }}>
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
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'inherit' }}>
            <AuxActions
              onOpenChart={() => setShowChart(true)}
              onOpenImport={onOpenImport}
              onOpenHelp={() => setHelpOpen(true)}
              onOpenAbout={() => setAboutOpen(true)}
              onOpenOptions={openOptions}
              onOpenDonate={() => setDonateOpen(true)}
              onOpenPhotoTest={() => photosensitivityTesterEnabled && setPhotoTestOpen(true)}
              onOpenUser={handleUserIconClick}
              loggedIn={!!token}
              photosensitivityTesterEnabled={photosensitivityTesterEnabled}
              enableAdaCompliance={enableAdaCompliance}
            />
            {/* Version info is now shown as a tooltip on the About icon */}
            {/* User authentication dialog/modal */}
            {userDialogOpen && (
              <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'var(--overlay-backdrop)' }}>
                <Box sx={{ maxWidth: 340, margin: '80px auto', background: 'var(--surface-1)', borderRadius: 2, p: 3, color: 'var(--text-primary)', boxShadow: 'var(--shadow-elevated)', border: '1px solid var(--border-strong)' }}>
                  {token ? (
                    <>
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserLoggedInIcon fontSize="large" />
                        <div>
                          <Typography variant="body2" color="text.secondary">Logged in as</Typography>
                          <Typography variant="body1" fontWeight="bold">{email}</Typography>
                        </div>
                      </div>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          color={hasDonated ? 'success' : 'default'}
                          label={hasDonated ? 'Donation: Verified' : 'Donation: Not donated'}
                          sx={{ fontWeight: 600 }}
                        />
                        {!hasDonated && (
                          <button
                            onClick={() => { setUserDialogOpen(false); setDonateOpen(true); }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--accent-primary)',
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            ❤️ Donate
                          </button>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <button
                          onClick={() => { setUserDialogOpen(false); onOpenMyShapes(); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface-2)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          📦 My Shapes
                        </button>
                        <button
                          onClick={() => { setUserDialogOpen(false); setAccountManagementOpen(true); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface-2)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ⚙️ Account & Privacy
                        </button>
                        <button
                          onClick={handleLogout}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid var(--accent-error)',
                            background: 'var(--accent-error)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            marginTop: '8px'
                          }}
                        >
                          🚪 Logout
                        </button>
                      </Box>
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
                  <button
                    onClick={() => setUserDialogOpen(false)}
                    style={{ marginTop: 16, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </Box>
              </Box>
            )}
          </Stack>
        </Box>
        {/* Second row: ToolGroup */}
        {showToolsRow && (
          <Box sx={{ position: 'relative', left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1, backgroundColor: 'var(--header-surface-muted)', borderBottom: '1px solid var(--border-subtle)', zIndex: 40, pointerEvents: 'auto', overflowX: 'hidden', backdropFilter: 'blur(4px)', color: 'inherit' }}>
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
                <IconButton size={isSmall ? 'small' : 'medium'} aria-label="hide-controls" onClick={onToggleChrome} sx={{ backgroundColor: 'var(--chip-bg)', color: 'inherit' }}>
                  <FullscreenExitIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
  {/* Third row: RecentShapesStrip (increased height to fit thumbnails + controls) */}
  <Box sx={{ position: 'relative', left: 0, right: 0, py: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1, backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)', zIndex: 41, pointerEvents: 'auto', overflowX: 'hidden', overflowY: 'hidden', mt: 0, color: 'inherit' }}>
          <RecentShapesStrip
            recentShapes={recentShapes}
            selectShape={selectShape}
            drawWithOverlay={drawWithOverlay}
            colorScheme={colorScheme}
            selectedShape={selectedShape}
            onRotateShape={onRotateShape}
            onSwitchToShapesTool={onSwitchToShapesTool}
            startPaletteDrag={startPaletteDrag}
            onSaveRecentShapes={() => {
              // Gate saving/capturing recent shapes: require login and donation
              if (!sessionStorage.getItem('authToken')) {
                window.dispatchEvent(new CustomEvent('auth:needLogin', { detail: { message: 'Please login to save shapes.' } }));
                return;
              }
              if (!hasDonated) {
                setDonateOpen(true);
                return;
              }
              onSaveRecentShapes && onSaveRecentShapes();
            }}
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
          photosensitivityTesterEnabled={photosensitivityTesterEnabled}
          setPhotosensitivityTesterEnabled={setPhotosensitivityTesterEnabled}

          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
      )}

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} onOpenPrivacy={() => setPrivacyOpen(true)} />
      <PrivacyPolicyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <AccountManagementDialog 
        open={accountManagementOpen} 
        onClose={() => setAccountManagementOpen(false)}
      />
      <PaymentDialog open={donateOpen} onClose={() => setDonateOpen(false)} />
      <PhotosensitivityTestDialog open={photoTestOpen} onClose={() => setPhotoTestOpen(false)} enableAdaCompliance={enableAdaCompliance} />

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
