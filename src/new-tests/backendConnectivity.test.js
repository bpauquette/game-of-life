// Debug: print the environment variable at test startup
// eslint-disable-next-line no-console
console.log('[TEST] process.env.REACT_APP_API_BASE:', process.env.REACT_APP_API_BASE);
import { checkBackendHealth } from '../utils/backendApi';

describe('Backend connectivity', () => {
  it('should respond to /v1/health', async () => {
    const ok = await checkBackendHealth();
    expect(ok).toBe(true);
  });
});
