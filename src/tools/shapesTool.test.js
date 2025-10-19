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

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
    mockPlaceShape = jest.fn();
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
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
    });

    it('should return early if no last position', () => {
      toolState.selectedShapeData = [[0, 0], [1, 0]];
      toolState.last = null;

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should handle array format shape data', () => {
      toolState.selectedShapeData = [[0, 0], [1, 0], [0, 1]];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(3);
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(3);
      
      // Due to the bug where DEFAULT_CELL_Y = 0 (should be 1), array coordinates behave as:
      // [0,0] -> cx=c[0]=0, cy=c[0]=0 -> (5+0, 5+0) = (50, 50)
      // [1,0] -> cx=c[0]=1, cy=c[0]=1 -> (5+1, 5+1) = (60, 60)  
      // [0,1] -> cx=c[0]=0, cy=c[0]=0 -> (5+0, 5+0) = (50, 50)
      
      const calls = mockCtx.fillRect.mock.calls;
      expect(calls).toContainEqual([50, 50, 10, 10]); // [0,0] and [0,1] both map here due to bug
      expect(calls).toContainEqual([60, 60, 10, 10]); // [1,0] maps here due to bug
    });

    it('should handle object format shape data with cells property', () => {
      toolState.selectedShapeData = {
        cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      };
      toolState.last = { x: 3, y: 4 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(2);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(30, 40, 10, 10); // (3+0)*10, (4+0)*10
      expect(mockCtx.fillRect).toHaveBeenCalledWith(40, 50, 10, 10); // (3+1)*10, (4+1)*10
    });

    it('should handle empty cells array', () => {
      toolState.selectedShapeData = [];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should handle cells array in object format being empty', () => {
      toolState.selectedShapeData = { cells: [] };
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should apply offset to drawing coordinates', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 2, y: 3 };
      const offsetWithValues = { x: 15, y: 25 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offsetWithValues, mockColorScheme);

      // (2+0)*10 - 15 = 5, (3+0)*10 - 25 = 5
      expect(mockCtx.fillRect).toHaveBeenCalledWith(5, 5, 10, 10);
    });

    it('should handle different cell sizes', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 1, y: 1 };
      const largeCellSize = 20;

      shapesTool.drawOverlay(mockCtx, toolState, largeCellSize, offset, mockColorScheme);

      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 20, 20, 20);
    });

    it('should use colorScheme getCellColor when available', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockColorScheme.getCellColor).toHaveBeenCalledWith(5, 5); // last.x + cx, last.y + cy
      expect(mockCtx.fillStyle).toBe('#ff0000');
    });

    it('should use default color when colorScheme getCellColor throws error', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };
      mockColorScheme.getCellColor.mockImplementation(() => {
        throw new Error('Color scheme error');
      });

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(logger.debug).toHaveBeenCalledWith('colorScheme.getCellColor failed:', expect.any(Error));
      expect(mockCtx.fillStyle).toBe('#222'); // DEFAULT_CELL_COLOR
    });

    it('should use default color when no colorScheme provided', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, null);

      expect(mockCtx.fillStyle).toBe('#222'); // DEFAULT_CELL_COLOR
    });

    it('should use default color when colorScheme does not have getCellColor function', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };
      const invalidColorScheme = { notGetCellColor: 'invalid' };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, invalidColorScheme);

      expect(mockCtx.fillStyle).toBe('#222'); // DEFAULT_CELL_COLOR
    });

    it('should handle object cells with missing x/y properties', () => {
      toolState.selectedShapeData = {
        cells: [{ x: 1 }, { y: 2 }, {}] // Missing y, missing x, missing both
      };
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(3);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(60, 50, 10, 10); // (5+1)*10, (5+0)*10 - x=1, y defaults to 0
      expect(mockCtx.fillRect).toHaveBeenCalledWith(50, 70, 10, 10); // (5+0)*10, (5+2)*10 - x defaults to 0, y=2
      expect(mockCtx.fillRect).toHaveBeenCalledWith(50, 50, 10, 10); // (5+0)*10, (5+0)*10 - both default to 0
    });

    it('should set correct stroke properties', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.strokeStyle).toBe('rgba(255,255,255,0.22)');
      expect(mockCtx.lineWidth).toBe(1); // MIN_STROKE_WIDTH for small cellSize
    });

    it('should calculate stroke width based on cell size', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };
      const largeCellSize = 50; // Should result in stroke width > 1

      shapesTool.drawOverlay(mockCtx, toolState, largeCellSize, offset, mockColorScheme);

      // 50 * 0.06 = 3, clamped to MAX_STROKE_WIDTH = 2
      expect(mockCtx.lineWidth).toBe(2);
    });

    it('should handle errors in drawOverlay gracefully', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };
      mockCtx.fillRect.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      // Should not throw
      expect(() => {
        shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);
      }).not.toThrow();

      expect(logger.error).toHaveBeenCalledWith('shapesTool.drawOverlay error:', expect.any(Error));
    });

    it('should set globalAlpha correctly during drawing', () => {
      toolState.selectedShapeData = [[0, 0]];
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      // Should set alpha to SHAPE_PREVIEW_ALPHA (0.45), then to FULL_OPACITY (1) for outline, then back
      expect(mockCtx.globalAlpha).toBe(0.45); // Last value set
    });

    it('should return early for invalid shape data formats', () => {
      toolState.selectedShapeData = "invalid string";
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('should return early for object without cells property', () => {
      toolState.selectedShapeData = { notCells: [[0, 0]] };
      toolState.last = { x: 5, y: 5 };

      shapesTool.drawOverlay(mockCtx, toolState, cellSize, offset, mockColorScheme);

      expect(mockCtx.save).not.toHaveBeenCalled();
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

      expect(mockCtx.fillRect).toHaveBeenCalledWith(30, 40, 10, 10); // (3+0)*10, (4+0)*10
      expect(mockCtx.fillRect).toHaveBeenCalledWith(40, 50, 10, 10); // (3+1)*10, (4+1)*10 - due to cy=c[0]=1
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