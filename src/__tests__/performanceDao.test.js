import { describe, expect, jest, test, beforeEach } from '@jest/globals';

beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
});

describe('performanceDao', () => {
  test('initializes from localStorage with clamping', async () => {
    localStorage.setItem('maxFPS', '200');
    localStorage.setItem('maxGPS', '-5');
    localStorage.setItem('enableFPSCap', 'true');
    localStorage.setItem('enableGPSCap', 'false');

    const { usePerformanceDao } = await import('../model/dao/performanceDao.js');
    const { performanceCaps } = usePerformanceDao.getState();

    expect(performanceCaps).toEqual({
      maxFPS: 120,
      maxGPS: 1,
      enableFPSCap: true,
      enableGPSCap: false
    });
  });

  test('setPerformanceCaps clamps and persists', async () => {
    const { usePerformanceDao } = await import('../model/dao/performanceDao.js');

    usePerformanceDao.getState().setPerformanceCaps({
      maxFPS: 999,
      maxGPS: -10,
      enableFPSCap: true,
      enableGPSCap: true,
    });

    const { performanceCaps } = usePerformanceDao.getState();

    expect(performanceCaps.maxFPS).toBe(120);
    expect(performanceCaps.maxGPS).toBe(1);
    expect(performanceCaps.enableFPSCap).toBe(true);
    expect(performanceCaps.enableGPSCap).toBe(true);
    expect(localStorage.getItem('maxFPS')).toBe('120');
    expect(localStorage.getItem('maxGPS')).toBe('1');
    expect(localStorage.getItem('enableFPSCap')).toBe('true');
    expect(localStorage.getItem('enableGPSCap')).toBe('true');
  });

  test('setMemoryTelemetryEnabled persists to localStorage', async () => {
    const { usePerformanceDao } = await import('../model/dao/performanceDao.js');

    usePerformanceDao.getState().setMemoryTelemetryEnabled(true);
    expect(usePerformanceDao.getState().memoryTelemetryEnabled).toBe(true);
    expect(localStorage.getItem('memoryTelemetryEnabled')).toBe('true');

    usePerformanceDao.getState().setMemoryTelemetryEnabled(false);
    expect(usePerformanceDao.getState().memoryTelemetryEnabled).toBe(false);
    expect(localStorage.getItem('memoryTelemetryEnabled')).toBe('false');
  });
});
