import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing and shows version info', () => {
    const { getByText } = render(<App />);
    expect(getByText(/Version:/)).toBeInTheDocument();
    expect(getByText(/Built:/)).toBeInTheDocument();
  });
});
