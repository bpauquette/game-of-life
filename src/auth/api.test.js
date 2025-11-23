import { post } from './api';

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

    expect(fetch).toHaveBeenCalledWith('http://localhost:55000/auth/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });
    expect(result).toEqual({ success: true });
  });

  test('uses REACT_APP_API_BASE if set', async () => {
    process.env.REACT_APP_API_BASE = 'https://api.example.com';
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    fetch.mockResolvedValue(mockResponse);

    await post('/test', {});

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.any(Object));
    delete process.env.REACT_APP_API_BASE;
  });

  test('throws error on non-ok response', async () => {
    const mockResponse = { ok: false, status: 400, statusText: 'Bad Request' };
    fetch.mockResolvedValue(mockResponse);

    await expect(post('/test', {})).rejects.toThrow('HTTP 400: Bad Request');
  });

  test('dispatches logout event on token expiry', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ error: 'Invalid or expired token' }) };
    fetch.mockResolvedValue(mockResponse);

    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    await post('/test', {});

    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect(dispatchEventSpy.mock.calls[0][0].type).toBe('auth:logout');

    dispatchEventSpy.mockRestore();
  });

  test('handles fetch errors', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(post('/test', {})).rejects.toThrow('Network error');
  });
});