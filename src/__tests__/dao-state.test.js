import { beforeEach, describe, expect, test, jest } from '@jest/globals';

const loadUiDao = async () => (await import('../model/dao/uiDao.js')).useUiDao;
const loadToolDao = async () => (await import('../model/dao/toolDao.js')).useToolDao;
const loadGameDao = async () => (await import('../model/dao/gameDao.js')).useGameDao;
const loadPopulationDao = async () => (await import('../model/dao/populationDao.js')).usePopulationDao;
const loadDialogDao = async () => (await import('../model/dao/dialogDao.js')).useDialogDao;
const loadPerformanceDao = async () => (await import('../model/dao/performanceDao.js')).usePerformanceDao;

beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
});

describe('uiDao', () => {
  test('getEnableAdaCompliance prefers global and local storage fallbacks', async () => {
    const { getEnableAdaCompliance } = await import('../model/dao/uiDao.js');
    globalThis.ADA_ENABLED = true;
    expect(getEnableAdaCompliance()).toBe(true);

    delete globalThis.ADA_ENABLED;
    localStorage.setItem('enableAdaCompliance', 'false');
    expect(getEnableAdaCompliance()).toBe(false);
  });

  test('uses ADA compliance default true unless stored', async () => {
    localStorage.setItem('enableAdaCompliance', 'false');
    const useUiDao = await loadUiDao();
    expect(useUiDao.getState().enableAdaCompliance).toBe(false);
  });

  test('persists web worker preference', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().setUseWebWorker(true);
    expect(useUiDao.getState().useWebWorker).toBe(true);
    expect(localStorage.getItem('useWebWorker')).toBe('true');
  });

  test('persists ADA compliance preference and uiState payload', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().setEnableAdaCompliance(false);
    useUiDao.getState().setUiState({ panel: 'open' });
    expect(useUiDao.getState().enableAdaCompliance).toBe(false);
    expect(localStorage.getItem('enableAdaCompliance')).toBe('false');
    expect(useUiDao.getState().uiState).toEqual({ panel: 'open' });
  });

  test('updates help, assistant and cursor state', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().setHelpOpen(true);
    useUiDao.getState().setAssistantOpen(true);
    useUiDao.getState().setCursorCell({ x: 1, y: 2 });
    expect(useUiDao.getState().helpOpen).toBe(true);
    expect(useUiDao.getState().assistantOpen).toBe(true);
    expect(useUiDao.getState().cursorCell).toEqual({ x: 1, y: 2 });
  });

  test('handles storage failures when reading/writing preferences', async () => {
    const originalStorage = globalThis.localStorage;
    const throwingStorage = {
      getItem: () => {
        throw new Error('read-fail');
      },
      setItem: () => {
        throw new Error('write-fail');
      },
      removeItem: () => {},
      clear: () => {},
    };
    Object.defineProperty(globalThis, 'localStorage', { value: throwingStorage, configurable: true });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const uiModule = await import('../model/dao/uiDao.js');
    const useUiDao = uiModule.useUiDao;
    useUiDao.getState().setUseWebWorker(true);
    useUiDao.getState().setEnableAdaCompliance(false);

    expect(typeof uiModule.getEnableAdaCompliance()).toBe('boolean');

    errorSpy.mockRestore();
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
  });

  test('toggles showUIControls and confirmOnClear', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().setShowUIControls(false);
    useUiDao.getState().setConfirmOnClear(false);
    expect(useUiDao.getState().showUIControls).toBe(false);
    expect(useUiDao.getState().confirmOnClear).toBe(false);
  });

  test('handles palette and color scheme changes', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().setEnableAdaCompliance(false);
    useUiDao.getState().setPaletteOpen(true);
    useUiDao.getState().setColorSchemeKey('adaSafe');
    useUiDao.getState().setColorScheme({ foo: 'bar' });
    useUiDao.getState().setScheduleCursorUpdate('not-a-fn');
    expect(useUiDao.getState().paletteOpen).toBe(true);
    expect(useUiDao.getState().colorSchemeKey).toBe('adaSafe');
    expect(useUiDao.getState().colorScheme).toEqual({ foo: 'bar' });
    expect(typeof useUiDao.getState().scheduleCursorUpdate).toBe('function');
  });

  test('enforces adaSafe color scheme while ADA mode is enabled', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().setEnableAdaCompliance(true);
    useUiDao.getState().setColorSchemeKey('bio');

    expect(useUiDao.getState().colorSchemeKey).toBe('adaSafe');
    expect(useUiDao.getState().colorScheme).toEqual(expect.objectContaining({ name: expect.stringContaining('ADA') }));

    useUiDao.getState().setColorScheme({ foo: 'bar' });
    expect(useUiDao.getState().colorSchemeKey).toBe('adaSafe');
    expect(useUiDao.getState().colorScheme).toEqual(expect.objectContaining({ name: expect.stringContaining('ADA') }));
  });

  test('sets dialog toggles and payloads', async () => {
    const useUiDao = await loadUiDao();
    const toggles = [
      ['setShowChart', 'showChart'],
      ['setShowSpeedGauge', 'showSpeedGauge'],
      ['setDetectStablePopulation', 'detectStablePopulation'],
      ['setOptionsOpen', 'optionsOpen'],
      ['setWasRunningBeforeOptions', 'wasRunningBeforeOptions'],
      ['setScriptOpen', 'scriptOpen'],
      ['setAboutOpen', 'aboutOpen'],
      ['setDonateOpen', 'donateOpen'],
      ['setPhotoTestOpen', 'photoTestOpen'],
      ['setUserDialogOpen', 'userDialogOpen'],
      ['setShowRegister', 'showRegister'],
    ];

    toggles.forEach(([setter, key]) => {
      useUiDao.getState()[setter](true);
      expect(useUiDao.getState()[key]).toBe(true);
    });

    const handler = jest.fn();
    useUiDao.getState().setOnImportSuccess(handler);
    useUiDao.getState().onImportSuccess('shape');
    useUiDao.getState().onClosePalette();
    useUiDao.getState().onCloseChart();

    expect(handler).toHaveBeenCalledWith('shape');
    expect(useUiDao.getState().paletteOpen).toBe(false);
    expect(useUiDao.getState().showChart).toBe(false);
  });

  test('handles palette selection and capture callbacks', async () => {
    const useUiDao = await loadUiDao();
    useUiDao.getState().onPaletteSelect('shape-1');
    expect(useUiDao.getState().selectedShape).toBe('shape-1');

    const closeSpy = jest.fn();
    useUiDao.getState().setOnCloseCaptureDialog(closeSpy);
    useUiDao.getState().onCloseCaptureDialog();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    const saveSpy = jest.fn();
    useUiDao.getState().setOnSaveCapture(saveSpy);
    const payload = { id: 'cap-1' };
    useUiDao.getState().onSaveCapture(payload);
    expect(saveSpy).toHaveBeenCalledWith(payload);

    useUiDao.getState().setCellSize(12);
    expect(useUiDao.getState().cellSize).toBe(12);

    useUiDao.getState().setColorSchemes({ custom: { foo: 'bar' } });
    expect(useUiDao.getState().colorSchemes).toEqual({ custom: { foo: 'bar' } });
  });
});

