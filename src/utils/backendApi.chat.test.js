import { chatWithAssistant, getBackendApiBase, getBackendHealthDetails } from './backendApi.js';

describe('chatWithAssistant', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }
  });

  test('returns normalized reply on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: ' Hello from AI ',
        model: 'gpt-test',
        usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
        requestId: 'req-1'
      })
    });

    const result = await chatWithAssistant([{ role: 'user', content: 'Hi' }], { backendBase: '/api' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/ai/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    );
    expect(result).toEqual({
      reply: 'Hello from AI',
      model: 'gpt-test',
      usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
      requestId: 'req-1'
    });
  });

  test('throws timeout error when fetch aborts', async () => {
    global.fetch.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(
      chatWithAssistant([{ role: 'user', content: 'Hi' }], { backendBase: '/api', timeoutMs: 1000 })
    ).rejects.toMatchObject({ code: 'chat_timeout' });
  });

  test('throws server error details when response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'AI service unavailable', code: 'ai_not_configured' })
    });

    await expect(
      chatWithAssistant([{ role: 'user', content: 'Hi' }], { backendBase: getBackendApiBase() })
    ).rejects.toMatchObject({
      message: 'AI service unavailable',
      status: 503,
      code: 'ai_not_configured'
    });
  });

  test('getBackendHealthDetails reports aiConfigured from health payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, ai: { configured: true, model: 'gpt-4o-mini' } })
    });

    await expect(getBackendHealthDetails('/api')).resolves.toMatchObject({
      ok: true,
      aiConfigured: true
    });
  });

  test('getBackendHealthDetails falls back to aiConfigured false on fetch failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    await expect(getBackendHealthDetails('/api')).resolves.toEqual({
      ok: false,
      aiConfigured: false,
      health: null
    });
  });
});
