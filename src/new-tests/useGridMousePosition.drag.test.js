import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useGridMousePosition from '../../src/view/hooks/useGridMousePosition';

function TestComp({ canvasRef, offset }) {
  const offsetRef = useRef(offset);
  const pos = useGridMousePosition({ canvasRef, cellSize: 16, offsetRef });
  return (
    <div>
      <div data-testid="pos">{pos ? `${pos.fx},${pos.fy}` : ''}</div>
    </div>
  );
}

describe('useGridMousePosition during drag', () => {
  it('updates fractional coords while pointer moves (dragging)', async () => {
    // create a canvas-like object and set as ref.current before rendering
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 200; canvasEl.height = 200;
    canvasEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });
    // stub addEventListener/remove to satisfy hook
    canvasEl.addEventListener = jest.fn();
    canvasEl.removeEventListener = jest.fn();
    const canvasRef = { current: canvasEl };
    render(<TestComp canvasRef={canvasRef} offset={{ x: 0, y: 0, cellSize: 16 }} />);

    // initial move
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 120, clientY: 110, bubbles: true }));

    await waitFor(() => {
      const txt = screen.getByTestId('pos').textContent;
      expect(txt).toBeTruthy();
    });

    const first = screen.getByTestId('pos').textContent;

    // simulate dragging further
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 160, clientY: 140, bubbles: true }));

    await waitFor(() => {
      const second = screen.getByTestId('pos').textContent;
      expect(second).not.toEqual(first);
    });
  });
});
