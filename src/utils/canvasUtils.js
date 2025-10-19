// canvasUtils.js
// Small helpers for canvas coordinate math and drawing used by GameOfLife.

export function computeComputedOffset(canvas, offsetRef, cellSize) {
  if (!canvas || !offsetRef) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  return {
    x: offsetRef.current.x * cellSize - centerX,
    y: offsetRef.current.y * cellSize - centerY
  };
}

export function eventToCellFromCanvas(e, canvas, offsetRef, cellSize) {
  if (!canvas || !offsetRef?.current) return null;
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const x = Math.floor(offsetRef.current.x + (e.clientX - rect.left - centerX) / cellSize);
  const y = Math.floor(offsetRef.current.y + (e.clientY - rect.top - centerY) / cellSize);
  return { x, y };
}

export function drawLiveCells(ctx, liveMap, computedOffset, cellSize, colorScheme) {
  if (!ctx || !liveMap) return;
  for (const [key] of liveMap.entries()) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = colorScheme.getCellColor(x, y);
    ctx.fillRect(
      x * cellSize - computedOffset.x,
      y * cellSize - computedOffset.y,
      cellSize,
      cellSize
    );
  }
}

// No default export: prefer named exports used across the codebase to avoid
// anonymous default export lint warnings.
