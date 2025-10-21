import { shapesTool } from './shapesTool';
import logger from '../utils/logger';

// Mock logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

describe('shapesTool', () => {
  let toolState;
  let mockSetCellAlive;
  let mockPlaceShape;
  let mockCtx;
  let mockColorScheme;
  let consoleWarnSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
    mockPlaceShape = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1
    };
    mockColorScheme = {
      getCellColor: jest.fn().mockReturnValue('#ff0000')
    };
    
    // Clear mock calls
    logger.debug.mockClear();
    logger.error.mockClear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('onMouseDown', () => {
    it('should initialize tool state with start and last positions', () => {
      shapesTool.onMouseDown(toolState, 5, 3);

      expect(toolState.start).toEqual({ x: 5, y: 3 });
      expect(toolState.last).toEqual({ x: 5, y: 3 });
      expect(toolState.dragging).toBe(true);
    });

    it('should handle negative coordinates', () => {
      shapesTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
      expect(toolState.dragging).toBe(true);
    });

    it('should handle zero coordinates', () => {
      shapesTool.onMouseDown(toolState, 0, 0);

      expect(toolState.start).toEqual({ x: 0, y: 0 });
      expect(toolState.last).toEqual({ x: 0, y: 0 });
      expect(toolState.dragging).toBe(true);
    });

    it('should overwrite existing state', () => {
      toolState.start = { x: 10, y: 20 };
      toolState.last = { x: 15, y: 25 };
      toolState.dragging = false;

      shapesTool.onMouseDown(toolState, 1, 2);

      expect(toolState.start).toEqual({ x: 1, y: 2 });
      expect(toolState.last).toEqual({ x: 1, y: 2 });
      expect(toolState.dragging).toBe(true);
    });
  });

  describe('onMouseMove', () => {
    it('should update last position', () => {
      toolState.last = { x: 5, y: 5 };

      shapesTool.onMouseMove(toolState, 10, 15);

      expect(toolState.last).toEqual({ x: 10, y: 15 });
    });

    it('should handle negative coordinates', () => {
      shapesTool.onMouseMove(toolState, -3, -7);

      expect(toolState.last).toEqual({ x: -3, y: -7 });
    });

    it('should handle zero coordinates', () => {
      shapesTool.onMouseMove(toolState, 0, 0);

      expect(toolState.last).toEqual({ x: 0, y: 0 });
    });

    it('should work when no previous last position exists', () => {
      expect(toolState.last).toBeUndefined();

      shapesTool.onMouseMove(toolState, 7, 8);

      expect(toolState.last).toEqual({ x: 7, y: 8 });
    });
  });

  describe('onMouseUp', () => {
    it('should place shape and reset state when last position exists', () => {
      toolState.start = { x: 0, y: 0 };
      toolState.last = { x: 5, y: 3 };
      toolState.dragging = true;

      shapesTool.onMouseUp(toolState, 10, 15, mockSetCellAlive, mockPlaceShape);

      expect(mockPlaceShape).toHaveBeenCalledWith(5, 3);
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.dragging).toBe(false);
    });

    it('should use provided coordinates when no last position exists', () => {
      toolState.last = null;

      shapesTool.onMouseUp(toolState, 7, 9, mockSetCellAlive, mockPlaceShape);

      expect(mockPlaceShape).toHaveBeenCalledWith(7, 9);
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.dragging).toBe(false);
    });

    it('should handle undefined coordinates when no last position', () => {
      toolState.last = null;

      shapesTool.onMouseUp(toolState, undefined, undefined, mockSetCellAlive, mockPlaceShape);

      expect(mockPlaceShape).not.toHaveBeenCalled();
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.dragging).toBe(false);
    });

    it('should not place shape if placeShape function not provided', () => {
      toolState.last = { x: 5, y: 3 };

      shapesTool.onMouseUp(toolState, 10, 15, mockSetCellAlive, null);

      // Should still reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.dragging).toBe(false);
    });

    it('should handle negative coordinates', () => {
      toolState.last = { x: -2, y: -3 };

      shapesTool.onMouseUp(toolState, 1, 2, mockSetCellAlive, mockPlaceShape);

      expect(mockPlaceShape).toHaveBeenCalledWith(-2, -3);
    });

    it('should reset state even without valid placement coordinates', () => {
      toolState.start = { x: 1, y: 2 };
      toolState.dragging = true;
      toolState.last = null;

      shapesTool.onMouseUp(toolState, null, null, mockSetCellAlive, mockPlaceShape);

      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.dragging).toBe(false);
    });
  });

  describe('drawOverlay', () => {
    const cellSize = 10;
    const offset = { x: 0, y: 0 };

    it('should return early if no selected shape data', () => {
      toolState.selectedShapeData = null;
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith('No shape selected for preview');
    });

    it('should return early if no last position', () => {
      toolState.selectedShapeData = [[0, 0], [1, 0]];
      toolState.last = null;

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith('No position for shape preview');
    });

    it('should handle array format shape data', () => {
      toolState.selectedShapeData = [[0, 0], [1, 0], [0, 1]];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      
      // Should draw placement indicator (crosshair and corners)
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
      
      // Should draw shape preview cells
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
    it('should handle object format shape data with cells property', () => {
      toolState.selectedShapeData = {
        cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      };
      toolState.last = { x: 3, y: 4 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should handle empty cells array', () => {
      toolState.selectedShapeData = [];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith('Shape has no cells to preview');
    });

    it('should handle object format with empty cells', () => {
      toolState.selectedShapeData = { cells: [] };
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith('Shape has no cells to preview');
    });

    it('should handle invalid shape format', () => {
      toolState.selectedShapeData = "invalid";
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };
      mockCtx.save.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      expect(() => {
        shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);
      }).not.toThrow();

      expect(logger.error).toHaveBeenCalledWith('shapesTool.drawOverlay error:', expect.any(Error));
    });
  });

  describe('tool integration', () => {
    it('should have all required methods', () => {
      expect(typeof shapesTool.onMouseDown).toBe('function');
      expect(typeof shapesTool.onMouseMove).toBe('function');
      expect(typeof shapesTool.onMouseUp).toBe('function');
      expect(typeof shapesTool.drawOverlay).toBe('function');
    });

    it('should handle complete shape placement sequence', () => {
      // Start dragging
      shapesTool.onMouseDown(toolState, 2, 3);
      expect(toolState.dragging).toBe(true);
      expect(toolState.start).toEqual({ x: 2, y: 3 });

      // Move to new position
      shapesTool.onMouseMove(toolState, 5, 7);
      expect(toolState.last).toEqual({ x: 5, y: 7 });

      // Finish and place shape
      shapesTool.onMouseUp(toolState, 10, 12, mockSetCellAlive, mockPlaceShape);
      expect(mockPlaceShape).toHaveBeenCalledWith(5, 7); // Uses last position
      expect(toolState.dragging).toBe(false);
      expect(toolState.start).toBeNull();
    });

    it('should handle shape preview drawing during drag', () => {
      toolState.selectedShapeData = [[0, 0], [1, 0]];
      toolState.last = { x: 3, y: 4 };

      // Should draw preview at last position
      shapesTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 }, mockColorScheme);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled(); // Should draw shape cells
      expect(mockCtx.stroke).toHaveBeenCalled(); // Should draw placement indicator
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null toolState gracefully', () => {
      expect(() => {
        shapesTool.onMouseDown(null, 0, 0);
      }).toThrow(); // Expected to throw since we're accessing properties
    });

    it('should handle very large coordinates', () => {
      const largeCoord = 999999;
      shapesTool.onMouseDown(toolState, largeCoord, largeCoord);
      
      expect(toolState.start).toEqual({ x: largeCoord, y: largeCoord });
    });

    it('should handle floating point coordinates', () => {
      shapesTool.onMouseDown(toolState, 1.5, 2.7);
      
      expect(toolState.start).toEqual({ x: 1.5, y: 2.7 });
    });

    it('should handle multiple consecutive mouse moves', () => {
      shapesTool.onMouseMove(toolState, 1, 1);
      shapesTool.onMouseMove(toolState, 2, 2);
      shapesTool.onMouseMove(toolState, 3, 3);
      
      expect(toolState.last).toEqual({ x: 3, y: 3 });
    });
  });
});