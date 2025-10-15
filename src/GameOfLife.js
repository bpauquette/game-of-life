// GameOfLife.js
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { shapes } from './shapes';
import { useChunkedGameState } from './chunkedGameState';
import { colorSchemes } from './colorSchemes';
import isPopulationStable from './utils/populationUtils';
import { drawTool } from './tools/drawTool';
import { lineTool } from './tools/lineTool';
import { rectTool } from './tools/rectTool';
import { circleTool } from './tools/circleTool';
import { ovalTool } from './tools/ovalTool';
import { randomRectTool } from './tools/randomRectTool';
import './GameOfLife.css';
import PopulationChart from './PopulationChart';
import ControlsBar from './ControlsBar';
import { computeComputedOffset, eventToCellFromCanvas, drawLiveCells } from './utils/canvasUtils';


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
  const [popWindowSize, setPopWindowSize] = React.useState(50);
  const [popTolerance, setPopTolerance] = React.useState(3);
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

  // Shapes context menu state (for the new Shapes tool)
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [shapesMenuPos, setShapesMenuPos] = useState({ x: 0, y: 0 });
  const shapesMenuRef = useRef(null);


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
          tool.drawOverlay(ctx, toolStateRef.current, cellSize, computedOffset);
        }
      }
    } catch (err) {
      // overlay drawing should never break main render; at least log the error
      // so lint rules about unused catch vars are satisfied.
      // In tests or restricted contexts this may be a noop.
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, [draw, selectedTool, cellSize, offsetRef, toolMap]);

  // Resize canvas to fill window and account for devicePixelRatio
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
          if (popHistoryRef.current.length > 1000) popHistoryRef.current.shift();
        } catch (err) {}
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
            if (!steadyDetectedRef.current) {
              steadyDetectedRef.current = true;
              setIsRunning(false);
            }
          } else {
            // clear the stop guard when not stable
            steadyDetectedRef.current = false;
          }
        } catch (err) {}
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

  // Ignore direct click-toggle behavior for drawing tools, but allow when the Shapes tool is active
  // so users can place selected shapes on left-click after choosing one with the right-click menu.
  if (selectedTool && selectedTool !== 'shapes') return;

    if (selectedShape && shapes[selectedShape]) {
      shapes[selectedShape].forEach(([dx, dy]) => setCellAlive(x + dx, y + dy, true));
    } else {
      const liveMap = getLiveCells();
      setCellAlive(x, y, !liveMap.has(`${x},${y}`));
    }
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
      try { e.target.setPointerCapture?.(e.pointerId); } catch (err) {};
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

    const tool = toolMap[selectedTool];
    if (!tool) return;
    // Only draw while primary button is pressed or toolState has last/start
    if (!(e.buttons & 1) && !toolStateRef.current.last && !toolStateRef.current.start) return;
    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);
    if (typeof tool.onMouseMove === 'function') tool.onMouseMove(toolStateRef.current, pt.x, pt.y, setCellAlive);
    drawWithOverlay();
  };

  const handleMouseUp = (e) => {
    // If we were panning, stop and release capture
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try { e.target.releasePointerCapture?.(e.pointerId); } catch (err) {}
      if (e.preventDefault) e.preventDefault();
      return;
    }

    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    // Some tools expect coords; pass last known if no pt
    const x = pt ? pt.x : toolStateRef.current.last?.x;
    const y = pt ? pt.y : toolStateRef.current.last?.y;
    if (typeof tool.onMouseUp === 'function') tool.onMouseUp(toolStateRef.current, x, y, setCellAlive);
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
        const maxCellSize = 200;
        const zoomFactor = 1.12; // per wheel tick
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

  // Context menu handler for Shapes tool
  const handleCanvasContextMenu = (e) => {
    if (selectedTool !== 'shapes') return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    // position menu at cursor (CSS pixels)
    const x = Math.min(window.innerWidth - 8, e.clientX - rect.left + rect.left);
    const y = Math.min(window.innerHeight - 8, e.clientY - rect.top + rect.top);
    setShapesMenuPos({ x, y });
    setShapesMenuOpen(true);
  };

  // Close shapes menu on outside click or Escape
  useEffect(() => {
    if (!shapesMenuOpen) return undefined;
    const onDocClick = (e) => {
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target)) {
        setShapesMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setShapesMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [shapesMenuOpen]);

  // Initial draw
  useEffect(() => { drawWithOverlay(); }, [drawWithOverlay]);

  // Keyboard pan: arrow keys nudge view in cell units
  useEffect(() => {
    const onKeyDown = (e) => {
      const amount = e.shiftKey ? 10 : 1;
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
        shapes={shapes}
        shapesMenuOpen={shapesMenuOpen}
        setShapesMenuOpen={setShapesMenuOpen}
        shapesMenuPos={shapesMenuPos}
        setShapesMenuPos={setShapesMenuPos}
        shapesMenuRef={shapesMenuRef}
        setSelectedShape={setSelectedShape}
        drawWithOverlay={drawWithOverlay}
        steadyInfo={steadyInfo}
        toolStateRef={toolStateRef}
        cursorCell={cursorCell}
      />

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onContextMenu={(e) => handleCanvasContextMenu?.(e)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: (selectedShape || selectedTool) ? 'crosshair' : 'default' }}
      />
      {shapesMenuOpen && (
        <div
          ref={shapesMenuRef}
          className="shapes-menu"
          style={{ left: shapesMenuPos.x, top: shapesMenuPos.y }}
        >
          {['', ...Object.keys(shapes)].map((shapeKey) => (
            <div
              key={shapeKey || '__eraser'}
              className="shapes-menu-item"
              onMouseDown={(ev) => {
                // prevent canvas from also receiving the click
                ev.stopPropagation();
                ev.preventDefault();
                const val = shapeKey || '';
                setSelectedShape?.(val || null);
                setShapesMenuOpen(false);
                // redraw to reflect the selected shape immediately
                drawWithOverlay();
              }}
            >
              {shapeKey === '' ? 'Eraser' : shapeKey}
            </div>
          ))}
        </div>
      )}
      {showChart && (
        <PopulationChart history={popHistoryRef.current.slice()} onClose={() => setShowChart(false)} />
      )}
    </div>
  );
};

export default GameOfLife;
