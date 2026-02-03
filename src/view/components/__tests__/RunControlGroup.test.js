import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RunControlGroup from '../RunControlGroup.js';

describe('RunControlGroup engine controls', () => {
  test('engine dropdown calls onSetEngineMode', async () => {
    const onSetEngineMode = jest.fn();
    render(<RunControlGroup engineMode="normal" onSetEngineMode={onSetEngineMode} />);

    const select = screen.getByLabelText(/engine mode/i);
    await userEvent.selectOptions(select, 'hashlife');
    expect(onSetEngineMode).toHaveBeenCalledWith('hashlife');
  });

  test('start/stop buttons delegate to provided handlers', async () => {
    const onStartNormalMode = jest.fn();
    const onStopAllEngines = jest.fn();

    const { rerender } = render(
      <RunControlGroup
        isRunning={false}
        onStartNormalMode={onStartNormalMode}
        onStopAllEngines={onStopAllEngines}
      />
    );

    const startButton = screen.getByLabelText(/start/i);
    await userEvent.click(startButton);
    expect(onStartNormalMode).toHaveBeenCalledTimes(1);

    rerender(
      <RunControlGroup
        isRunning={true}
        onStartNormalMode={onStartNormalMode}
        onStopAllEngines={onStopAllEngines}
      />
    );

    const stopButton = screen.getByLabelText(/stop/i);
    await userEvent.click(stopButton);
    expect(onStopAllEngines).toHaveBeenCalledTimes(1);
  });
});
