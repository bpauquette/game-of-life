// GameOfLife.js
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
// shapes list removed from frontend; shape data is provided by palette or backend
import { useChunkedGameState } from './chunkedGameState';
import { colorSchemes } from './colorSchemes';
import isPopulationStable from './utils/populationUtils';
import { drawTool } from './tools/drawTool';
import { lineTool } from './tools/lineTool';
import { rectTool } from './tools/rectTool';
import { circleTool } from './tools/circleTool';
import { ovalTool } from './tools/ovalTool';
import { randomRectTool } from './tools/randomRectTool';
import { shapesTool } from './tools/shapesTool';
import './GameOfLife.css';
import PopulationChart from './PopulationChart';
import ControlsBar from './ControlsBar';
import { computeComputedOffset, eventToCellFromCanvas, drawLiveCells } from './utils/canvasUtils';
import Tooltip from '@mui/material/Tooltip';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ShapePaletteDialog from './ShapePaletteDialog';

// Constants to avoid magic numbers
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;
const MAX_POPULATION_HISTORY = 1000;
const MAX_RECENT_SHAPES = 20;
const MAX_CELL_SIZE = 200;
const ZOOM_FACTOR = 1.12;
const RECENT_SHAPES_THUMBNAIL_SIZE = 48;
const KEYBOARD_PAN_AMOUNT = 1;
const KEYBOARD_PAN_AMOUNT_SHIFT = 10;


