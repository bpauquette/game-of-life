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

  // Tool selection (e.g. freehand draw)
  const [selectedTool, setSelectedTool] = React.useState(null);
  const toolStateRef = useRef({});

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

  const [colorSchemeKey, setColorSchemeKey] = React.useState('neon');
  const colorScheme = colorSchemes[colorSchemeKey];


  // Draw function (keeps your original rendering)
  const draw = useCallback(() => {
  if (!canvasRef.current || !offsetRef?.current) return;
  const ctx = canvasRef.current.getContext('2d');

  // Use the current color scheme
  ctx.fillStyle = colorScheme.background;
  ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

  // Draw live cells
  getLiveCells().forEach((_, key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = colorScheme.getCellColor(x, y);
    ctx.fillRect(
      x * cellSize - offsetRef.current.x,
      y * cellSize - offsetRef.current.y,
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
        const tool = toolMap[selectedTool];
        if (tool && typeof tool.drawOverlay === 'function') {
          tool.drawOverlay(ctx, toolStateRef.current, cellSize, offsetRef.current);
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
    // rect is in CSS pixels; we've set transform to map logical pixels -> CSS pixels, so we can use CSS coords and divide by cellSize
    const x = Math.floor((e.clientX - rect.left) / cellSize + offsetRef.current.x / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize + offsetRef.current.y / cellSize);

    // If a freehand tool is active, ignore click-toggle behavior
    if (selectedTool === 'draw') return;

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
    const x = Math.floor((e.clientX - rect.left) / cellSize + offsetRef.current.x / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize + offsetRef.current.y / cellSize);
    return { x, y };
  };

  // Mouse handlers to support tools (freehand draw)
  const handleMouseDown = (e) => {
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
    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    // Some tools expect coords; pass last known if no pt
    const x = pt ? pt.x : toolStateRef.current.last?.x;
    const y = pt ? pt.y : toolStateRef.current.last?.y;
    if (typeof tool.onMouseUp === 'function') tool.onMouseUp(toolStateRef.current, x, y, setCellAlive);
    drawWithOverlay();
  };

  // Arrow key panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!offsetRef?.current) return;
      const panAmount = 20; // pixels in logical space
      if (e.key === "ArrowUp") offsetRef.current.y -= panAmount;
      if (e.key === "ArrowDown") offsetRef.current.y += panAmount;
      if (e.key === "ArrowLeft") offsetRef.current.x -= panAmount;
      if (e.key === "ArrowRight") offsetRef.current.x += panAmount;
      drawWithOverlay();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [offsetRef, drawWithOverlay]);

  // Mouse wheel: adjust cell size (zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // handleWheel will zoom centered on the mouse cursor
    const handleWheel = (e) => {
      // Compute mouse position relative to canvas (CSS pixels / logical units)
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Update cellSize multiplicatively and adjust offset so the point under cursor remains fixed
      setCellSize(prev => {
        const dpr = window.devicePixelRatio || 1;
        const minCellSize = 1 / dpr; // one device pixel in logical units
        const maxCellSize = 200;
        const zoomFactor = 1.12; // per wheel tick
        const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
        let newSize = prev * factor;
        // clamp raw value
        newSize = Math.max(minCellSize, Math.min(maxCellSize, newSize));

        // directional snapping to device-pixel multiples so we can step up/down
        const rawPixels = newSize * dpr;
        let snappedPixels;
        if (rawPixels === Math.round(rawPixels)) {
          snappedPixels = rawPixels;
        } else if (newSize > prev) {
          // zooming in: ceil to next device pixel
          snappedPixels = Math.ceil(rawPixels);
        } else {
          // zooming out: floor to previous device pixel
          snappedPixels = Math.floor(rawPixels);
        }
        // ensure at least 1 device pixel
        snappedPixels = Math.max(1, Math.min(Math.round(maxCellSize * dpr), snappedPixels));
        const snappedSize = Math.max(minCellSize, snappedPixels / dpr);

        if (snappedSize === prev) return prev;
        const scale = snappedSize / prev;
        // offsetRef stores pixel offsets in logical units
        offsetRef.current.x = (sx + offsetRef.current.x) * scale - sx;
        offsetRef.current.y = (sy + offsetRef.current.y) * scale - sy;
        return snappedSize;
      });

      // prevent page scroll while zooming
      if (e.cancelable) e.preventDefault();
      drawWithOverlay();
    };

    // passive: false so preventDefault() works in browsers
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel, { passive: false });
  }, [setCellSize, drawWithOverlay, offsetRef]);

  // Initial draw
  useEffect(() => { drawWithOverlay(); }, [drawWithOverlay]);

  return (
    <div className="canvas-container">
      <div className="controls">
        <label style={{ marginRight: 8 }}>
          Tool: <select value={selectedTool || ''} onChange={(e) => setSelectedTool(e.target.value || null)} style={{ marginLeft: 8, marginRight: 12 }}>
            <option value=''>None</option>
            <option value='draw'>Freehand</option>
            <option value='line'>Line</option>
            <option value='rect'>Rectangle</option>
            <option value='circle'>Circle</option>
            <option value='oval'>Oval</option>
            <option value='randomRect'>Randomize Rect</option>
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

        <select value={selectedShape || ''} onChange={(e) => setSelectedShape?.(e.target.value || null)}>
          <option value=''>Eraser</option>
          {Object.keys(shapes).map(shape => (
            <option key={shape} value={shape}>{shape}</option>
          ))}
        </select>

        <button onClick={() => setIsRunning(!isRunning)} style={{ marginLeft: 8 }}>
          {isRunning ? 'Stop' : 'Start'}
        </button>
  <button onClick={() => { step(); draw(); }}>Step</button>
        <button onClick={() => { clear(); draw(); }}>Clear</button>
        <span style={{ marginLeft: 8 }}>Live Cells: {getLiveCells().size}</span>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: (selectedShape || selectedTool) ? 'crosshair' : 'default' }}
      />
    </div>
  );
};

export default GameOfLife;
