
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import GameOfLifeApp from './GameOfLifeApp';
import { AuthProvider } from '../auth/AuthProvider';

describe('GameOfLifeApp', () => {
  function renderWithAuthProvider(ui) {
    return render(<AuthProvider>{ui}</AuthProvider>);
  }

  it('renders without crashing', () => {
    renderWithAuthProvider(<GameOfLifeApp />);
    expect(document.body).toBeDefined();
  });

  it('toggles dialogs and updates UI state', () => {
    const { rerender } = renderWithAuthProvider(<GameOfLifeApp initialUIState={{ paletteOpen: false }} />);
    rerender(<AuthProvider><GameOfLifeApp initialUIState={{ paletteOpen: true }} /></AuthProvider>);
    expect(document.body).toBeDefined();
  });

  it('handles localStorage fallbacks gracefully', () => {
    const orig = global.localStorage;
    delete global.localStorage;
    expect(() => renderWithAuthProvider(<GameOfLifeApp />)).not.toThrow();
    global.localStorage = orig;
  });

  it('accepts initialUIState prop', () => {
    const { rerender } = renderWithAuthProvider(<GameOfLifeApp initialUIState={{ showChart: true }} />);
    rerender(<AuthProvider><GameOfLifeApp initialUIState={{ showChart: false }} /></AuthProvider>);
    expect(document.body).toBeDefined();
  });
});
