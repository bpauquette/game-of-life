import { randomRectTool } from './randomRectTool';

describe('randomRectTool', () => {
  let toolState;
  let mockSetCellAlive;
  let mockCtx;
  let originalMathRandom;

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
    mockCtx = {
      fillStyle: '',
      fillRect: jest.fn()
    };
    
    // Mock Math.random for predictable tests
    originalMathRandom = Math.random;
    Math.random = jest.fn();
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  describe('onMouseDown', () => {
    it('should initialize tool state with default probability', () => {
      randomRectTool.onMouseDown(toolState, 5, 3);

      expect(toolState.start).toEqual({ x: 5, y: 3 });
      expect(toolState.last).toEqual({ x: 5, y: 3 });
      expect(toolState.preview).toEqual([]);
      expect(toolState.prob).toBe(0.5);
    });

    it('should preserve existing probability if set', () => {
      toolState.prob = 0.7;

      randomRectTool.onMouseDown(toolState, 5, 3);

      expect(toolState.prob).toBe(0.7);
    });

    it('should set default probability if null', () => {
      toolState.prob = null;

      randomRectTool.onMouseDown(toolState, 5, 3);

      expect(toolState.prob).toBe(0.5);
    });

    it('should set default probability if undefined', () => {
      toolState.prob = undefined;

      randomRectTool.onMouseDown(toolState, 5, 3);

      expect(toolState.prob).toBe(0.5);
    });

    it('should handle negative coordinates', () => {
      randomRectTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
    });

    it('should reset existing state', () => {
      toolState.start = { x: 10, y: 20 };
      toolState.last = { x: 15, y: 25 };
      toolState.preview = [[1, 1], [2, 2]];

      randomRectTool.onMouseDown(toolState, 1, 2);

      expect(toolState.start).toEqual({ x: 1, y: 2 });
      expect(toolState.last).toEqual({ x: 1, y: 2 });
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('onMouseMove', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      randomRectTool.onMouseMove(toolState, 10, 10);

      expect(toolState.last).toBeUndefined();
      expect(toolState.preview).toBeUndefined();
    });

    it('should update last position and generate preview', () => {
      toolState.start = { x: 0, y: 0 };

      randomRectTool.onMouseMove(toolState, 2, 2);

      expect(toolState.last).toEqual({ x: 2, y: 2 });
      expect(toolState.preview).toBeDefined();
      expect(Array.isArray(toolState.preview)).toBe(true);
      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should generate filled rectangle preview', () => {
      toolState.start = { x: 0, y: 0 };

      randomRectTool.onMouseMove(toolState, 2, 1);

      // 3x2 rectangle should have 6 cells
      expect(toolState.preview.length).toBe(6);
      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([1, 0]);
      expect(toolState.preview).toContainEqual([2, 0]);
      expect(toolState.preview).toContainEqual([0, 1]);
      expect(toolState.preview).toContainEqual([1, 1]);
      expect(toolState.preview).toContainEqual([2, 1]);
    });

    it('should handle single cell (same point)', () => {
      toolState.start = { x: 5, y: 5 };

      randomRectTool.onMouseMove(toolState, 5, 5);

      expect(toolState.preview).toEqual([[5, 5]]);
    });

    it('should handle negative coordinates', () => {
      toolState.start = { x: -1, y: -1 };

      randomRectTool.onMouseMove(toolState, 1, 1);

      expect(toolState.preview.length).toBe(9); // 3x3 rectangle
      expect(toolState.preview).toContainEqual([-1, -1]);
      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([1, 1]);
    });

    it('should handle reversed coordinates (drag from bottom-right to top-left)', () => {
      toolState.start = { x: 2, y: 2 };

      randomRectTool.onMouseMove(toolState, 0, 0);

      // Should still create the same 3x3 rectangle
      expect(toolState.preview.length).toBe(9);
      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([1, 1]);
      expect(toolState.preview).toContainEqual([2, 2]);
    });

    it('should handle horizontal line', () => {
      toolState.start = { x: 0, y: 5 };

      randomRectTool.onMouseMove(toolState, 3, 5);

      expect(toolState.preview.length).toBe(4); // 4x1 line
      expect(toolState.preview).toContainEqual([0, 5]);
      expect(toolState.preview).toContainEqual([1, 5]);
      expect(toolState.preview).toContainEqual([2, 5]);
      expect(toolState.preview).toContainEqual([3, 5]);
    });

    it('should handle vertical line', () => {
      toolState.start = { x: 5, y: 0 };

      randomRectTool.onMouseMove(toolState, 5, 3);

      expect(toolState.preview.length).toBe(4); // 1x4 line
      expect(toolState.preview).toContainEqual([5, 0]);
      expect(toolState.preview).toContainEqual([5, 1]);
      expect(toolState.preview).toContainEqual([5, 2]);
      expect(toolState.preview).toContainEqual([5, 3]);
    });
  });

  describe('onMouseUp', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      randomRectTool.onMouseUp(toolState, 10, 10, mockSetCellAlive);

      expect(mockSetCellAlive).not.toHaveBeenCalled();
    });

    it('should place cells randomly and reset state', () => {
      toolState.start = { x: 0, y: 0 };
      toolState.prob = 0.5;
      
      // Mock random to return alternating values for each cell in order
      // Rectangle from (0,0) to (1,1) creates points: (0,0), (1,0), (0,1), (1,1)
      Math.random.mockReturnValueOnce(0.3) // first cell: alive (0.3 < 0.5)
                 .mockReturnValueOnce(0.7) // second cell: dead (0.7 >= 0.5)
                 .mockReturnValueOnce(0.2) // third cell: alive (0.2 < 0.5)
                 .mockReturnValueOnce(0.8); // fourth cell: dead (0.8 >= 0.5)

      randomRectTool.onMouseUp(toolState, 1, 1, mockSetCellAlive);

      // Should call setCellAlive for each cell in rectangle order
      expect(mockSetCellAlive).toHaveBeenCalledTimes(4); // 2x2 rectangle
      
      // Check that some cells are alive and some dead based on probability
      const aliveCalls = mockSetCellAlive.mock.calls.filter(call => call[2] === true);
      const deadCalls = mockSetCellAlive.mock.calls.filter(call => call[2] === false);
      expect(aliveCalls.length).toBe(2); // Two cells should be alive
      expect(deadCalls.length).toBe(2); // Two cells should be dead

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should use default probability if not set', () => {
      toolState.start = { x: 0, y: 0 };
      // Don't set toolState.prob

      Math.random.mockReturnValue(0.3);

      randomRectTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true); // 0.3 < 0.5 (default)
    });

    it('should clamp probability to valid range', () => {
      toolState.start = { x: 0, y: 0 };
      
      // Test with probability > 1
      toolState.prob = 1.5;
      Math.random.mockReturnValue(0.9);

      randomRectTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true); // Should use clamped prob = 1.0

      // Reset for next test
      mockSetCellAlive.mockClear();
      toolState.start = { x: 0, y: 0 };

      // Test with probability < 0
      toolState.prob = -0.5;
      Math.random.mockReturnValue(0.1);

      randomRectTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, false); // Should use clamped prob = 0.0
    });

    it('should handle probability 0 (no cells alive)', () => {
      toolState.start = { x: 0, y: 0 };
      toolState.prob = 0;

      Math.random.mockReturnValue(0.5);

      randomRectTool.onMouseUp(toolState, 1, 1, mockSetCellAlive);

      // All calls should be with false
      mockSetCellAlive.mock.calls.forEach(call => {
        expect(call[2]).toBe(false);
      });
    });

    it('should handle probability 1 (all cells alive)', () => {
      toolState.start = { x: 0, y: 0 };
      toolState.prob = 1;

      Math.random.mockReturnValue(0.5);

      randomRectTool.onMouseUp(toolState, 1, 1, mockSetCellAlive);

      // All calls should be with true
      mockSetCellAlive.mock.calls.forEach(call => {
        expect(call[2]).toBe(true);
      });
    });

    it('should handle single cell', () => {
      toolState.start = { x: 5, y: 5 };
      toolState.prob = 0.8;

      Math.random.mockReturnValue(0.5);

      randomRectTool.onMouseUp(toolState, 5, 5, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(5, 5, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(1);
    });

    it('should handle negative coordinates', () => {
      toolState.start = { x: -1, y: -1 };
      toolState.prob = 1; // All alive for predictable test
      
      // Mock random to return values < 1 for all cells
      Math.random.mockReturnValue(0.5);

      randomRectTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      // Should call setCellAlive for all cells in rectangle
      expect(mockSetCellAlive).toHaveBeenCalledTimes(4); // 2x2 rectangle
      
      // Check that all expected coordinates are covered
      const calledCoords = mockSetCellAlive.mock.calls.map(call => [call[0], call[1]]);
      expect(calledCoords).toContainEqual([-1, -1]);
      expect(calledCoords).toContainEqual([0, -1]);
      expect(calledCoords).toContainEqual([-1, 0]);
      expect(calledCoords).toContainEqual([0, 0]);
      
      // All should be alive due to prob = 1
      mockSetCellAlive.mock.calls.forEach(call => {
        expect(call[2]).toBe(true);
      });
    });
  });

  describe('drawOverlay', () => {
    it('should return early if no preview', () => {
      toolState.preview = null;

      randomRectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should return early if empty preview', () => {
      toolState.preview = [];

      randomRectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should draw preview cells with correct styling', () => {
      toolState.preview = [[1, 1], [2, 1], [1, 2], [2, 2]];

      randomRectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillStyle).toBe('rgba(255,255,255,0.08)');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 10, 10, 10); // (1*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 10, 10, 10); // (2*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 10, 10); // (1*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 20, 10, 10); // (2*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should apply offset to preview drawing', () => {
      toolState.preview = [[1, 1]];

      randomRectTool.drawOverlay(mockCtx, toolState, 20, { x: 5, y: 3 });

      // (1*20-5, 1*20-3, 20, 20) = (15, 17, 20, 20)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(15, 17, 20, 20);
    });

    it('should handle negative coordinates in preview', () => {
      toolState.preview = [[-1, -1]];

      randomRectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledWith(-10, -10, 10, 10);
    });

    it('should handle many preview points', () => {
      // Create a large rectangle preview
      toolState.preview = [];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 4; y++) {
          toolState.preview.push([x, y]);
        }
      }

      randomRectTool.drawOverlay(mockCtx, toolState, 8, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(20); // 5x4 rectangle
    });
  });

  describe('tool integration', () => {
    it('should have all required methods', () => {
      expect(typeof randomRectTool.onMouseDown).toBe('function');
      expect(typeof randomRectTool.onMouseMove).toBe('function');
      expect(typeof randomRectTool.onMouseUp).toBe('function');
      expect(typeof randomRectTool.drawOverlay).toBe('function');
    });

    it('should handle complete random rectangle drawing sequence', () => {
      // Start drawing
      randomRectTool.onMouseDown(toolState, 0, 0);
      expect(toolState.start).toEqual({ x: 0, y: 0 });
      expect(toolState.prob).toBe(0.5);

      // Move to create preview
      randomRectTool.onMouseMove(toolState, 2, 2);
      expect(toolState.preview.length).toBe(9); // 3x3 rectangle

      // Finish drawing
      Math.random.mockReturnValue(0.3);
      randomRectTool.onMouseUp(toolState, 2, 2, mockSetCellAlive);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(9);
      expect(toolState.start).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should maintain probability between mouse events', () => {
      toolState.prob = 0.8;

      randomRectTool.onMouseDown(toolState, 0, 0);
      expect(toolState.prob).toBe(0.8);

      randomRectTool.onMouseMove(toolState, 1, 1);
      expect(toolState.prob).toBe(0.8);

      Math.random.mockReturnValue(0.5);
      randomRectTool.onMouseUp(toolState, 1, 1, mockSetCellAlive);
      
      // Should use the maintained probability
      mockSetCellAlive.mock.calls.forEach(call => {
        expect(call[2]).toBe(true); // 0.5 < 0.8
      });
    });
  });

  describe('rectangle algorithm', () => {
    it('should generate complete filled rectangle', () => {
      toolState.start = { x: 1, y: 2 };

      randomRectTool.onMouseMove(toolState, 3, 4);

      // Should create 3x3 rectangle from (1,2) to (3,4)
      expect(toolState.preview.length).toBe(9);
      
      // Check all expected points are present
      for (let x = 1; x <= 3; x++) {
        for (let y = 2; y <= 4; y++) {
          expect(toolState.preview).toContainEqual([x, y]);
        }
      }
    });

    it('should handle edge case of single point', () => {
      toolState.start = { x: 0, y: 0 };

      randomRectTool.onMouseMove(toolState, 0, 0);

      expect(toolState.preview).toEqual([[0, 0]]);
    });

    it('should be consistent between preview and final placement', () => {
      toolState.start = { x: 0, y: 0 };

      // Generate preview
      randomRectTool.onMouseMove(toolState, 2, 1);
      const previewCount = toolState.preview.length;

      // Execute final drawing
      Math.random.mockReturnValue(0);
      randomRectTool.onMouseUp(toolState, 2, 1, mockSetCellAlive);

      // Should call setCellAlive for each preview cell
      expect(mockSetCellAlive).toHaveBeenCalledTimes(previewCount);
    });
  });
});