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

  test('ADA mode disables start while step remains available', async () => {
    const onStartNormalMode = jest.fn();
    const step = jest.fn();

    render(
      <RunControlGroup
        isRunning={false}
        enableAdaCompliance={true}
        onStartNormalMode={onStartNormalMode}
        step={step}
      />
    );

    const startButton = screen.getByLabelText(/start/i);
    expect(startButton).toBeDisabled();
    expect(onStartNormalMode).not.toHaveBeenCalled();

    const stepButton = screen.getByRole('button', { name: /step/i });
    await userEvent.click(stepButton);
    expect(step).toHaveBeenCalledTimes(1);
  });

  test('reset button calls generation-zero reset handler', async () => {
    const resetToGenerationZero = jest.fn();
    const setIsRunning = jest.fn();

    render(
      <RunControlGroup
        isRunning={true}
        setIsRunning={setIsRunning}
        step={jest.fn()}
        draw={jest.fn()}
        clear={jest.fn()}
        snapshotsRef={{ current: [] }}
        setSteadyInfo={jest.fn()}
        resetToGenerationZero={resetToGenerationZero}
      />
    );

    const resetButton = screen.getByRole('button', { name: /reset-to-generation-zero/i });
    await userEvent.click(resetButton);

    expect(setIsRunning).toHaveBeenCalledWith(false);
    expect(resetToGenerationZero).toHaveBeenCalledTimes(1);
  });
});
