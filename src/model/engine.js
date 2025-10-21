// engine.js
import { useEffect, useRef } from 'react';

/**
 * Central loop: calls tick() every animation frame while isRunning is true.
 * tick() should do: step (maybe throttled), animateZoom, draw.
 */
export function useEngine(isRunning, tick) {
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const loop = () => {
      tick();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);
}
