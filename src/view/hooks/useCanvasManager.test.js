import { renderHook, act } from '@testing-library/react';
import { useCanvasManager } from './useCanvasManager';
import { actFn } from '../../../test-utils/testHelpers';

// Mock dependencies
jest.mock('../../controller/utils/canvasUtils', () => ({
  eventToCellFromCanvas: jest.fn(() => ({ x: 5, y: 5 })),
  computeComputedOffset: jest.fn(() => ({ x: 0, y: 0 })),
  drawLiveCells: jest.fn()
}));

const mockProps = {
  getLiveCells: jest.fn(() => new Map()),
  cellSize: 8,
  offsetRef: { current: { x: 0, y: 0 } },
  colorScheme: { background: '#000000', getCellColor: jest.fn(() => '#ff0000') },
  selectedTool: 'draw',
  toolMap: {
    draw: {
      onMouseDown: jest.fn(),
      onMouseMove: jest.fn(), 
      onMouseUp: jest.fn(),
      drawOverlay: jest.fn()
    }
  },
  toolStateRef: { current: {} },
  setCellAlive: jest.fn(),
  scheduleCursorUpdate: jest.fn(),
  selectedShape: null,
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
};

describe('useCanvasManager', () => {
  let mockCanvas;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      getContext: jest.fn(),
      fillStyle: '',
      fillRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      setTransform: jest.fn(),
      scale: jest.fn(),
      canvas: {
        width: 800,
        height: 600
      }
    };

    mockCanvas = {
      getContext: jest.fn(() => mockContext),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0
      })),
      style: {},
      width: 800,
      height: 600
    };

  Object.defineProperty(globalThis, 'window', {
      value: {
        devicePixelRatio: 1,
        innerWidth: 800,
        innerHeight: 600,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      },
      writable: true
    });

  Object.defineProperty(globalThis, 'requestAnimationFrame', {
      value: jest.fn((cb) => setTimeout(cb, 0)),
      writable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return all expected interface methods and properties', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));

      expect(result.current).toHaveProperty('canvasRef');
      expect(result.current).toHaveProperty('ready');
      expect(result.current).toHaveProperty('setReady');
      expect(result.current).toHaveProperty('draw');
      expect(result.current).toHaveProperty('drawWithOverlay');
      expect(result.current).toHaveProperty('resizeCanvas');
      expect(result.current).toHaveProperty('handleCanvasClick');
      expect(result.current).toHaveProperty('handleMouseDown');
      expect(result.current).toHaveProperty('handleMouseMove');
      expect(result.current).toHaveProperty('handleMouseUp');
      expect(result.current).toHaveProperty('eventToCell');
    });

    it('should initialize with ready state as true', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      expect(result.current.ready).toBe(true);
    });

    it('should set ready to true when setReady is called', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      act(() => {
        result.current.setReady(true);
      });

      expect(result.current.ready).toBe(true);
    });
  });

  describe('canvas reference', () => {
    it('should provide a canvas ref', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      expect(result.current.canvasRef).toBeDefined();
      expect(result.current.canvasRef.current).toBe(null);
    });

    it('should allow setting canvas ref', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      expect(result.current.canvasRef.current).toBe(mockCanvas);
    });
  });

  describe('drawing functions', () => {
    it('should call draw function without errors when canvas is set', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      act(() => {
        result.current.draw();
      });

      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should not throw error when draw is called without canvas', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
        expect(actFn(() => result.current.draw())).not.toThrow();
    });

    it('should call drawWithOverlay without errors', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      act(() => {
        result.current.drawWithOverlay();
      });

      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });
  });

  describe('mouse event handlers', () => {
    it('should handle mouse events without throwing', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      // Set up canvas ref
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
        button: 0,
        buttons: 1,
        preventDefault: jest.fn(),
        target: { setPointerCapture: jest.fn(), releasePointerCapture: jest.fn() },
        pointerId: 1
      };

        expect(actFn(() => result.current.handleMouseDown(mockEvent))).not.toThrow();

        expect(actFn(() => result.current.handleMouseMove(mockEvent))).not.toThrow();

        expect(actFn(() => result.current.handleMouseUp(mockEvent))).not.toThrow();
    });

    it('should handle canvas click without throwing', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      const mockEvent = {
        clientX: 100,
        clientY: 100
      };

        expect(actFn(() => result.current.handleCanvasClick(mockEvent))).not.toThrow();
    });
  });

  describe('resize functionality', () => {
    it('should handle resize canvas without throwing', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

        expect(actFn(() => result.current.resizeCanvas())).not.toThrow();
    });

    it('should not throw when resizing without canvas', () => {
      const { result } = renderHook(() => useCanvasManager(mockProps));

        expect(actFn(() => result.current.resizeCanvas())).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid color scheme gracefully', () => {
      const propsWithBadColorScheme = {
        ...mockProps,
        colorScheme: null
      };

      const { result } = renderHook(() => useCanvasManager(propsWithBadColorScheme));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

        expect(actFn(() => result.current.draw())).not.toThrow();
    });

    it('should handle missing tool gracefully', () => {
      const propsWithMissingTool = {
        ...mockProps,
        selectedTool: 'nonexistentTool'
      };

      const { result } = renderHook(() => useCanvasManager(propsWithMissingTool));

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        button: 0,
        buttons: 1,
        preventDefault: jest.fn()
      };

        expect(actFn(() => result.current.handleMouseDown(mockEvent))).not.toThrow();
    });

    it('should log errors when overlay drawing fails', () => {
      const mockPropsWithFailingTool = {
        ...mockProps,
        toolMap: {
          draw: {
            drawOverlay: jest.fn(() => { throw new Error('Mock overlay error'); })
          }
        }
      };

      const { result } = renderHook(() => useCanvasManager(mockPropsWithFailingTool));
      
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      act(() => {
        result.current.drawWithOverlay();
      });

      expect(mockProps.logger.warn).toHaveBeenCalledWith('Overlay rendering failed:', expect.any(Error));
    });
  });
});