import { lineTool } from './lineTool';

const CONST_FUNCTION = 'function';

describe('lineTool', () => {
  let toolState;
  let mockSetCellAlive;
  let mockCtx;

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
    mockCtx = {
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn()
    };
  });

  describe('onMouseDown', () => {
    it('should initialize tool state', () => {
      lineTool.onMouseDown(toolState, 5, 3);

      expect(toolState.start).toEqual({ x: 5, y: 3 });
      expect(toolState.last).toEqual({ x: 5, y: 3 });
      expect(toolState.preview).toEqual([]);
    });

    it('should handle negative coordinates', () => {
      lineTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
    });

    it('should reset existing state', () => {
      toolState.start = { x: 10, y: 20 };
      toolState.last = { x: 15, y: 25 };
      toolState.preview = [[1, 1], [2, 2]];

      lineTool.onMouseDown(toolState, 1, 2);

      expect(toolState.start).toEqual({ x: 1, y: 2 });
      expect(toolState.last).toEqual({ x: 1, y: 2 });
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('onMouseMove', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      lineTool.onMouseMove(toolState, 10, 10, mockSetCellAlive);

      expect(toolState.last).toBeUndefined();
      expect(toolState.preview).toBeUndefined();
      expect(mockSetCellAlive).not.toHaveBeenCalled();
    });

    it('should update last position and generate preview', () => {
      toolState.start = { x: 0, y: 0 };

      lineTool.onMouseMove(toolState, 3, 3, mockSetCellAlive);

      expect(toolState.last).toEqual({ x: 3, y: 3 });
      expect(toolState.preview).toBeDefined();
      expect(Array.isArray(toolState.preview)).toBe(true);
      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should generate horizontal line preview', () => {
      toolState.start = { x: 0, y: 5 };

      lineTool.onMouseMove(toolState, 3, 5, mockSetCellAlive);

      expect(toolState.preview).toContainEqual([0, 5]);
      expect(toolState.preview).toContainEqual([1, 5]);
      expect(toolState.preview).toContainEqual([2, 5]);
      expect(toolState.preview).toContainEqual([3, 5]);
    });

    it('should generate vertical line preview', () => {
      toolState.start = { x: 5, y: 0 };

      lineTool.onMouseMove(toolState, 5, 3, mockSetCellAlive);

      expect(toolState.preview).toContainEqual([5, 0]);
      expect(toolState.preview).toContainEqual([5, 1]);
      expect(toolState.preview).toContainEqual([5, 2]);
      expect(toolState.preview).toContainEqual([5, 3]);
    });

    it('should generate diagonal line preview', () => {
      toolState.start = { x: 0, y: 0 };

      lineTool.onMouseMove(toolState, 2, 2, mockSetCellAlive);

      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([1, 1]);
      expect(toolState.preview).toContainEqual([2, 2]);
    });

    it('should handle single point (start and end same)', () => {
      toolState.start = { x: 5, y: 5 };

      lineTool.onMouseMove(toolState, 5, 5, mockSetCellAlive);

      expect(toolState.preview).toEqual([[5, 5]]);
    });

    it('should generate preview for negative coordinates', () => {
      toolState.start = { x: -1, y: -1 };

      lineTool.onMouseMove(toolState, 1, 1, mockSetCellAlive);

      expect(toolState.preview).toContainEqual([-1, -1]);
      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([1, 1]);
    });
  });

  describe('onMouseUp', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      lineTool.onMouseUp(toolState, 10, 10, mockSetCellAlive);

      expect(mockSetCellAlive).not.toHaveBeenCalled();
    });

    it('should place cells and reset state', () => {
      toolState.start = { x: 0, y: 0 };

      lineTool.onMouseUp(toolState, 2, 0, mockSetCellAlive);

      // Should call setCellAlive for each point in the line
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 0, true);

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should place vertical line correctly', () => {
      toolState.start = { x: 3, y: 1 };

      lineTool.onMouseUp(toolState, 3, 3, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(3);
    });

    it('should place diagonal line correctly', () => {
      toolState.start = { x: 0, y: 0 };

      lineTool.onMouseUp(toolState, 2, 2, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 2, true);
    });

    it('should handle single point', () => {
      toolState.start = { x: 5, y: 5 };

      lineTool.onMouseUp(toolState, 5, 5, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(5, 5, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(1);
    });

    it('should handle negative coordinates', () => {
      toolState.start = { x: -1, y: -1 };

      lineTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(-1, -1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
    });

    it('should handle backward lines (end < start)', () => {
      toolState.start = { x: 3, y: 3 };

      lineTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
    });
  });

  describe('drawOverlay', () => {
    it('should return early if no preview', () => {
      toolState.preview = null;

      lineTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
    });

    it('should return early if empty preview', () => {
      toolState.preview = [];

      lineTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
    });

    it('should draw line overlay with correct styling', () => {
      toolState.preview = [[0, 0], [1, 1], [2, 2]];

      lineTool.drawOverlay(mockCtx, toolState, 12, { x: 0, y: 0 });

      expect(mockCtx.strokeStyle).toBe('rgba(255,255,255,0.6)');
      expect(mockCtx.lineWidth).toBe(2); // Math.max(1, Math.min(4, 12/6))
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should calculate line width correctly for different cell sizes', () => {
      toolState.preview = [[0, 0], [1, 1]];

      // Small cell size
      lineTool.drawOverlay(mockCtx, toolState, 6, { x: 0, y: 0 });
      expect(mockCtx.lineWidth).toBe(1); // Math.max(1, Math.min(4, 6/6))

      // Large cell size  
      lineTool.drawOverlay(mockCtx, toolState, 30, { x: 0, y: 0 });
      expect(mockCtx.lineWidth).toBe(4); // Math.max(1, Math.min(4, 30/6))
    });

    it('should draw line points with correct coordinates', () => {
      toolState.preview = [[1, 1], [2, 2]];

      lineTool.drawOverlay(mockCtx, toolState, 10, { x: 5, y: 3 });

      // First point: (1*10 - 5 + 10/2, 1*10 - 3 + 10/2) = (10, 12)
      // Second point: (2*10 - 5 + 10/2, 2*10 - 3 + 10/2) = (20, 22)
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 12);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 22);
    });

    it('should handle single point preview', () => {
      toolState.preview = [[5, 5]];

      lineTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      // Single point should only call moveTo
      expect(mockCtx.moveTo).toHaveBeenCalledWith(55, 55); // 5*10 + 10/2
      expect(mockCtx.lineTo).not.toHaveBeenCalled();
    });

    it('should apply offset correctly', () => {
      toolState.preview = [[0, 0]];

      lineTool.drawOverlay(mockCtx, toolState, 20, { x: 10, y: 5 });

      // (0*20 - 10 + 20/2, 0*20 - 5 + 20/2) = (0, 5)
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 5);
    });

    it('should handle negative coordinates in preview', () => {
      toolState.preview = [[-1, -1]];

      lineTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      // (-1*10 - 0 + 10/2, -1*10 - 0 + 10/2) = (-5, -5)
      expect(mockCtx.moveTo).toHaveBeenCalledWith(-5, -5);
    });
  });

  describe('tool integration', () => {
    it('should have all required methods', () => {
      expect(typeof lineTool.onMouseDown).toBe(CONST_FUNCTION);
      expect(typeof lineTool.onMouseMove).toBe(CONST_FUNCTION);
      expect(typeof lineTool.onMouseUp).toBe(CONST_FUNCTION);
      expect(typeof lineTool.drawOverlay).toBe(CONST_FUNCTION);
    });

    it('should handle complete line drawing sequence', () => {
      // Start drawing
      lineTool.onMouseDown(toolState, 0, 0);
      expect(toolState.start).toEqual({ x: 0, y: 0 });

      // Move to create preview
      lineTool.onMouseMove(toolState, 3, 2, mockSetCellAlive);
      expect(toolState.preview.length).toBeGreaterThan(0);

      // Finish drawing
      lineTool.onMouseUp(toolState, 3, 2, mockSetCellAlive);
      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(toolState.start).toBeNull();
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('Bresenham algorithm tests', () => {
    it('should generate correct line for steep slope', () => {
      toolState.start = { x: 0, y: 0 };

      lineTool.onMouseMove(toolState, 1, 3, mockSetCellAlive);

      // Steep line should include all necessary points
      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([0, 1]);
      expect(toolState.preview).toContainEqual([1, 2]);
      expect(toolState.preview).toContainEqual([1, 3]);
    });

    it('should generate correct line for gentle slope', () => {
      toolState.start = { x: 0, y: 0 };

      lineTool.onMouseMove(toolState, 3, 1, mockSetCellAlive);

      // Gentle line should include all necessary points
      expect(toolState.preview).toContainEqual([0, 0]);
      expect(toolState.preview).toContainEqual([1, 0]);
      expect(toolState.preview).toContainEqual([2, 1]);
      expect(toolState.preview).toContainEqual([3, 1]);
    });
  });
});