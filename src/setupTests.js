// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock canvas for tests
const mockContext = {
  scale: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  globalAlpha: 1,
  drawImage: jest.fn(),
  setTransform: jest.fn(),
  translate: jest.fn(),
  clearRect: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn()
};

// Mock HTMLCanvasElement
const mockGetContext = jest.fn((contextType) => {
  if (contextType === '2d') {
    return mockContext;
  }
  return null;
});

HTMLCanvasElement.prototype.getContext = mockGetContext;
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  right: 800,
  bottom: 600,
  x: 0,
  y: 0
}));

// Mock window.devicePixelRatio
Object.defineProperty(globalThis, 'devicePixelRatio', {
  value: 1,
  writable: true
});

// Export mockContext for tests that need it directly
globalThis.mockCanvasContext = mockContext;

// ===== Suppress noisy test console output =====
// Filter a small set of known, non-actionable warnings to keep test logs clean.
// If new important warnings appear, relax these filters.
const _origWarn = console.warn;
const _origError = console.error;

beforeAll(() => {
  // Intercept warnings
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    const msg = args[0] && typeof args[0] === 'string' ? args[0] : '';
    // MUI Grid deprecation and Select out-of-range warnings are noisy and
    // do not indicate test failures; suppress them here.
    if (msg.includes('MUI Grid:') || msg.includes('MUI: You have provided an out-of-range value') || msg.includes('You have provided an out-of-range value')) {
      return;
    }
    _origWarn(...args);
  });

  // Intercept errors (keep real errors flowing through)
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args[0] && typeof args[0] === 'string' ? args[0] : '';
    // Suppress noisy React test warnings we've addressed where the remaining
    // messages are not actionable in CI (debounce/microtask timing, duplicate keys)
    if ((msg.includes('An update to') && msg.includes('inside a test was not wrapped in act')) ||
        msg.includes('Encountered two children with the same key') ||
        msg.includes('Received `true` for a non-boolean attribute')) {
      return;
    }
    _origError(...args);
  });
});

afterAll(() => {
  // Restore originals if mocks exist
  console.warn?.mockRestore?.();
  console.error?.mockRestore?.();
});

// Minimal ResizeObserver mock for jsdom environments used in tests.
// Tests can trigger resize notifications by calling ResizeObserver.__trigger(entries)
if (typeof globalThis.ResizeObserver === 'undefined') {
  (function () {
    const instances = [];
    class MockRO {
      constructor(cb) {
        this.cb = cb;
        instances.push(this);
      }
      observe(_el) {
        // no-op; tests will trigger callbacks manually
      }
      unobserve(_el) {
        // no-op
      }
      disconnect() {
        // no-op
      }
      // helper for tests to trigger observers
      static __trigger(entries) {
        for (const inst of instances) {
          try { inst.cb(entries); } catch (e) { /* ignore */ }
        }
      }
    }
    globalThis.ResizeObserver = MockRO;
  }());
}