describe('toolDao', () => {
  test('defaults and tool switching', async () => {
    const useToolDao = await loadToolDao();
    expect(useToolDao.getState().selectedTool).toBe('draw');
    useToolDao.getState().onSwitchToShapesTool();
    expect(useToolDao.getState().selectedTool).toBe('shapes');
  });

  test('sets randomRectPercent and tool map', async () => {
    const useToolDao = await loadToolDao();
    useToolDao.getState().setRandomRectPercent(75);
    useToolDao.getState().setToolMap({ draw: {} });
    expect(useToolDao.getState().randomRectPercent).toBe(75);
    expect(useToolDao.getState().toolMap).toEqual({ draw: {} });
  });

  test('manages recent shapes list', async () => {
    const useToolDao = await loadToolDao();
    useToolDao.getState().setRecentShapes([{ id: 1 }]);
    useToolDao.getState().onClearRecentShapes();
    expect(useToolDao.getState().recentShapes).toEqual([]);
    useToolDao.getState().onSaveRecentShapes([{ id: 2 }]);
    expect(useToolDao.getState().recentShapes).toEqual([{ id: 2 }]);
    useToolDao.getState().setSelectedShape('foo');
    expect(useToolDao.getState().selectedShape).toBe('foo');
  });

  test('sets tool state, persistence, and refs', async () => {
    const useToolDao = await loadToolDao();
    useToolDao.getState().setToolState({ a: 1 });
    expect(useToolDao.getState().toolState).toEqual({ a: 1 });

    useToolDao.getState().setRecentShapesPersistence({ loaded: true });
    expect(useToolDao.getState().recentShapesPersistence).toEqual({ loaded: true });

    useToolDao.getState().onSelectShape({ id: 's1' });
    expect(useToolDao.getState().selectedShape).toEqual({ id: 's1' });

    useToolDao.getState().onRotateShape({ id: 's2' });
    expect(useToolDao.getState().selectedShape).toEqual({ id: 's2' });

    const ref = { current: { tool: 'draw' } };
    useToolDao.getState().setToolStateRef(ref);
    expect(useToolDao.getState().toolStateRef).toBe(ref);
  });
});

