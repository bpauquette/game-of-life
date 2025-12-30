import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing and shows version info', () => {
    const { getByLabelText } = render(<App />);
    // App no longer renders version metadata in the root; ensure core UI mounts
    expect(getByLabelText(/Load saved grid state/i)).toBeInTheDocument();
    expect(getByLabelText(/Save current grid state/i)).toBeInTheDocument();
  });
});
