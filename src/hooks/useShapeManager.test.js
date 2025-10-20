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

  describe('Shape Array Management and Positioning', () => {
    const createShape = (id, name = null) => ({
      id,
      name: name || `Shape ${id}`,
      cells: [{ x: 0, y: 0 }]
    });

    it('should add new shapes to the beginning of the array', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      // Add first shape
      act(() => {
        result.current.updateRecentShapesList(createShape('shape1'));
      });

      expect(result.current.recentShapes).toEqual([createShape('shape1')]);

      // Add second shape - should go to beginning
      act(() => {
        result.current.updateRecentShapesList(createShape('shape2'));
      });

      expect(result.current.recentShapes).toEqual([
        createShape('shape2'),
        createShape('shape1')
      ]);

      // Add third shape - should go to beginning
      act(() => {
        result.current.updateRecentShapesList(createShape('shape3'));
      });

      expect(result.current.recentShapes).toEqual([
        createShape('shape3'),
        createShape('shape2'),
        createShape('shape1')
      ]);
    });

    it('should remove duplicates and move to front when same shape is selected again', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape1 = createShape('shape1');
      const shape2 = createShape('shape2');
      const shape3 = createShape('shape3');

      // Add initial shapes
      act(() => {
        result.current.updateRecentShapesList(shape1);
        result.current.updateRecentShapesList(shape2);
        result.current.updateRecentShapesList(shape3);
      });

      expect(result.current.recentShapes).toEqual([shape3, shape2, shape1]);

      // Re-select shape1 - should move to front and remove duplicate
      act(() => {
        result.current.updateRecentShapesList(shape1);
      });

      expect(result.current.recentShapes).toEqual([shape1, shape3, shape2]);
      expect(result.current.recentShapes).toHaveLength(3); // No duplicates
    });

    it('should enforce MAX_RECENT_SHAPES limit (20)', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      // Add 25 shapes (more than MAX_RECENT_SHAPES = 20)
      const shapes = Array.from({ length: 25 }, (_, i) => createShape(`shape${i}`));
      
      act(() => {
        shapes.forEach(shape => {
          result.current.updateRecentShapesList(shape);
        });
      });

      // Should only keep the latest 20 shapes
      expect(result.current.recentShapes).toHaveLength(20);
      
      // Should be the last 20 shapes in reverse order (newest first)
      const expectedShapes = shapes.slice(-20).reverse();
      expect(result.current.recentShapes).toEqual(expectedShapes);
    });

    it('should maintain FIFO behavior - oldest shapes disappear when limit exceeded', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      // Add exactly 20 shapes (the limit)
      const initialShapes = Array.from({ length: 20 }, (_, i) => createShape(`initial${i}`));
      
      act(() => {
        initialShapes.forEach(shape => {
          result.current.updateRecentShapesList(shape);
        });
      });

      expect(result.current.recentShapes).toHaveLength(20);
      
      // The first shape added should be at the end
      const firstShape = createShape('initial0');
      expect(result.current.recentShapes[19]).toEqual(firstShape);

      // Add one more shape
      const newShape = createShape('new');
      act(() => {
        result.current.updateRecentShapesList(newShape);
      });

      // Should still have 20 shapes
      expect(result.current.recentShapes).toHaveLength(20);
      
      // New shape should be at the beginning
      expect(result.current.recentShapes[0]).toEqual(newShape);
      
      // Oldest shape should have been removed
      expect(result.current.recentShapes).not.toContain(firstShape);
    });

    it('should handle deduplication correctly with different key generation strategies', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));

      const shapeWithId = { id: 'test', cells: [{ x: 0, y: 0 }] };
      const shapeWithString = 'stringShape';
      const shapeWithObject = { cells: [{ x: 1, y: 1 }] };

      act(() => {
        result.current.updateRecentShapesList(shapeWithId);
        result.current.updateRecentShapesList(shapeWithString);
        result.current.updateRecentShapesList(shapeWithObject);
      });

      // All shapes should be present
      expect(result.current.recentShapes).toHaveLength(3);

      // Re-add the same shapes - should deduplicate and move to front
      act(() => {
        result.current.updateRecentShapesList(shapeWithId); // Same ID
        result.current.updateRecentShapesList(shapeWithString); // Same string
        result.current.updateRecentShapesList(shapeWithObject); // Same JSON
      });

      // Should still have 3 unique shapes, but in new order
      expect(result.current.recentShapes).toHaveLength(3);
      expect(result.current.recentShapes[0]).toEqual(shapeWithObject);
      expect(result.current.recentShapes[1]).toEqual(shapeWithString);
      expect(result.current.recentShapes[2]).toEqual(shapeWithId);
    });

    it('should handle selectShape with proper array management', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape1 = createShape('shape1');
      const shape2 = createShape('shape2');

      // selectShape should update both game state and recent shapes
      act(() => {
        result.current.selectShape(shape1);
      });

      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(shape1);
      expect(result.current.recentShapes).toEqual([shape1]);
      expect(mockProps.toolStateRef.current.selectedShapeData).toBe(shape1);
      expect(mockProps.drawWithOverlay).toHaveBeenCalled();

      // Select another shape
      act(() => {
        result.current.selectShape(shape2);
      });

      expect(result.current.recentShapes).toEqual([shape2, shape1]);
      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(shape2);
    });

    it('should not add shape to recent list when selectShape called with null', () => {
      const { result } = renderHook(() => useShapeManager(mockProps));
      const shape = createShape('shape1');

      // Add a shape first
      act(() => {
        result.current.selectShape(shape);
      });

      expect(result.current.recentShapes).toEqual([shape]);

      // Clear selection
      act(() => {
        result.current.selectShape(null);
      });

      // Recent shapes should remain unchanged
      expect(result.current.recentShapes).toEqual([shape]);
      expect(mockProps.setSelectedShape).toHaveBeenCalledWith(null);
    });
  });
});