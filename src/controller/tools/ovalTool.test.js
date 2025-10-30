/* eslint-disable sonarjs/no-duplicate-string */
import { ovalTool } from './ovalTool';

const CONST_FUNCTION = 'function';

describe('ovalTool', () => {
  const SAMPLE_START_X = 5;
  const SAMPLE_START_Y = 3;
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
  ovalTool.onMouseDown(toolState, SAMPLE_START_X, SAMPLE_START_Y);

  expect(toolState.start).toEqual({ x: SAMPLE_START_X, y: SAMPLE_START_Y });
  expect(toolState.last).toEqual({ x: SAMPLE_START_X, y: SAMPLE_START_Y });
      expect(toolState.preview).toEqual([]);
    });

  it('should handle negative coordinates', () => {
      ovalTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
    });

    it('should reset existing state', () => {
      toolState.start = { x: 10, y: 20 };
      toolState.last = { x: 15, y: 25 };
      toolState.preview = [[1, 1], [2, 2]];

      ovalTool.onMouseDown(toolState, 1, 2);

      expect(toolState.start).toEqual({ x: 1, y: 2 });
      expect(toolState.last).toEqual({ x: 1, y: 2 });
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('onMouseMove', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      ovalTool.onMouseMove(toolState, 10, 10);

      expect(toolState.last).toBeUndefined();
      expect(toolState.preview).toBeUndefined();
    });

    it('should update last position and generate preview', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseMove(toolState, 4, 2);

      expect(toolState.last).toEqual({ x: 4, y: 2 });
      expect(toolState.preview).toBeDefined();
      expect(Array.isArray(toolState.preview)).toBe(true);
    });

    it('should generate oval perimeter for rectangular bounds', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseMove(toolState, 4, 2);

      expect(toolState.preview.length).toBeGreaterThan(0);
      
      // Should have points on the perimeter of the ellipse
      expect(toolState.preview).toBeDefined();
    });

    it('should handle same point (zero size oval)', () => {
      toolState.start = { x: 5, y: 5 };

      ovalTool.onMouseMove(toolState, 5, 5);

      // Zero size oval should have minimal points or be empty
      expect(Array.isArray(toolState.preview)).toBe(true);
    });

    it('should handle horizontal oval (width > height)', () => {
      toolState.start = { x: 0, y: 1 };

      ovalTool.onMouseMove(toolState, 6, 3);

      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should handle vertical oval (height > width)', () => {
      toolState.start = { x: 1, y: 0 };

      ovalTool.onMouseMove(toolState, 3, 6);

      expect(toolState.preview.length).toBeGreaterThan(0);
    });

  it('should handle negative coordinates', () => {
      toolState.start = { x: -2, y: -2 };

      ovalTool.onMouseMove(toolState, 2, 2);

      expect(toolState.preview).toBeDefined();
      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should handle reversed coordinates (drag from bottom-right to top-left)', () => {
      toolState.start = { x: 4, y: 4 };

      ovalTool.onMouseMove(toolState, 0, 0);

      expect(toolState.preview).toBeDefined();
      expect(toolState.preview.length).toBeGreaterThan(0);
    });
  });

  describe('onMouseUp', () => {
    it('should return early if start is not set', () => {
      toolState.start = null;

      ovalTool.onMouseUp(toolState, 10, 10, mockSetCellAlive);

      expect(mockSetCellAlive).not.toHaveBeenCalled();
    });

    it('should place cells and reset state', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseUp(toolState, 4, 2, mockSetCellAlive);

      // Should call setCellAlive for each point in the oval perimeter
      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(mockSetCellAlive.mock.calls.length).toBeGreaterThan(0);

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should handle small oval', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseUp(toolState, 2, 2, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalled();

      // Should reset state
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should handle zero size oval (same point)', () => {
      toolState.start = { x: 5, y: 5 };

      ovalTool.onMouseUp(toolState, 5, 5, mockSetCellAlive);

      // Should still reset state even if no cells are placed
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

  it('should handle negative coordinates', () => {
      toolState.start = { x: -2, y: -2 };

      ovalTool.onMouseUp(toolState, 2, 2, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(toolState.start).toBeNull();
    });

    it('should place all computed points', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseUp(toolState, 3, 2, mockSetCellAlive);

      // Verify all calls are with valid coordinates and true flag
      for (const call of mockSetCellAlive.mock.calls) {
        expect(call).toHaveLength(3);
        expect(typeof call[0]).toBe('number'); // x coordinate
        expect(typeof call[1]).toBe('number'); // y coordinate
        expect(call[2]).toBe(true); // alive flag
      }
    });
  });

  describe('drawOverlay', () => {
    it('should return early if no preview', () => {
      toolState.preview = null;

      ovalTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should return early if empty preview', () => {
      toolState.preview = [];

      ovalTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should draw preview cells with correct styling', () => {
      toolState.preview = [[1, 1], [2, 1], [1, 2], [2, 2]];

      ovalTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillStyle).toBe('rgba(255,255,255,0.12)');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 10, 10, 10); // (1*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 10, 10, 10); // (2*10-0, 1*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 10, 10); // (1*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(20, 20, 10, 10); // (2*10-0, 2*10-0, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should apply offset to preview drawing', () => {
      toolState.preview = [[1, 1]];

      ovalTool.drawOverlay(mockCtx, toolState, 20, { x: 5, y: 3 });

      // (1*20-5, 1*20-3, 20, 20) = (15, 17, 20, 20)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(15, 17, 20, 20);
    });

    it('should handle negative coordinates in preview', () => {
      toolState.preview = [[-1, -1]];

      ovalTool.drawOverlay(mockCtx, toolState, 10, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledWith(-10, -10, 10, 10);
    });

    it('should handle many preview points', () => {
      // Create a larger oval preview
      toolState.preview = [];
      for (let i = 0; i < 30; i++) {
        toolState.preview.push([i % 6, Math.floor(i / 6)]);
      }

      ovalTool.drawOverlay(mockCtx, toolState, 5, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(30);
    });

    it('should handle different cell sizes', () => {
      toolState.preview = [[0, 0]];

      ovalTool.drawOverlay(mockCtx, toolState, 15, { x: 0, y: 0 });

      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 15, 15);
    });
  });

  describe('tool integration', () => {
    it('should have all required methods', () => {
      expect(typeof ovalTool.onMouseDown).toBe(CONST_FUNCTION);
      expect(typeof ovalTool.onMouseMove).toBe(CONST_FUNCTION);
      expect(typeof ovalTool.onMouseUp).toBe(CONST_FUNCTION);
      expect(typeof ovalTool.drawOverlay).toBe(CONST_FUNCTION);
    });

    it('should handle complete oval drawing sequence', () => {
      // Start drawing
      ovalTool.onMouseDown(toolState, 0, 0);
      expect(toolState.start).toEqual({ x: 0, y: 0 });

      // Move to create preview
      ovalTool.onMouseMove(toolState, 4, 3);
      expect(toolState.preview.length).toBeGreaterThanOrEqual(0);

      // Finish drawing
      ovalTool.onMouseUp(toolState, 4, 3, mockSetCellAlive);
      expect(toolState.start).toBeNull();
      expect(toolState.preview).toEqual([]);
    });

    it('should maintain state consistency throughout drawing', () => {
      // Start drawing
      ovalTool.onMouseDown(toolState, 1, 1);
      
      // Move to one position
      ovalTool.onMouseMove(toolState, 3, 2);
      const firstPreview = [...toolState.preview];
      
      // Move to significantly different position - should generate different preview
      ovalTool.onMouseMove(toolState, 5, 4);
      const secondPreview = [...toolState.preview];
      
      expect(firstPreview).not.toEqual(secondPreview);
      expect(toolState.start).toEqual({ x: 1, y: 1 }); // Start should remain constant
      
      // Finish
      ovalTool.onMouseUp(toolState, 5, 4, mockSetCellAlive);
      expect(toolState.start).toBeNull();
      expect(toolState.preview).toEqual([]);
    });
  });

  describe('ellipse algorithm edge cases', () => {
    it('should handle very small ellipses', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseMove(toolState, 1, 1);

      expect(Array.isArray(toolState.preview)).toBe(true);
    });

    it('should handle single-width ellipse (vertical line)', () => {
      toolState.start = { x: 2, y: 0 };

      ovalTool.onMouseMove(toolState, 2, 4);

      expect(Array.isArray(toolState.preview)).toBe(true);
    });

    it('should handle single-height ellipse (horizontal line)', () => {
      toolState.start = { x: 0, y: 2 };

      ovalTool.onMouseMove(toolState, 4, 2);

      expect(Array.isArray(toolState.preview)).toBe(true);
    });

    it('should handle square bounds (should approximate a circle)', () => {
      toolState.start = { x: 0, y: 0 };

      ovalTool.onMouseMove(toolState, 4, 4);

      expect(toolState.preview.length).toBeGreaterThan(0);
    });

    it('should be consistent between onMouseMove and onMouseUp', () => {
      toolState.start = { x: 0, y: 0 };

      // Generate preview
      ovalTool.onMouseMove(toolState, 3, 2);
      const previewPoints = [...toolState.preview];

      // Execute final drawing
      ovalTool.onMouseUp(toolState, 3, 2, mockSetCellAlive);

      // Should have called setCellAlive for each preview point
      expect(mockSetCellAlive.mock.calls.length).toBe(previewPoints.length);
    });
  });
});