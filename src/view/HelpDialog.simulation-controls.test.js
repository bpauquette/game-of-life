import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HelpDialog from './HelpDialog.js';

describe('HelpDialog simulation controls icons', () => {
  test('shows icons for Start/Stop, Step, Clear, and Reset to Generation 0', () => {
    render(<HelpDialog open={true} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Tools & Controls' }));

    expect(screen.getByText('Start/Stop')).toBeInTheDocument();
    expect(screen.getByText('Step')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Reset to Generation 0')).toBeInTheDocument();

    expect(screen.getByTestId('PlayArrowIcon')).toBeInTheDocument();
    expect(screen.getByTestId('StopIcon')).toBeInTheDocument();
    expect(screen.getByTestId('SkipNextIcon')).toBeInTheDocument();
    expect(screen.getByTestId('DeleteSweepIcon')).toBeInTheDocument();
    expect(screen.getByTestId('RestartAltIcon')).toBeInTheDocument();
  });
});
