import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OptionsPanel from './OptionsPanel.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { useUiDao } from '../model/dao/uiDao.js';

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
});
