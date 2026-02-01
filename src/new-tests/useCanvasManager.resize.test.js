import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useCanvasManager from '../../src/view/hooks/useCanvasManager.js';

function TestCanvas() {
  const offsetRef = React.useRef({ x: 0, y: 0 });
  const toolStateRef = React.useRef({});
  const canvasRef = React.useRef(null);
  useCanvasManager({
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
    logger: console,
    canvasRef
  });

  return (
    <div data-testid="container" style={{ width: '800px', height: '600px' }}>
      <canvas data-testid="canvas" ref={canvasRef} />
    </div>
  );
}

test('resize observer triggers canvas resize', async () => {
  render(<TestCanvas />);
  const canvas = screen.getByTestId('canvas');

  // initial style may be set, trigger a resize via the mock ResizeObserver
  // Simulate a contentRect change on the parent element (container)
  const container = screen.getByTestId('container');
  // call the helper to trigger all observers
  globalThis.ResizeObserver.__trigger([{ target: container, contentRect: { width: 500, height: 400 } }]);

  // style.width is set to logical px
  await waitFor(() => expect(canvas.style.width).toBe('500px'));
  // canvas.width (pixel buffer) should match content width * devicePixelRatio (setupTests sets dpr=1)
  await waitFor(() => expect(canvas.width).toBe(500));
  await waitFor(() => expect(canvas.style.height).toBe('400px'));
  await waitFor(() => expect(canvas.height).toBe(400));
});
