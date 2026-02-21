import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FirstLoadWarningDialog from './FirstLoadWarningDialog.js';
import { useUiDao } from '../model/dao/uiDao.js';

describe('FirstLoadWarningDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiDao.setState({ enableAdaCompliance: true });
  });

  test('allows continue without legal-risk acknowledgment when ADA mode is on', () => {
    const onClose = jest.fn();
    render(<FirstLoadWarningDialog open onClose={onClose} />);

    const continueButton = screen.getByRole('button', { name: 'Continue with ADA ON' });
    expect(continueButton).toBeEnabled();
    expect(screen.queryByLabelText('I acknowledge.')).not.toBeInTheDocument();
    expect(screen.getByText('Community Features')).toBeInTheDocument();
    expect(screen.getByText('Optional Donation ($5-10):')).toBeInTheDocument();

    fireEvent.click(continueButton);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('gol-first-load-warning-seen')).toBe('true');
  });

  test('requires legal-risk acknowledgment before continue when ADA mode is off', () => {
    useUiDao.setState({ enableAdaCompliance: false });
    const onClose = jest.fn();
    render(<FirstLoadWarningDialog open onClose={onClose} />);

    const continueButton = screen.getByRole('button', { name: 'Continue with ADA OFF' });
    expect(continueButton).toBeDisabled();

    fireEvent.click(continueButton);
    expect(onClose).not.toHaveBeenCalled();
    expect(localStorage.getItem('gol-first-load-warning-seen')).toBeNull();

    fireEvent.click(screen.getByLabelText('I acknowledge.'));
    fireEvent.click(continueButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('gol-first-load-warning-seen')).toBe('true');
  });
});
