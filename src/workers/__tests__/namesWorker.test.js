import { jest } from '@jest/globals';

describe('namesWorker', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('streams a single page then done', async () => {
    const messages = [];
    global.postMessage = jest.fn((msg) => messages.push(msg));

    let messageHandler;
    global.addEventListener = (event, handler) => {
      if (event === 'message') messageHandler = handler;
    };

    global.self = { location: { origin: 'http://localhost:3000', host: 'localhost:3000' } };
    global.window = global.self;
    global.location = global.self.location;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: 1, name: 'Blinker' }], total: 1 })
    });

    require('../namesWorker.js');

    await messageHandler({ data: { type: 'start', q: 'b', limit: 1, stopAfterFirstPage: true } });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost/api/v1/shapes/names?q=b&limit=1&offset=0');
    expect(messages).toContainEqual({ type: 'page', items: [{ id: 1, name: 'Blinker' }], total: 1, offset: 0 });
    expect(messages).toContainEqual({ type: 'done' });
  });

  test('emits error when backend responds with non-ok status', async () => {
    const messages = [];
    global.postMessage = jest.fn((msg) => messages.push(msg));

    let messageHandler;
    global.addEventListener = (event, handler) => {
      if (event === 'message') messageHandler = handler;
    };

    global.self = { location: { origin: 'http://localhost:3000', host: 'localhost:3000' } };
    global.window = global.self;
    global.location = global.self.location;

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    require('../namesWorker.js');

    await messageHandler({ data: { type: 'start', q: 'x', limit: 5, stopAfterFirstPage: true } });

    expect(messages).toContainEqual({ type: 'error', message: 'HTTP 503' });
    expect(messages).not.toContainEqual({ type: 'done' });
  });
});
