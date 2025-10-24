import { drawTool } from "./drawTool";

describe("drawTool", () => {
  let toolState;
  let mockSetCellAlive;

  beforeEach(() => {
    toolState = {};
    mockSetCellAlive = jest.fn();
  });

  describe("onMouseDown", () => {
    it("should set start and last positions", () => {
      drawTool.onMouseDown(toolState, 5, 3);

      expect(toolState.start).toEqual({ x: 5, y: 3 });
      expect(toolState.last).toEqual({ x: 5, y: 3 });
    });

    it("should handle negative coordinates", () => {
      drawTool.onMouseDown(toolState, -2, -1);

      expect(toolState.start).toEqual({ x: -2, y: -1 });
      expect(toolState.last).toEqual({ x: -2, y: -1 });
    });

    it("should overwrite existing positions", () => {
      toolState.start = { x: 1, y: 1 };
      toolState.last = { x: 2, y: 2 };

      drawTool.onMouseDown(toolState, 10, 20);

      expect(toolState.start).toEqual({ x: 10, y: 20 });
      expect(toolState.last).toEqual({ x: 10, y: 20 });
    });
  });

  describe("onMouseMove", () => {
    it("should return early if last position is not set", () => {
      toolState.last = null;

      drawTool.onMouseMove(toolState, 5, 3, mockSetCellAlive);

      expect(mockSetCellAlive).not.toHaveBeenCalled();
      expect(toolState.last).toBeNull();
    });

    it("should draw single cell when moving to same position", () => {
      toolState.last = { x: 5, y: 3 };

      drawTool.onMouseMove(toolState, 5, 3, mockSetCellAlive);

      expect(mockSetCellAlive).toHaveBeenCalledWith(5, 3, true);
      expect(toolState.last).toEqual({ x: 5, y: 3 });
    });

    it("should draw line when moving horizontally", () => {
      toolState.last = { x: 2, y: 3 };

      drawTool.onMouseMove(toolState, 5, 3, mockSetCellAlive);

      // Should draw cells at (2,3), (3,3), (4,3), (5,3)
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(4, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(5, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(4);
      expect(toolState.last).toEqual({ x: 5, y: 3 });
    });

    it("should draw line when moving vertically", () => {
      toolState.last = { x: 3, y: 1 };

      drawTool.onMouseMove(toolState, 3, 4, mockSetCellAlive);

      // Should draw cells at (3,1), (3,2), (3,3), (3,4)
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 4, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(4);
      expect(toolState.last).toEqual({ x: 3, y: 4 });
    });

    it("should draw diagonal line", () => {
      toolState.last = { x: 0, y: 0 };

      drawTool.onMouseMove(toolState, 2, 2, mockSetCellAlive);

      // Should draw cells at (0,0), (1,1), (2,2)
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(2, 2, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(3);
      expect(toolState.last).toEqual({ x: 2, y: 2 });
    });

    it("should handle single step movement", () => {
      toolState.last = { x: 3, y: 3 };

      drawTool.onMouseMove(toolState, 4, 3, mockSetCellAlive);

      // Should draw cells at (3,3), (4,3)
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(4, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(2);
    });

    it("should handle backward movement", () => {
      toolState.last = { x: 5, y: 3 };

      drawTool.onMouseMove(toolState, 3, 3, mockSetCellAlive);

      // Should draw cells from (5,3) to (3,3)
      expect(mockSetCellAlive).toHaveBeenCalledWith(5, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(4, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(3, 3, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(3);
    });

    it("should handle fractional coordinates by rounding", () => {
      toolState.last = { x: 0, y: 0 };

      drawTool.onMouseMove(toolState, 1, 1, mockSetCellAlive);

      // With steps = 1, intermediate point is (0.5, 0.5) which rounds to (1, 1)
      expect(mockSetCellAlive).toHaveBeenCalledWith(0, 0, true);
      expect(mockSetCellAlive).toHaveBeenCalledWith(1, 1, true);
      expect(mockSetCellAlive).toHaveBeenCalledTimes(2);
    });
  });

  describe("onMouseUp", () => {
    it("should clear start and last positions", () => {
      toolState.start = { x: 5, y: 3 };
      toolState.last = { x: 10, y: 7 };

      drawTool.onMouseUp(toolState);

      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
    });

    it("should handle already null positions", () => {
      toolState.start = null;
      toolState.last = null;

      drawTool.onMouseUp(toolState);

      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
    });
  });

  describe("drawOverlay", () => {
    it("should exist and not throw", () => {
      const mockCtx = {};
      const mockToolState = {};
      const cellSize = 10;
      const offset = { x: 0, y: 0 };

      expect(() => {
        drawTool.drawOverlay(mockCtx, mockToolState, cellSize, offset);
      }).not.toThrow();
    });
  });

  describe("tool integration", () => {
    it("should have all required methods", () => {
      expect(typeof drawTool.onMouseDown).toBe("function");
      expect(typeof drawTool.onMouseMove).toBe("function");
      expect(typeof drawTool.onMouseUp).toBe("function");
      expect(typeof drawTool.drawOverlay).toBe("function");
    });

    it("should handle complete draw sequence", () => {
      // Start drawing
      drawTool.onMouseDown(toolState, 0, 0);
      expect(toolState.start).toEqual({ x: 0, y: 0 });
      expect(toolState.last).toEqual({ x: 0, y: 0 });

      // Move to draw line
      drawTool.onMouseMove(toolState, 2, 1, mockSetCellAlive);
      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(toolState.last).toEqual({ x: 2, y: 1 });

      // Continue drawing
      mockSetCellAlive.mockClear();
      drawTool.onMouseMove(toolState, 4, 2, mockSetCellAlive);
      expect(mockSetCellAlive).toHaveBeenCalled();
      expect(toolState.last).toEqual({ x: 4, y: 2 });

      // End drawing
      drawTool.onMouseUp(toolState);
      expect(toolState.start).toBeNull();
      expect(toolState.last).toBeNull();
    });
  });
});
