import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameOfLifeApp from './GameOfLifeApp';

describe('Shapes tool UI state', () => {
  it('preserves shapes palette state after unrelated UI updates', async () => {
    render(<GameOfLifeApp />);

    // Simulate opening the shapes palette
    fireEvent.click(screen.getByTestId('open-shapes-palette'));
  // Wait for dialog to appear
  await waitFor(() => expect(screen.getByTestId('shapes-palette')).toBeVisible());

    // Simulate an unrelated UI state update (e.g., toggling chart)
    fireEvent.click(screen.getByTestId('toggle-chart'));

  // The shapes palette should still be open
  await waitFor(() => expect(screen.getByTestId('shapes-palette')).toBeVisible());
  });
});
