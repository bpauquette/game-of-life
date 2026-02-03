import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import ScriptExecutionHUD from '../ScriptExecutionHUD.js';

describe('ScriptExecutionHUD', () => {
  const dispatch = (type, detail = {}) => {
    act(() => {
      globalThis.dispatchEvent(new CustomEvent(type, { detail }));
    });
  };

  afterEach(() => {
    // Clean up any lingering listeners by unmounting between tests
    jest.restoreAllMocks();
  });

  test('shows start info when script begins', () => {
    render(<ScriptExecutionHUD />);

    dispatch('gol:script:start', { script: 'RECT 1 1' });

    expect(screen.getByText(/Script started/i)).not.toBeNull();
    expect(screen.getAllByText(/RECT 1 1/i).length).toBeGreaterThan(0);
  });

  test('renders progress updates from debug events', () => {
    render(<ScriptExecutionHUD />);

    dispatch('gol:script:start', { script: 'STEP 10' });
    dispatch('gol:script:debug', { type: 'progress', current: 2, total: 4, msg: 'Halfway' });

    expect(screen.getAllByText(/Halfway/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 \/ 4/)).not.toBeNull();
  });

  test('close button dispatches stop event and hides HUD', () => {
    const spy = jest.spyOn(globalThis, 'dispatchEvent');
    render(<ScriptExecutionHUD />);

    dispatch('gol:script:start', { script: 'RUN' });

    fireEvent.click(screen.getByTitle(/Stop Script and Close/i));

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'gol:script:stop' }));
    expect(screen.queryByText(/Script started/i)).toBeNull();
  });

  test('after closing, HUD stays hidden until next start', () => {
    render(<ScriptExecutionHUD />);

    dispatch('gol:script:start', { script: 'RUN' });
    fireEvent.click(screen.getByTitle(/Stop Script and Close/i));

    // Emit a debug event that previously would have reopened the HUD
    dispatch('gol:script:debug', { type: 'command', line: 'RECT 1 1' });

    expect(screen.queryByText(/Executing:/i)).toBeNull();

    // New start should show HUD again
    dispatch('gol:script:start', { script: 'RUN' });
    expect(screen.getByText(/Script started/i)).toBeInTheDocument();
  });
});
