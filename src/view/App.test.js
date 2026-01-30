// Mock StepScheduler to bypass ESM/worker errors in Jest
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App.js';
jest.mock('../controller/StepScheduler', () => ({
  __esModule: true,
  default: function StepScheduler() {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      setSpeed: jest.fn(),
      setUseWorker: jest.fn(),
      isUsingWorker: () => false,
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(),
    };
  }
}));

// Mock canvas and DOM methods for tests
beforeAll(() => {
  // Mock getBoundingClientRect on all elements
  Element.prototype.getBoundingClientRect = jest.fn(function() {
    return {
      width: this.tagName === 'CANVAS' ? 800 : 100,
      height: this.tagName === 'CANVAS' ? 600 : 100,
      top: 0,
      left: 0,
      bottom: this.tagName === 'CANVAS' ? 600 : 100,
      right: this.tagName === 'CANVAS' ? 800 : 100,
      x: 0,
      y: 0
    };
  });

  // Explicitly mock on HTMLCanvasElement.prototype as well
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(function() {
    return {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0
    };
  });

  // Mock HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = jest.fn(function() {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      canvas: this
    };
  });
});

describe('App', () => {
  it('renders without crashing and shows version info', () => {
    render(<App />);
    // App no longer renders version metadata in the root; ensure core UI mounts
    expect(screen.getByLabelText(/Load saved grid state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Save current grid state/i)).toBeInTheDocument();
  });
});
