import { circleTool } from './circleTool';

describe('circleTool', () => {
  let toolState;
  let mockSetCellAlive;
  let mockCtx;

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
    mockCtx = {
      fillStyle: '',
      fillRect: jest.fn()
    };
  });

  describe('onMouseDown', () => {
    it('should initialize tool state', () => {
      circleTool.onMouseDown(toolState, 5, 3);

      expect(toolState.start).toEqual({ x: 5, y: 3 });
      expect(toolState.last).toEqual({ x: 5, y: 3 });
      expect(toolState.preview).toEqual([]);
    });

    it('should handle negative coordinates', () => {
      circleTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
    });

    it('should reset existing state', () => {
      toolState.start = { x: 10, y: 20 };
      toolState.last = { x: 15, y: 25 };
      toolState.preview = [[1, 1], [2, 2]];

      circleTool.onMouseDown(toolState, 1, 2);

      expect(toolState.start).toEqual({ x: 1, y: 2 });
      expect(toolState.last).toEqual({ x: 1, y: 2 });
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('onMouseMove', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      circleTool.onMouseMove(toolState, 10, 10);

      expect(toolState.last).toBeUndefined();
      expect(toolState.preview).toBeUndefined();
    });

    it('should update last position and generate preview', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseMove(toolState, 3, 4);

      expect(toolState.last).toEqual({ x: 3, y: 4 });
      expect(toolState.preview).toBeDefined();
      expect(Array.isArray(toolState.preview)).toBe(true);
    });

    it('should calculate radius correctly', () => {
      toolState.start = { x: 0, y: 0 };

      // Distance from (0,0) to (3,4) is 5
      circleTool.onMouseMove(toolState, 3, 4);

      // Should generate a circle with radius 5
      expect(toolState.preview.length).toBeGreaterThan(0);
      
      // Check that some expected points are in the circle perimeter
      const preview = toolState.preview;
      expect(preview.some(p => p[0] === 5 && p[1] === 0)).toBe(true); // Right point
      expect(preview.some(p => p[0] === -5 && p[1] === 0)).toBe(true); // Left point
      expect(preview.some(p => p[0] === 0 && p[1] === 5)).toBe(true); // Bottom point
      expect(preview.some(p => p[0] === 0 && p[1] === -5)).toBe(true); // Top point
    });

    it('should handle zero radius (same point)', () => {
      toolState.start = { x: 5, y: 5 };

      circleTool.onMouseMove(toolState, 5, 5);

      // Radius 0 should return empty array
      expect(toolState.preview).toEqual([]);
    });

    it('should handle radius 1', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseMove(toolState, 1, 0);

      // Radius 1 circle should have 4 cardinal points
      expect(toolState.preview).toContainEqual([1, 0]);  // Right
      expect(toolState.preview).toContainEqual([-1, 0]); // Left
      expect(toolState.preview).toContainEqual([0, 1]);  // Bottom
      expect(toolState.preview).toContainEqual([0, -1]); // Top
    });

    it('should handle radius 2', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseMove(toolState, 2, 0);

      // Radius 2 circle should include more points
      expect(toolState.preview).toContainEqual([2, 0]);
      expect(toolState.preview).toContainEqual([-2, 0]);
      expect(toolState.preview).toContainEqual([0, 2]);
      expect(toolState.preview).toContainEqual([0, -2]);
    });

    it('should calculate radius from diagonal movement', () => {
      toolState.start = { x: 0, y: 0 };

      // Distance from (0,0) to (1,1) is sqrt(2) ≈ 1.414, rounds to 1
      circleTool.onMouseMove(toolState, 1, 1);

      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should handle negative coordinates', () => {
      toolState.start = { x: -1, y: -1 };

      circleTool.onMouseMove(toolState, 1, 1);

      expect(toolState.preview).toBeDefined();
      expect(toolState.preview.length).toBeGreaterThan(0);
    });
  });

  describe('onMouseUp', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      circleTool.onMouseUp(toolState, 10, 10, mockSetCellAlive);

      expect(mockSetCellAlive).not.toHaveBeenCalled();
    });

    it('should place cells and reset state', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseUp(toolState, 1, 0, mockSetCellAlive);

      // Should call setCellAlive for each point in the circle
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 0, true);   // Right
      expect(mockSetCellAlive).toHaveBeenCalledWith(-1, 0, true);  // Left
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 1, true);   // Bottom
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, -1, true);  // Top

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should handle zero radius circle', () => {
      toolState.start = { x: 5, y: 5 };

      circleTool.onMouseUp(toolState, 5, 5, mockSetCellAlive);

      // Zero radius should not place any cells
      expect(mockSetCellAlive).not.toHaveBeenCalled();

      // Should still reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should handle larger circle', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseUp(toolState, 3, 4, mockSetCellAlive); // radius = 5

      // Should place many cells for a radius 5 circle
      expect(mockSetCellAlive).toHaveBeenCalledWith(5, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(-5, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 5, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, -5, true);
      
      // Should have called setCellAlive multiple times
      expect(mockSetCellAlive.mock.calls.length).toBeGreaterThan(4);
    });

    it('should handle negative coordinates', () => {
      toolState.start = { x: -2, y: -2 };

      circleTool.onMouseUp(toolState, -1, -2, mockSetCellAlive); // radius = 1

      expect(mockSetCellAlive).toHaveBeenCalledWith(-1, -2, true); // Right from center
      expect(mockSetCellAlive).toHaveBeenCalledWith(-3, -2, true); // Left from center  
      expect(mockSetCellAlive).toHaveBeenCalledWith(-2, -1, true); // Bottom from center
      expect(mockSetCellAlive).toHaveBeenCalledWith(-2, -3, true); // Top from center
    });
  });

  describe('drawOverlay', () => {
    it('should return early if no preview', () => {
      toolState.preview = null;

      circleTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should return early if empty preview', () => {
      toolState.preview = [];

      circleTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should draw preview cells with correct styling', () => {
      toolState.preview = [[1, 1], [2, 1], [1, 2], [2, 2]];

      circleTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillStyle).toBe('rgba(255,255,255,0.12)');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 10, 10, 10); // (1*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 10, 10, 10); // (2*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 10, 10); // (1*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 20, 10, 10); // (2*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should apply offset to preview drawing', () => {
      toolState.preview = [[1, 1]];

      circleTool.drawOverlay(mockCtx, toolState, 20, { x: 5, y: 3 });

      // (1*20-5, 1*20-3, 20, 20) = (15, 17, 20, 20)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(15, 17, 20, 20);
    });

    it('should handle negative coordinates in preview', () => {
      toolState.preview = [[-1, -1]];

      circleTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledWith(-10, -10, 10, 10);
    });

    it('should handle many preview points', () => {
      // Create a larger circle preview
      toolState.preview = [];
      for (let i = 0; i < 20; i++) {
        toolState.preview.push([i, i]);
      }

      circleTool.drawOverlay(mockCtx, toolState, 5, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(20);
    });
  });

  describe('tool integration', () => {
    it('should have all required methods', () => {
      expect(typeof circleTool.onMouseDown).toBe('function');
      expect(typeof circleTool.onMouseMove).toBe('function');
      expect(typeof circleTool.onMouseUp).toBe('function');
      expect(typeof circleTool.drawOverlay).toBe('function');
    });

    it('should handle complete circle drawing sequence', () => {
      // Start drawing
      circleTool.onMouseDown(toolState, 0, 0);
      expect(toolState.start).toEqual({ x: 0, y: 0 });

      // Move to create preview
      circleTool.onMouseMove(toolState, 3, 0);
      expect(toolState.preview.length).toBeGreaterThan(0);

      // Finish drawing
      circleTool.onMouseUp(toolState, 3, 0, mockSetCellAlive);
      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(toolState.start).toBeNull();
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('circle algorithm edge cases', () => {
    it('should handle very small circles', () => {
      toolState.start = { x: 0, y: 0 };

      // Fractional distance that rounds to 1
      circleTool.onMouseMove(toolState, 0.7, 0.7);

      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should deduplicate circle points', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseMove(toolState, 1, 0); // radius = 1

      // Check that there are no duplicate points
      const seen = new Set();
      let hasDuplicate = false;
      
      for (const point of toolState.preview) {
        const key = `${point[0]},${point[1]}`;
        if (seen.has(key)) {
          hasDuplicate = true;
          break;
        }
        seen.add(key);
      }
      
      expect(hasDuplicate).toBe(false);
    });

    it('should handle asymmetric radius calculation', () => {
      toolState.start = { x: 2, y: 3 };

      // Move to create non-axis-aligned radius
      circleTool.onMouseMove(toolState, 5, 7);

      expect(toolState.preview).toBeDefined();
      expect(toolState.preview.length).toBeGreaterThan(0);
    });
  });
});