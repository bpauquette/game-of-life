import { jest } from '@jest/globals';

jest.mock('../../utils/backendApi.js', () => ({
  getBackendApiBase: () => 'http://base.test'
}));

describe('hoverWorker', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('fetches preview and posts result', async () => {
    const messages = [];
    const fakeSelf = {
      postMessage: jest.fn((msg) => messages.push(msg)),
      addEventListener: jest.fn((event, handler) => {
        fakeSelf._handler = handler;
      }),
    };
    global.self = fakeSelf;
    global.window = fakeSelf;
    global.postMessage = fakeSelf.postMessage;
    global.addEventListener = fakeSelf.addEventListener;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'abc', name: 'Foo', cells: [{ x: 0, y: 0 }] })
    });

    require('../hoverWorker.js');

    expect(fakeSelf.addEventListener).toHaveBeenCalled();
    const handler = fakeSelf.addEventListener.mock.calls[0][1];
    await handler?.({ data: { type: 'start', id: 'abc' } });

    expect(global.fetch).toHaveBeenCalledWith('http://base.test/v1/shapes/abc', expect.any(Object));
    expect(messages).toContainEqual({ type: 'preview', data: { id: 'abc', name: 'Foo', description: '', cells: [{ x: 0, y: 0 }] } });
  });
});
