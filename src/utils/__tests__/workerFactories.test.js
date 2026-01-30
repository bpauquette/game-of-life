
// Use real timers so faux worker setTimeout/setInterval work as expected
jest.useRealTimers();
// Mock backendApi so faux-workers call the mocked functions. Must mock before
// requiring the module under test so the module picks up the mocked helpers.
jest.mock('../backendApi', () => ({
  fetchShapeNames: jest.fn(),
  fetchShapeById: jest.fn()
}));


const { createNamesWorker, createHoverWorker } = require('../workerFactories.js');
const { fetchShapeNames, fetchShapeById } = require('../backendApi.js');

describe('workerFactories (faux worker behavior)', () => {
  beforeAll(() => {
    jest.setTimeout(15000);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createHoverWorker returns preview data', async () => {
    fetchShapeById.mockResolvedValue({ ok: true, data: { id: 'x', name: 'X', description: 'desc', cells: [[0, 0]] } });

    const worker = createHoverWorker('');

    const preview = await new Promise((resolve) => {
      worker.onmessage = (ev) => {
        if (ev.data.type === 'preview') resolve(ev.data.data);
        if (ev.data.type === 'error') resolve({ error: ev.data.message });
      };
      worker.postMessage({ type: 'start', id: 'x', base: '' });
    });

    expect(preview).toHaveProperty('id', 'x');
    expect(preview).toHaveProperty('name', 'X');
    expect(preview).toHaveProperty('cells');
    expect(preview.cells).toEqual([[0, 0]]);
  });


  test('createNamesWorker returns error', async () => {
    fetchShapeNames.mockResolvedValueOnce({ ok: false, items: [], total: 0 });
    const worker = createNamesWorker('', '', 1);
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '', q: '', limit: 1 });
    await new Promise(r => setTimeout(r, 50));
    expect(events.some(e => e.type === 'error')).toBe(true);
  });

  test('createNamesWorker can be aborted', async () => {
    fetchShapeNames.mockResolvedValue({ ok: true, items: [{ id: 'a', name: 'A' }], total: 100 });
    const worker = createNamesWorker('', '', 1);
    const events = [];
    worker.onmessage = (ev) => events.push(ev.data);
    worker.postMessage({ type: 'start', base: '', q: '', limit: 1 });
    worker.terminate();
    await new Promise(r => setTimeout(r, 50));
    // Should not emit more than one page due to abort
    expect(events.filter(e => e.type === 'page').length).toBeLessThanOrEqual(1);
  });
});
