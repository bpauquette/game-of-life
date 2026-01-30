import { FRONTEND_VERSION, FRONTEND_TIMESTAMP } from '../version.js';

describe('Frontend build version', () => {
  it('should have a valid version string', () => {
    expect(FRONTEND_VERSION).toMatch(/^v?\d+\.\d+\.\d+/);
  });

  it('should have a valid EST military time timestamp', () => {
    // Example: 2025-12-12T15:29:46 EST
    expect(FRONTEND_TIMESTAMP).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2} EST/);
  });
});
