// GameOfLife.js
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { shapes } from './shapes';
import { useChunkedGameState } from './chunkedGameState';
import { colorSchemes } from './colorSchemes';
import { drawTool } from './tools/drawTool';
import { lineTool } from './tools/lineTool';
import { rectTool } from './tools/rectTool';
import { circleTool } from './tools/circleTool';
import { ovalTool } from './tools/ovalTool';
import { randomRectTool } from './tools/randomRectTool';
import './GameOfLife.css';
import PopulationChart from './PopulationChart';


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

  // local state: keeps a small flag so initial resize happens after draw is defined
  const [ready, setReady] = useState(false);

  const [colorSchemeKey, setColorSchemeKey] = React.useState('spectrum');
  const colorScheme = colorSchemes[colorSchemeKey];

  // Shapes context menu state (for the new Shapes tool)
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [shapesMenuPos, setShapesMenuPos] = useState({ x: 0, y: 0 });
  const shapesMenuRef = useRef(null);


  // Draw function (keeps your original rendering)
  const draw = useCallback(() => {
  if (!canvasRef.current || !offsetRef) return;
  const ctx = canvasRef.current.getContext('2d');
  const rect = canvasRef.current.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  // computedOffset: offsetRef is stored in cell units (world coord at center)
  // convert to CSS pixels for drawing
  const computedOffset = {
    x: offsetRef.current.x * cellSize - centerX,
    y: offsetRef.current.y * cellSize - centerY
  };

  // Use the current color scheme
  ctx.fillStyle = colorScheme.background;
  ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

  // Draw live cells
  getLiveCells().forEach((_, key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = colorScheme.getCellColor(x, y);
    ctx.fillRect(
      x * cellSize - computedOffset.x,
      y * cellSize - computedOffset.y,
      cellSize,
      cellSize
    );
  });
}, [getLiveCells, cellSize, offsetRef, colorScheme]);

  // Enhanced draw: call tool overlay draw after main render
  const drawWithOverlay = useCallback(() => {
    draw();
    try {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && selectedTool && offsetRef?.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // computedOffset: offsetRef is stored in cell units (world coord at center)
        // convert to CSS pixels for overlay drawing (same as main draw())
        const computedOffset = {
          x: offsetRef.current.x * cellSize - centerX,
          y: offsetRef.current.y * cellSize - centerY
        };
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
          // clamp history length to something reasonable
          if (popHistoryRef.current.length > 1000) popHistoryRef.current.shift();
        } catch (err) {}
        drawWithOverlay();
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    if (isRunning) animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, step, drawWithOverlay]);

  

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
    if (!canvasRef.current || !offsetRef?.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = Math.floor(offsetRef.current.x + (e.clientX - rect.left - centerX) / cellSize);
    const y = Math.floor(offsetRef.current.y + (e.clientY - rect.top - centerY) / cellSize);
    return { x, y };
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
  }, [drawWithOverlay]);

  // Panning helper removed.

  return (
    <div className="canvas-container">
      <div className="controls">
        <label style={{ marginRight: 8 }}>
          Tool: <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)} style={{ marginLeft: 8, marginRight: 12 }}>
            <option value='draw'>Freehand</option>
            <option value='line'>Line</option>
            <option value='rect'>Rectangle</option>
            <option value='circle'>Circle</option>
            <option value='oval'>Oval</option>
              <option value='randomRect'>Randomize Rect</option>
              <option value='shapes'>Shapes</option>
          </select>
        </label>
          <label htmlFor="color-scheme-select" style={{ marginRight: 8 }}>Color Scheme:</label>
        <select
          id="color-scheme-select"
          value={colorSchemeKey}
          onChange={(e) => setColorSchemeKey(e.target.value)}
          style={{ marginRight: 8 }}
        >
          {Object.entries(colorSchemes).map(([key, scheme]) => (
            <option key={key} value={key}>{scheme.name}</option>
          ))}
        </select>

        {/* Shapes selector is now a right-click context menu when the Shapes tool is active */}

        <button onClick={() => setIsRunning(!isRunning)} style={{ marginLeft: 8 }}>
          {isRunning ? 'Stop' : 'Start'}
        </button>
  <button onClick={() => { step(); draw(); }}>Step</button>
        <button onClick={() => { clear(); draw(); }}>Clear</button>
        <button onClick={() => {
          // Place a centered blinker (3-cell oscillator, period 2) for testing
          const canvas = canvasRef.current;
          if (!canvas || !offsetRef?.current) return;
          const rect = canvas.getBoundingClientRect();
          const centerCssX = rect.width / 2;
          const centerCssY = rect.height / 2;
          // compute center cell with center-origin semantics
          const cx = Math.floor(offsetRef.current.x + (centerCssX - centerCssX) / cellSize);
          const cy = Math.floor(offsetRef.current.y + (centerCssY - centerCssY) / cellSize);
          const coords = [
            [-1, 0], [0, 0], [1, 0]
          ];
          coords.forEach(([dx,dy]) => setCellAlive(cx + dx, cy + dy, true));
          drawWithOverlay();
        }}>Place Blinker</button>
        <button style={{ marginLeft: 8 }} onClick={() => setShowChart(true)}>Show Population Chart</button>
        <span style={{ marginLeft: 8 }}>Live Cells: {getLiveCells().size}</span>
      </div>

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
