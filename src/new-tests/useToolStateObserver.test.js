import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useToolStateObserver from '../../src/view/hooks/useToolStateObserver';

function createFakeModel() {
  const observers = new Set();
  return {
    addObserver: (fn) => observers.add(fn),
    removeObserver: (fn) => observers.delete(fn),
    emit: (event, data) => observers.forEach(fn => fn(event, data)),
  };
}

function HookHarness({ model, toolStateRef }) {
  const state = useToolStateObserver({ model, toolStateRef });
  return <pre data-testid="state">{JSON.stringify(state)}</pre>;
}

describe('useToolStateObserver', () => {
  test('initializes from ref and updates on model event', async () => {
    const model = createFakeModel();
    const toolStateRef = { current: { start: { x: 1, y: 2 } } };
    render(<HookHarness model={model} toolStateRef={toolStateRef} />);

    expect(screen.getByTestId('state').textContent).toContain('\"start\":{\"x\":1,\"y\":2}');

    model.emit('toolStateChanged', { last: { x: 3, y: 4 }, dragging: true });
    await waitFor(() => expect(screen.getByTestId('state').textContent).toContain('"last":{"x":3,"y":4}'));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toContain('"dragging":true'));
  });
});
