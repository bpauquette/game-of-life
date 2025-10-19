import { renderHook } from '@testing-library/react';
import { useEngine } from './engine';

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();

global.requestAnimationFrame = mockRequestAnimationFrame;
global.cancelAnimationFrame = mockCancelAnimationFrame;

describe('useEngine', () => {
  let mockTick;

  beforeEach(() => {
    mockTick = jest.fn();
    mockRequestAnimationFrame.mockClear();
    mockCancelAnimationFrame.mockClear();
    
    // Setup requestAnimationFrame to execute callback immediately
    mockRequestAnimationFrame.mockImplementation((callback) => {
      const id = Math.random();
      setTimeout(callback, 0);
      return id;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not start animation loop when isRunning is false', () => {
    renderHook(() => useEngine(false, mockTick));
    
    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    expect(mockTick).not.toHaveBeenCalled();
  });

  it('should start animation loop when isRunning is true', () => {
    renderHook(() => useEngine(true, mockTick));
    
    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should call tick function when running', async () => {
    renderHook(() => useEngine(true, mockTick));
    
    // Wait for the async callback to execute
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockTick).toHaveBeenCalled();
  });

  it('should cancel animation frame when isRunning changes to false', () => {
    const animationId = 123;
    mockRequestAnimationFrame.mockReturnValue(animationId);
    
    const { rerender } = renderHook(
      ({ isRunning }) => useEngine(isRunning, mockTick),
      { initialProps: { isRunning: true } }
    );
    
    // Change isRunning to false
    rerender({ isRunning: false });
    
    expect(mockCancelAnimationFrame).toHaveBeenCalledWith(animationId);
  });

  it('should cancel animation frame on unmount', () => {
    const animationId = 456;
    mockRequestAnimationFrame.mockReturnValue(animationId);
    
    const { unmount } = renderHook(() => useEngine(true, mockTick));
    
    unmount();
    
    expect(mockCancelAnimationFrame).toHaveBeenCalledWith(animationId);
  });

  it('should restart animation loop when tick function changes', () => {
    const newMockTick = jest.fn();
    
    const { rerender } = renderHook(
      ({ tick }) => useEngine(true, tick),
      { initialProps: { tick: mockTick } }
    );
    
    mockRequestAnimationFrame.mockClear();
    
    // Change tick function
    rerender({ tick: newMockTick });
    
    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should handle multiple state changes correctly', () => {
    const { rerender } = renderHook(
      ({ isRunning }) => useEngine(isRunning, mockTick),
      { initialProps: { isRunning: false } }
    );
    
    // Start running
    rerender({ isRunning: true });
    expect(mockRequestAnimationFrame).toHaveBeenCalled();
    
    mockRequestAnimationFrame.mockClear();
    
    // Stop running
    rerender({ isRunning: false });
    expect(mockCancelAnimationFrame).toHaveBeenCalled();
    
    // Start running again
    rerender({ isRunning: true });
    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should not call cancelAnimationFrame if no animation is running', () => {
    const { rerender } = renderHook(
      ({ isRunning }) => useEngine(isRunning, mockTick),
      { initialProps: { isRunning: false } }
    );
    
    // Change to false again (no animation was running)
    rerender({ isRunning: false });
    
    expect(mockCancelAnimationFrame).not.toHaveBeenCalled();
  });
});