// GameOfLife.js
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { shapes } from './shapes';
import { useChunkedGameState } from './chunkedGameState';
import './GameOfLife.css';

const GameOfLife = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const {
    getLiveCells,
    setCellAlive,
    clear,
    randomize,
    step,
    cellSize,
    setCellSize,
    selectedShape,
    setSelectedShape,
    offsetRef,
    isRunning,
    setIsRunning
  } = useChunkedGameState();

  // local state: keeps a small flag so initial resize happens after draw is defined
  const [ready, setReady] = useState(false);

  // Draw function (keeps your original rendering)
  const draw = useCallback(() => {
    if (!canvasRef.current || !offsetRef?.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Because we set transform for DPR in resizeCanvas, we can draw in logical pixels.
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

    // Draw live cells
    getLiveCells().forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      const hue = ((x * 53 + y * 97) % 360);
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      ctx.fillRect(
        x * cellSize - offsetRef.current.x,
        y * cellSize - offsetRef.current.y,
        cellSize,
        cellSize
      );
    });
  }, [getLiveCells, cellSize, offsetRef]);

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
    // Reset transform and scale to logical coordinate system
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Redraw after resize
    draw();
  }, [draw]);

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
        draw();
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    if (isRunning) animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, step, draw]);

  // Canvas click: toggle or place shape
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !offsetRef?.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // rect is in CSS pixels; we've set transform to map logical pixels -> CSS pixels, so we can use CSS coords and divide by cellSize
    const x = Math.floor((e.clientX - rect.left) / cellSize + offsetRef.current.x / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize + offsetRef.current.y / cellSize);

    if (selectedShape && shapes[selectedShape]) {
      shapes[selectedShape].forEach(([dx, dy]) => setCellAlive(x + dx, y + dy, true));
    } else {
      const liveMap = getLiveCells();
      setCellAlive(x, y, !liveMap.has(`${x},${y}`));
    }
    draw();
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
      draw();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [offsetRef, draw]);

  // Mouse wheel: adjust cell size (zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // add passive=false if you want to call preventDefault; keep default here
    const handleWheel = (e) => {
      // change cell size (logical pixels)
      setCellSize(prev => Math.min(50, Math.max(5, prev + (e.deltaY < 0 ? 1 : -1))));
      draw();
    };
    canvas.addEventListener('wheel', handleWheel);
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [setCellSize, draw]);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="canvas-container">
      <div className="controls">
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
        <button onClick={() => { randomize(); draw(); }}>Randomize</button>
        <button onClick={() => { clear(); draw(); }}>Clear</button>
        <span style={{ marginLeft: 8 }}>Live Cells: {getLiveCells().size}</span>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: selectedShape ? 'crosshair' : 'default' }}
      />
    </div>
  );
};

export default GameOfLife;
