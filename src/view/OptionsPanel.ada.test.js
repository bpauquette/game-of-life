import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OptionsPanel from './OptionsPanel.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { useUiDao } from '../model/dao/uiDao.js';
import { useDialogDao } from '../model/dao/dialogDao.js';
import { usePerformanceDao } from '../model/dao/performanceDao.js';
import { useGameDao } from '../model/dao/gameDao.js';

describe('OptionsPanel ADA enforcement', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiDao.setState({
      colorSchemeKey: 'bio',
      enableAdaCompliance: false,
      colorSchemes: {
        bio: { name: 'Bio' },
        adaSafe: { name: 'ADA Safe (Low Contrast)' }
      }
    });
    useDialogDao.setState({ showFirstLoadWarning: false });
    usePerformanceDao.setState({
      performanceCaps: {
        maxFPS: 60,
        maxGPS: 30,
        enableFPSCap: false,
        enableGPSCap: false
      }
    });
    useGameDao.setState({
      engineMode: 'normal',
      onSetEngineMode: jest.fn()
    });
  });

  test('forces adaSafe color scheme when ADA mode is enabled and OK is pressed', () => {
    const onOk = jest.fn();
    const onCancel = jest.fn();

    render(
      <ThemeProvider>
        <OptionsPanel onOk={onOk} onCancel={onCancel} />
      </ThemeProvider>
    );

    const adaCheckbox = screen.getByLabelText('Enable ADA Compliance Mode');
    if (!adaCheckbox.checked) {
      fireEvent.click(adaCheckbox);
    }

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(useUiDao.getState().colorSchemeKey).toBe('adaSafe');
    expect(localStorage.getItem('colorSchemeKey')).toBe('adaSafe');
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  test('does not render a manual photosensitivity tester toggle', () => {
    render(
      <ThemeProvider>
        <OptionsPanel onOk={() => {}} onCancel={() => {}} />
      </ThemeProvider>
    );

    expect(screen.queryByLabelText('Enable photosensitivity tester (manual)')).not.toBeInTheDocument();
    expect(
      screen.getByText('Photosensitivity testing is available only when ADA Compliance Mode is enabled.')
    ).toBeInTheDocument();
  });

  test('does not expose backend selector in options UI', () => {
    render(
      <ThemeProvider>
        <OptionsPanel onOk={() => {}} onCancel={() => {}} />
      </ThemeProvider>
    );

    expect(screen.queryByLabelText('Backend')).not.toBeInTheDocument();
    expect(screen.queryByText(/Node \(port 55000\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Java \(port 55001\)/i)).not.toBeInTheDocument();
  });

  test('resets privacy controls and reopens first-load warning flow', () => {
    localStorage.setItem('gol-first-load-warning-seen', 'true');
    const onCancel = jest.fn();

    render(
      <ThemeProvider>
        <OptionsPanel onOk={() => {}} onCancel={onCancel} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset Privacy Controls' }));

    expect(localStorage.getItem('gol-first-load-warning-seen')).toBe('false');
    expect(useDialogDao.getState().showFirstLoadWarning).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('when ADA mode is turned off, resets to BioLife and max speed caps', () => {
    localStorage.setItem('enableAdaCompliance', 'true');
    useUiDao.setState({
      colorSchemeKey: 'adaSafe',
      enableAdaCompliance: true,
    });
    usePerformanceDao.setState({
      performanceCaps: {
        maxFPS: 2,
        maxGPS: 2,
        enableFPSCap: true,
        enableGPSCap: true
      }
    });

    render(
      <ThemeProvider>
        <OptionsPanel onOk={() => {}} onCancel={() => {}} />
      </ThemeProvider>
    );

    const adaCheckbox = screen.getByLabelText('Enable ADA Compliance Mode');
    fireEvent.click(adaCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(useUiDao.getState().enableAdaCompliance).toBe(false);
    expect(useUiDao.getState().colorSchemeKey).toBe('bio');
    expect(usePerformanceDao.getState().performanceCaps).toEqual(expect.objectContaining({
      maxFPS: 120,
      maxGPS: 60,
      enableFPSCap: true,
      enableGPSCap: true
    }));
    expect(localStorage.getItem('colorSchemeKey')).toBe('bio');
    expect(localStorage.getItem('maxFPS')).toBe('120');
    expect(localStorage.getItem('maxGPS')).toBe('60');
    expect(localStorage.getItem('enableFPSCap')).toBe('true');
    expect(localStorage.getItem('enableGPSCap')).toBe('true');
  });

  test('moves engine mode control into options and applies it on OK', () => {
    const onSetEngineMode = jest.fn();
    useGameDao.setState({ engineMode: 'normal', onSetEngineMode });

    render(
      <ThemeProvider>
        <OptionsPanel onOk={() => {}} onCancel={() => {}} />
      </ThemeProvider>
    );

    const engineSelect = screen.getByLabelText('Engine mode');
    fireEvent.mouseDown(engineSelect);
    fireEvent.click(screen.getByRole('option', { name: 'HashLife' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onSetEngineMode).toHaveBeenCalledWith('hashlife');
  });
});
