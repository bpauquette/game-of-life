import React, { useCallback, useRef, useState, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import HeaderBar from './HeaderBar';
import PalettePortal from './PalettePortal';
import CaptureDialogPortal from './CaptureDialogPortal';
import RecentShapesDrawer from './RecentShapesDrawer';
import StatisticsPanel from './StatisticsPanel';
import BottomStatusBar from './BottomStatusBar';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/Fullscreen';
function GameUILayout({
  recentShapes,
  onSelectShape,
  drawWithOverlay,
  colorScheme,
  selectedShapeForPanel,
  onRotateShape,
  onSwitchToShapesTool,
  controlsProps,
  selectedTool,
  uiState,
  onClosePalette,
  onPaletteSelect,
  captureDialogOpen,
  onCloseCaptureDialog,
  captureData,
  onSaveCapture,
  canvasRef,
  cursorStyle,
  cursorCell,
  populationHistory,
  onCloseChart,
  isRunning,
  showSpeedGauge,
  onToggleSpeedGauge,
  gameRef,
  liveCellsCount,
  generation,
  sidebarOpen,
  onToggleSidebar,
  isSmall,
  onToggleChrome
}) {
  // measure header height so content is positioned correctly under it
  const headerRef = useRef(null);
  const [headerTop, setHeaderTop] = useState((uiState?.showChrome ?? true) ? 104 : 0);

  useLayoutEffect(() => {
    const measure = () => {
      try {
        const h = headerRef.current ? headerRef.current.offsetHeight : 0;
        setHeaderTop(h || ((uiState?.showChrome ?? true) ? 104 : 0));
      } catch (e) {
        setHeaderTop((uiState?.showChrome ?? true) ? 104 : 0);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [uiState?.showChrome, isSmall]);
  return (
    <div className="canvas-container" style={{ height: '100vh', backgroundColor: '#000' }}>
      {(uiState?.showChrome ?? true) && (
        <HeaderBar
          headerRef={headerRef}
          recentShapes={recentShapes}
          selectShape={onSelectShape}
          drawWithOverlay={drawWithOverlay}
        onRotateShape={onRotateShape}
        onSwitchToShapesTool={onSwitchToShapesTool}
          isRunning={isRunning}
          setIsRunning={controlsProps?.setIsRunning}
          step={controlsProps?.step}
          draw={drawWithOverlay}
          clear={controlsProps?.clear}
          snapshotsRef={controlsProps?.snapshotsRef}
          setSteadyInfo={controlsProps?.setSteadyInfo}
          colorSchemes={controlsProps?.colorSchemes}
          colorScheme={colorScheme}
          colorSchemeKey={uiState?.colorSchemeKey || 'bio'}
          setColorSchemeKey={controlsProps?.setColorSchemeKey}
          popWindowSize={controlsProps?.popWindowSize}
          setPopWindowSize={controlsProps?.setPopWindowSize}
          popTolerance={controlsProps?.popTolerance}
          setPopTolerance={controlsProps?.setPopTolerance}
          showSpeedGauge={showSpeedGauge}
          setShowSpeedGauge={controlsProps?.setShowSpeedGauge}
          maxFPS={controlsProps?.maxFPS}
          setMaxFPS={controlsProps?.setMaxFPS}
          maxGPS={controlsProps?.maxGPS}
          setMaxGPS={controlsProps?.setMaxGPS}
          getLiveCells={controlsProps?.getLiveCells}
          onLoadGrid={controlsProps?.onLoadGrid}
          generation={generation}
          setShowChart={controlsProps?.setShowChart}
          onToggleSidebar={onToggleSidebar}
          isSidebarOpen={sidebarOpen}
          isSmall={isSmall}
          selectedTool={selectedTool}
          setSelectedTool={controlsProps?.setSelectedTool}
          showToolsRow={true}
        />
      )}
  {/* main content: absolutely positioned below header and sized to fill remaining viewport */}
  <div style={{ position: 'absolute', top: (uiState?.showChrome ?? true) ? (headerTop || 0) : 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <PalettePortal
          open={uiState?.paletteOpen ?? false}
          onClose={onClosePalette}
          onSelectShape={onPaletteSelect}
          backendBase={controlsProps?.backendBase}
          colorScheme={colorScheme}
          onAddRecent={controlsProps?.onAddRecent}
        />
        <CaptureDialogPortal
          open={captureDialogOpen}
          onClose={onCloseCaptureDialog}
          captureData={captureData}
          onSave={onSaveCapture}
        />
        <canvas
          ref={el => {
            if (canvasRef) canvasRef.current = el;
            if (el && typeof drawWithOverlay === 'function') {
              drawWithOverlay();
            }
          }}
          style={{ cursor: cursorStyle, display: 'block', width: '100%', height: '100%', backgroundColor: '#000', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        />
        {(uiState?.showChrome ?? true) && isSmall && (
          <RecentShapesDrawer
            open={sidebarOpen}
            onClose={onToggleSidebar}
            recentShapes={recentShapes}
            onSelectShape={(shape) => { onSelectShape(shape); onSwitchToShapesTool(); }}
            colorScheme={colorScheme}
          />
        )}
        {(uiState?.showChrome ?? true) && (uiState?.showChart ?? false) && (
          <StatisticsPanel
            open
            onClose={onCloseChart}
            history={populationHistory}
            isRunning={isRunning}
            gameRef={gameRef}
          />
        )}
        {(uiState?.showChrome ?? true) && (
          <BottomStatusBar
            selectedTool={selectedTool}
            toolStateRef={controlsProps?.toolStateRef}
            cursorCell={cursorCell}
            selectedShape={selectedShapeForPanel}
            model={controlsProps?.model}
            liveCellsCount={liveCellsCount}
            generation={generation}
          />
        )}
        <Box sx={{ position: 'fixed', top: (uiState?.showChrome ?? true) ? 112 : 8, right: 8, zIndex: 50 }}>
          <Tooltip title={(uiState?.showChrome ?? true) ? 'Hide controls' : 'Show controls'}>
            <IconButton
              size={isSmall ? 'small' : 'medium'}
              color="default"
              aria-label={(uiState?.showChrome ?? true) ? 'hide-controls' : 'show-controls'}
              onClick={onToggleChrome}
              sx={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            >
              {(uiState?.showChrome ?? true) ? <FullscreenIcon fontSize="small" /> : <FullscreenExitIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </div>
    </div>
  );
}

GameUILayout.propTypes = {
  recentShapes: PropTypes.array,
  onSelectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  colorScheme: PropTypes.object,
  selectedShapeForPanel: PropTypes.object,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func,
  controlsProps: PropTypes.object,
  selectedTool: PropTypes.string,
  uiState: PropTypes.object,
  onClosePalette: PropTypes.func,
  onPaletteSelect: PropTypes.func,
  captureDialogOpen: PropTypes.bool,
  onCloseCaptureDialog: PropTypes.func,
  captureData: PropTypes.object,
  onSaveCapture: PropTypes.func,
  canvasRef: PropTypes.object,
  cursorStyle: PropTypes.string,
  cursorCell: PropTypes.object,
  populationHistory: PropTypes.array,
  onCloseChart: PropTypes.func,
  isRunning: PropTypes.bool,
  showSpeedGauge: PropTypes.bool,
  onToggleSpeedGauge: PropTypes.func,
  gameRef: PropTypes.object,
  liveCellsCount: PropTypes.number,
  generation: PropTypes.number,
  sidebarOpen: PropTypes.bool,
  onToggleSidebar: PropTypes.func,
  isSmall: PropTypes.bool,
  onToggleChrome: PropTypes.func
};

export default GameUILayout;
