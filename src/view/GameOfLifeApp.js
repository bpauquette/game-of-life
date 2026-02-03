/**
 * ⚠️ SEALED FILE
 *
 * This file is the composition root.
 * Do not add domain logic, effects, policies, or refs here.
 * All new behavior must live in hooks, controllers, or services.
 */
import React from 'react';
import PropTypes from 'prop-types';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import LoadingShapesOverlay from './LoadingShapesOverlay.js';
import ScriptExecutionHUD from './ScriptExecutionHUD.js';
import GameUILayout from './GameUILayout.js';
import FirstLoadWarningDialog from './FirstLoadWarningDialog.js';
import { GameProvider } from '../context/GameContext.js';
import useGameOfLifeAppRuntime from './hooks/useGameOfLifeAppRuntime.js';
import './GameOfLife.css';

function GameOfLifeApp() {
  const {
    canvasRef,
    drawWithOverlay,
    gameRef,
    controlsProps,
    selectedTool,
    requestToolChange,
    shapesLoading,
    shapesProgress,
    shapesError,
    shapesStart,
    shapeManager,
    handleSelectShape,
    colorScheme,
    selectedShape,
    handleRotateShape,
    startPaletteDrag,
    setSelectedTool,
    toolState,
    setToolState,
    shapesReady,
    paletteOpen,
    setPaletteOpen,
    captureDialogOpen,
    captureData,
    onCloseCaptureDialog,
    onSaveCapture,
    myShapesDialogOpen,
    setMyShapesDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    showStableDialog,
    setShowStableDialog,
    shapesNotifOpen,
    setShapesNotifOpen,
    loginNotifOpen,
    setLoginNotifOpen,
    loginNotifMessage,
    showDuplicateDialog,
    setShowDuplicateDialog,
    duplicateShape,
    setDuplicateShape,
    onImportSuccess,
    cursorCell,
    populationHistory,
    setPopulationHistory,
    popWindowSize,
    setPopWindowSize,
    generation,
    setGeneration,
    maxChartGenerations,
    setMaxChartGenerations,
    setShowChart,
    isRunning,
    showUIControls,
    setShowUIControls,
    snapshotsRef,
    setSteadyInfo,
    offsetRef,
    renderCaptureSaveDialog,
    stableDetectionInfo,
    setStableDetectionInfo,
    setIsRunningCombined,
    enableAdaCompliance,
    userNotifiedRef,
    detectStablePopulation,
    showFirstLoadWarning,
    setShowFirstLoadWarning,
    showSpeedGauge,
    setShowSpeedGauge,
    liveCellsCount,
    isSmall,
    clear,
    step
  } = useGameOfLifeAppRuntime();

  const handleViewExistingShape = React.useCallback(() => {
    if (duplicateShape) {
      shapeManager?.selectShape?.(duplicateShape);
      gameRef.current?.setSelectedTool?.('shapes');
    }
    setShowDuplicateDialog(false);
    setDuplicateShape(null);
  }, [duplicateShape, gameRef, setDuplicateShape, setShowDuplicateDialog, shapeManager]);

  const handleKeepPaused = React.useCallback(() => {
    setShowStableDialog(false);
    setStableDetectionInfo(null);
    setIsRunningCombined(false);
  }, [setIsRunningCombined, setShowStableDialog, setStableDetectionInfo]);

  const handleContinueRunning = React.useCallback(() => {
    setShowStableDialog(false);
    setStableDetectionInfo(null);
    userNotifiedRef.current = false;
    setIsRunningCombined(true);
    setTimeout(() => {
      const mvc = gameRef.current;
      if (mvc && typeof mvc.isStable === 'function') {
        try {
          console.log('🔄 Forcing stability recheck after continue...');
        } catch (err) {
          console.error(err);
        }
      }
    }, 100);
  }, [gameRef, setIsRunningCombined, setShowStableDialog, setStableDetectionInfo, userNotifiedRef]);

  return (
    <GameProvider
      canvasRef={canvasRef}
      drawWithOverlay={drawWithOverlay}
      gameRef={gameRef}
      controlsProps={controlsProps}
      selectedTool={selectedTool}
      requestToolChange={requestToolChange}
    >
      <LoadingShapesOverlay
        loading={shapesLoading}
        progress={shapesProgress}
        error={shapesError}
        onRetry={shapesStart}
      />
      <GameUILayout
        recentShapes={shapeManager.recentShapes}
        recentShapesPersistence={shapeManager.persistenceState}
        onSaveRecentShapes={shapeManager.persistRecentShapes}
        onClearRecentShapes={shapeManager.clearRecentShapes}
        onSelectShape={handleSelectShape}
        drawWithOverlay={drawWithOverlay}
        colorScheme={colorScheme}
        selectedShape={selectedShape}
        onRotateShape={handleRotateShape}
        onSwitchToShapesTool={() => gameRef.current?.setSelectedTool?.('shapes')}
        startPaletteDrag={startPaletteDrag}
        controlsProps={controlsProps}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        toolState={toolState}
        setToolState={setToolState}
        shapesReady={shapesReady}
        paletteOpen={paletteOpen}
        onClosePalette={() => setPaletteOpen(false)}
        onPaletteSelect={(shape) => {
          gameRef.current?.setSelectedShape?.(shape);
          shapeManager.selectShapeAndClosePalette(shape);
        }}
         captureDialogOpen={captureDialogOpen}
         onCloseCaptureDialog={onCloseCaptureDialog}
        captureData={captureData}
         onSaveCapture={onSaveCapture}
        myShapesDialogOpen={myShapesDialogOpen}
        onCloseMyShapesDialog={() => setMyShapesDialogOpen(false)}
        onOpenMyShapes={() => setMyShapesDialogOpen(true)}
        importDialogOpen={importDialogOpen}
        onCloseImportDialog={() => setImportDialogOpen(false)}
        onOpenImportDialog={() => setImportDialogOpen(true)}
        onImportSuccess={onImportSuccess}
        canvasRef={canvasRef}
        cursorCell={cursorCell}
        populationHistory={populationHistory}
        setPopulationHistory={setPopulationHistory}
        popWindowSize={popWindowSize}
        setPopWindowSize={setPopWindowSize}
        generation={generation}
        setGeneration={setGeneration}
        maxChartGenerations={maxChartGenerations}
        setMaxChartGenerations={setMaxChartGenerations}
        onCloseChart={() => setShowChart(false)}
        isRunning={isRunning}
        showSpeedGauge={showSpeedGauge}
        onToggleSpeedGauge={setShowSpeedGauge}
        gameRef={gameRef}
        liveCellsCount={liveCellsCount}
        offsetRef={offsetRef}
        isSmall={isSmall}
        onToggleChrome={() => setShowUIControls(!showUIControls)}
        enableAdaCompliance={enableAdaCompliance}
        step={step}
        draw={drawWithOverlay}
        clear={clear}
        snapshotsRef={snapshotsRef}
        setSteadyInfo={setSteadyInfo}
      />
      <Snackbar
        open={shapesNotifOpen}
        autoHideDuration={4000}
        onClose={() => setShapesNotifOpen(false)}
      >
        <Alert severity="success" onClose={() => setShapesNotifOpen(false)} sx={{ width: '100%' }}>
          Shapes catalog loaded
        </Alert>
      </Snackbar>
      <Snackbar
        open={loginNotifOpen}
        autoHideDuration={6000}
        onClose={() => setLoginNotifOpen(false)}
      >
        <Alert severity="info" onClose={() => setLoginNotifOpen(false)} sx={{ width: '100%' }}>
          {loginNotifMessage}
        </Alert>
      </Snackbar>
      {renderCaptureSaveDialog()}
      <Dialog open={showDuplicateDialog} onClose={() => setShowDuplicateDialog(false)}>
        <DialogTitle>Duplicate Shape Detected</DialogTitle>
        <DialogContent>
          <p>A shape with the same pattern already exists in the catalog:</p>
          {duplicateShape && (
            <div>
              <strong>Name:</strong> {duplicateShape.name}
              <br />
              <strong>Description:</strong> {duplicateShape.description || 'No description'}
              <br />
              <strong>Cells:</strong> {duplicateShape.cellCount || 'Unknown'}
            </div>
          )}
          <p>Would you like to view the existing shape instead?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDuplicateDialog(false)}>Cancel</Button>
          <Button onClick={handleViewExistingShape} variant="contained">
            View Existing Shape
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showStableDialog && detectStablePopulation}
        onClose={() => setShowStableDialog(false)}
      >
        <DialogTitle>🎉 Stable Pattern Detected!</DialogTitle>
        <DialogContent>
          {stableDetectionInfo && (
            <div>
              <p>
                <strong>Pattern Type:</strong> {stableDetectionInfo.patternType}
              </p>
              <p>
                <strong>Generation:</strong> {stableDetectionInfo.generation}
              </p>
              <p>
                <strong>Population:</strong> {stableDetectionInfo.populationCount} cells
              </p>
              {stableDetectionInfo.period > 1 && (
                <p>
                  <strong>Period:</strong> {stableDetectionInfo.period}
                </p>
              )}
              <p>
                The simulation has been automatically paused. Would you like to continue running or
                keep it paused?
              </p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleKeepPaused}>Keep Paused</Button>
          <Button onClick={handleContinueRunning} variant="contained">
            Continue Running
          </Button>
        </DialogActions>
      </Dialog>
      <ScriptExecutionHUD />
      <FirstLoadWarningDialog
        open={showFirstLoadWarning}
        onClose={() => setShowFirstLoadWarning(false)}
      />
    </GameProvider>
  );
}

GameOfLifeApp.propTypes = {
  initialUIState: PropTypes.object
};

export default GameOfLifeApp;
