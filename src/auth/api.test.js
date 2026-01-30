import { post } from './api.js';

// Mock fetch
global.fetch = jest.fn();

describe('API post function', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('makes POST request with correct headers and body', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
    fetch.mockResolvedValue(mockResponse);

    const result = await post('/test', { key: 'value' });

    expect(fetch).toHaveBeenCalledWith('http://localhost/api/auth/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });
    expect(result).toEqual({ success: true });
  });

  test('uses REACT_APP_API_BASE if set', async () => {
    // Simulate Node environment (no globalThis)
    delete global.globalThis;
    process.env.REACT_APP_API_BASE = 'https://api.example.com';
    jest.resetModules();
    const { post } = require('./api.js');
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    fetch.mockResolvedValue(mockResponse);

    await post('/test', {});

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/auth/test', expect.any(Object));
    delete process.env.REACT_APP_API_BASE;
  });

  test('throws error on non-ok response', async () => {
    const mockResponse = { ok: false, status: 400, statusText: 'Bad Request' };
    fetch.mockResolvedValue(mockResponse);

    await expect(post('/test', {})).rejects.toThrow('HTTP 400: Bad Request');
  });

  test('dispatches logout event on token expiry', async () => {
    // Ensure globalThis exists for this test
    if (!global.globalThis) global.globalThis = {};
    global.globalThis.dispatchEvent = jest.fn();
    const mockResponse = { ok: true, json: () => Promise.resolve({ error: 'Invalid or expired token' }) };
    fetch.mockResolvedValue(mockResponse);

    await post('/test', {});

    expect(global.globalThis.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect(global.globalThis.dispatchEvent.mock.calls[0][0].type).toBe('auth:logout');
  });

  test('handles fetch errors', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(post('/test', {})).rejects.toThrow('Network error');
  });

  test('uses browser /api/auth if in browser', () => {
    const originalWindow = global.globalThis;
    global.globalThis = { location: { origin: 'https://example.com' } };
    jest.resetModules();
    const { getAuthApiBase } = require('./api.js');
    expect(getAuthApiBase()).toBe('https://example.com/api/auth');
    global.globalThis = originalWindow;
  });
});