describe('gameDao', () => {
  test('hydrates engine prefs and generation batch size from storage', async () => {
    localStorage.setItem('engineMode', 'hashlife');
    localStorage.setItem('useHashlife', 'true');
    localStorage.setItem('generationBatchSize', '8');

    const useGameDao = (await import('../model/dao/gameDao.js')).useGameDao;

    expect(useGameDao.getState().engineMode).toBe('hashlife');
    expect(useGameDao.getState().useHashlife).toBe(true);
    expect(useGameDao.getState().isHashlifeMode).toBe(true);
    expect(useGameDao.getState().generationBatchSize).toBe(8);
  });

  test('updates generation batch size and model hooks', async () => {
    const useGameDao = await loadGameDao();
    useGameDao.getState().setGenerationBatchSize(5);
    expect(useGameDao.getState().generationBatchSize).toBe(5);

    const customSetter = jest.fn();
    useGameDao.getState().setSetCellAlive(customSetter);
    useGameDao.getState().setCellAlive(1, 2, true);
    expect(customSetter).toHaveBeenCalledWith(1, 2, true);
  });

  test('manages engine mode and running state', async () => {
    const useGameDao = await loadGameDao();
    useGameDao.getState().setEngineMode('normal');
    useGameDao.getState().setIsRunning(true);
    useGameDao.getState().setGameModel({ id: 'model' });
    expect(useGameDao.getState().engineMode).toBe('normal');
    expect(useGameDao.getState().isRunning).toBe(true);
    expect(useGameDao.getState().gameModel).toEqual({ id: 'model' });

    expect(localStorage.getItem('engineMode')).toBe('normal');
  });
  
  test('delegates getLiveCells and default setCellAlive logging', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const useGameDao = await loadGameDao();
    useGameDao.getState().setGetLiveCells(() => 'cells');
    expect(useGameDao.getState().getLiveCells()).toBe('cells');
    useGameDao.getState().setSetCellAlive((...args) => logSpy('override', ...args));
    useGameDao.getState().setCellAlive(3, 4, false);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test('engine mode syncs hashlife flags', async () => {
    const useGameDao = await loadGameDao();
    expect(useGameDao.getState().engineMode).toBe('normal');
    expect(useGameDao.getState().isHashlifeMode).toBe(false);
    expect(useGameDao.getState().useHashlife).toBe(false);

    useGameDao.getState().setEngineMode('hashlife');
    expect(useGameDao.getState().engineMode).toBe('hashlife');
    expect(useGameDao.getState().isHashlifeMode).toBe(true);
    expect(useGameDao.getState().useHashlife).toBe(true);

    useGameDao.getState().setUseHashlife(false);
    expect(useGameDao.getState().engineMode).toBe('normal');
    expect(useGameDao.getState().isHashlifeMode).toBe(false);

    useGameDao.getState().setIsHashlifeMode(true);
    expect(useGameDao.getState().engineMode).toBe('hashlife');
    expect(useGameDao.getState().useHashlife).toBe(true);
  });

  test('exposes handler wiring slots for engine controls', async () => {
    const useGameDao = await loadGameDao();
    const slots = [
      'onStartNormalMode',
      'onStartHashlifeMode',
      'onStopAllEngines',
      'onSetEngineMode',
      'onSetGenerationBatchSize'
    ];
    slots.forEach((slot) => {
      expect(typeof useGameDao.getState()[slot]).toBe('function');
    });

    const fn = jest.fn();
    useGameDao.getState().setOnStartHashlifeMode(fn);
    useGameDao.getState().onStartHashlifeMode();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('steady info setter replaces object', async () => {
    const useGameDao = await loadGameDao();
    const next = { steady: true, period: 5, popChanging: false };
    useGameDao.getState().setSteadyInfo(next);
    expect(useGameDao.getState().steadyInfo).toEqual(next);
  });
});

describe('populationDao', () => {
  test('tracks population window and chart size', async () => {
    const usePopulationDao = await loadPopulationDao();
    usePopulationDao.getState().setPopWindowSize(10);
    usePopulationDao.getState().setPopTolerance(2);
    usePopulationDao.getState().setMaxChartGenerations(1234);
    expect(usePopulationDao.getState().popWindowSize).toBe(10);
    expect(usePopulationDao.getState().popTolerance).toBe(2);
    expect(usePopulationDao.getState().maxChartGenerations).toBe(1234);
  });

  test('stores generation and history', async () => {
    const usePopulationDao = await loadPopulationDao();
    usePopulationDao.getState().setPopulationHistory([1, 2]);
    usePopulationDao.getState().setGeneration(42);
    usePopulationDao.getState().setStableDetectionInfo({ period: 3 });
    expect(usePopulationDao.getState().populationHistory).toEqual([1, 2]);
    expect(usePopulationDao.getState().generation).toBe(42);
    expect(usePopulationDao.getState().stableDetectionInfo).toEqual({ period: 3 });
  });
});

describe('dialogDao', () => {
  test('opens dialogs and stores payloads', async () => {
    const useDialogDao = await loadDialogDao();
    useDialogDao.getState().setCaptureDialogOpen(true);
    useDialogDao.getState().setCaptureData({ name: 'foo' });
    useDialogDao.getState().setDuplicateShape({ id: 1 });
    expect(useDialogDao.getState().captureDialogOpen).toBe(true);
    expect(useDialogDao.getState().captureData).toEqual({ name: 'foo' });
    expect(useDialogDao.getState().duplicateShape).toEqual({ id: 1 });
  });

  test('manages duplicate and login notifications', async () => {
    const useDialogDao = await loadDialogDao();
    const toggles = [
      ['setShowDuplicateDialog', 'showDuplicateDialog'],
      ['setLoginNotifOpen', 'loginNotifOpen'],
      ['setShapesNotifOpen', 'shapesNotifOpen'],
      ['setMyShapesDialogOpen', 'myShapesDialogOpen'],
      ['setImportDialogOpen', 'importDialogOpen'],
      ['setShowStableDialog', 'showStableDialog'],
      ['setShowFirstLoadWarning', 'showFirstLoadWarning'],
    ];

    toggles.forEach(([setter, key]) => {
      useDialogDao.getState()[setter](true);
      expect(useDialogDao.getState()[key]).toBe(true);
    });

    useDialogDao.getState().setLoginNotifMessage('hello');
    useDialogDao.getState().setDuplicateShape({ id: 1 });
    expect(useDialogDao.getState().loginNotifMessage).toBe('hello');
    expect(useDialogDao.getState().duplicateShape).toEqual({ id: 1 });
  });
});

describe('performanceDao', () => {
  test('clamps and persists performance caps', async () => {
    const usePerformanceDao = await loadPerformanceDao();
    usePerformanceDao.getState().setPerformanceCaps({ maxFPS: 999, maxGPS: -5, enableFPSCap: true, enableGPSCap: false });
    expect(usePerformanceDao.getState().performanceCaps).toEqual({ maxFPS: 120, maxGPS: 1, enableFPSCap: true, enableGPSCap: false });
    expect(localStorage.getItem('maxFPS')).toBe('120');
    expect(localStorage.getItem('maxGPS')).toBe('1');
    expect(localStorage.getItem('enableFPSCap')).toBe('true');
    expect(localStorage.getItem('enableGPSCap')).toBe('false');
  });

  test('persists memory telemetry flag', async () => {
    const usePerformanceDao = await loadPerformanceDao();
    usePerformanceDao.getState().setMemoryTelemetryEnabled(true);
    expect(usePerformanceDao.getState().memoryTelemetryEnabled).toBe(true);
    expect(localStorage.getItem('memoryTelemetryEnabled')).toBe('true');
  });
});
