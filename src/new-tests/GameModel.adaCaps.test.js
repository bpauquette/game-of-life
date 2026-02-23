import { GameModel } from '../model/GameModel.js';

describe('GameModel ADA caps (normal engine only)', () => {
  beforeEach(() => {
    try { globalThis.localStorage?.clear(); } catch (e) { /* ignore */ }
    delete globalThis.ADA_ENABLED;
  });

  afterEach(() => {
    delete globalThis.ADA_ENABLED;
  });

  test('enforces 2 FPS/2 GPS caps in normal mode when ADA is enabled', () => {
    globalThis.ADA_ENABLED = true;
    const model = new GameModel();
    model.setEngineMode('normal');

    const next = model.setPerformanceSettingsModel({
      maxFPS: 120,
      maxGPS: 60,
      enableFPSCap: false,
      enableGPSCap: false
    });

    expect(next.maxFPS).toBe(2);
    expect(next.maxGPS).toBe(2);
    expect(next.enableFPSCap).toBe(true);
    expect(next.enableGPSCap).toBe(true);
  });

  test('does not enforce ADA caps in hashlife mode', () => {
    globalThis.ADA_ENABLED = true;
    const model = new GameModel();
    model.setEngineMode('hashlife');

    const next = model.setPerformanceSettingsModel({
      maxFPS: 120,
      maxGPS: 60,
      enableFPSCap: false,
      enableGPSCap: false
    });

    expect(next.maxFPS).toBe(120);
    expect(next.maxGPS).toBe(60);
    expect(next.enableFPSCap).toBe(false);
    expect(next.enableGPSCap).toBe(false);
  });

  test('applies ADA caps when switching from hashlife to normal mode', () => {
    globalThis.ADA_ENABLED = true;
    const model = new GameModel();
    model.setEngineMode('hashlife');
    model.setPerformanceSettingsModel({
      maxFPS: 120,
      maxGPS: 60,
      enableFPSCap: false,
      enableGPSCap: false
    });

    model.setEngineMode('normal');
    const next = model.getPerformanceSettings();

    expect(next.maxFPS).toBe(2);
    expect(next.maxGPS).toBe(2);
    expect(next.enableFPSCap).toBe(true);
    expect(next.enableGPSCap).toBe(true);
  });

  test('does not enforce ADA caps when ADA is disabled', () => {
    globalThis.ADA_ENABLED = false;
    const model = new GameModel();
    model.setEngineMode('normal');

    const next = model.setPerformanceSettingsModel({
      maxFPS: 120,
      maxGPS: 60,
      enableFPSCap: false,
      enableGPSCap: false
    });

    expect(next.maxFPS).toBe(120);
    expect(next.maxGPS).toBe(60);
    expect(next.enableFPSCap).toBe(false);
    expect(next.enableGPSCap).toBe(false);
  });
});
