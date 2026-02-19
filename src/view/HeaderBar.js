import useGlobalShortcuts from './hooks/useGlobalShortcuts.js';
import React, { useCallback, useEffect, useState } from 'react';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import UserLoggedInIcon from '@mui/icons-material/LockPerson';
import Box from '@mui/material/Box';
// import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import PropTypes from 'prop-types';
import { useUiDao } from '../model/dao/uiDao.js';
import { useGameDao } from '../model/dao/gameDao.js';
import { usePopulationDao } from '../model/dao/populationDao.js';
import { useToolDao } from '../model/dao/toolDao.js';
import { useAuth } from '../auth/AuthProvider.js';
import Login from '../auth/Login.jsx';
import Register from '../auth/Register.jsx';
import AboutDialog from './AboutDialog.js';
import AuxActions from './AuxActions.js';
import RunControlGroup from './components/RunControlGroup.js';
import SaveLoadGroup from './components/SaveLoadGroup.js';
// import TOOL_DESCRIPTIONS from './components/toolDescriptions.js';
import ToolGroup from './components/ToolGroup.js';
import HelpDialog from './HelpDialog.js';
import useGridFileManager from './hooks/useGridFileManager.js';
import LoadGridDialog from './LoadGridDialog.js';
import OptionsPanel from './OptionsPanel.js';
import PaymentDialog from './PaymentDialog.js';
import PhotosensitivityTestDialog from './PhotosensitivityTestDialog.js';
import RecentShapesStrip from './RecentShapesStrip.js';
import { getBackendApiBase, getBackendHealthDetails } from '../utils/backendApi.js';
import AssistantDialog from './AssistantDialog.js';
// import { useGameContext } from '../context/GameContext.js';
import SaveGridDialog from './SaveGridDialog.js';
import ScriptPanel from './ScriptPanel.js';

