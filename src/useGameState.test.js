import { renderHook, act } from '@testing-library/react';
import { useGameState } from './useGameState';
import * as gameLogic from './gameLogic';

// Mock the gameLogic module
jest.mock('./gameLogic');

describe('useGameState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state values', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.isRunning).toBe(false);
    expect(result.current.cellSize).toBe(20);
    expect(result.current.zoom).toBe(1);
    expect(result.current.selectedShape).toBe(null);
    expect(result.current.liveCount).toBe(0);
    expect(result.current.liveCellsRef.current).toBeInstanceOf(Map);
    expect(result.current.offsetRef.current).toEqual({ x: 0, y: 0 });
  });

  it('should provide setter functions', () => {
    const { result } = renderHook(() => useGameState());

    expect(typeof result.current.setIsRunning).toBe('function');
    expect(typeof result.current.setCellSize).toBe('function');
    expect(typeof result.current.setZoom).toBe('function');
    expect(typeof result.current.setSelectedShape).toBe('function');
  });

  it('should provide game control functions', () => {
    const { result } = renderHook(() => useGameState());

    expect(typeof result.current.step).toBe('function');
    expect(typeof result.current.toggleCell).toBe('function');
    expect(typeof result.current.placeShape).toBe('function');
  });

  describe('step function', () => {
    it('should call gameStep with current live cells', () => {
      const mockNewMap = new Map([['1,1', true], ['2,2', true]]);
      gameLogic.step.mockReturnValue(mockNewMap);

      const { result } = renderHook(() => useGameState());

      // Add some initial cells
      act(() => {
        result.current.liveCellsRef.current.set('0,0', true);
      });

      const initialMap = result.current.liveCellsRef.current;

      act(() => {
        result.current.step();
      });

      expect(gameLogic.step).toHaveBeenCalledWith(initialMap);
      expect(result.current.liveCellsRef.current).toBe(mockNewMap);
      expect(result.current.liveCount).toBe(2);
    });
  });

  describe('toggleCell function', () => {
    it('should add cell if not present', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.toggleCell(5, 3);
      });

      expect(result.current.liveCellsRef.current.has('5,3')).toBe(true);
      expect(result.current.liveCount).toBe(1);
    });

    it('should remove cell if present', () => {
      const { result } = renderHook(() => useGameState());

      // Add cell first
      act(() => {
        result.current.toggleCell(5, 3);
      });

      expect(result.current.liveCellsRef.current.has('5,3')).toBe(true);
      expect(result.current.liveCount).toBe(1);

      // Toggle again to remove
      act(() => {
        result.current.toggleCell(5, 3);
      });

      expect(result.current.liveCellsRef.current.has('5,3')).toBe(false);
      expect(result.current.liveCount).toBe(0);
    });

    it('should handle multiple cells correctly', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.toggleCell(1, 1);
        result.current.toggleCell(2, 2);
        result.current.toggleCell(3, 3);
      });

      expect(result.current.liveCount).toBe(3);

      // Remove middle cell
      act(() => {
        result.current.toggleCell(2, 2);
      });

      expect(result.current.liveCount).toBe(2);
      expect(result.current.liveCellsRef.current.has('2,2')).toBe(false);
    });
  });

  describe('placeShape function', () => {
    it('should place shape at specified coordinates', () => {
      const { result } = renderHook(() => useGameState());
      const shapes = {
        glider: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2]]
      };

      act(() => {
        result.current.placeShape(5, 5, shapes, 'glider');
      });

      expect(result.current.liveCellsRef.current.has('5,5')).toBe(true); // 5+0, 5+0
      expect(result.current.liveCellsRef.current.has('6,5')).toBe(true); // 5+1, 5+0
      expect(result.current.liveCellsRef.current.has('7,5')).toBe(true); // 5+2, 5+0
      expect(result.current.liveCellsRef.current.has('7,6')).toBe(true); // 5+2, 5+1
      expect(result.current.liveCellsRef.current.has('6,7')).toBe(true); // 5+1, 5+2
      expect(result.current.liveCount).toBe(5);
    });

    it('should not place shape when selectedShape is null', () => {
      const { result } = renderHook(() => useGameState());
      const shapes = {
        glider: [[0, 0], [1, 0]]
      };

      act(() => {
        result.current.placeShape(5, 5, shapes, null);
      });

      expect(result.current.liveCount).toBe(0);
      expect(result.current.liveCellsRef.current.size).toBe(0);
    });

    it('should place shape with negative coordinates', () => {
      const { result } = renderHook(() => useGameState());
      const shapes = {
        small: [[0, 0], [-1, -1], [1, 1]]
      };

      act(() => {
        result.current.placeShape(0, 0, shapes, 'small');
      });

      expect(result.current.liveCellsRef.current.has('0,0')).toBe(true);
      expect(result.current.liveCellsRef.current.has('-1,-1')).toBe(true);
      expect(result.current.liveCellsRef.current.has('1,1')).toBe(true);
      expect(result.current.liveCount).toBe(3);
    });
  });

  describe('state updates', () => {
    it('should update isRunning state', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setIsRunning(true);
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('should update cellSize state', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setCellSize(30);
      });

      expect(result.current.cellSize).toBe(30);
    });

    it('should update zoom state', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setZoom(2.5);
      });

      expect(result.current.zoom).toBe(2.5);
    });

    it('should update selectedShape state', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setSelectedShape('glider');
      });

      expect(result.current.selectedShape).toBe('glider');

      act(() => {
        result.current.setSelectedShape(null);
      });

      expect(result.current.selectedShape).toBe(null);
    });
  });

  describe('return object structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useGameState());

      const expectedKeys = [
        'isRunning', 'setIsRunning',
        'cellSize', 'setCellSize',
        'zoom', 'setZoom',
        'selectedShape', 'setSelectedShape',
        'liveCellsRef', 'offsetRef', 'liveCount',
        'step', 'toggleCell', 'placeShape'
      ];

      expectedKeys.forEach(key => {
        expect(result.current).toHaveProperty(key);
      });
    });
  });

  describe('refs persistence', () => {
    it('should maintain liveCellsRef across renders', () => {
      const { result, rerender } = renderHook(() => useGameState());

      act(() => {
        result.current.toggleCell(1, 1);
      });

      const initialRef = result.current.liveCellsRef;

      rerender();

      expect(result.current.liveCellsRef).toBe(initialRef);
      expect(result.current.liveCellsRef.current.has('1,1')).toBe(true);
    });

    it('should maintain offsetRef across renders', () => {
      const { result, rerender } = renderHook(() => useGameState());

      const initialOffsetRef = result.current.offsetRef;
      result.current.offsetRef.current = { x: 10, y: 20 };

      rerender();

      expect(result.current.offsetRef).toBe(initialOffsetRef);
      expect(result.current.offsetRef.current).toEqual({ x: 10, y: 20 });
    });
  });
});