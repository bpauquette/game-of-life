import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider.js';
import Login from './Login.jsx';

import { post } from './api.js';

// Mock the API
jest.mock('./api', () => ({
  post: jest.fn(),
}));

const mockPost = post;

describe('Login Component', () => {
  beforeEach(() => {
    mockPost.mockClear();
  });

  test('renders login form', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  test('validates email format', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'invalidemail' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  test('requires email and password', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  test('handles successful login', async () => {
    mockPost.mockResolvedValue({ token: 'fake-token' });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/login', { email: 'test@example.com', password: 'Password123!' });
    });
    // Check that no error message is shown
    expect(screen.queryByText(/Login failed/)).not.toBeInTheDocument();
  });

  test('handles login error', async () => {
    mockPost.mockResolvedValue({ error: 'Invalid credentials' });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('toggles password visibility', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const passwordInput = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByRole('button', { name: 'Show password' });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });
});