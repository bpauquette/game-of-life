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
import { FullscreenExit as FullscreenExitIcon } from '@mui/icons-material';
function GameUILayout({
  recentShapes,
  recentShapesPersistence,
  onSaveRecentShapes,
  onClearRecentShapes,
  onSelectShape,
  drawWithOverlay,
  colorScheme,
  selectedShape,
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
  onToggleChrome,
  shapesReady
}) {
  // measure header height so content is positioned correctly under it
  const headerRef = useRef(null);
  const [headerTop, setHeaderTop] = useState((uiState?.showChrome ?? true) ? 104 : 0);

  // helper to push small debug messages into the overlay buffer (if present)
  const pushDebug = (obj) => {
    try {
      const text = typeof obj === 'string' ? obj : JSON.stringify(obj);
      if (globalThis.__GOL_PUSH_CANVAS_LOG__) {
        try { globalThis.__GOL_PUSH_CANVAS_LOG__(text); } catch (e) {}
      } else {
        globalThis.__GOL_CANVAS_LOGS__ = globalThis.__GOL_CANVAS_LOGS__ || [];
        globalThis.__GOL_CANVAS_LOGS__.push({ ts: Date.now(), text });
        try { globalThis.dispatchEvent && globalThis.dispatchEvent(new CustomEvent('__GOL_CANVAS_LOG_UPDATE')); } catch (e) {}
      }
    } catch (e) { /* ignore */ }
  };

  // Wrap the provided onToggleChrome so we automatically capture diagnostics
  // before and after the UI chrome toggles. This reduces manual console work.
  /* eslint-disable complexity */
  const handleToggleChrome = useCallback(() => {
    try {
      globalThis.__GOL_DUMP_CANVAS_STATE__ && globalThis.__GOL_DUMP_CANVAS_STATE__();
    } catch (e) { pushDebug({ event: 'toggleChrome.before.error', error: String(e) }); }

    try {
      if (typeof onToggleChrome === 'function') onToggleChrome();
    } catch (e) { pushDebug({ event: 'toggleChrome.invoke.error', error: String(e) }); }

    // After layout change give the browser a frame or two and record the new state.
    // Use double rAF to wait for layout & paint, then force an immediate resize
    // and schedule a render to avoid intermediate paints at the wrong size.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const after = (globalThis.__GOL_DUMP_CANVAS_STATE__ && globalThis.__GOL_DUMP_CANVAS_STATE__()) || null;
          pushDebug({ event: 'toggleChrome.after', after });
        } catch (e) { pushDebug({ event: 'toggleChrome.after.error', error: String(e) }); }

        // Also dispatch a resize event to make sure any listeners run
        try { globalThis.dispatchEvent && globalThis.dispatchEvent(new Event('resize')); } catch (e) {}

        // Compute final viewport size
        let w = document.documentElement.clientWidth || document.body.clientWidth;
        let h = document.documentElement.clientHeight || document.body.clientHeight;

        // Preferred path: call renderer.forceResize then controller.requestRender
        try {
          const renderer = gameRef && gameRef.current && gameRef.current.view && gameRef.current.view.renderer;
          const controller = gameRef && gameRef.current && gameRef.current.controller;
          if (renderer && typeof renderer.forceResize === 'function') {
            try { renderer.forceResize(w, h); } catch (e) { /* ignore */ }
          } else if (globalThis.__GOL_FORCE_RESIZE__) {
            try { globalThis.__GOL_FORCE_RESIZE__(); } catch (e) { /* ignore */ }
          } else if (gameRef && gameRef.current && gameRef.current.view && typeof gameRef.current.view.resize === 'function') {
            try { gameRef.current.view.resize(w, h); } catch (e) { /* ignore */ }
          }

          if (controller && typeof controller.requestRender === 'function') {
            try { controller.requestRender(); } catch (e) { /* ignore */ }
          } else {
            // fallback: try a global helper that may trigger a render
            try { if (globalThis.__GOL_REQUEST_RENDER__) globalThis.__GOL_REQUEST_RENDER__(); } catch (e) {}
          }
        } catch (e) {}
      });
    });
  }, [onToggleChrome, gameRef]);
  /* eslint-enable complexity */

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
            recentShapesPersistence={recentShapesPersistence}
          selectShape={onSelectShape}
          drawWithOverlay={drawWithOverlay}
        onRotateShape={onRotateShape}
        onSwitchToShapesTool={onSwitchToShapesTool}
            onSaveRecentShapes={onSaveRecentShapes}
          onClearRecentShapes={onClearRecentShapes}
          isRunning={isRunning}
          setIsRunning={controlsProps?.setIsRunning}
          step={controlsProps?.step}
          draw={drawWithOverlay}
          clear={controlsProps?.clear}
          snapshotsRef={controlsProps?.snapshotsRef}
          setSteadyInfo={controlsProps?.setSteadyInfo}
          colorSchemes={controlsProps?.colorSchemes}
          colorScheme={colorScheme}
          selectedShape={selectedShape}
          colorSchemeKey={uiState?.colorSchemeKey || 'bio'}
          setColorSchemeKey={controlsProps?.setColorSchemeKey}
          popWindowSize={controlsProps?.popWindowSize}
          setPopWindowSize={controlsProps?.setPopWindowSize}
          popTolerance={controlsProps?.popTolerance}
          setPopTolerance={controlsProps?.setPopTolerance}
          showSpeedGauge={showSpeedGauge}
          setShowSpeedGauge={controlsProps?.setShowSpeedGauge}
          detectStablePopulation={controlsProps?.detectStablePopulation ?? false}
          setDetectStablePopulation={controlsProps?.setDetectStablePopulation}
          maxFPS={controlsProps?.maxFPS}
          setMaxFPS={controlsProps?.setMaxFPS}
          maxGPS={controlsProps?.maxGPS}
          setMaxGPS={controlsProps?.setMaxGPS}
          getLiveCells={controlsProps?.getLiveCells}
          onLoadGrid={controlsProps?.onLoadGrid}
          generation={generation}
          setShowChart={controlsProps?.setShowChart}
          onToggleSidebar={onToggleSidebar}
          onToggleChrome={handleToggleChrome}
          isSidebarOpen={sidebarOpen}
          isSmall={isSmall}
          selectedTool={selectedTool}
          setSelectedTool={controlsProps?.setSelectedTool}
          shapesReady={shapesReady}
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
        <canvas
          ref={el => {
            if (canvasRef) canvasRef.current = el;
            if (el && typeof drawWithOverlay === 'function') {
              drawWithOverlay();
            }
          }}
          style={
            !(uiState?.showChrome ?? true)
              ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, cursor: cursorStyle, display: 'block', width: '100vw', height: '100vh', backgroundColor: '#000', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', boxSizing: 'border-box', zIndex: 9999 }
              : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: cursorStyle, display: 'block', width: '100%', height: '100%', backgroundColor: '#000', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', boxSizing: 'border-box' }
          }
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
          <BottomStatusBar cursorCell={cursorCell} />
        )}
        {/* Floating "Show controls" button appears only when the chrome is hidden
            so it sits over the canvas and lets the user bring the header back. */}
        {!(uiState?.showChrome ?? true) && (
          // Ensure the floating "Show controls" button sits above the canvas
          // when chrome is hidden. The canvas uses a very large z-index
          // (9999) in the fullscreen-hidden style, so give this button a
          // higher z-index and tuck it into the top-right corner of the
          // viewport so it hovers over the canvas.
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

GameUILayout.propTypes = {
  recentShapes: PropTypes.array,
  recentShapesPersistence: PropTypes.object,
  onSaveRecentShapes: PropTypes.func,
  onSelectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object,
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
  onToggleChrome: PropTypes.func,
  onClearRecentShapes: PropTypes.func,
};

export default GameUILayout;
