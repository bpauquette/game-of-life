import { renderHook, act } from '@testing-library/react';
import { useShapeManager } from './useShapeManager';

const mockProps = {
  selectedShape: null,
  setSelectedShape: jest.fn(),
  selectedTool: 'draw',
  setSelectedTool: jest.fn(),
  toolStateRef: { current: {} },
  drawWithOverlay: jest.fn()
};

describe('useShapeManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return all expected interface methods and properties', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      expect(result.current).toHaveProperty('recentShapes');
      expect(result.current).toHaveProperty('paletteOpen');
      expect(result.current).toHaveProperty('selectShape');
      expect(result.current).toHaveProperty('openPalette');
      expect(result.current).toHaveProperty('closePalette');
      expect(result.current).toHaveProperty('selectShapeAndClosePalette');
      expect(result.current).toHaveProperty('generateShapeKey');
      expect(result.current).toHaveProperty('updateRecentShapesList');
      expect(result.current).toHaveProperty('updateShapeState');
    });

    it('should initialize with empty recent shapes', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      expect(result.current.recentShapes).toEqual([]);
    });

    it('should initialize with palette closed', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      expect(result.current.paletteOpen).toBe(false);
    });
  });

  describe('generateShapeKey', () => {
    it('should return string id for shapes with id property', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = { id: 'glider', name: 'Glider' };
      
      const key = result.current.generateShapeKey(shape);
      expect(key).toBe('glider');
    });

    it('should return string shapes as-is', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = 'glider';
      
      const key = result.current.generateShapeKey(shape);
      expect(key).toBe('glider');
    });

    it('should return JSON string for object shapes without id', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = { cells: [[0, 0], [1, 0]] };
      
      const key = result.current.generateShapeKey(shape);
      expect(key).toBe(JSON.stringify(shape));
    });

    it('should handle null and undefined shapes', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      
      expect(result.current.generateShapeKey(null)).toBe('null');
      expect(result.current.generateShapeKey(undefined)).toBeUndefined();
    });
  });

  describe('updateShapeState', () => {
    it('should call setSelectedShape with normalized shape', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = { id: 'glider', cells: [[0, 0]] };

      act(() => {
        result.current.updateShapeState(shape);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(shape);
      expect(mockProps.toolStateRef.current.selectedShapeData).toBe(shape);
    });

    it('should normalize null shape', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      act(() => {
        result.current.updateShapeState(null);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(null);
      expect(mockProps.toolStateRef.current.selectedShapeData).toBe(null);
    });

    it('should normalize undefined shape', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      act(() => {
        result.current.updateShapeState(undefined);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(null);
      expect(mockProps.toolStateRef.current.selectedShapeData).toBe(null);
    });

    it('should handle missing setSelectedShape gracefully', () => {
      const propsWithoutSetter = { ...mockProps, setSelectedShape: undefined };
      const { result } = renderHook(() => useShapeManager(propsWithoutSetter));

      expect(() => {
        act(() => {
          result.current.updateShapeState({ id: 'test' });
        });
      }).not.toThrow();
    });
  });

  describe('updateRecentShapesList', () => {
    it('should add new shape to beginning of list', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape1 = { id: 'glider' };
      const shape2 = { id: 'block' };

      act(() => {
        result.current.updateRecentShapesList(shape1);
      });

      expect(result.current.recentShapes).toEqual([shape1]);

      act(() => {
        result.current.updateRecentShapesList(shape2);
      });

      expect(result.current.recentShapes).toEqual([shape2, shape1]);
    });

    it('should remove duplicate shapes and move to front', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape1 = { id: 'glider' };
      const shape2 = { id: 'block' };

      act(() => {
        result.current.updateRecentShapesList(shape1);
      });

      act(() => {
        result.current.updateRecentShapesList(shape2);
      });

      act(() => {
        result.current.updateRecentShapesList(shape1); // Add glider again
      });

      expect(result.current.recentShapes).toEqual([shape1, shape2]);
    });

    it('should limit list to maximum size', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      
      // Add 25 shapes (more than MAX_RECENT_SHAPES = 20)
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.updateRecentShapesList({ id: `shape${i}` });
        }
      });

      expect(result.current.recentShapes).toHaveLength(20);
      expect(result.current.recentShapes[0]).toEqual({ id: 'shape24' });
      expect(result.current.recentShapes[19]).toEqual({ id: 'shape5' });
    });

    it('should handle shapes with same JSON but different references', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape1 = { cells: [[0, 0]] };
      const shape2 = { cells: [[0, 0]] }; // Same content, different reference

      act(() => {
        result.current.updateRecentShapesList(shape1);
      });

      act(() => {
        result.current.updateRecentShapesList(shape2);
      });

      expect(result.current.recentShapes).toHaveLength(1);
      expect(result.current.recentShapes[0]).toBe(shape2);
    });
  });

  describe('selectShape', () => {
    it('should update shape state, add to recent list, and trigger redraw', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = { id: 'glider' };

      act(() => {
        result.current.selectShape(shape);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(shape);
      expect(mockProps.toolStateRef.current.selectedShapeData).toBe(shape);
      expect(result.current.recentShapes).toEqual([shape]);
      expect(mockProps.drawWithOverlay).toHaveBeenCalled();
    });

    it('should not add null shape to recent list', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      act(() => {
        result.current.selectShape(null);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(null);
      expect(result.current.recentShapes).toEqual([]);
      expect(mockProps.drawWithOverlay).toHaveBeenCalled();
    });

    it('should not add undefined shape to recent list', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      act(() => {
        result.current.selectShape(undefined);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(null);
      expect(result.current.recentShapes).toEqual([]);
      expect(mockProps.drawWithOverlay).toHaveBeenCalled();
    });
  });

  describe('palette management', () => {
    it('should open palette and switch to shapes tool', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      act(() => {
        result.current.openPalette();
      });

      expect(result.current.paletteOpen).toBe(true);
      expect(mockProps.setSelectedTool).toHaveBeenCalledWith('shapes');
    });

    it('should handle missing setSelectedTool when opening palette', () => {
      const propsWithoutSetter = { ...mockProps, setSelectedTool: undefined };
      const { result } = renderHook(() => useShapeManager(propsWithoutSetter));

      expect(() => {
        act(() => {
          result.current.openPalette();
        });
      }).not.toThrow();

      expect(result.current.paletteOpen).toBe(true);
    });

    it('should close palette and restore previous tool by default', () => {
      const { result } = renderHook(() => useShapeManager({
        ...mockProps,
        selectedTool: 'line'
      }));

      // Open palette (saves current tool)
      act(() => {
        result.current.openPalette();
      });

      // Close palette with restore
      act(() => {
        result.current.closePalette(true);
      });

      expect(result.current.paletteOpen).toBe(false);
      expect(mockProps.setSelectedTool).toHaveBeenLastCalledWith('line');
    });

    it('should close palette without restoring previous tool when requested', () => {
      const { result } = renderHook(() => useShapeManager({
        ...mockProps,
        selectedTool: 'line'
      }));

      // Open palette
      act(() => {
        result.current.openPalette();
      });

      // Close palette without restore
      act(() => {
        result.current.closePalette(false);
      });

      expect(result.current.paletteOpen).toBe(false);
      // Should not restore to 'line', only the 'shapes' call from open
      expect(mockProps.setSelectedTool).toHaveBeenCalledTimes(1);
    });

    it('should handle missing previous tool when closing', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      // Close palette without opening (no previous tool stored)
      act(() => {
        result.current.closePalette(true);
      });

      expect(result.current.paletteOpen).toBe(false);
      // Should not call setSelectedTool since no previous tool was stored
      expect(mockProps.setSelectedTool).not.toHaveBeenCalled();
    });
  });

  describe('selectShapeAndClosePalette', () => {
    it('should select shape and close palette without restoring tool', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = { id: 'glider' };

      // Open palette first
      act(() => {
        result.current.openPalette();
      });

      act(() => {
        result.current.selectShapeAndClosePalette(shape);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(shape);
      expect(result.current.recentShapes).toEqual([shape]);
      expect(result.current.paletteOpen).toBe(false);
      expect(mockProps.drawWithOverlay).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle all functions without required props', () => {
      const minimalProps = {
        selectedShape: null,
        setSelectedShape: undefined,
        selectedTool: 'draw',
        setSelectedTool: undefined,
        toolStateRef: { current: {} },
        drawWithOverlay: jest.fn()
      };
      
      const { result } = renderHook(() => useShapeManager(minimalProps));
      
      expect(() => {
        act(() => {
          result.current.selectShape({ id: 'test' });
          result.current.openPalette();
          result.current.closePalette();
          result.current.updateShapeState({ id: 'test' });
        });
      }).not.toThrow();
    });

    it('should handle complex shapes in key generation', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      
      const complexShape = {
        name: 'Complex',
        cells: [[0, 0], [1, 1], [2, 2]],
        metadata: { author: 'test', description: 'A test shape' }
      };

      expect(() => {
        act(() => {
          result.current.updateRecentShapesList(complexShape);
        });
      }).not.toThrow();

      expect(result.current.recentShapes).toContain(complexShape);
    });

    it('should handle circular references in shape objects gracefully', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      
      const circularShape = { id: 'circular' };
      circularShape.self = circularShape;

      // Should not throw when generating key (falls back to id)
      expect(() => {
        act(() => {
          result.current.updateRecentShapesList(circularShape);
        });
      }).not.toThrow();
    });
  });
});