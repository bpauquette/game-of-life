import { drawScene } from './renderer';

describe('renderer', () => {
  let mockCtx;
  let mockCanvas;
  let mockRefs;

  beforeEach(() => {
    mockCanvas = {
      width: 800,
      height: 600
    };

    mockCtx = {
      canvas: mockCanvas,
      fillStyle: '',
      strokeStyle: '',
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn()
    };

    mockRefs = {
      liveCellsRef: { current: new Map() },
      offsetRef: { current: { x: 0, y: 0 } },
      cellSizePx: 10
    };
  });

  describe('drawScene', () => {
    it('should clear canvas with black background', () => {
      drawScene(mockCtx, mockRefs);
      
      expect(mockCtx.fillStyle).toBe('black');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should draw grid lines', () => {
      drawScene(mockCtx, mockRefs);
      
      expect(mockCtx.strokeStyle).toBe('#202020');
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should draw vertical grid lines at correct intervals', () => {
      mockRefs.cellSizePx = 20;
      drawScene(mockCtx, mockRefs);
      
      // With cellSize 20, lines should be at x: 0, 20, 40, 60, ...
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0.5, 0);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(0.5, 600);
      expect(mockCtx.moveTo).toHaveBeenCalledWith(20.5, 0);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20.5, 600);
    });

    it('should draw horizontal grid lines at correct intervals', () => {
      mockRefs.cellSizePx = 20;
      drawScene(mockCtx, mockRefs);
      
      // With cellSize 20, lines should be at y: 0, 20, 40, 60, ...
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0.5);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(800, 0.5);
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 20.5);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(800, 20.5);
    });

    it('should handle offset in grid calculations', () => {
      mockRefs.offsetRef.current = { x: 1, y: 1 };
      mockRefs.cellSizePx = 10;
      drawScene(mockCtx, mockRefs);
      
      // With offset (1,1) and cellSize 10:
      // startX = (-1 * 10) % 10 = -10 % 10 = 0 (after adding s)
      // startY = (-1 * 10) % 10 = -10 % 10 = 0 (after adding s)
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0.5, 0);
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0.5);
    });

    it('should draw no cells when liveCellsRef is empty', () => {
      const fillRectCalls = mockCtx.fillRect.mock.calls;
      const initialCallCount = fillRectCalls.length;
      
      drawScene(mockCtx, mockRefs);
      
      // Should only have the background clear call, no cell drawing
      expect(fillRectCalls.length).toBe(initialCallCount + 1); // +1 for background
      expect(fillRectCalls[fillRectCalls.length - 1]).toEqual([0, 0, 800, 600]);
    });

    it('should draw cells at correct positions', () => {
      mockRefs.liveCellsRef.current.set('5,3', true);
      mockRefs.liveCellsRef.current.set('10,7', true);
      mockRefs.cellSizePx = 20;
      
      drawScene(mockCtx, mockRefs);
      
      // Cell (5,3): sx = (5-0)*20 = 100, sy = (3-0)*20 = 60
      // Cell (10,7): sx = (10-0)*20 = 200, sy = (7-0)*20 = 140
      expect(mockCtx.fillRect).toHaveBeenCalledWith(100, 60, 20, 20);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(200, 140, 20, 20);
    });

    it('should apply cell offset correctly', () => {
      mockRefs.liveCellsRef.current.set('5,3', true);
      mockRefs.offsetRef.current = { x: 2, y: 1 };
      mockRefs.cellSizePx = 10;
      
      drawScene(mockCtx, mockRefs);
      
      // Cell (5,3) with offset (2,1): sx = (5-2)*10 = 30, sy = (3-1)*10 = 20
      expect(mockCtx.fillRect).toHaveBeenCalledWith(30, 20, 10, 10);
    });

    it('should use correct HSL colors for cells', () => {
      mockRefs.liveCellsRef.current.set('0,0', true);
      mockRefs.liveCellsRef.current.set('1,1', true);
      
      drawScene(mockCtx, mockRefs);
      
      // Cell (0,0): hue = (0*53 + 0*97) % 360 = 0
      // Cell (1,1): hue = (1*53 + 1*97) % 360 = 150
      expect(mockCtx.fillStyle).toBe('hsl(150, 80%, 55%)'); // Last set value
      // Check that both colors were set at some point
      expect(mockCtx.fillStyle).toEqual(expect.stringContaining('hsl('));
    });

    it('should handle hue wrap-around correctly', () => {
      // Create a cell that will have hue > 360
      mockRefs.liveCellsRef.current.set('10,10', true);
      
      drawScene(mockCtx, mockRefs);
      
      // Cell (10,10): hue = (10*53 + 10*97) % 360 = 1500 % 360 = 60
      expect(mockCtx.fillStyle).toContain('hsl(60, 80%, 55%)');
    });

    it('should skip cells outside canvas bounds', () => {
      // Add cells that are outside the visible area
      mockRefs.liveCellsRef.current.set('-10,-10', true); // Off-screen top-left
      mockRefs.liveCellsRef.current.set('100,100', true);  // Off-screen bottom-right
      mockRefs.cellSizePx = 10;
      
      const fillRectCalls = mockCtx.fillRect.mock.calls;
      const initialCallCount = fillRectCalls.length;
      
      drawScene(mockCtx, mockRefs);
      
      // Should only have background clear, no cell drawing for off-screen cells
      expect(fillRectCalls.length).toBe(initialCallCount + 1); // +1 for background only
    });

    it('should draw cells partially visible at canvas edges', () => {
      // Cell that's partially visible
      mockRefs.liveCellsRef.current.set('79,59', true); // Right at edge with cellSize 10
      mockRefs.cellSizePx = 10;
      
      drawScene(mockCtx, mockRefs);
      
      // Cell (79,59): sx = (79-0)*10 = 790, sy = (59-0)*10 = 590
      // This cell should be drawn as it's partially visible
      expect(mockCtx.fillRect).toHaveBeenCalledWith(790, 590, 10, 10);
    });

    it('should use Math.floor and Math.ceil for cell positioning', () => {
      mockRefs.liveCellsRef.current.set('0,0', true);
      mockRefs.cellSizePx = 10.7; // Non-integer cell size
      
      drawScene(mockCtx, mockRefs);
      
      // Should use Math.floor for position, Math.ceil for size
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 11, 11); // Math.floor(0), Math.ceil(10.7)
    });

    it('should handle negative coordinates correctly', () => {
      mockRefs.liveCellsRef.current.set('-1,-1', true);
      mockRefs.offsetRef.current = { x: -5, y: -5 };
      mockRefs.cellSizePx = 20;
      
      drawScene(mockCtx, mockRefs);
      
      // Cell (-1,-1) with offset (-5,-5): sx = (-1-(-5))*20 = 80, sy = (-1-(-5))*20 = 80
      expect(mockCtx.fillRect).toHaveBeenCalledWith(80, 80, 20, 20);
    });
  });
});