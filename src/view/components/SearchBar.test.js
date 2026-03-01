import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchBar from './SearchBar.js';

describe('SearchBar', () => {
  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<SearchBar value="" onChange={() => {}} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses wrapped layout on mobile', () => {
    render(<SearchBar value="" onChange={() => {}} onClose={() => {}} isMobile />);

    expect(screen.getByTestId('shape-search-bar')).toHaveStyle({ flexWrap: 'wrap' });
  });

  it('omits close button when onClose is not supplied', () => {
    render(<SearchBar value="" onChange={() => {}} />);

    expect(screen.queryByLabelText(/close/i)).toBeNull();
  });
});
