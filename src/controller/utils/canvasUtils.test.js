import { computeComputedOffset, eventToCellFromCanvas, drawLiveCells } from './canvasUtils';

describe('canvasUtils', () => {
  describe('computeComputedOffset', () => {
    it('should return zero offset when canvas or offsetRef is null', () => {
      const result = computeComputedOffset(null, null, 10);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return zero offset when canvas is null', () => {
      const offsetRef = { current: { x: 5, y: 3 } };
      const result = computeComputedOffset(null, offsetRef, 10);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return zero offset when offsetRef is null', () => {
      const mockCanvas = {
        getBoundingClientRect: () => ({ width: 800, height: 600 })
      };
      const result = computeComputedOffset(mockCanvas, null, 10);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should compute correct offset for valid inputs', () => {
      const mockCanvas = {
        getBoundingClientRect: () => ({ width: 800, height: 600 })
      };
      const offsetRef = { current: { x: 5, y: 3 } };
      const cellSize = 10;
      
      const result = computeComputedOffset(mockCanvas, offsetRef, cellSize);
      
      // centerX = 400, centerY = 300
      // x = 5 * 10 - 400 = -350
      // y = 3 * 10 - 300 = -270
      expect(result).toEqual({ x: -350, y: -270 });
    });
  });

  describe('eventToCellFromCanvas', () => {
    const mockCanvas = {
      getBoundingClientRect: () => ({
        width: 800,
        height: 600,
        left: 100,
        top: 50
      })
    };

    it('should return null when canvas is null', () => {
      const offsetRef = { current: { x: 0, y: 0 } };
      const mockEvent = { clientX: 500, clientY: 350 };
      
      const result = eventToCellFromCanvas(mockEvent, null, offsetRef, 10);
      expect(result).toBeNull();
    });

    it('should return null when offsetRef is null', () => {
      const mockEvent = { clientX: 500, clientY: 350 };
      
      const result = eventToCellFromCanvas(mockEvent, mockCanvas, null, 10);
      expect(result).toBeNull();
    });

    it('should return null when offsetRef.current is null', () => {
      const offsetRef = { current: null };
      const mockEvent = { clientX: 500, clientY: 350 };
      
      const result = eventToCellFromCanvas(mockEvent, mockCanvas, offsetRef, 10);
      expect(result).toBeNull();
    });

    it('should compute correct cell coordinates for valid inputs', () => {
      const offsetRef = { current: { x: 0, y: 0 } };
      const mockEvent = { clientX: 500, clientY: 350 };
      const cellSize = 10;
      
      const result = eventToCellFromCanvas(mockEvent, mockCanvas, offsetRef, cellSize);
      
      // centerX = 400, centerY = 300
      // clientX - rect.left - centerX = 500 - 100 - 400 = 0
      // clientY - rect.top - centerY = 350 - 50 - 300 = 0  
      // x = Math.floor(0 + 0 / 10) = 0
      // y = Math.floor(0 + 0 / 10) = 0
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should compute correct cell coordinates with offset', () => {
      const offsetRef = { current: { x: 5, y: 3 } };
      const mockEvent = { clientX: 550, clientY: 380 };
      const cellSize = 20;
      
      const result = eventToCellFromCanvas(mockEvent, mockCanvas, offsetRef, cellSize);
      
      // centerX = 400, centerY = 300
      // clientX - rect.left - centerX = 550 - 100 - 400 = 50
      // clientY - rect.top - centerY = 380 - 50 - 300 = 30
      // x = Math.floor(5 + 50 / 20) = Math.floor(5 + 2.5) = 7
      // y = Math.floor(3 + 30 / 20) = Math.floor(3 + 1.5) = 4
      expect(result).toEqual({ x: 7, y: 4 });
    });
  });

  describe('drawLiveCells', () => {
    let mockCtx;
    let mockColorScheme;
    
    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        fillRect: jest.fn()
      };
      
      mockColorScheme = {
        getCellColor: jest.fn().mockReturnValue('#ff0000')
      };
    });

    it('should return early when ctx is null', () => {
      const liveMap = new Map([['5,3', true]]);
      const computedOffset = { x: 0, y: 0 };
      
      drawLiveCells(null, liveMap, computedOffset, 10, mockColorScheme);
      
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should return early when liveMap is null', () => {
      const computedOffset = { x: 0, y: 0 };
      
      drawLiveCells(mockCtx, null, computedOffset, 10, mockColorScheme);
      
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should draw cells for valid inputs', () => {
      const liveMap = new Map([
        ['5,3', true],
        ['10,7', true]
      ]);
      const computedOffset = { x: 20, y: 15 };
      const cellSize = 10;
      
      drawLiveCells(mockCtx, liveMap, computedOffset, cellSize, mockColorScheme);
      
      expect(mockColorScheme.getCellColor).toHaveBeenCalledWith(5, 3);
      expect(mockColorScheme.getCellColor).toHaveBeenCalledWith(10, 7);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(30, 15, 10, 10); // (5*10-20, 3*10-15, 10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(80, 55, 10, 10); // (10*10-20, 7*10-15, 10, 10)
      expect(mockCtx.fillStyle).toBe('#ff0000');
    });

    it('should handle empty liveMap', () => {
      const liveMap = new Map();
      const computedOffset = { x: 0, y: 0 };
      
      drawLiveCells(mockCtx, liveMap, computedOffset, 10, mockColorScheme);
      
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
      expect(mockColorScheme.getCellColor).not.toHaveBeenCalled();
    });
  });
});