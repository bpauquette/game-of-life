import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the component under test after mocking
import GameOfLifeApp from '../GameOfLifeApp';

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
        addObserver: () => {}
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
jest.mock('../../auth/useProtectedAction', () => ({
  useProtectedAction: (action) => ({ wrappedAction: (...args) => action(...args), renderDialog: () => null })
}));
jest.mock('../../auth/AuthProvider', () => ({
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
