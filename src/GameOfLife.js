// GameOfLife.js
import React, { useRef, useEffect, useCallback } from 'react';
import { shapes } from './shapes';
import { useChunkedGameState } from './chunkedGameState';

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

  // Draw function
  const draw = useCallback(() => {
    if (!canvasRef.current || !offsetRef?.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

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
    const x = Math.floor((e.clientX - rect.left) / cellSize + offsetRef.current.x / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize + offsetRef.current.y / cellSize);

    if (selectedShape && shapes[selectedShape]) {
      const shape = shapes[selectedShape];
      shape.forEach(([dx, dy]) => setCellAlive(x + dx, y + dy, true));
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
      const panAmount = 20; // pixels
      if (e.key === "ArrowUp") offsetRef.current.y -= panAmount;
      if (e.key === "ArrowDown") offsetRef.current.y += panAmount;
      if (e.key === "ArrowLeft") offsetRef.current.x -= panAmount;
      if (e.key === "ArrowRight") offsetRef.current.x += panAmount;
      draw();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [offsetRef, draw]);

  // Mouse wheel: adjust cell size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      setCellSize(prev => Math.min(50, Math.max(5, prev + (e.deltaY < 0 ? 1 : -1))));
      draw();
    };
    canvas.addEventListener('wheel', handleWheel);
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [setCellSize, draw]);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  return (
    <div style={{ color: 'white', fontFamily: 'Arial' }}>
      <div style={{ marginBottom: '8px' }}>
        <select value={selectedShape || ''} onChange={(e) => setSelectedShape?.(e.target.value || null)}>
          <option value=''>Eraser</option>
          {Object.keys(shapes).map(shape => (
            <option key={shape} value={shape}>{shape}</option>
          ))}
        </select>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid white', cursor: selectedShape ? 'crosshair' : 'default' }}
        onClick={handleCanvasClick}
      />
      <div style={{ marginTop: '8px' }}>
        <button onClick={() => setIsRunning(!isRunning)} style={{ marginRight: 4}}>
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button onClick={() => { step(); draw(); }} style={{ marginRight: 4}}>Step</button>
        <button onClick={() => { randomize(); draw(); }} style={{ marginRight: 4}}>Randomize</button>
        <button onClick={() => { clear(); draw(); }} style={{ marginRight: 4}}>Clear</button>
        <span>Live Cells: {getLiveCells().size}</span>
      </div>
    </div>
  );
};

export default GameOfLife;
