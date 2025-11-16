// Mock backendApi so faux-workers call the mocked functions. Must mock before
// requiring the module under test so the module picks up the mocked helpers.
jest.mock('../backendApi', () => ({
  fetchShapeNames: jest.fn(),
  fetchShapeById: jest.fn()
}));

const { createNamesWorker, createHoverWorker } = require('../workerFactories');
const { fetchShapeNames, fetchShapeById } = require('../backendApi');

describe('workerFactories (faux worker behavior)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createNamesWorker loads pages until done', async () => {
    // Simulate three single-item pages then done
    fetchShapeNames.mockImplementation((base, q, limit, offset) => {
      if (offset === 0) return Promise.resolve({ ok: true, items: [{ id: 'a', name: 'A' }], total: 3 });
      if (offset === 1) return Promise.resolve({ ok: true, items: [{ id: 'b', name: 'B' }], total: 3 });
      if (offset === 2) return Promise.resolve({ ok: true, items: [{ id: 'c', name: 'C' }], total: 3 });
      return Promise.resolve({ ok: true, items: [], total: 3 });
    });

    const worker = createNamesWorker('', '', 1);
    const pages = [];

    await new Promise((resolve) => {
      worker.onmessage = (ev) => {
        const d = ev.data;
        if (d.type === 'page') pages.push(d);
        if (d.type === 'done') resolve();
      };

      worker.postMessage({ type: 'start', base: '', q: '', limit: 1 });
    });

    expect(pages.length).toBe(3);
    expect(pages.map(p => p.items[0].id)).toEqual(['a', 'b', 'c']);
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
});