const GameOfLife = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  

  const {
    getLiveCells,
    setCellAlive,
    clear,
    step,
    cellSize,
    setCellSize,
    placeShape,
    selectedShape,
    setSelectedShape,
    offsetRef,
    isRunning,
    setIsRunning
  } = useChunkedGameState();

  // population history (counts per generation)
  const [showChart, setShowChart] = React.useState(false);
  const popHistoryRef = React.useRef([]);
  // population-stability detection params (window N and tolerance X)
  const [popWindowSize, setPopWindowSize] = React.useState(DEFAULT_POPULATION_WINDOW_SIZE);
  const [popTolerance, setPopTolerance] = React.useState(DEFAULT_POPULATION_TOLERANCE);
  // steady state detection
  const snapshotsRef = React.useRef([]);
  const [steadyInfo, setSteadyInfo] = React.useState({ steady: false, period: 0, popChanging: false });
  const MAX_SNAPSHOTS = 60;
  const steadyDetectedRef = React.useRef(false);

  // population stability checker moved to src/utils/populationUtils.js

  // Tool selection (e.g. freehand draw)
  // default to freehand draw so UI doesn't show an empty "None" selection
  const [selectedTool, setSelectedTool] = React.useState('draw');
  const toolStateRef = useRef({});

  // Panning refs (pixel-based offsets used by existing drawing semantics)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  const toolMap = useMemo(() => ({
    draw: drawTool,
    line: lineTool,
    rect: rectTool,
    circle: circleTool,
    oval: ovalTool,
    randomRect: randomRectTool
    ,
    shapes: shapesTool
  }), []);

  // Cursor tracking for tool status (throttled via RAF)
  const [cursorCell, setCursorCell] = useState(null);
  const latestCursorRef = useRef(null);
  const rafCursorRef = useRef(null);
  const scheduleCursorUpdate = (cell) => {
    latestCursorRef.current = cell;
    if (rafCursorRef.current) return;
    rafCursorRef.current = requestAnimationFrame(() => {
      setCursorCell(latestCursorRef.current);
      rafCursorRef.current = null;
    });
  };

  // local state: keeps a small flag so initial resize happens after draw is defined
  const [ready, setReady] = useState(false);

  const [colorSchemeKey, setColorSchemeKey] = React.useState('spectrum');
  // defensive: create a shallow copy and freeze it so external code cannot
  // accidentally mutate the active scheme object and change colors unexpectedly
  const colorScheme = useMemo(() => {
    const base = colorSchemes[colorSchemeKey] || {};
    // shallow copy functions/properties then freeze
    const copy = Object.assign({}, base);
    try { Object.freeze(copy); } catch (err) { /* ignore in older envs */ }
    return copy;
  }, [colorSchemeKey]);

  // Shapes menu removed — selection is handled via palette or recent strip
  // recent shapes (last 20 selected)
  const [recentShapes, setRecentShapes] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const prevToolRef = useRef(null);


  // Draw function (keeps your original rendering)
  const draw = useCallback(() => {
    if (!canvasRef.current || !offsetRef) return;
    const ctx = canvasRef.current.getContext('2d');
    const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);

    // Use the current color scheme
    ctx.fillStyle = colorScheme.background;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw live cells
    drawLiveCells(ctx, getLiveCells(), computedOffset, cellSize, colorScheme);
  }, [getLiveCells, cellSize, offsetRef, colorScheme]);

  // Enhanced draw: call tool overlay draw after main render
  const drawWithOverlay = useCallback(() => {
    draw();
    try {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && selectedTool && offsetRef?.current) {
        const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);
        const tool = toolMap[selectedTool];
        if (tool && typeof tool.drawOverlay === 'function') {
          tool.drawOverlay(ctx, toolStateRef.current, cellSize, computedOffset, colorScheme);
        }
        // Draw selected-shape preview if present. This is a non-committing
        // overlay drawn from the non-reactive toolStateRef so it remains fast.
        const selShape = toolStateRef.current.selectedShapeData || selectedShape;
        const last = toolStateRef.current.last;
        if (selShape && last) {
          // resolve cells from shape object or array
          let cells = [];
          if (Array.isArray(selShape)) cells = selShape;
          else if (selShape && Array.isArray(selShape.cells)) cells = selShape.cells;

          if (cells && cells.length > 0) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            for (let i = 0; i < cells.length; i++) {
              const c = cells[i];
              const cx = (c.x !== undefined) ? c.x : c[0];
              const cy = (c.y !== undefined) ? c.y : c[1];
              const drawX = (last.x + cx) * cellSize - computedOffset.x;
              const drawY = (last.y + cy) * cellSize - computedOffset.y;
              try {
                ctx.fillStyle = (typeof (colorScheme.getCellColor) === 'function') ? colorScheme.getCellColor(last.x + cx, last.y + cy) : '#222';
              } catch (err) {
                ctx.fillStyle = '#222';
              }
              ctx.fillRect(drawX, drawY, cellSize, cellSize);
            }
            ctx.restore();
          }
        }
      }
      } catch (err) {
        // overlay drawing should never break main render; at least log the error
        // so lint rules about unused catch vars are satisfied.
        // In tests or restricted contexts this may be a noop.
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }, [draw, selectedTool, cellSize, offsetRef, toolMap, colorScheme, selectedShape]);  // Resize canvas to fill window and account for devicePixelRatio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = window.innerWidth;
    const logicalHeight = window.innerHeight;

    // set CSS size (so canvas looks correct in layout)
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    // set actual pixel buffer size for crispness
    canvas.width = Math.max(1, Math.floor(logicalWidth * dpr));
    canvas.height = Math.max(1, Math.floor(logicalHeight * dpr));

    const ctx = canvas.getContext('2d');
    // Reset transform and scale to logical coordinate system if available.
    // Some test environments (jsdom) provide a mock context without setTransform.
    if (ctx && typeof ctx.setTransform === 'function') {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (ctx && typeof ctx.scale === 'function') {
      // Fallback: scale the context if setTransform isn't available
      ctx.scale(dpr, dpr);
    }

    // Redraw after resize
    drawWithOverlay();
  }, [drawWithOverlay]);

  // Initial resize + listener
  useEffect(() => {
    // mark ready after first render so draw exists for resizeCanvas
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    // initial size and subscribe
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [ready, resizeCanvas]);

  // Game loop
  useEffect(() => {
    const loop = () => {
      if (isRunning) {
        step();
        // record population after stepping
        try {
          popHistoryRef.current.push(getLiveCells().size);
          if (popHistoryRef.current.length > MAX_POPULATION_HISTORY) popHistoryRef.current.shift();
        } catch (err) {
          // Avoid silently swallowing errors - log for diagnostics. Tests may run
          // in environments where console is a noop, but logging helps during
          // development and CI analysis tools to surface issues.
          // eslint-disable-next-line no-console
          console.warn('Failed to update population history', err);
        }
        // record snapshot and detect steady state
        try {
          const liveMap = getLiveCells();
          const keys = Array.from(liveMap.keys()).sort();
          const snap = keys.join(';');
          const snaps = snapshotsRef.current;
          // search for a previous identical snapshot from the end
          let matchIdx = -1;
          for (let i = snaps.length - 1; i >= 0; i--) {
            if (snaps[i] === snap) {
              matchIdx = snaps.length - 1 - i; // distance
              break;
            }
          }
          snaps.push(snap);
          if (snaps.length > MAX_SNAPSHOTS) snaps.shift();
          snapshotsRef.current = snaps;

          // population-based steady detection: use configurable window+tolerance
          const ph = popHistoryRef.current;
          const popSteady = isPopulationStable(ph, popWindowSize, popTolerance);

          let detected = false;
          let detectedPeriod = 0;
          if (popSteady) {
            detected = true;
            detectedPeriod = 1;
          } else if (matchIdx === 0) {
            detected = true;
            detectedPeriod = 1;
          } else if (matchIdx > 0) {
            detected = true;
            detectedPeriod = matchIdx + 1;
          }

          // popChanging is true when population is changing between generations
          setSteadyInfo(detected ? { steady: true, period: detectedPeriod, popChanging: !popSteady } : { steady: false, period: 0, popChanging: !popSteady });

          // Auto-stop when the population is considered stable by the window/tolerance
          // Keep snapshot/oscillation detection for the UI indicator, but do not stop on those alone.
          if (popSteady) {
            // Only auto-stop when there is at least one live cell. This avoids
            // immediately stopping on empty worlds (which are trivially 'stable')
            // and gives the user control to run/stop explicitly.
            if (!steadyDetectedRef.current && liveMap.size > 0) {
              steadyDetectedRef.current = true;
              setIsRunning(false);
            }
          } else {
            // clear the stop guard when not stable
            steadyDetectedRef.current = false;
          }
        } catch (err) {
          // Avoid swallowing snapshot/steady-state detection errors so they
          // can be investigated if they occur in CI or a user's browser.
          // eslint-disable-next-line no-console
          console.warn('Failed to compute snapshots or steady-state info', err);
        }
        drawWithOverlay();
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    if (isRunning) animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, step, drawWithOverlay, getLiveCells, popWindowSize, popTolerance, setIsRunning]);

  

  // Canvas click: toggle or place shape
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !offsetRef?.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // compute cell relative to canvas center (center is world origin)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = Math.floor(offsetRef.current.x + (e.clientX - rect.left - centerX) / cellSize);
    const y = Math.floor(offsetRef.current.y + (e.clientY - rect.top - centerY) / cellSize);

  // Ignore direct click-toggle behavior for drawing tools. Shape placement is
  // handled on mouseup by the palette tool, so clicks do nothing here.
  if (selectedTool && selectedTool !== 'palette') return;
  if (selectedTool === 'palette') return;

  // Default click behavior toggles a single cell when no shape placement
  // is intended.
  const liveMap = getLiveCells();
  setCellAlive(x, y, !liveMap.has(`${x},${y}`));
    drawWithOverlay();
  };

  // Helper to convert mouse event to cell coordinates
  const eventToCell = (e) => {
    return eventToCellFromCanvas(e, canvasRef.current, offsetRef, cellSize);
  };

  // Mouse handlers to support tools (freehand draw)
  const handleMouseDown = (e) => {
    // Start panning if middle button or space+left
    if ((e.button === 1) || (e.button === 0 && e.nativeEvent && e.nativeEvent.shiftKey)) {
      // use shift as an alternative pan modifier (space can be noisy in some browsers)
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOffsetStartRef.current = { x: offsetRef.current.x, y: offsetRef.current.y };
      if (e.preventDefault) e.preventDefault();
      // capture pointer if available
      try { e.target.setPointerCapture?.(e.pointerId); } catch (err) { /* setPointerCapture not supported in some browsers */ }
      return;
    }

    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);

    if (typeof tool.onMouseDown === 'function') tool.onMouseDown(toolStateRef.current, pt.x, pt.y);
    // allow tools to react to initial point; pass setCellAlive in case they want it
    if (typeof tool.onMouseMove === 'function') tool.onMouseMove(toolStateRef.current, pt.x, pt.y, setCellAlive);
    drawWithOverlay();
  };

  const handleMouseMove = (e) => {
    // If currently panning, update offsetRef in pixels so draw uses same semantics
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      // convert pixel delta to cell units so offsetRef (in cells) remains consistent
      const dxCells = dx / cellSize;
      const dyCells = dy / cellSize;
      // move offset so content follows the pointer (drag right -> content moves right)
      offsetRef.current.x = panOffsetStartRef.current.x - dxCells;
      offsetRef.current.y = panOffsetStartRef.current.y - dyCells;
      drawWithOverlay();
      if (e.preventDefault) e.preventDefault();
      return;
    }

    // Always update cursor position (throttled via RAF) so the ToolStatus can
    // display the mouse coordinates even when no tool is selected.
    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);

    const tool = toolMap[selectedTool];
    if (!tool) {
      // No active tool — nothing more to do
      return;
    }

    // If shapes tool is active, update preview position while hovering
    // (no mouse button required). This lets users see the shape preview as
    // they move the cursor after selecting a shape from the palette.
    if (selectedTool === 'shapes') {
      toolStateRef.current.last = { x: pt.x, y: pt.y };
      // allow tool-specific onMouseMove if it wants to run as well
      if (typeof tool.onMouseMove === 'function') tool.onMouseMove(toolStateRef.current, pt.x, pt.y, setCellAlive);
      drawWithOverlay();
      return;
    }

    // Only let other tools modify state/draw while primary button is pressed or
    // when the tool already has an active start/last state.
    if (!(e.buttons & 1) && !toolStateRef.current.last && !toolStateRef.current.start) return;

    if (typeof tool.onMouseMove === 'function') tool.onMouseMove(toolStateRef.current, pt.x, pt.y, setCellAlive);
    drawWithOverlay();
  };

  const handleMouseUp = (e) => {
    // If we were panning, stop and release capture
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try { e.target.releasePointerCapture?.(e.pointerId); } catch (err) { /* releasePointerCapture not supported in some browsers */ }
      if (e.preventDefault) e.preventDefault();
      return;
    }

    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);

    // Some tools expect coords; pass last known if no pt
    const x = pt ? pt.x : toolStateRef.current.last?.x;
    const y = pt ? pt.y : toolStateRef.current.last?.y;
    if (typeof tool.onMouseUp === 'function') tool.onMouseUp(toolStateRef.current, x, y, setCellAlive, placeShape);
    drawWithOverlay();
  };

  // Panning support removed to simplify zoom behavior per user request.

  // Mouse wheel: adjust cell size (zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // handleWheel will zoom centered on the canvas center (simpler UX)
    const handleWheel = (e) => {
      // Use canvas center rather than cursor position (center is world origin)
      // Update cellSize multiplicatively but do NOT change offsetRef (center remains world origin)
      setCellSize(prev => {
        const dpr = window.devicePixelRatio || 1;
        const minCellSize = 1 / dpr; // one device pixel in logical units
        const maxCellSize = MAX_CELL_SIZE;
        const zoomFactor = ZOOM_FACTOR; // per wheel tick
        const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

        // device pixel snapping
        const prevDevice = prev * dpr;
        let newDevice = prevDevice * factor;
        const maxDevice = maxCellSize * dpr;
        newDevice = Math.max(1, Math.min(maxDevice, newDevice));
        let snappedDevice = Math.round(newDevice);
        if (newDevice > prevDevice) snappedDevice = Math.ceil(newDevice);
        else snappedDevice = Math.floor(newDevice);
        snappedDevice = Math.max(1, Math.min(Math.round(maxDevice), snappedDevice));
        const snappedSize = Math.max(minCellSize, snappedDevice / dpr);
        return snappedSize === prev ? prev : snappedSize;
      });

      // prevent page scroll while zooming
      if (e.cancelable) e.preventDefault();
      drawWithOverlay();
    };

    // passive: false so preventDefault() works in browsers
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel, { passive: false });
  }, [setCellSize, drawWithOverlay, offsetRef]);

  // shapes menu removed: no context menu handler

  // Initial draw
  useEffect(() => { drawWithOverlay(); }, [drawWithOverlay]);

  // Centralized shape selection helper: sets the selected shape, updates the tool
  // state and maintains the recent-shapes list in one place.
  const selectShape = useCallback((shape) => {
    // update reactive state
    setSelectedShape?.(shape || null);
    // update non-reactive tool state for fast access by render/overlay
    toolStateRef.current.selectedShapeData = shape || null;
    // maintain recent shapes list (unique, newest-first, max MAX_RECENT_SHAPES)
    if (shape) {
      setRecentShapes(prev => {
        const newEntry = shape;
        const keyFor = (it) => (it && it.id) ? String(it.id) : (typeof it === 'string' ? it : JSON.stringify(it));
        const newKey = keyFor(newEntry);
        const filtered = prev.filter(p => keyFor(p) !== newKey);
        return [newEntry, ...filtered].slice(0, MAX_RECENT_SHAPES);
      });
    }
    // Refresh overlay immediately so the preview appears right after selection
    drawWithOverlay();
  }, [setSelectedShape, drawWithOverlay]);

  const openPalette = useCallback(() => {
    prevToolRef.current = selectedTool;
    // activate shapes tool while the palette is open so previews work
    setSelectedTool && setSelectedTool('shapes');
    setPaletteOpen(true);
  }, [selectedTool, setSelectedTool]);

  const closePalette = useCallback((restorePrev = true) => {
    setPaletteOpen(false);
    if (restorePrev && prevToolRef.current) setSelectedTool && setSelectedTool(prevToolRef.current);
    prevToolRef.current = null;
  }, [setSelectedTool]);

  // Keyboard pan: arrow keys nudge view in cell units
  useEffect(() => {
    const onKeyDown = (e) => {
      const amount = e.shiftKey ? KEYBOARD_PAN_AMOUNT_SHIFT : KEYBOARD_PAN_AMOUNT;
      if (e.key === 'ArrowLeft') {
        offsetRef.current.x -= amount;
        drawWithOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        offsetRef.current.x += amount;
        drawWithOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        offsetRef.current.y -= amount;
        drawWithOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        offsetRef.current.y += amount;
        drawWithOverlay();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawWithOverlay, offsetRef]);

  // Panning helper removed.

  return (
    <div className="canvas-container">
      {/* Left-side recent shapes strip */}
      <div className="recent-shapes" style={{ position: 'absolute', left: 8, top: 80, zIndex: 20 }}>
        {recentShapes.map((s, idx) => {
          const key = s && s.id ? s.id : idx;
          const cells = (s && Array.isArray(s.cells)) ? s.cells : (Array.isArray(s) ? s : []);
          const width = cells.reduce((max, c) => Math.max(max, (Array.isArray(c) ? c[0] : (c.x || 0))), 0) + 1 || 8;
          const height = cells.reduce((max, c) => Math.max(max, (Array.isArray(c) ? c[1] : (c.y || 0))), 0) + 1 || 8;
          const title = s?.name || s?.meta?.name || (s && s.id) || `shape ${idx}`;
          return (
            <div key={key} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => { selectShape(s); drawWithOverlay(); }} title={title}>
              <svg width={RECENT_SHAPES_THUMBNAIL_SIZE} height={RECENT_SHAPES_THUMBNAIL_SIZE} viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`} preserveAspectRatio="xMidYMid meet" style={{ background: colorScheme.background || 'transparent', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6 }}>
                {Array.from({ length: width }).map((_, cx) => (
                  Array.from({ length: height }).map((__, cy) => (
                    <rect key={`g-${key}-${cx}-${cy}`} x={cx} y={cy} width={1} height={1} fill="transparent" stroke="rgba(255,255,255,0.02)" />
                  ))
                ))}
                {cells.map((c, i) => {
                  const x = Array.isArray(c) ? c[0] : (c.x || 0);
                  const y = Array.isArray(c) ? c[1] : (c.y || 0);
                  return <rect key={`c-${key}-${i}`} x={x} y={y} width={1} height={1} fill={typeof (colorScheme.getCellColor) === 'function' ? colorScheme.getCellColor(x, y) : '#222'} />
                })}
              </svg>
            </div>
          );
        })}
      </div>
      <ControlsBar
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        colorSchemeKey={colorSchemeKey}
        setColorSchemeKey={setColorSchemeKey}
        colorSchemes={colorSchemes}
        isRunning={isRunning}
        setIsRunning={(v) => { if (!v) {} ; setIsRunning(v); }}
        step={step}
        draw={draw}
        clear={clear}
        snapshotsRef={snapshotsRef}
        setSteadyInfo={setSteadyInfo}
        canvasRef={canvasRef}
        offsetRef={offsetRef}
        cellSize={cellSize}
        setCellAlive={setCellAlive}
        popHistoryRef={popHistoryRef}
        setShowChart={setShowChart}
        getLiveCells={getLiveCells}
        popWindowSize={popWindowSize}
        setPopWindowSize={setPopWindowSize}
        popTolerance={popTolerance}
        setPopTolerance={setPopTolerance}
  
  selectShape={selectShape}
  selectedShape={selectedShape}
        drawWithOverlay={drawWithOverlay}
        openPalette={openPalette}
        steadyInfo={steadyInfo}
        toolStateRef={toolStateRef}
        cursorCell={cursorCell}
      />

      {paletteOpen && (
        <ShapePaletteDialog
          open={paletteOpen}
          onClose={() => closePalette(true)}
          onSelectShape={(shape) => { selectShape(shape); closePalette(false); }}
          backendBase={process.env.REACT_APP_BACKEND_BASE || 'http://localhost:55000'}
          colorScheme={colorSchemes ? (colorSchemes[colorSchemeKey] || {}) : {}}
        />
      )}

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onContextMenu={(e) => { if (e && e.preventDefault) e.preventDefault(); }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: (selectedShape || selectedTool) ? 'crosshair' : 'default' }}
      />
      {showChart && (
        <PopulationChart history={popHistoryRef.current.slice()} onClose={() => setShowChart(false)} />
      )}
      {/* Run-state indicator (top-right overlay) - lights while running, dark when stopped */}
      <div className="steady-indicator" title={isRunning ? 'Running' : 'Stopped'}>
        <Tooltip title={isRunning ? 'Running' : 'Stopped'}>
          <LightbulbIcon style={{ color: isRunning ? '#FFC107' : 'rgba(255,255,255,0.35)' }} />
        </Tooltip>
      </div>
    </div>
  );
};

export default GameOfLife;
