import React from 'react';
import { render, screen } from '@testing-library/react';
import useToolStateObserver from '../../src/view/hooks/useToolStateObserver.js';
import PropTypes from 'prop-types';

function createFakeModel() {
  const observers = new Set();
  return {
    addObserver: (fn) => observers.add(fn),
    removeObserver: (fn) => observers.delete(fn),
    emit: (event, data) => {
      for (const fn of observers) {
        fn(event, data);
      }
    },
  };
}

// This is an intentionally minimal React function component used to exercise a hook in tests.
// Some static analyzers may not recognize it as a component and raise a false positive about
// calling hooks from a non-component. It's rendered via JSX (<HookHarness />), so this usage is valid.
function HookHarness({ model, toolStateRef }) { // NOSONAR: valid React component used for hook testing
  const state = useToolStateObserver({ model, toolStateRef });
  // Use an accessible element so we can query without test IDs
  return <output aria-label="tool-state">{JSON.stringify(state)}</output>;
}
HookHarness.propTypes = {
  model: PropTypes.object,
  toolStateRef: PropTypes.object,
};
// Removed extra closing brace
const TestComponent = ({ model, toolStateRef }) => null;
TestComponent.propTypes = {
  model: PropTypes.object,
  toolStateRef: PropTypes.object,
};

describe('useToolStateObserver', () => {
  test('initializes from ref and updates on model event', async () => {
    const model = createFakeModel();
    const toolStateRef = { current: { start: { x: 1, y: 2 } } };
    render(<HookHarness model={model} toolStateRef={toolStateRef} />);

    expect(screen.getByRole('status', { name: 'tool-state' })).toHaveTextContent('"start":{"x":1,"y":2}');

    model.emit('toolStateChanged', { last: { x: 3, y: 4 }, dragging: true });
    // Prefer findBy* queries to wait for async DOM updates
    expect(await screen.findByText(/"last":\{"x":3,"y":4\}/)).toBeInTheDocument();
    expect(await screen.findByText(/"dragging":true/)).toBeInTheDocument();
  });
});
