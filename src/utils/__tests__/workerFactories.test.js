jest.useRealTimers();

jest.mock('../backendApi', () => ({
  fetchShapeNames: jest.fn(),
  getBackendApiBase: jest.fn(() => '/api')
}));

const { createNamesWorker, createFauxNamesWorker } = require('../workerFactories.js');
const { fetchShapeNames } = require('../backendApi.js');

const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

describe('workerFactories (faux worker behavior)', () => {
  beforeAll(() => {
    jest.setTimeout(15000);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createNamesWorker returns error event when backend reports !ok', async () => {
    fetchShapeNames.mockResolvedValueOnce({ ok: false, items: [], total: 0 });
    const worker = createNamesWorker();
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '/api', q: '', limit: 1 });
    await wait(60);
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  test('createNamesWorker handles malformed backend response as backend error', async () => {
    fetchShapeNames.mockResolvedValueOnce(null);
    const worker = createNamesWorker();
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '/api', q: '', limit: 1 });
    await wait(60);
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  test('createNamesWorker handles thrown fetch error', async () => {
    fetchShapeNames.mockRejectedValueOnce(new Error('network down'));
    const worker = createNamesWorker();
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '/api', q: '', limit: 1 });
    await wait(60);
    expect(events.some((e) => e.type === 'error' && String(e.message).includes('network down'))).toBe(true);
  });

  test('faux worker emits page and done with stopAfterFirstPage', async () => {
    fetchShapeNames.mockResolvedValueOnce({ ok: true, items: [{ id: 'a', name: 'A' }], total: 50 });
    const worker = createFauxNamesWorker();
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '/api', q: 'A', limit: 1, offsetStart: 0, stopAfterFirstPage: true });
    await wait(80);

    const pageEvents = events.filter((e) => e.type === 'page');
    expect(pageEvents).toHaveLength(1);
    expect(pageEvents[0]).toMatchObject({ total: 50, offset: 0 });
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });

  test('faux worker can be aborted by terminate', async () => {
    fetchShapeNames.mockResolvedValue({ ok: true, items: [{ id: 'a', name: 'A' }], total: 100 });
    const worker = createNamesWorker();
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '/api', q: '', limit: 1 });
    worker.terminate();
    await wait(80);
    expect(events.filter((e) => e.type === 'page').length).toBeLessThanOrEqual(1);
  });

  test('faux worker supports explicit stop messages', () => {
    const worker = createFauxNamesWorker();
    expect(worker._aborted).toBe(false);
    worker.postMessage({ type: 'stop' });
    expect(worker._aborted).toBe(true);
    worker.postMessage(null);
  });
});

describe('createNamesWorker (real Worker path)', () => {
  const originalWorker = global.Worker;

  afterEach(() => {
    global.Worker = originalWorker;
    jest.resetModules();
    jest.restoreAllMocks();
    delete global.__GOL_TEST_MODE__;
  });

  test('uses module Worker when environment is not test and Worker exists', () => {
    const createdWorker = { postMessage: jest.fn(), terminate: jest.fn() };
    const WorkerMock = jest.fn(() => createdWorker);
    global.Worker = WorkerMock;
    global.__GOL_TEST_MODE__ = false;

    let createWorker;
    jest.isolateModules(() => {
      jest.doMock('../runtimeEnv.js', () => ({
        isTestEnvironment: () => false
      }));
      createWorker = require('../workerFactories.js').createNamesWorker;
    });

    const worker = createWorker();
    expect(WorkerMock).toHaveBeenCalledWith('/workers/namesWorker.js', { type: 'module' });
    expect(worker).toBe(createdWorker);
  });

  test('falls back to faux worker when Worker constructor throws', () => {
    global.Worker = jest.fn(() => {
      throw new Error('boom');
    });
    global.__GOL_TEST_MODE__ = false;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let createWorker;
    jest.isolateModules(() => {
      jest.doMock('../runtimeEnv.js', () => ({
        isTestEnvironment: () => false
      }));
      createWorker = require('../workerFactories.js').createNamesWorker;
    });

    const worker = createWorker();
    expect(typeof worker.postMessage).toBe('function');
    expect(warnSpy).toHaveBeenCalled();
  });
});