export default function HeaderBar({
  // Only keep local/component-specific props
  recentShapes,
  recentShapesPersistence,
  selectShape,
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
  selectedShape,
  step,
  draw,
  clear,
  snapshotsRef,
  setSteadyInfo,
  isRunning: isRunningProp,
  setIsRunning: setIsRunningProp,
  engineMode: engineModeProp,
  isHashlifeMode: isHashlifeModeProp,
  onStartNormalMode: onStartNormalModeProp,
  onStartHashlifeMode: onStartHashlifeModeProp,
  onStopAllEngines: onStopAllEnginesProp,
  onSetEngineMode: onSetEngineModeProp,
  useHashlife: useHashlifeProp,
  generationBatchSize: generationBatchSizeProp,
  onSetGenerationBatchSize: onSetGenerationBatchSizeProp
}) {

  useGlobalShortcuts();
  // const { drawWithOverlay } = useGameContext();

  // Zustand selectors (including all UI/dialog state)

  // Auth and user info (must come before callbacks that depend on logout)
  const { token, email, logout } = useAuth();

  // UI state from uiDao (helpOpen and setHelpOpen must come first for hook order)
  const helpOpen = useUiDao(state => state.helpOpen);
  const setHelpOpen = useUiDao(state => state.setHelpOpen);

  // Memoized handler for HelpDialog onClose
  const handleHelpClose = useCallback(() => setHelpOpen(false), [setHelpOpen]);

  // UI actions (wired via DAO)
  const setShowChart = useUiDao(state => state.setShowChart);
  const [assistantAvailable, setAssistantAvailable] = useState(false);

  // UI state from uiDao
  const colorScheme = useUiDao(state => state.colorScheme);
  const scriptOpen = useUiDao(state => state.scriptOpen);
  const setScriptOpen = useUiDao(state => state.setScriptOpen);
  const assistantOpen = useUiDao(state => state.assistantOpen);
  const setAssistantOpen = useUiDao(state => state.setAssistantOpen);
  const optionsOpen = useUiDao(state => state.optionsOpen);
  const setOptionsOpen = useUiDao(state => state.setOptionsOpen);
  const wasRunningBeforeOptions = useUiDao(state => state.wasRunningBeforeOptions);
  const setWasRunningBeforeOptions = useUiDao(state => state.setWasRunningBeforeOptions);
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
  const enableAdaCompliance = useUiDao(state => state.enableAdaCompliance);

  useEffect(() => {
    let active = true;

    (async () => {
      const health = await getBackendHealthDetails();
      if (!active) return;
      const available = health.ok && health.aiConfigured;
      setAssistantAvailable(available);
      if (!available) {
        setAssistantOpen(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [setAssistantOpen]);

  const handleUserIconClick = useCallback(() => {
    try { setShowRegister(false); } catch (e) { console.error('[HeaderBar] failed to reset register flag', e); }
    setUserDialogOpen(true);
  }, [setShowRegister, setUserDialogOpen]);
  const handleLogout = useCallback(() => {
    try {
      logout?.();
      setUserDialogOpen(false);
    } catch (e) {
      console.error('[HeaderBar] logout failed', e);
    }
  }, [logout, setUserDialogOpen]);

  // Tool state from toolDao
  // Tool selection is now handled via context in ToolGroup

  // Game state from gameDao
  const storeIsRunning = useGameDao(state => state.isRunning);
  const storeSetIsRunning = useGameDao(state => state.setIsRunning);
  const isRunning = typeof isRunningProp === 'boolean' ? isRunningProp : storeIsRunning;
  const setIsRunning = typeof setIsRunningProp === 'function' ? setIsRunningProp : storeSetIsRunning;
  const storeEngineMode = useGameDao(state => state.engineMode);
  const storeIsHashlifeMode = useGameDao(state => state.isHashlifeMode);
  const storeOnStartNormalMode = useGameDao(state => state.onStartNormalMode);
  const storeOnStartHashlifeMode = useGameDao(state => state.onStartHashlifeMode);
  const storeOnStopAllEngines = useGameDao(state => state.onStopAllEngines);
  const storeOnSetEngineMode = useGameDao(state => state.onSetEngineMode);
  const storeUseHashlife = useGameDao(state => state.useHashlife);
  const storeGenerationBatchSize = useGameDao(state => state.generationBatchSize);
  const storeOnSetGenerationBatchSize = useGameDao(state => state.onSetGenerationBatchSize);

  const engineMode = engineModeProp ?? storeEngineMode;
  const isHashlifeMode = typeof isHashlifeModeProp === 'boolean' ? isHashlifeModeProp : storeIsHashlifeMode;
  const onStartNormalMode = typeof onStartNormalModeProp === 'function' ? onStartNormalModeProp : storeOnStartNormalMode;
  const onStartHashlifeMode = typeof onStartHashlifeModeProp === 'function' ? onStartHashlifeModeProp : storeOnStartHashlifeMode;
  const onStopAllEngines = typeof onStopAllEnginesProp === 'function' ? onStopAllEnginesProp : storeOnStopAllEngines;
  const onSetEngineMode = typeof onSetEngineModeProp === 'function' ? onSetEngineModeProp : storeOnSetEngineMode;
  const useHashlife = typeof useHashlifeProp === 'boolean' ? useHashlifeProp : storeUseHashlife;
  const generationBatchSize = typeof generationBatchSizeProp === 'number' ? generationBatchSizeProp : storeGenerationBatchSize;
  const onSetGenerationBatchSize = typeof onSetGenerationBatchSizeProp === 'function'
    ? onSetGenerationBatchSizeProp
    : storeOnSetGenerationBatchSize;

  // Population state from populationDao
  const generation = usePopulationDao(state => state.generation);

  // Placeholder refs and handlers for missing logic
  // snapshotsRef is now passed as a prop from GameUILayout/GameOfLifeApp
  const getLiveCells = useCallback(() => new Set(), []); // TODO: Replace with real logic
  // step, draw, clear, snapshotsRef, setSteadyInfo are now passed from props (from GameOfLifeApp)
  const onRotateShape = useCallback((rotatedShape) => {
    try {
      // Prefer toolDao to keep selected shape in sync
      useToolDao.getState().setSelectedShape?.(rotatedShape);
    } catch (e) {
      console.error('[HeaderBar] failed to set rotated shape on toolDao', e);
    }
    try {
      // Also publish to uiDao recentShapes if available
      const setRecentShapes = useUiDao.getState().setRecentShapes;
      if (typeof setRecentShapes === 'function') {
        setRecentShapes((prev = []) => {
          const next = [...prev];
          // replace first occurrence of matching id/name
          const idx = next.findIndex(s => (s?.id && rotatedShape?.id && s.id === rotatedShape.id) || (s?.name && rotatedShape?.name && s.name === rotatedShape.name));
          if (idx >= 0) {
            next[idx] = rotatedShape;
          }
          return next;
        });
      }
    } catch (e) {
      console.error('[HeaderBar] failed to update recent shapes with rotated shape', e);
    }
  }, []);
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
  const getDonateUrl = useCallback(() => {
    const apiBase = getBackendApiBase();
    if (apiBase.endsWith('/api')) return `${apiBase.slice(0, -4)}/donate`;
    return `${apiBase.replace(/\/+$/, '')}/donate`;
  }, []);
  const openDonate = useCallback(() => {
    const donateUrl = getDonateUrl();
    let popup = null;
    try {
      popup = globalThis.open?.(donateUrl, '_blank', 'noopener,noreferrer') ?? null;
    } catch (e) {
      console.error('[HeaderBar] failed to open donate popup', e);
    }
    if (!popup) {
      try {
        globalThis.location?.assign?.(donateUrl);
      } catch (e) {
        console.error('[HeaderBar] failed to navigate to donate URL', e);
      }
    }
  }, [getDonateUrl]);
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

  // Global drawer state from uiDao

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
              setSteadyInfo={setSteadyInfo}
              confirmOnClear={confirmOnClear}
              enableAdaCompliance={enableAdaCompliance}
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
              onOpenScript={() => setScriptOpen(true)}
              onOpenAssistant={() => setAssistantOpen(true)}
              showAssistant={assistantAvailable}
              showPhotoTest={enableAdaCompliance}
              onOpenDonate={openDonate}
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
            <ToolGroup isSmall={isSmall} shapesEnabled={shapesReady} />
            {/* Only show chip if enough space for both chip and tool icons */}
            {/* ToolGroup now handles selectedTool via context; chip can be moved there if needed */}
            <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <Tooltip title="Hide controls">
                <IconButton size={isSmall ? 'small' : 'medium'} aria-label="hide-controls" onClick={onToggleChrome} sx={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
                  <FullscreenExitIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
        {/* Third row: RecentShapesStrip (always visible, compact) */}
        <Box
          sx={{
            position: 'relative',
            left: 0,
            right: 0,
            py: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1,
            backgroundColor: 'rgba(20,20,25,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            zIndex: 41,
            pointerEvents: 'auto',
            overflow: 'visible',
            mt: 0,
            minHeight: 90,
            maxHeight: 120,
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
          }}
        >
          <RecentShapesStrip
            recentShapes={recentShapes}
            selectShape={selectShape}
            colorScheme={colorScheme}
            selectedShape={selectedShape}
            onRotateShape={onRotateShape}
            onSwitchToShapesTool={onSwitchToShapesTool}
            startPaletteDrag={startPaletteDrag}
            onSaveRecentShapes={onSaveRecentShapes}
            onClearRecentShapes={onClearRecentShapes}
            persistenceStatus={recentShapesPersistence}
          />
          {/* Button to open the expanded drawer */}
        </Box>
        {/* Drawer for expanded recent shapes view (no strip inside) */}
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
          onOk={handleOk}
          onCancel={handleCancel}
          data-testid-ok="options-ok-button"
          data-testid-cancel="options-cancel-button"
        />
      )}

      <HelpDialog open={helpOpen} onClose={handleHelpClose} />
      <AssistantDialog open={assistantOpen} onClose={() => setAssistantOpen(false)} />
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
  selectedShape: PropTypes.any,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  snapshotsRef: PropTypes.object.isRequired,
  setSteadyInfo: PropTypes.func,
  isRunning: PropTypes.bool,
  setIsRunning: PropTypes.func,
  engineMode: PropTypes.oneOf(['normal', 'hashlife']),
  isHashlifeMode: PropTypes.bool,
  onStartNormalMode: PropTypes.func,
  onStartHashlifeMode: PropTypes.func,
  onStopAllEngines: PropTypes.func,
  onSetEngineMode: PropTypes.func,
  useHashlife: PropTypes.bool,
  generationBatchSize: PropTypes.number,
  onSetGenerationBatchSize: PropTypes.func
};
