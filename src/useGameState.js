import { useState, useRef, useCallback } from 'react';
import { step as gameStep } from './gameLogic';

export const useGameState = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [cellSize, setCellSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [selectedShape, setSelectedShape] = useState(null);
  const [liveCount, setLiveCount] = useState(0);

  const liveCellsRef = useRef(new Map());
  const offsetRef = useRef({ x: 0, y: 0 });

  const step = useCallback(() => {
    liveCellsRef.current = gameStep(liveCellsRef.current);
    setLiveCount(liveCellsRef.current.size);
  }, []);

  const toggleCell = useCallback((x, y) => {
    const key = `${x},${y}`;
    const map = liveCellsRef.current;
    if (map.has(key)) map.delete(key);
    else map.set(key, true);
    setLiveCount(map.size);
  }, []);

  const placeShape = useCallback((x, y, shapes, selectedShape) => {
    if (!selectedShape) return;
    const map = liveCellsRef.current;
    shapes[selectedShape].forEach(([dx, dy]) => map.set(`${x + dx},${y + dy}`, true));
    setLiveCount(map.size);
  }, []);

  return {
    isRunning, setIsRunning,
    cellSize, setCellSize,
    zoom, setZoom,
    selectedShape, setSelectedShape,
    liveCellsRef,
    offsetRef,
    liveCount,
    step,
    toggleCell,
    placeShape
  };
};
