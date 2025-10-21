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

    it('should calculate bounding box correctly', () => {
      toolState.start = { x: 0, y: 0 };

      // Bounding box from (0,0) to (3,4) gives dimensions 3x4, smaller is 3
      // Circle radius should be 1 (3/2 = 1.5, floor = 1), centered at (1,2)
      circleTool.onMouseMove(toolState, 3, 4);

      // Should generate a circle that fits within bounding box
      expect(toolState.preview.length).toBeGreaterThan(0);
      
      // Circle should be centered around (1,2) with radius 1
      const preview = toolState.preview;
      // Check that circle points are within the bounding box
      for (const p of preview) {
        expect(p[0]).toBeGreaterThanOrEqual(0);
        expect(p[0]).toBeLessThanOrEqual(3);
        expect(p[1]).toBeGreaterThanOrEqual(0);
        expect(p[1]).toBeLessThanOrEqual(4);
      }
    });

    it('should handle zero size bounding box (same point)', () => {
      toolState.start = { x: 5, y: 5 };

      circleTool.onMouseMove(toolState, 5, 5);

      // Zero-size bounding box should still create a minimal circle (radius 1)
      expect(toolState.preview.length).toBeGreaterThan(0);
      // Should be a small circle centered at (5,5) - check for points around center
      const preview = toolState.preview;
      const hasPointsNearCenter = preview.some(p => 
        Math.abs(p[0] - 5) <= 1 && Math.abs(p[1] - 5) <= 1
      );
      expect(hasPointsNearCenter).toBe(true);
    });

    it('should handle small bounding box', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseMove(toolState, 1, 0);

      // Bounding box is 1x0, smaller dimension is 0, so radius becomes 1 (minimum)
      // Circle should be generated within the bounds
      expect(toolState.preview.length).toBeGreaterThan(0);
      const preview = toolState.preview;
      // All points should be within or near the bounding area
      for (const p of preview) {
        expect(p[0]).toBeGreaterThanOrEqual(-1);
        expect(p[0]).toBeLessThanOrEqual(2);
      }
    });

    it('should handle larger bounding box', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseMove(toolState, 4, 4);

      // Bounding box is 4x4, so circle radius should be 2, centered at (2,2)
      expect(toolState.preview.length).toBeGreaterThan(0);
      const preview = toolState.preview;
      // All points should be within the bounding box
      for (const p of preview) {
        expect(p[0]).toBeGreaterThanOrEqual(0);
        expect(p[0]).toBeLessThanOrEqual(4);
        expect(p[1]).toBeGreaterThanOrEqual(0);
        expect(p[1]).toBeLessThanOrEqual(4);
      }
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

      circleTool.onMouseUp(toolState, 2, 2, mockSetCellAlive);

      // Should call setCellAlive for each point in the circle (bounding box approach)
      expect(mockSetCellAlive).toHaveBeenCalled();

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should handle zero-size bounding box', () => {
      toolState.start = { x: 5, y: 5 };

      circleTool.onMouseUp(toolState, 5, 5, mockSetCellAlive);

      // Zero-size bounding box should still create minimal circle
      expect(mockSetCellAlive).toHaveBeenCalled();

      // Should still reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should handle larger bounding box', () => {
      toolState.start = { x: 0, y: 0 };

      circleTool.onMouseUp(toolState, 6, 6, mockSetCellAlive); // 6x6 bounding box

      // Should place cells for a circle that fits within 6x6 box
      expect(mockSetCellAlive).toHaveBeenCalled();
      
      // Should have called setCellAlive multiple times for circle perimeter
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