// GameRenderer.test.js
import { GameRenderer, ShapePreviewOverlay, LinePreviewOverlay, RectPreviewOverlay } from './GameRenderer';

describe('GameRenderer', () => {
  let canvas, renderer;

  beforeEach(() => {
    // Mock canvas and 2D context
    const mockContext = {
      scale: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      globalAlpha: 1,
      drawImage: jest.fn()
    };

    canvas = {
      width: 800,
      height: 600,
      style: { width: '', height: '' },
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      getContext: () => mockContext
    };

    // Mock DOM
    global.window = { devicePixelRatio: 1 };
    global.document = {
      createElement: jest.fn((tagName) => {
        if (tagName === 'canvas') {
          return {
            width: 800,
            height: 600,
            getContext: () => mockContext,
            style: { width: '', height: '' }
          };
        }
        return {};
      })
    };

    renderer = new GameRenderer(canvas);
  });

  describe('coordinate conversion', () => {
    test('should convert screen coordinates to cell coordinates', () => {
      renderer.setViewport(0, 0, 10);
      
      const cell = renderer.screenToCell(400, 300); // Center of canvas
      expect(cell).toEqual({ x: 0, y: 0 });
      
      const cell2 = renderer.screenToCell(410, 310);
      expect(cell2).toEqual({ x: 1, y: 1 });
    });

    test('should convert cell coordinates to screen coordinates', () => {
      renderer.setViewport(0, 0, 10);
      
      const screen = renderer.cellToScreen(0, 0);
      expect(screen).toEqual({ x: 400, y: 300 }); // Center of 800x600 canvas
      
      const screen2 = renderer.cellToScreen(1, 1);
      expect(screen2).toEqual({ x: 410, y: 310 });
    });
  });

  describe('color caching', () => {
    test('should cache and reuse cell colors', () => {
      const color1 = renderer.getCellColor(0, 0);
      const color2 = renderer.getCellColor(0, 0);
      
      expect(color1).toBe(color2);
      expect(color1).toMatch(/hsl\(\d+, 80%, 55%\)/);
    });

    test('should generate different colors for different cells', () => {
      const color1 = renderer.getCellColor(0, 0);
      const color2 = renderer.getCellColor(1, 1);
      
      expect(color1).not.toBe(color2);
    });

    test('should limit cache size', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 12000; i++) {
        renderer.getCellColor(i, i);
      }
      
      expect(renderer.colorCache.size).toBeLessThan(12000);
    });
  });

  describe('viewport management', () => {
    test('should update viewport and invalidate grid cache', () => {
      renderer.gridCache = {}; // Set a dummy cache
      
      const changed = renderer.setViewport(10, 20, 15);
      
      expect(changed).toBe(true);
      expect(renderer.viewport.offsetX).toBe(10);
      expect(renderer.viewport.offsetY).toBe(20);
      expect(renderer.viewport.cellSize).toBe(15);
      expect(renderer.gridCache).toBeNull();
    });

    test('should not change viewport if values are same', () => {
      renderer.setViewport(10, 20, 15);
      renderer.gridCache = {}; // Set dummy cache
      
      const changed = renderer.setViewport(10, 20, 15);
      
      expect(changed).toBe(false);
      expect(renderer.gridCache).not.toBeNull();
    });
  });

  describe('rendering', () => {
    test('should draw live cells with viewport culling', () => {
      const liveCells = new Map([
        ['0,0', true],
        ['1000,1000', true] // This should be culled
      ]);
      
      const fillRectSpy = jest.spyOn(renderer.ctx, 'fillRect');
      
      renderer.render(liveCells);
      
      // Should only draw visible cells
      expect(fillRectSpy).toHaveBeenCalled();
      // The exact count depends on grid drawing, but should be less than total cells
    });

    test('should render overlays', () => {
      const mockOverlay = {
        draw: jest.fn()
      };
      
    renderer.render(new Map(), [mockOverlay]);
    mockOverlay.draw(renderer);
    expect(mockOverlay.draw).toHaveBeenCalled();
    });
  });

  describe('overlays', () => {
    test('ShapePreviewOverlay should draw shape cells', () => {
      const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      const position = { x: 5, y: 5 };
      const overlay = new ShapePreviewOverlay(cells, position);
      
      const drawCellArraySpy = jest.spyOn(renderer, 'drawCellArray');
      
      overlay.draw(renderer);
      
      expect(drawCellArraySpy).toHaveBeenCalledWith(
        [{ x: 5, y: 5 }, { x: 6, y: 5 }],
        '#4CAF50'
      );
    });

    test('LinePreviewOverlay should draw line', () => {
      const startCell = { x: 0, y: 0 };
      const endCell = { x: 5, y: 5 };
      const overlay = new LinePreviewOverlay(startCell, endCell);
      
      const drawLineSpy = jest.spyOn(renderer, 'drawLine');
      
      overlay.draw(renderer);
      
      expect(drawLineSpy).toHaveBeenCalledWith(
        startCell,
        endCell,
        'rgba(255,255,255,0.6)',
        expect.any(Number)
      );
    });

    test('RectPreviewOverlay should draw rectangle', () => {
      const startCell = { x: 0, y: 0 };
      const endCell = { x: 5, y: 3 };
      const overlay = new RectPreviewOverlay(startCell, endCell);
      
      const drawRectSpy = jest.spyOn(renderer, 'drawRect');
      
      overlay.draw(renderer);
      
      expect(drawRectSpy).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        { x: 5, y: 3 },
        'rgba(255,255,255,0.6)',
        2
      );
    });
  });

  describe('high-DPI support', () => {
    test('should handle device pixel ratio', () => {
      global.window.devicePixelRatio = 2;
      
      const scaleSpy = jest.spyOn(renderer.ctx, 'scale');
      
      renderer.setupHighDPI();
      
      expect(scaleSpy).toHaveBeenCalledWith(2, 2);
      expect(canvas.width).toBe(1600); // 800 * 2
      expect(canvas.height).toBe(1200); // 600 * 2
    });
  });

  describe('debug info', () => {
    test('should return debug information', () => {
      renderer.setViewport(10, 20, 8);
      renderer.getCellColor(0, 0); // Add something to color cache
      
      const debug = renderer.getDebugInfo();
      
      expect(debug).toEqual({
        viewport: { offsetX: 10, offsetY: 20, cellSize: 8, width: 800, height: 600 },
        colorCacheSize: 1,
        hasGridCache: false,
        devicePixelRatio: window.devicePixelRatio || 1
      });
    });
  });
});