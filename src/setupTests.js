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
