import { renderHook, act } from '@testing-library/react';
import { useShapeManager } from '../view/hooks/useShapeManager';

const noop = () => {};

const createShapeManager = () => {
  const toolStateRef = { current: {} };
  return renderHook(() => useShapeManager({
    toolStateRef,
    drawWithOverlay: noop,
    model: null,
    selectedTool: 'draw',
    setSelectedTool: noop,
    setSelectedShape: noop
  }));
};

describe('useShapeManager recent shapes cell safety', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('immediately stores normalized cells for shapes that arrive with pattern data', () => {
    const { result } = createShapeManager();
    act(() => {
      result.current.addRecentShape({
        id: 'p1',
        pattern: [
          [5, 5],
          [6, 6]
        ]
      });
    });
    const first = result.current.recentShapes[0];
    expect(first.cells).toEqual([[0, 0], [1, 1]]);
    expect(first.meta.cellCount).toBe(2);
  });

  it('retains cell data after the deferred normalization pass completes', () => {
    jest.useFakeTimers();
    const { result } = createShapeManager();
    act(() => {
      result.current.addRecentShape({
        id: 'p2',
        pattern: [[10, 4]]
      });
    });
    expect(result.current.recentShapes[0].cells).toEqual([[0, 0]]);
    act(() => {
      jest.runAllTimers();
    });
    expect(result.current.recentShapes[0].cells).toEqual([[0, 0]]);
    jest.useRealTimers();
  });
});
