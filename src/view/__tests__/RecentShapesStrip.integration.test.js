import React, { useEffect, useRef } from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentShapesStrip from '../RecentShapesStrip';
import { useShapeManager } from '../hooks/useShapeManager';

const noop = () => {};
const colorScheme = {
  background: '#000000',
  getCellColor: () => '#00ff88'
};

function StripHarness({ shape }) {
  const toolStateRef = useRef({});
  const manager = useShapeManager({
    toolStateRef,
    drawWithOverlay: noop,
    model: null,
    selectedTool: 'draw',
    setSelectedTool: noop,
    setSelectedShape: noop
  });

  useEffect(() => {
    if (shape) {
      manager.addRecentShape(shape);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  return (
    <RecentShapesStrip
      recentShapes={manager.recentShapes}
      selectShape={noop}
      drawWithOverlay={noop}
      colorScheme={colorScheme}
      selectedShape={null}
      onRotateShape={noop}
      onSwitchToShapesTool={noop}
      onSaveRecentShapes={undefined}
      persistenceStatus={{}}
    />
  );
}

describe('RecentShapesStrip integration', () => {
  afterEach(() => {
    cleanup();
    if (typeof localStorage?.clear === 'function') {
      localStorage.clear();
    }
  });

  it('renders live cells for shapes added through useShapeManager even when only pattern data is provided', async () => {
    const shape = {
      id: 'pattern-shape',
      name: 'Pattern shape',
      pattern: [
        [5, 5],
        [6, 5],
        [6, 6]
      ]
    };

    const { container } = render(<StripHarness shape={shape} />);

    await waitFor(() => {
      const rects = container.querySelectorAll('svg[data-shape-id="pattern-shape"] rect');
      expect(rects.length).toBe(3);
    });
  });
});