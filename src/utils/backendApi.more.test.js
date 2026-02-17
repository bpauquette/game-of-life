import {
  updateShapePublic,
  getBackendApiBase,
  saveCapturedShapeToBackend,
  fetchShapes,
  fetchShapeNames,
  fetchShapeById,
  deleteShapeById,
  createShape,
  checkBackendHealth,
  chatWithAssistant,
} from './backendApi.js';

function setLocation(next) {
  Object.defineProperty(globalThis, 'location', {
    value: next,
    configurable: true,
  });
}

describe('backendApi additional coverage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
    process.env.REACT_APP_API_BASE = '';
    sessionStorage.clear();
    setLocation({ host: 'example.test', origin: 'https://example.test' });
  });

  afterEach(() => {
    process.env.REACT_APP_API_BASE = '';
  });

  test('getBackendApiBase prefers env and trims trailing slash', () => {
    process.env.REACT_APP_API_BASE = 'https://api.example.test/';
    expect(getBackendApiBase()).toBe('https://api.example.test');
  });

  test('getBackendApiBase uses localhost dev heuristic when running on :3000', () => {
    setLocation({ host: 'localhost:3000', origin: 'http://localhost:3000' });
    expect(getBackendApiBase()).toBe('http://localhost:55000');
  });

  test('updateShapePublic sends PATCH with auth and returns JSON', async () => {
    sessionStorage.setItem('authToken', 'token-1');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await updateShapePublic('shape 1', true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.test/api/v1/shapes/shape%201/public',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-1',
        }),
      })
    );
    expect(result).toEqual({ ok: true });
  });

  test('updateShapePublic omits auth header when token is missing', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await updateShapePublic('shape-2', false);

    const [, request] = global.fetch.mock.calls[0];
    expect(request.headers.Authorization).toBeUndefined();
  });

  test('updateShapePublic throws detailed error when backend fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'bad',
    });

    await expect(updateShapePublic('id', false)).rejects.toThrow(
      'Failed to update shape public status: 500 bad'
    );
  });

  test('saveCapturedShapeToBackend rejects duplicate names from lookup', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ name: 'Blinker' }], total: 1 }),
    });

    await expect(
      saveCapturedShapeToBackend({ name: 'blinker', pattern: [[0, 0]], width: 1, height: 1 })
    ).rejects.toThrow('DUPLICATE_NAME:blinker');
  });

  test('saveCapturedShapeToBackend handles duplicate conflict payload', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ duplicate: true, existingShape: { id: 'existing' } }),
      });

    await expect(
      saveCapturedShapeToBackend({ name: 'shape', pattern: [[0, 0]], width: 1, height: 1 })
    ).rejects.toMatchObject({ duplicate: true, existingShape: { id: 'existing' } });
  });

  test('saveCapturedShapeToBackend returns created payload on success', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'created-shape' }),
      });

    const result = await saveCapturedShapeToBackend({
      name: 'shape-ok',
      pattern: [[0, 0]],
      width: 1,
      height: 1,
    });

    expect(result).toEqual({ id: 'created-shape' });
  });

  test('saveCapturedShapeToBackend logs out on invalid token', async () => {
    const logout = jest.fn();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid or expired token' }),
      });

    await expect(
      saveCapturedShapeToBackend({ name: 'shape', pattern: [[0, 0]], width: 1, height: 1 }, logout)
    ).rejects.toThrow('Please log in again to save shapes');
    expect(logout).toHaveBeenCalledTimes(1);
  });

  test('saveCapturedShapeToBackend throws generic HTTP error when payload has no message', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({}),
      });

    await expect(
      saveCapturedShapeToBackend({ name: 'shape-fail', pattern: [[0, 0]], width: 1, height: 1 })
    ).rejects.toThrow('HTTP 500: Server Error');
  });

  test('fetchShapes handles non-ok and invalid JSON', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('bad-json');
        },
      });

    const first = await fetchShapes('x', 'https://api');
    const second = await fetchShapes('x', 'https://api');

    expect(first).toEqual({ ok: false, status: 503, items: [], total: 0 });
    expect(second).toEqual({ ok: true, items: [], total: 0 });
  });

  test('fetchShapes returns parsed items and total on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 'a' }], total: 9 }),
    });

    const result = await fetchShapes('term', 'https://api');

    expect(result).toEqual({ ok: true, items: [{ id: 'a' }], total: 9 });
  });

  test('fetchShapeNames supports explicit and legacy signatures', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: 'Blinker' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 2, name: 'Beacon' }], total: 5 }),
      });

    const explicit = await fetchShapeNames('https://api', 'b', 5, 10, null);
    const legacy = await fetchShapeNames('be', null);

    expect(explicit).toEqual({ ok: true, items: [{ id: 1, name: 'Blinker' }], total: 1 });
    expect(legacy.ok).toBe(true);
    expect(legacy.total).toBe(5);
  });

  test('fetchShapeNames returns not-ok payload on fetch error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'));
    const result = await fetchShapeNames('https://api', 'q', 10, 0, null);
    expect(result).toEqual({ ok: false, items: [], total: 0 });
  });

  test('fetchShapeById, deleteShapeById and createShape return normalized results', async () => {
    sessionStorage.setItem('authToken', 'token-2');
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 's1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'deleted',
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    const byId = await fetchShapeById('s1', 'https://api');
    const deleted = await deleteShapeById('s2', 'https://api');
    const created = await createShape({ name: 'shape' }, 'https://api');

    expect(byId).toEqual({ ok: true, data: { id: 's1' } });
    expect(deleted.ok).toBe(true);
    expect(deleted.details).toContain('DELETE https://api/v1/shapes/s2');
    expect(created).toBe(true);
  });

  test('fetchShapeById returns not-ok when JSON parsing fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('bad');
      },
    });
    await expect(fetchShapeById('bad-json', 'https://api')).resolves.toEqual({ ok: false });
  });

  test('checkBackendHealth returns true on ok response and false on error', async () => {
    process.env.REACT_APP_API_BASE = 'https://api.example.test/';
    global.fetch
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(checkBackendHealth()).resolves.toBe(true);
    await expect(checkBackendHealth()).resolves.toBe(false);

    errorSpy.mockRestore();
  });

  test('chatWithAssistant throws empty-reply error for blank responses', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: '   ' }),
    });

    await expect(chatWithAssistant([{ role: 'user', content: 'x' }], { backendBase: '/api' })).rejects.toMatchObject({ code: 'empty_reply' });
  });

  test('chatWithAssistant handles invalid JSON responses', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('invalid-json');
      },
    });

    await expect(chatWithAssistant([{ role: 'user', content: 'x' }], { backendBase: '/api' })).rejects.toMatchObject({ code: 'empty_reply' });
  });

  test('getBackendApiBase falls back to /api when no env or location is available', () => {
    const priorLocation = globalThis.location;
    Object.defineProperty(globalThis, 'location', { value: undefined, configurable: true });
    process.env.REACT_APP_API_BASE = '';

    expect(getBackendApiBase()).toBe('/api');

    Object.defineProperty(globalThis, 'location', { value: priorLocation, configurable: true });
  });
});
