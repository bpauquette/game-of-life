import { useState, useEffect } from 'react';

/**
 * Tracks mouse position in grid coordinates (cellX, cellY) based on canvas and cell size.
 * @param {Object} params
 * @param {React.RefObject} canvasRef - Ref to the canvas element
 * @param {number} cellSize - Size of a cell in pixels
 * @returns {{ x: number, y: number }} Grid coordinates
 */
const useGridMousePosition = ({ canvasRef, cellSize }) => {
  const [gridPosition, setGridPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateGridPosition = (ev) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = ev.clientX - rect.left;
      const canvasY = ev.clientY - rect.top;
      const x = Math.floor(canvasX / cellSize);
      const y = Math.floor(canvasY / cellSize);
      setGridPosition({ x, y });
    };
    globalThis.addEventListener('mousemove', updateGridPosition);
    return () => {
      globalThis.removeEventListener('mousemove', updateGridPosition);
    };
  }, [canvasRef, cellSize]);

  return gridPosition;
};

export default useGridMousePosition;
