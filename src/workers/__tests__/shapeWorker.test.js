describe('shapeWorker', () => {
  let originalPostMessage;

  beforeEach(() => {
    jest.resetModules();
    originalPostMessage = global.self.postMessage;
    global.self.postMessage = jest.fn();
    global.self.onmessage = null;
    require('../shapeWorker.js');
  });

  afterEach(() => {
    global.self.postMessage = originalPostMessage;
    global.self.onmessage = null;
  });

  test('normalizes shape cells and emits normalized result', () => {
    const shape = {
      id: 's1',
      name: 'Glider',
      cells: [{ x: 5, y: 7 }, [6, 7], { x: 5, y: 8 }]
    };

    global.self.onmessage({ data: { type: 'normalize', shape } });

    expect(global.self.postMessage).toHaveBeenCalledTimes(1);
    const payload = global.self.postMessage.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: 'normalized',
      shapeId: 's1'
    });
    expect(payload.result.cells).toEqual([[0, 0], [1, 0], [0, 1]]);
    expect(payload.result.width).toBe(2);
    expect(payload.result.height).toBe(2);
    expect(payload.result.meta.cellCount).toBe(3);
  });

  test('returns original shape when no source cells exist', () => {
    const shape = { id: 'empty', name: 'None' };
    global.self.onmessage({ data: { type: 'normalize', shape } });
    const payload = global.self.postMessage.mock.calls[0][0];
    expect(payload.result).toEqual(shape);
  });

  test('generates key from id when present', () => {
    global.self.onmessage({ data: { type: 'key', shape: { id: 42, cells: [[0, 0]] } } });
    const payload = global.self.postMessage.mock.calls[0][0];
    expect(payload).toEqual({ type: 'key', shapeId: 42, key: '42' });
  });

  test('generates key from name/meta/sampled cells when id is absent', () => {
    const shape = {
      name: 'Pattern',
      meta: { width: 4, height: 3, cellCount: 6 },
      pattern: [[1, 2], { x: 3, y: 4 }, [5, 6], [7, 8], [9, 10]]
    };

    global.self.onmessage({ data: { type: 'key', shape } });
    const payload = global.self.postMessage.mock.calls[0][0];

    expect(payload.type).toBe('key');
    expect(payload.key).toContain('n:Pattern');
    expect(payload.key).toContain('w:4');
    expect(payload.key).toContain('h:3');
    expect(payload.key).toContain('c:6');
    expect(payload.key).toContain('len:5');
    expect(payload.key).toContain('1,2');
    expect(payload.key).toContain('3,4');
    expect(payload.key).not.toContain('9,10');
  });

  test('ignores unsupported message types', () => {
    global.self.onmessage({ data: { type: 'noop', shape: { id: 'x' } } });
    expect(global.self.postMessage).not.toHaveBeenCalled();
  });
});
