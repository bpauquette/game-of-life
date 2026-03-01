import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FooterControls from './FooterControls.js';

const baseProps = {
  total: 25,
  threshold: 1000,
  page: 1,
  limit: 10,
  canPagePrev: true,
  canPageNext: true,
  onPrevPage: jest.fn(),
  onNextPage: jest.fn(),
  loading: false,
  busy: false,
  isMobile: false
};

describe('FooterControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows range text and handles paging clicks', () => {
    render(<FooterControls {...baseProps} />);

    expect(screen.getByText(/Showing 11–20 of 25 shapes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Prev/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(baseProps.onPrevPage).toHaveBeenCalledTimes(1);
    expect(baseProps.onNextPage).toHaveBeenCalledTimes(1);
  });

  it('disables paging buttons when busy and switches to mobile layout', () => {
    render(
      <FooterControls
        {...baseProps}
        busy={true}
        canPagePrev={false}
        canPageNext={false}
        isMobile={true}
      />
    );

    expect(screen.getByRole('button', { name: /Prev/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
    expect(screen.getByTestId('shape-palette-footer')).toHaveStyle({ flexDirection: 'column' });
  });
});
