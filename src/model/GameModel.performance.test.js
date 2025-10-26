import { GameModel } from '../model/GameModel';

describe('GameModel Performance Tracking', () => {
  let originalPerformanceNow;
  let mockTime;
  
  beforeEach(() => {
    // Mock performance.now() for consistent timing
    originalPerformanceNow = globalThis.performance.now;
    mockTime = 0;
    globalThis.performance.now = jest.fn(() => {
      return mockTime;
    });
  });

  afterEach(() => {
    globalThis.performance.now = originalPerformanceNow;
  });

  test('trackGeneration should record timestamps', () => {
    const model = new GameModel();
    
    // Track multiple generations
    mockTime = 1000;
    model.trackGeneration();
    
    mockTime = 1100;
    model.trackGeneration();
    
    mockTime = 1200;
    model.trackGeneration();
    
    expect(model.generationTimestamps.length).toBe(3);
    expect(model.generationTimestamps).toEqual([1000, 1100, 1200]);
  });

  test('trackRender should record timestamps', () => {
    const model = new GameModel();
    
    // Track multiple renders
    mockTime = 2000;
    model.trackRender();
    
    mockTime = 2016.67;
    model.trackRender();
    
    mockTime = 2033.34;
    model.trackRender();
    
    expect(model.renderTimestamps.length).toBe(3);
    expect(model.renderTimestamps).toEqual([2000, 2016.67, 2033.34]);
  });

  test('getGenPerSecond should calculate correct Gen/s', () => {
    const model = new GameModel();
    
    // Track generations over 1 second (10 generations per second)
    for (let i = 0; i < 10; i++) {
      mockTime = 1000 + (i * 100); // Every 100ms
      model.trackGeneration();
    }
    
    // Set current time to 1 second later
    mockTime = 2000;
    
    const gps = model.getGenPerSecond();
    
    // Should be close to 10 Gen/s (9 intervals over 900ms = 10 Gen/s)
    expect(gps).toBeCloseTo(10, 0);
  });

  test('getFPS should calculate correct FPS', () => {
    const model = new GameModel();
    
    // Track renders over 1 second (60 FPS)
    for (let i = 0; i < 60; i++) {
      mockTime = 1000 + (i * 16.67); // Every 16.67ms (60 FPS)
      model.trackRender();
    }
    
    // Set current time to 1 second later
    mockTime = 2000;
    
    const fps = model.getFPS();
    
    // Should be close to 60 FPS
    expect(fps).toBeCloseTo(60, 0);
  });

  test('getGenPerSecond should return 0 when no generations tracked', () => {
    const model = new GameModel();
    expect(model.getGenPerSecond()).toBe(0);
  });

  test('getFPS should return 0 when no renders tracked', () => {
    const model = new GameModel();
    expect(model.getFPS()).toBe(0);
  });

  test('step should automatically call trackGeneration', () => {
    const model = new GameModel();
    
    // Add some live cells
  model.setCellAliveModel(5, 5, true);
    
    // Spy on trackGeneration
    const trackSpy = jest.spyOn(model, 'trackGeneration');
    
    mockTime = 1000;
    model.step();
    
    expect(trackSpy).toHaveBeenCalledTimes(1);
  });

  test('performance metrics should show non-zero values during active simulation', () => {
    const model = new GameModel();
    
    // Add live cells
  model.setCellAliveModel(5, 5, true);
  model.setCellAliveModel(5, 6, true);
  model.setCellAliveModel(6, 5, true);
    
    // Simulate game running for several steps with renders
    for (let i = 0; i < 10; i++) {
      mockTime = 1000 + (i * 100);
      model.step(); // This calls trackGeneration
      
      mockTime = 1000 + (i * 100) + 16.67;
      model.trackRender();
    }
    
    mockTime = 2000;
    
    const metrics = model.getPerformanceMetrics();
    
    expect(metrics.fps).toBeGreaterThan(0);
    expect(metrics.gps).toBeGreaterThan(0);
    expect(metrics.generation).toBe(10);
    expect(metrics.population).toBeGreaterThan(0);
  });
});