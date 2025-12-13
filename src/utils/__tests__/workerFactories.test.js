// Mock backendApi so faux-workers call the mocked functions. Must mock before
// requiring the module under test so the module picks up the mocked helpers.
jest.mock('../backendApi', () => ({
  fetchShapeNames: jest.fn(),
  fetchShapeById: jest.fn()
}));

const { createNamesWorker, createHoverWorker } = require('../workerFactories');
const { fetchShapeNames, fetchShapeById } = require('../backendApi');

describe('workerFactories (faux worker behavior)', () => {
  beforeAll(() => {
    jest.setTimeout(30000);
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
});
