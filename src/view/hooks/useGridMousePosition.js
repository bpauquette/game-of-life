import { useState, useEffect, useRef } from 'react';
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
  const lastClientRef = useRef(null);

  useEffect(() => {
    if (!canvas) return undefined;
    const defaultOffsetRef = { current: { x: 0, y: 0, cellSize: cellSize } };
    const targetOffsetRef = offsetRef?.current ? offsetRef : defaultOffsetRef;
    const getEffectiveCellSize = () => {
      // Prefer the dynamic cellSize from offsetRef (reflects zoom changes).
      const dynamic = targetOffsetRef.current?.cellSize;
      const size = (typeof dynamic === 'number' && dynamic > 0) ? dynamic : (cellSize || 1);
      return size > 0 ? size : 1;
    };
    const handleMove = (ev) => {
      // remember client coords so wheel/zoom handlers can recompute from
      // the last known cursor position even when pointer events aren't fired
      try { lastClientRef.current = { x: ev.clientX, y: ev.clientY }; } catch (e) { /* ignore */ }
      // Compute both exact (fractional) and floored cell coords so renderers
      // can draw precise crosshairs while still exposing integer cell indices.
      const rect = canvas.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
      const centerX = (rect.width || 0) / 2;
      const centerY = (rect.height || 0) / 2;
      const eff = getEffectiveCellSize();
      const fx = targetOffsetRef.current.x + (ev.clientX - rect.left - centerX) / eff;
      const fy = targetOffsetRef.current.y + (ev.clientY - rect.top - centerY) / eff;
      const point = { x: Math.floor(fx), y: Math.floor(fy), fx, fy };
      setGridPosition((prev) => (prev && prev.x === point.x && prev.y === point.y && prev.fx === point.fx && prev.fy === point.fy ? prev : point));
    };
    const handleWheel = (ev) => {
      // When zooming (wheel) the mouse may not move; recompute grid pos
      const last = lastClientRef.current || { x: ev.clientX, y: ev.clientY };
      const rect = canvas.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
      const centerX = (rect.width || 0) / 2;
      const centerY = (rect.height || 0) / 2;
      const eff = getEffectiveCellSize();
      const fx = targetOffsetRef.current.x + (last.x - rect.left - centerX) / eff;
      const fy = targetOffsetRef.current.y + (last.y - rect.top - centerY) / eff;
      const point = { x: Math.floor(fx), y: Math.floor(fy), fx, fy };
      setGridPosition((prev) => (prev && prev.x === point.x && prev.y === point.y && prev.fx === point.fx && prev.fy === point.fy ? prev : point));
    };
    const handleLeave = () => setGridPosition(null);
    // Listen to pointer events as well so dragging (pointermove) updates the
    // grid position while a pointer capture is active. Keep mousemove for
    // environments that don't use pointer events.
    globalThis.addEventListener('pointermove', handleMove);
    globalThis.addEventListener('mousemove', handleMove);
    globalThis.addEventListener('wheel', handleWheel, { passive: true });
    canvas.addEventListener('mouseleave', handleLeave);

    // If offset/zoom changes while the pointer is stationary, attempt a
    // recompute using the last known client coords so overlays stay in-sync.
    if (lastClientRef.current) {
      const rect = canvas.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
      const centerX = (rect.width || 0) / 2;
      const centerY = (rect.height || 0) / 2;
      const eff = getEffectiveCellSize();
      const fx = targetOffsetRef.current.x + (lastClientRef.current.x - rect.left - centerX) / eff;
      const fy = targetOffsetRef.current.y + (lastClientRef.current.y - rect.top - centerY) / eff;
      const pt = { x: Math.floor(fx), y: Math.floor(fy), fx, fy };
      if (pt) setGridPosition((prev) => (prev && prev.x === pt.x && prev.y === pt.y && prev.fx === pt.fx && prev.fy === pt.fy ? prev : pt));
    }

    return () => {
      globalThis.removeEventListener('pointermove', handleMove);
      globalThis.removeEventListener('mousemove', handleMove);
      globalThis.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [canvas, offsetRef, cellSize]);

  return gridPosition;
};

export default useGridMousePosition;
