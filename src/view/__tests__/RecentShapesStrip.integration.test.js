import React, { useEffect, useRef } from 'react';
import { render, waitFor, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentShapesStrip from '../RecentShapesStrip';
import { useShapeManager } from '../hooks/useShapeManager';

const noop = () => {};
const colorScheme = {
  background: '#000000',
  getCellColor: () => '#00ff88'
};

function StripHarness({ shape, enablePersistenceControls = false }) {
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
      onSaveRecentShapes={enablePersistenceControls ? manager.persistRecentShapes : undefined}
      onClearRecentShapes={enablePersistenceControls ? manager.clearRecentShapes : undefined}
      persistenceStatus={enablePersistenceControls ? manager.persistenceState : {}}
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

    render(<StripHarness shape={shape} />);
    await waitFor(() => {
      const rects = screen.getAllByTestId('pattern-shape-rect');
      expect(rects.length).toBe(3);
    });
  });

  it('clears all recent shapes when the clear button is clicked', async () => {
    const shape = {
      id: 'clearable-shape',
      name: 'Clearable shape',
      pattern: [
        [0, 0],
        [1, 0]
      ]
    };

    render(<StripHarness shape={shape} enablePersistenceControls />);
    await waitFor(() => {
      const rects = screen.getAllByTestId('clearable-shape-rect');
      expect(rects.length).toBe(2);
    });

    fireEvent.click(screen.getByTestId('recent-clear-button'));

    await waitFor(() => {
      const rects = screen.queryAllByTestId('clearable-shape-rect');
      expect(rects.length).toBe(0);
    });
  });
});