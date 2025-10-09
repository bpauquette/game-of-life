// gameState.js
import { useState, useRef, useCallback } from 'react';
import { step as gameStep } from './gameLogic';

export const useGameState = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [cellSize, setCellSize] = useState(20);
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
    if (liveCellsRef.current.has(key)) liveCellsRef.current.delete(key);
    else liveCellsRef.current.set(key, true);
    setLiveCount(liveCellsRef.current.size);
  }, []);

  const placeShape = useCallback((x, y, shapes, selectedShape) => {
    if (!selectedShape) return;
    shapes[selectedShape].forEach(([dx, dy]) => liveCellsRef.current.set(`${x + dx},${y + dy}`, true));
    setLiveCount(liveCellsRef.current.size);
  }, []);

  return {
    isRunning, setIsRunning,
    cellSize, setCellSize,
    selectedShape, setSelectedShape,
    liveCount,
    liveCellsRef,
    offsetRef,
    step,
    toggleCell,
    placeShape
  };
};
