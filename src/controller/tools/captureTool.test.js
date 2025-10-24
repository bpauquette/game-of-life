import { captureTool } from './captureTool';

describe('captureTool', () => {
  let toolState;
  let mockSetCellAlive;
  let mockGetLiveCells;
  let mockTool;

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
    mockGetLiveCells = jest.fn(() => new Map([
      ['1,1', true],
      ['2,1', true],
      ['1,2', true],
      ['5,5', true]
    ]));
    mockTool = {
      onCaptureComplete: jest.fn()
    };
  });

  describe('mouse interactions', () => {
    test('onMouseDown sets start position', () => {
      captureTool.onMouseDown(toolState, 0, 0);
      
      expect(toolState.start).toEqual({ x: 0, y: 0 });
      expect(toolState.end).toEqual({ x: 0, y: 0 });
      expect(toolState.preview).toEqual([]);
      expect(toolState.capturedCells).toEqual([]);
    });

    test('onMouseMove without start position does nothing', () => {
      captureTool.onMouseMove(toolState, 5, 5, mockSetCellAlive, mockGetLiveCells);
      
      expect(toolState.start).toBeUndefined();
      expect(toolState.end).toBeUndefined();
      expect(toolState.preview).toBeUndefined();
    });

    test('onMouseMove with start position creates selection rectangle', () => {
      toolState.start = { x: 0, y: 0 };
      
      captureTool.onMouseMove(toolState, 2, 2, mockSetCellAlive, mockGetLiveCells);
      
      expect(toolState.end).toEqual({ x: 2, y: 2 });
      expect(toolState.preview).toBeDefined();
      expect(toolState.preview.length).toBeGreaterThan(0);
      expect(toolState.capturedCells).toBeDefined();
    });

    test('onMouseUp captures cells in selection area', () => {
      toolState.start = { x: 0, y: 0 };
      
      captureTool.onMouseUp(toolState, 3, 3, mockSetCellAlive, mockGetLiveCells, mockTool);
      
      expect(mockTool.onCaptureComplete).toHaveBeenCalledWith({
        cells: expect.arrayContaining([
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 }
        ]),
        width: 4,
        height: 4,
        originalBounds: { minX: 0, maxX: 3, minY: 0, maxY: 3 },
        cellCount: 3
      });
      
      // Tool state should be reset
      expect(toolState.start).toBeNull();
      expect(toolState.end).toBeNull();
      expect(toolState.preview).toEqual([]);
      expect(toolState.capturedCells).toEqual([]);
    });

    test('onMouseUp without callback resets state and does not throw', () => {
      toolState.start = { x: 0, y: 0 };

      expect(() => {
        captureTool.onMouseUp(toolState, 2, 2, mockSetCellAlive, mockGetLiveCells);
      }).not.toThrow();

      // Tool state should be reset even when no callback is provided
      expect(toolState.start).toBeNull();
      expect(toolState.end).toBeNull();
      expect(toolState.preview).toEqual([]);
      expect(toolState.capturedCells).toEqual([]);
    });
  });

  describe('drawOverlay', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        strokeStyle: '',
        lineWidth: 0,
        setLineDash: jest.fn(),
        strokeRect: jest.fn(),
        strokeText: jest.fn(),
        fillStyle: '',
        fillRect: jest.fn(),
        fillText: jest.fn(),
        font: '',
        textAlign: '',
        textBaseline: ''
      };
    });

    test('draws selection rectangle when dragging', () => {
      toolState.start = { x: 1, y: 1 };
      toolState.end = { x: 3, y: 3 };
      toolState.capturedCells = [[2, 2]]; // Format expected by drawOverlay

      const offset = { x: 0, y: 0 };
      captureTool.drawOverlay(mockCtx, toolState, 10, offset);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockCtx.strokeRect).toHaveBeenCalledWith(10, 10, 30, 30);
      expect(mockCtx.fillText).toHaveBeenCalledWith('1 cells', 10, 2);
    });

    test('does nothing when not dragging', () => {
      const offset = { x: 0, y: 0 };
      captureTool.drawOverlay(mockCtx, toolState, 10, offset);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.strokeRect).not.toHaveBeenCalled();
    });
  });
});