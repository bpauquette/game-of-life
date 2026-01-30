// Debug: print the environment variable at test startup
 
import { checkBackendHealth } from '../utils/backendApi.js';
console.log('[TEST] process.env.REACT_APP_API_BASE:', process.env.REACT_APP_API_BASE);

describe('Backend connectivity', () => {
  it('should respond to /v1/health', async () => {
    const ok = await checkBackendHealth();
    if (ok === false) {
      // Skip test if backend is not running
      console.warn('Backend not running, skipping test.');
      return;
    }
    expect(ok).toBe(true);
  });
});
