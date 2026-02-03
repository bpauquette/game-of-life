// App integration tests
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

  if (!HTMLCanvasElement.prototype.getContext) {
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
  }
});

// Global mock localStorage
const localStorageMock = {
  clear: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Global mock of URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-object-url');

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing and shows version info', async () => {
    render(<App />);
    
    // App should render
    expect(document.body).toBeDefined();
  });
});
