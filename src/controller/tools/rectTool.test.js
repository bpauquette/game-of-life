import { rectTool } from './rectTool';

describe('rectTool', () => {
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
      rectTool.onMouseDown(toolState, 5, 3);

      expect(toolState.start).toEqual({ x: 5, y: 3 });
      expect(toolState.last).toEqual({ x: 5, y: 3 });
      expect(toolState.preview).toEqual([]);
    });

    it('should handle negative coordinates', () => {
      rectTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
    });

    it('should reset existing state', () => {
      toolState.start = { x: 10, y: 20 };
      toolState.last = { x: 15, y: 25 };
      toolState.preview = [['old', 'data']];

      rectTool.onMouseDown(toolState, 1, 2);

      expect(toolState.start).toEqual({ x: 1, y: 2 });
      expect(toolState.last).toEqual({ x: 1, y: 2 });
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('onMouseMove', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      rectTool.onMouseMove(toolState, 10, 10);

      expect(toolState.last).toBeUndefined();
      expect(toolState.preview).toBeUndefined();
    });

    it('should update last position and preview', () => {
      toolState.start = { x: 0, y: 0 };

      rectTool.onMouseMove(toolState, 2, 2);

      expect(toolState.last).toEqual({ x: 2, y: 2 });
      expect(toolState.preview).toBeDefined();
      expect(Array.isArray(toolState.preview)).toBe(true);
      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should generate rectangle perimeter preview for 2x2 rectangle', () => {
      toolState.start = { x: 0, y: 0 };

      rectTool.onMouseMove(toolState, 1, 1);

      // 2x2 rectangle should have 8 cells on perimeter
      expect(toolState.preview).toEqual([
        [0, 0], [0, 1], // top edge
        [1, 0], [1, 1], // bottom edge
        // No side edges for 2x2 (they're covered by corners)
      ]);
    });

    it('should generate rectangle perimeter preview for 3x3 rectangle', () => {
      toolState.start = { x: 0, y: 0 };

      rectTool.onMouseMove(toolState, 2, 2);

      expect(toolState.preview).toContainEqual([0, 0]); // top-left corner
      expect(toolState.preview).toContainEqual([1, 0]); // top edge
      expect(toolState.preview).toContainEqual([2, 0]); // top-right corner
      expect(toolState.preview).toContainEqual([0, 1]); // left edge
      expect(toolState.preview).toContainEqual([2, 1]); // right edge
      expect(toolState.preview).toContainEqual([0, 2]); // bottom-left corner
      expect(toolState.preview).toContainEqual([1, 2]); // bottom edge
      expect(toolState.preview).toContainEqual([2, 2]); // bottom-right corner
    });

    it('should handle single cell (point)', () => {
      toolState.start = { x: 5, y: 5 };

      rectTool.onMouseMove(toolState, 5, 5);

      expect(toolState.preview).toEqual([[5, 5]]);
    });

    it('should handle horizontal line', () => {
      toolState.start = { x: 0, y: 5 };

      rectTool.onMouseMove(toolState, 3, 5);

      // Horizontal line from (0,5) to (3,5)
      expect(toolState.preview).toEqual([
        [0, 5], [1, 5], [2, 5], [3, 5]
      ]);
    });

    it('should handle vertical line', () => {
      toolState.start = { x: 5, y: 0 };

      rectTool.onMouseMove(toolState, 5, 3);

      // Vertical line from (5,0) to (5,3)
      expect(toolState.preview).toEqual([
        [5, 0], [5, 3], // top and bottom
        [5, 1], [5, 2]  // middle edges
      ]);
    });
  });

  describe('onMouseUp', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      rectTool.onMouseUp(toolState, 10, 10, mockSetCellAlive);

      expect(mockSetCellAlive).not.toHaveBeenCalled();
    });

    it('should place cells and reset state', () => {
      toolState.start = { x: 0, y: 0 };

      rectTool.onMouseUp(toolState, 1, 1, mockSetCellAlive);

      // Should call setCellAlive for each perimeter cell
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 1, true);

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should place 3x3 rectangle perimeter correctly', () => {
      toolState.start = { x: 0, y: 0 };

      rectTool.onMouseUp(toolState, 2, 2, mockSetCellAlive);

      // Check that all perimeter cells are placed
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true); // corners
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 2, true);
      
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 0, true); // edges
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 1, true);

      expect(mockSetCellAlive).toHaveBeenCalledTimes(8);
    });

    it('should handle negative coordinates', () => {
      toolState.start = { x: -1, y: -1 };

      rectTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(-1, -1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(-1, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, -1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
    });

    it('should handle reversed coordinates (drag from bottom-right to top-left)', () => {
      toolState.start = { x: 2, y: 2 };

      rectTool.onMouseUp(toolState, 0, 0, mockSetCellAlive);

      // Should still create the same 3x3 rectangle
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 2, true);
    });
  });

  describe('drawOverlay', () => {
    it('should return early if no preview', () => {
      toolState.preview = null;

      rectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should return early if empty preview', () => {
      toolState.preview = [];

      rectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should draw preview cells with correct styling', () => {
      toolState.preview = [[1, 1], [2, 1], [1, 2], [2, 2]];

      rectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillStyle).toBe('rgba(255,255,255,0.12)');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 10, 10, 10); // (1*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 10, 10, 10); // (2*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 10, 10); // (1*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 20, 10, 10); // (2*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should apply offset to preview drawing', () => {
      toolState.preview = [[1, 1]];

      rectTool.drawOverlay(mockCtx, toolState, 20, { x: 5, y: 3 });

      // (1*20-5, 1*20-3, 20, 20) = (15, 17, 20, 20)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(15, 17, 20, 20);
    });

    it('should handle negative coordinates in preview', () => {
      toolState.preview = [[-1, -1]];

      rectTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledWith(-10, -10, 10, 10);
    });
  });

  describe('tool integration', () => {
    it('should have all required methods', () => {
      expect(typeof rectTool.onMouseDown).toBe('function');
      expect(typeof rectTool.onMouseMove).toBe('function');
      expect(typeof rectTool.onMouseUp).toBe('function');
      expect(typeof rectTool.drawOverlay).toBe('function');
    });

    it('should handle complete rectangle draw sequence', () => {
      // Start drawing
      rectTool.onMouseDown(toolState, 0, 0);
      expect(toolState.start).toEqual({ x: 0, y: 0 });

      // Move to create preview
      rectTool.onMouseMove(toolState, 2, 1);
      expect(toolState.preview.length).toBeGreaterThan(0);

      // Finish drawing
      rectTool.onMouseUp(toolState, 2, 1, mockSetCellAlive);
      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(toolState.start).toBeNull();
      expect(toolState.preview).toEqual([]);
    });
  });
});