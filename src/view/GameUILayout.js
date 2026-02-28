import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useCanvasManager } from './hooks/useCanvasManager.js';
import { useGameContext } from '../context/GameContext.js';
import { useUiDao } from '../model/dao/uiDao.js';
import HeaderBar from './HeaderBar.js';
import RunControlGroup from './components/RunControlGroup.js';
import PalettePortal from './PalettePortal.js';
import CaptureDialogPortal from './CaptureDialogPortal.js';
import MyShapesDialog from './MyShapesDialog.js';
import ImportShapeDialog from './components/ImportShapeDialog.jsx';
import StatisticsPanel from './StatisticsPanel.js';
import BottomStatusBar from './BottomStatusBar.js';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { FullscreenExit as FullscreenExitIcon } from '@mui/icons-material';

const SkipLink = ({ href, children }) => (
  <a href={href} style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>{children}</a>
);

SkipLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

function GameUILayout({
  recentShapes,
  recentShapesPersistence,
  onSaveRecentShapes,
  onClearRecentShapes,
  onSelectShape,
  onRotateShape,
  startPaletteDrag,
  shapesReady,
  onOpenMyShapes,
  onOpenImportDialog,
  onCloseImportDialog,
  onImportSuccess,
  importDialogOpen,
  paletteOpen,
  onClosePalette,
  onPaletteSelect,
  captureDialogOpen,
  onCloseCaptureDialog,
  captureData,
  onSaveCapture,
  myShapesDialogOpen,
  onCloseMyShapesDialog,
  controlsProps,
  populationHistory,
  onCloseChart,
  gameRef,
  isSmall,
  onToggleChrome,
  enableAdaCompliance,
  step,
  draw,
  clear,
  snapshotsRef,
  setSteadyInfo,
  offsetRef: providedOffsetRef
}) {
  const { canvasRef, drawWithOverlay } = useGameContext();
  // Always create a local ref, then prefer the provided model-synced ref.
  const localOffsetRef = useRef({ x: 0, y: 0 });
  const offsetRef = providedOffsetRef || localOffsetRef;
  const {
    resizeCanvas
  } = useCanvasManager({
    offsetRef,
    canvasRef,
    gameRef
  });

  const showUIControls = useUiDao(state => state.showUIControls ?? true);
  const showChart = useUiDao(state => state.showChart ?? false);
  const confirmOnClear = useUiDao(state => state.confirmOnClear ?? true);
  const headerRef = useRef(null);
  const [headerTop, setHeaderTop] = useState(0);

  const updateHeaderTop = useCallback(() => {
    if (!showUIControls) {
      setHeaderTop(0);
      return;
    }
    const node = headerRef.current;
    if (!node) {
      setHeaderTop(0);
      return;
    }
    try {
      const rect = node.getBoundingClientRect();
      setHeaderTop(rect.bottom);
    } catch (err) {
      console.error('measureHeader failed', err);
      setHeaderTop(0);
    }
  }, [showUIControls]);

  const scheduleHeaderMeasure = useCallback(() => {
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(() => updateHeaderTop());
    }
    return setTimeout(() => updateHeaderTop(), 0);
  }, [updateHeaderTop]);

  useLayoutEffect(() => {
    const ticket = scheduleHeaderMeasure();
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(ticket);
        } else {
          clearTimeout(ticket);
        }
      };
    }
    const node = headerRef.current;
    if (!node) {
      return () => {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(ticket);
        } else {
          clearTimeout(ticket);
        }
      };
    }
    const observer = new ResizeObserver(() => scheduleHeaderMeasure());
    observer.observe(node);
    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(ticket);
      } else {
        clearTimeout(ticket);
      }
      observer.disconnect();
    };
  }, [scheduleHeaderMeasure, showUIControls, enableAdaCompliance, isSmall, paletteOpen]);

  const initCanvas = useCallback(() => {
    resizeCanvas();
    requestAnimationFrame(() => drawWithOverlay?.());
  }, [resizeCanvas, drawWithOverlay]);

  useEffect(() => {
    if (!canvasRef?.current) return;
    initCanvas();
  }, [canvasRef, initCanvas, showUIControls, enableAdaCompliance]);

  useEffect(() => {
    if (!showUIControls) {
      resizeCanvas();
    }
  }, [showUIControls, resizeCanvas]);

  const handleToggleChrome = useCallback(() => {
    onToggleChrome?.();
    requestAnimationFrame(() => resizeCanvas());
  }, [onToggleChrome, resizeCanvas]);

  const backendBase = controlsProps?.backendBase ?? '';
  const onAddRecent = controlsProps?.onAddRecent ?? (() => {});

  return (
    <div className="canvas-container" style={{ height: '100vh', backgroundColor: 'var(--surface-0)' }}>
      <SkipLink href="#main-game-content">Skip to main content</SkipLink>
      <SkipLink href="#header-controls">Skip to controls</SkipLink>
      {showUIControls && (
        <HeaderBar
          id="header-controls"
          tabIndex="-1"
          headerRef={headerRef}
          recentShapes={recentShapes}
          recentShapesPersistence={recentShapesPersistence}
          selectShape={onSelectShape}
          onRotateShape={onRotateShape}
          startPaletteDrag={startPaletteDrag}
          onSaveRecentShapes={onSaveRecentShapes}
          onClearRecentShapes={onClearRecentShapes}
          onOpenMyShapes={onOpenMyShapes}
          onOpenImport={onOpenImportDialog}
          onToggleChrome={handleToggleChrome}
          isSmall={isSmall}
          showToolsRow
          shapesReady={shapesReady}
          selectedShape={controlsProps?.selectedShape}
          isRunning={controlsProps?.isRunning}
          setIsRunning={controlsProps?.setIsRunning}
          engineMode={controlsProps?.engineMode}
          isHashlifeMode={controlsProps?.isHashlifeMode}
          onStartNormalMode={controlsProps?.onStartNormalMode}
          onStartHashlifeMode={controlsProps?.onStartHashlifeMode}
          onStopAllEngines={controlsProps?.onStopAllEngines}
          onSetEngineMode={controlsProps?.onSetEngineMode}
          useHashlife={controlsProps?.useHashlife}
          generationBatchSize={controlsProps?.generationBatchSize}
          onSetGenerationBatchSize={controlsProps?.onSetGenerationBatchSize}
          step={step}
          draw={draw}
          clear={clear}
          resetToGenerationZero={controlsProps?.resetToGenerationZero}
          snapshotsRef={snapshotsRef}
          setSteadyInfo={setSteadyInfo}
        />
      )}
      <div
        id="main-game-content"
        tabIndex="-1"
        style={{ position: 'absolute', top: showUIControls ? headerTop : 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      >
        <PalettePortal
          open={paletteOpen}
          onClose={onClosePalette}
          onSelectShape={onPaletteSelect}
          backendBase={backendBase}
          onAddRecent={onAddRecent}
          prefetchOnMount={false}
        />
        <CaptureDialogPortal
          open={captureDialogOpen}
          onClose={onCloseCaptureDialog}
          captureData={captureData}
          onSave={onSaveCapture}
        />
        <MyShapesDialog open={myShapesDialogOpen} onClose={onCloseMyShapesDialog} />
        <ImportShapeDialog open={importDialogOpen} onClose={onCloseImportDialog} onImportSuccess={onImportSuccess} />
        <StatisticsPanel open={showChart} onClose={onCloseChart} history={populationHistory} gameRef={gameRef} />
        <canvas
          ref={el => {
            if (!canvasRef) return;
            canvasRef.current = el;
            if (el) initCanvas();
          }}
          style={
            showUIControls
              ? {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  cursor: 'default',
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  backgroundColor: '#000',
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  boxSizing: 'border-box'
                }
              : {
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  cursor: 'default',
                  display: 'block',
                  width: '100vw',
                  height: '100vh',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  backgroundColor: '#000',
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                  zIndex: 10
                }
          }
        />
        {showUIControls && <BottomStatusBar />}
        {!showUIControls && (
          <Box
            sx={{
              position: 'fixed',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 11000,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pointerEvents: 'auto'
            }}
          >
            <RunControlGroup
              isRunning={!!controlsProps?.isRunning}
              setIsRunning={controlsProps?.setIsRunning || (() => {})}
              step={step}
              draw={draw}
              clear={clear}
              resetToGenerationZero={controlsProps?.resetToGenerationZero}
              snapshotsRef={snapshotsRef}
              setSteadyInfo={setSteadyInfo || (() => {})}
              confirmOnClear={confirmOnClear}
              engineMode={controlsProps?.engineMode}
              isHashlifeMode={controlsProps?.isHashlifeMode}
              onStartNormalMode={controlsProps?.onStartNormalMode}
              onStartHashlifeMode={controlsProps?.onStartHashlifeMode}
              onStopAllEngines={controlsProps?.onStopAllEngines}
              onSetEngineMode={controlsProps?.onSetEngineMode}
              useHashlife={controlsProps?.useHashlife}
              generationBatchSize={controlsProps?.generationBatchSize}
              onSetGenerationBatchSize={controlsProps?.onSetGenerationBatchSize}
            />
            <Tooltip title="Exit Focus Mode (show all controls)">
              <IconButton
                size={isSmall ? 'small' : 'medium'}
                color="default"
                aria-label="exit-focus-mode"
                onClick={handleToggleChrome}
                sx={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              >
                <FullscreenExitIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </div>
    </div>
  );
}

GameUILayout.propTypes = {
  recentShapes: PropTypes.array,
  recentShapesPersistence: PropTypes.object,
  onSaveRecentShapes: PropTypes.func,
  onClearRecentShapes: PropTypes.func,
  onSelectShape: PropTypes.func,
  onRotateShape: PropTypes.func,
  startPaletteDrag: PropTypes.func,
  shapesReady: PropTypes.bool,
  onOpenMyShapes: PropTypes.func,
  onOpenImportDialog: PropTypes.func,
  onCloseImportDialog: PropTypes.func,
  onImportSuccess: PropTypes.func,
  importDialogOpen: PropTypes.bool,
  paletteOpen: PropTypes.bool,
  onClosePalette: PropTypes.func,
  onPaletteSelect: PropTypes.func,
  captureDialogOpen: PropTypes.bool,
  onCloseCaptureDialog: PropTypes.func,
  captureData: PropTypes.object,
  onSaveCapture: PropTypes.func,
  myShapesDialogOpen: PropTypes.bool,
  onCloseMyShapesDialog: PropTypes.func,
  controlsProps: PropTypes.object,
  populationHistory: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  onCloseChart: PropTypes.func,
  gameRef: PropTypes.object,
  isSmall: PropTypes.bool,
  onToggleChrome: PropTypes.func,
  enableAdaCompliance: PropTypes.bool,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  snapshotsRef: PropTypes.object,
  setSteadyInfo: PropTypes.func,
  offsetRef: PropTypes.object,
};

export default GameUILayout;
