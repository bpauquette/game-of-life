import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import React from 'react';

import jwt from 'jsonwebtoken';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(globalThis, 'sessionStorage', { value: mockSessionStorage });

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
}));

const mockDecode = jwt.decode;

describe('AuthProvider', () => {
  beforeEach(() => {
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
    mockDecode.mockClear();
  });

  test('loads token from sessionStorage on mount', () => {
    mockSessionStorage.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'valid-token';
      if (key === 'authEmail') return 'test@example.com';
      return null;
    });
    mockDecode.mockReturnValue({ exp: Date.now() / 1000 + 3600 }); // Not expired

    const TestComponent = () => {
      const { token, email } = useAuth();
      return <div>Token: {token}, Email: {email}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('authToken');
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('authEmail');
    expect(screen.getByText('Token: valid-token, Email: test@example.com')).toBeInTheDocument();
  });

  test('removes expired token from sessionStorage', () => {
    mockSessionStorage.getItem.mockReturnValue('expired-token');
    mockDecode.mockReturnValue({ exp: Date.now() / 1000 - 3600 }); // Expired

    const TestComponent = () => {
      const { token } = useAuth();
      return <div>Token: {token}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authEmail');
    expect(screen.getByText('Token:')).toBeInTheDocument(); // Null token
  });

  test('handles invalid token in sessionStorage', () => {
    mockSessionStorage.getItem.mockReturnValue('invalid-token');
    mockDecode.mockImplementation(() => { throw new Error('Invalid token'); });

    const TestComponent = () => {
      const { token } = useAuth();
      return <div>Token: {token}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authEmail');
  });

  test('login stores token in sessionStorage', () => {
    const TestComponent = () => {
      const { login } = useAuth();
      return <button onClick={() => login('test@example.com', 'new-token')}>Login</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('authEmail', 'test@example.com');
  });

  test('logout removes token from sessionStorage', () => {
    const TestComponent = () => {
      const { logout } = useAuth();
      return <button onClick={logout}>Logout</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authEmail');
  });
});