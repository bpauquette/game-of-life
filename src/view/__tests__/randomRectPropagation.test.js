import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameOfLifeApp from '../GameOfLifeApp.js';

// Mock canvas BEFORE importing GameOfLifeApp
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

// Explicitly mock on HTMLCanvasElement.prototype
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

// Spy for controller._setToolState
const mockSetToolState = jest.fn();

// Minimal GameMVC mock used by GameOfLifeApp initialization
jest.mock('../../controller/GameMVC', () => ({
  GameMVC: function () {
    return {
      model: {
        getSelectedTool: () => 'draw',
        getSelectedShape: () => null,
        getIsRunning: () => false,
        getPopulationHistory: () => [] ,
        addObserver: () => {},
        removeObserver: () => {}
      },
        controller: {
          _setToolState: mockSetToolState,
        requestRender: () => {},
        randomRectBuffer: null
      },
      setColorScheme: () => {},
      getViewport: () => ({ offsetX: 0, offsetY: 0, cellSize: 8 }),
      getPerformanceSettings: () => ({ maxFPS: 60, maxGPS: 30, enableFPSCap: false, enableGPSCap: false })
    };
  }
}));

// Mock auth hooks used by GameOfLifeApp to avoid needing full auth context
jest.mock('../../auth/useProtectedAction', () => {
  const shim = (action) => ({ wrappedAction: (...args) => action(...args), renderDialog: () => null });
  return {
    __esModule: true,
    useProtectedAction: shim,
    default: shim
  };
});
jest.mock('../../auth/AuthProvider.js', () => ({
  useAuth: () => ({ token: null, email: null, logout: () => {} })
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  try { localStorage.removeItem('randomRectPercent'); } catch {}
});

test('syncs randomRectPercent into controller as prob (defaults to 50% on first-run)', async () => {
  // Ensure no stored value exists so component uses the default 50
  try { localStorage.removeItem('randomRectPercent'); } catch {}

  render(<GameOfLifeApp />);

  // Wait for the effect that syncs randomRectPercent to call controller._setToolState
  await waitFor(() => {
    expect(mockSetToolState).toHaveBeenCalled();
  });

  // Find a call that set prob to ~0.5
  const found = mockSetToolState.mock.calls.some(call => {
    const arg = call[0];
    return arg && typeof arg.prob === 'number' && Math.abs(arg.prob - 0.5) < 1e-9;
  });
  expect(found).toBe(true);
});
