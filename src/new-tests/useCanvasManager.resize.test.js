import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useCanvasManager from '../../src/view/hooks/useCanvasManager';

function TestCanvas() {
  const offsetRef = React.useRef({ x: 0, y: 0 });
  const toolStateRef = React.useRef({});
  const { canvasRef } = useCanvasManager({
    getLiveCells: () => new Map(),
    cellSize: 8,
    offsetRef,
    colorScheme: {},
    selectedTool: null,
    toolMap: {},
    toolStateRef,
    setCellAlive: () => {},
    scheduleCursorUpdate: () => {},
    selectedShape: null,
    placeShape: () => {},
    logger: console
  });

  return (
    <div data-testid="container" style={{ width: '800px', height: '600px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

test('resize observer triggers canvas resize', async () => {
  render(<TestCanvas />);
  const canvas = document.querySelector('canvas');
  expect(canvas).toBeTruthy();

  // initial style may be set, trigger a resize via the mock ResizeObserver
  // Simulate a contentRect change on the parent element (container)
  const parent = canvas.parentElement;
  // call the helper to trigger all observers
  globalThis.ResizeObserver.__trigger([{ target: parent, contentRect: { width: 500, height: 400 } }]);

  await waitFor(() => {
    // style.width is set to logical px
    expect(canvas.style.width).toBe('500px');
    // canvas.width (pixel buffer) should match content width * devicePixelRatio (setupTests sets dpr=1)
    expect(canvas.width).toBe(500);
    expect(canvas.style.height).toBe('400px');
    expect(canvas.height).toBe(400);
  });
});
