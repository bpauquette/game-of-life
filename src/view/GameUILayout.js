import React, { useCallback, useRef, useState, useLayoutEffect } from 'react';
import { useToolDao } from '../model/dao/toolDao.js';
import { useUiDao } from '../model/dao/uiDao.js';
import { usePopulationDao } from '../model/dao/populationDao.js';
import { useGameContext } from '../context/GameContext.js';
import HeaderBar from './HeaderBar.js';
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

// Fallback SkipLink if not present
import PropTypes from 'prop-types';
const SkipLink = ({ href, children }) => (
  <a href={href} style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>{children}</a>
);
SkipLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

function GameUILayout(/* props */) {
  // Use context for refs/controllers only
  const { canvasRef, drawWithOverlay, gameRef, controlsProps } = useGameContext();

  // Destructure needed props from controlsProps for use in JSX
  const {
    isRunning,
    colorScheme,
    selectedTool,
    showSpeedGauge,
    importDialogOpen,
    onCloseImportDialog,
    onOpenImportDialog,
    cursorStyle
  } = controlsProps || {};
  // Tool state/actions from toolDao
  const recentShapes = useToolDao(state => state.recentShapes);
  const recentShapesPersistence = useToolDao(state => state.recentShapesPersistence);
  const onSaveRecentShapes = useToolDao(state => state.onSaveRecentShapes);
  const onClearRecentShapes = useToolDao(state => state.onClearRecentShapes);
  const onSelectShape = useToolDao(state => state.onSelectShape);
  const onRotateShape = useToolDao(state => state.onRotateShape);
  const onSwitchToShapesTool = useToolDao(state => state.onSwitchToShapesTool);

  // UI/dialog/palette state/actions from uiDao
  const onClosePalette = useUiDao(state => state.onClosePalette);
  const onPaletteSelect = useUiDao(state => state.onPaletteSelect);
  const captureDialogOpen = useUiDao(state => state.captureDialogOpen);
  const onCloseCaptureDialog = useUiDao(state => state.onCloseCaptureDialog);
  const captureData = useUiDao(state => state.captureData);
  const onSaveCapture = useUiDao(state => state.onSaveCapture);
  const myShapesDialogOpen = useUiDao(state => state.myShapesDialogOpen);
  const onCloseMyShapesDialog = useUiDao(state => state.onCloseMyShapesDialog);
  const onOpenMyShapes = useUiDao(state => state.onOpenMyShapes);
  const onImportSuccess = useUiDao(state => state.onImportSuccess);
  const onCloseChart = useUiDao(state => state.onCloseChart);
  const isSmall = useUiDao(state => state.isSmall);
  const onToggleChrome = useUiDao(state => state.onToggleChrome);
  const shapesReady = useUiDao(state => state.shapesReady);
  const startPaletteDrag = useUiDao(state => state.startPaletteDrag);
  // DialogDao (if still needed for dialog state)
  // const captureDialogOpen = useDialogDao(state => state.captureDialogOpen);
  // const setCaptureDialogOpen = useDialogDao(state => state.setCaptureDialogOpen);
  // const captureData = useDialogDao(state => state.captureData);
  // const setCaptureData = useDialogDao(state => state.setCaptureData);
  // const myShapesDialogOpen = useDialogDao(state => state.myShapesDialogOpen);
  // const setMyShapesDialogOpen = useDialogDao(state => state.setMyShapesDialogOpen);
  // const importDialogOpen = useDialogDao(state => state.importDialogOpen);
  // const setImportDialogOpen = useDialogDao(state => state.setImportDialogOpen);
  // const sidebarOpen = useGameStore(state => state.sidebarOpen); // purged
  const uiState = useUiDao(state => state.uiState);
  const enableAdaCompliance = useUiDao(state => state.enableAdaCompliance);
  // Population state from populationDao
  const populationHistory = usePopulationDao(state => state.populationHistory);
  const setPopulationHistory = usePopulationDao(state => state.setPopulationHistory);
  const popWindowSize = usePopulationDao(state => state.popWindowSize);
  const setPopWindowSize = usePopulationDao(state => state.setPopWindowSize);
  const generation = usePopulationDao(state => state.generation);
  const setGeneration = usePopulationDao(state => state.setGeneration);
  const maxChartGenerations = usePopulationDao(state => state.maxChartGenerations);
  const setMaxChartGenerations = usePopulationDao(state => state.setMaxChartGenerations);

  // Robust canvas initialization: sets up size, scaling, and clears for zoom/resize/refresh
  const initCanvas = useCallback(() => {
    if (!canvasRef?.current) return;
    const canvas = canvasRef.current;
    // Get device pixel ratio for crisp rendering
    const dpr = globalThis.devicePixelRatio || 1;
    // Set canvas size to match container
    const container = canvas.parentElement;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    // Only update if changed
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }
    // Set transform for crisp scaling
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
    }
    // Optionally trigger overlay redraw
    if (typeof drawWithOverlay === 'function') {
      drawWithOverlay();
    }
  }, [canvasRef, drawWithOverlay]);

  // measure header height so content is positioned correctly under it
  const headerRef = useRef(null);
  const [headerTop, setHeaderTop] = useState((uiState?.showUIControls ?? true) ? 104 : 0);

  const handleToggleChrome = useCallback(() => {
    if (typeof onToggleChrome === 'function') onToggleChrome();
  }, [onToggleChrome]);

  useLayoutEffect(() => {
    const measure = () => {
      try {
        const h = headerRef.current ? headerRef.current.offsetHeight : 0;
        setHeaderTop(h || ((uiState?.showUIControls ?? true) ? 104 : 0));
      } catch (e) {
        setHeaderTop((uiState?.showUIControls ?? true) ? 104 : 0);
      }
      // Re-init canvas on resize
      initCanvas();
    };
    measure();
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, [uiState?.showUIControls, isSmall, initCanvas]);

  // Init canvas on mount and when relevant state changes
  useLayoutEffect(() => {
    initCanvas();
  }, [initCanvas, enableAdaCompliance]);

  return (
    <div className="canvas-container" style={{ height: '100vh', backgroundColor: 'var(--surface-0)' }}>
      <SkipLink href="#main-game-content">Skip to main content</SkipLink>
      <SkipLink href="#header-controls">Skip to controls</SkipLink>
      <h1 style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
          Conway&apos;s Game of Life - Interactive Cellular Automaton Simulator
      </h1>
      {(uiState?.showUIControls ?? true) && (
        <HeaderBar
          id="header-controls"
          tabIndex="-1"
          headerRef={headerRef}
          recentShapes={recentShapes}
          recentShapesPersistence={recentShapesPersistence}
          selectShape={onSelectShape}
          drawWithOverlay={drawWithOverlay}
          startPaletteDrag={startPaletteDrag}
          onRotateShape={onRotateShape}
          onSwitchToShapesTool={onSwitchToShapesTool}
          onSaveRecentShapes={onSaveRecentShapes}
          onClearRecentShapes={onClearRecentShapes}
          isRunning={isRunning}
          colorScheme={colorScheme}
          selectedTool={selectedTool}
          showSpeedGauge={showSpeedGauge}
          enableAdaCompliance={enableAdaCompliance}
          generation={generation}
          isSmall={isSmall}
          shapesReady={shapesReady}
          showToolsRow={true}
          onOpenMyShapes={onOpenMyShapes}
          onOpenImport={onOpenImportDialog}
          onToggleChrome={handleToggleChrome}
        />
      )}
      <div
        id="main-game-content"
        tabIndex="-1"
        style={{ position: 'absolute', top: (uiState?.showUIControls ?? true) ? (headerTop || 0) : 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      >
        <PalettePortal
          open={uiState?.paletteOpen ?? false}
          onClose={onClosePalette}
          onSelectShape={onPaletteSelect}
          backendBase={controlsProps?.backendBase}
          colorScheme={colorScheme}
          colorSchemeKey={uiState?.colorSchemeKey || 'bio'}
          onAddRecent={controlsProps?.onAddRecent}
          prefetchOnMount={false}
        />
        <CaptureDialogPortal
          open={captureDialogOpen}
          onClose={onCloseCaptureDialog}
          captureData={captureData}
          onSave={onSaveCapture}
        />
        <MyShapesDialog
          open={myShapesDialogOpen}
          onClose={onCloseMyShapesDialog}
        />
        <ImportShapeDialog
          open={importDialogOpen}
          onClose={onCloseImportDialog}
          onImportSuccess={onImportSuccess}
        />
        <canvas
          ref={el => {
            if (canvasRef) canvasRef.current = el;
            if (el) {
              initCanvas();
            }
          }}
          onMouseDown={controlsProps?.handleMouseDown}
          onMouseMove={controlsProps?.handleMouseMove}
          onMouseUp={controlsProps?.handleMouseUp}
          onPointerDown={controlsProps?.handleMouseDown}
          onPointerMove={controlsProps?.handleMouseMove}
          onPointerUp={controlsProps?.handleMouseUp}
          style={
            !(uiState?.showUIControls ?? true)
              ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, cursor: typeof cursorStyle === 'string' ? cursorStyle : 'default', display: 'block', width: enableAdaCompliance ? '160px' : '100vw', height: enableAdaCompliance ? '160px' : '100vh', maxWidth: enableAdaCompliance ? '160px' : 'none', maxHeight: enableAdaCompliance ? '160px' : 'none', backgroundColor: '#000', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', boxSizing: 'border-box', zIndex: 9999 }
              : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: typeof cursorStyle === 'string' ? cursorStyle : 'default', display: 'block', width: enableAdaCompliance ? '160px' : '100%', height: enableAdaCompliance ? '160px' : '100%', maxWidth: enableAdaCompliance ? '160px' : 'none', maxHeight: enableAdaCompliance ? '160px' : 'none', backgroundColor: '#000', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', boxSizing: 'border-box' }
          }
        />
        {(uiState?.showUIControls ?? true) && (uiState?.showChart ?? false) && (
          <StatisticsPanel
            open
            onClose={onCloseChart}
            history={typeof populationHistory !== 'undefined' ? populationHistory : []}
            gameRef={gameRef}
            setPopulationHistory={setPopulationHistory}
            popWindowSize={popWindowSize}
            setPopWindowSize={setPopWindowSize}
            generation={generation}
            setGeneration={setGeneration}
            maxChartGenerations={maxChartGenerations}
            setMaxChartGenerations={setMaxChartGenerations}
          />
        )}
        {(uiState?.showUIControls ?? true) && (
          <BottomStatusBar />
        )}
        {/* Floating "Show controls" button appears only when the chrome is hidden */}
        {!(uiState?.showUIControls ?? true) && (
          <Box sx={{ position: 'fixed', top: 8, right: 8, zIndex: 11000 }}>
            <Tooltip title="Show controls">
              <IconButton
                size={isSmall ? 'small' : 'medium'}
                color="default"
                aria-label="show-controls"
                onClick={onToggleChrome}
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

export default GameUILayout;
