import { useState, useEffect } from 'react';
import { eventToCellFromCanvas } from '../../controller/utils/canvasUtils';

/**
 * Tracks mouse position in grid coordinates (cellX, cellY) based on canvas and cell size.
 * @param {Object} params
 * @param {React.RefObject} canvasRef - Ref to the canvas element
 * @param {number} cellSize - Size of a cell in pixels
 * @param {React.RefObject} offsetRef - Ref containing world offset and zoom info
 * @returns {{ x: number, y: number } | null} Grid coordinates
 */
const useGridMousePosition = ({ canvasRef, cellSize, offsetRef }) => {
  const [gridPosition, setGridPosition] = useState(null);
  const canvas = canvasRef?.current;

  useEffect(() => {
    if (!canvas) return undefined;
    const defaultOffsetRef = { current: { x: 0, y: 0, cellSize: cellSize } };
    const targetOffsetRef = offsetRef?.current ? offsetRef : defaultOffsetRef;
    const getEffectiveCellSize = () => {
      const size = cellSize || targetOffsetRef.current?.cellSize;
      return size > 0 ? size : 1;
    };
    const handleMove = (ev) => {
      const point = eventToCellFromCanvas(ev, canvas, targetOffsetRef, getEffectiveCellSize());
      if (!point) return;
      setGridPosition((prev) => (prev && prev.x === point.x && prev.y === point.y ? prev : point));
    };
    const handleLeave = () => setGridPosition(null);
    globalThis.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    return () => {
      globalThis.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [canvas, offsetRef, cellSize]);

  return gridPosition;
};

export default useGridMousePosition;
