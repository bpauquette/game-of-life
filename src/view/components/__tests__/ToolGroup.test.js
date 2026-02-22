import React from 'react';
import { render } from '@testing-library/react';
import ToolGroup from '../ToolGroup.js';
import { GameContext } from '../../../context/GameContext.js';

function renderWithGameContext(ui, value) {
  return render(
    <GameContext.Provider value={value}>
      {ui}
    </GameContext.Provider>
  );
}

describe('ToolGroup', () => {
  test('matches Angular toolbar order, with toggle first and shapes last', () => {
    const { container } = renderWithGameContext(
      <ToolGroup />,
      {
        selectedTool: 'draw',
        requestToolChange: jest.fn()
      }
    );

    const labels = Array.from(container.querySelectorAll('button[aria-label]'))
      .map((el) => el.getAttribute('aria-label'));

    expect(labels).toEqual([
      'toggle',
      'draw',
      'erase',
      'line',
      'rect',
      'square',
      'circle',
      'oval',
      'randomRect',
      'capture',
      'shapes'
    ]);
  });
});
