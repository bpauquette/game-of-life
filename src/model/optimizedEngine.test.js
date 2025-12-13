import { useOptimizedEngine, createFrameRateLimiter, usePerformanceMonitor, GameLogicWorker } from './optimizedEngine';

describe('optimizedEngine', () => {
  it('should export useOptimizedEngine as a function', () => {
    expect(typeof useOptimizedEngine).toBe('function');
  });
  it('should export createFrameRateLimiter as a function', () => {
    expect(typeof createFrameRateLimiter).toBe('function');
  });
  it('should export usePerformanceMonitor as a function', () => {
    expect(typeof usePerformanceMonitor).toBe('function');
  });
  it('should export GameLogicWorker as a class or function', () => {
    expect(typeof GameLogicWorker).toMatch(/function|object/);
  });
});
